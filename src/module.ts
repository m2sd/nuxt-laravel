import { Module, Configuration } from '@nuxt/types'

import fs from 'fs-extra'
import path from 'path'
import execa from 'execa'
import { URL } from 'url'
import { EOL } from 'os'

import { moduleKey, laravelAppEnv, nuxtOutputEnv } from './constants'
import { logger, addBadgeMessage, getModuleOptions } from './utils'
import { getConfiguration, Options } from './options'

const laravelModule: Module<Options> = function(overwrites) {
  const config = getConfiguration(this.options, overwrites)

  // Optional cache module
  if (config.cache) {
    this.requireModule('@nuxtjs/pwa')

    const pwa = getModuleOptions(this.options, '@nuxtjs/pwa')
    const routingExtensions =
      (pwa && pwa.workbox && pwa.workbox.routingExtensions) || []

    const { dst } = this.addTemplate({
      src: path.join(__dirname, 'templates', 'workbox.cache.js'),
      options: config.cache,
      fileName: config.cache.fileName,
    })

    this.options.pwa = {
      ...pwa,
      workbox: {
        ...(pwa && pwa.workbox),
        routingExtensions: [
          ...(typeof routingExtensions === 'string'
            ? [routingExtensions]
            : routingExtensions),
          path.join(this.options.buildDir!, dst),
        ],
      },
    }
  }

  /* Validation */

  // Fail with error if laravelRoot is invalid
  if (!fs.existsSync(path.join(config.laravel.root, 'server.php'))) {
    logger.error(
      `Unable to find 'server.php' file in Laravel path: ${config.laravel.root}`
    )
    addBadgeMessage(this.options, false)

    return
  }

  // Fail with error if publicDir cannot be found
  if (!fs.existsSync(config.laravel.public)) {
    logger.error(`Unable to find Laravel public dir: ${config.laravel.public}`)
    addBadgeMessage(this.options, false)

    return
  }

  // Fail with warning if laravel proxy is disabled
  if (!config.laravel.server) {
    logger.warn('Laravel proxy is disabled')

    addBadgeMessage(this.options, false)

    return
  }

  /* Implementation */

  // resolve pertinent config parameters
  const laravelUrl = new URL(
    `http://${config.laravel.server.host || 'localhost'}:${
      config.laravel.server.port
    }`
  )

  // require axios module to implement proxy
  this.requireModule('@nuxtjs/axios')
  this.options.axios = {
    ...(this.options.axios || {}),
    proxy: true,
  }

  // configure proxy to forward all requests without a x-laravel-nuxt-proxy header to Laravel
  this.options.proxy = [
    ...(this.options.proxy || []),
    [
      (_pathname: string, req: Request) => {
        return req.headers.has('x-laravel-nuxt-proxy')
      },
      {
        target: laravelUrl.origin,
        ws: false,
        logLevel: 'debug',
      },
    ],
  ]

  logger.info(`Proxying all routes to Laravel on: ${laravelUrl.origin}`)

  if (this.options.dev) {
    // start Laravel test server on first render:done
    let _serverInitialized = false
    this.nuxt.hook(
      'render:done',
      async ({ options }: { options: Configuration }) => {
        /* istanbul ignore next */
        if (_serverInitialized) {
          return
        }
        _serverInitialized = true

        const nuxtServer = options.server!

        const nuxtHost = ['0.0.0.0', '127.0.0.1'].includes(`${nuxtServer.host}`)
          ? 'localhost'
          : nuxtServer.host

        // retrieve dev server URL
        const nuxtUrl = new URL(
          config.nuxt.urlPath,
          `http${!!nuxtServer.https ? 's' : ''}://${nuxtHost}:${
            nuxtServer.port
          }`
        )

        // try to start artisan server from Laravel path
        logger.debug(`Nuxt url: ${nuxtUrl.href}`)
        logger.debug(`Laravel url: ${laravelUrl.href}`)

        const server = execa(
          'php',
          [
            '-S',
            `${
              laravelUrl.hostname === 'localhost'
                ? '127.0.0.1'
                : laravelUrl.hostname
            }:${laravelUrl.port}`,
            `${config.laravel.root}/server.php`,
          ],
          {
            cwd: config.laravel.root,
            // forward render path and baseUrl as env variables
            env: {
              ...process.env,
              [laravelAppEnv]: nuxtUrl.origin,
              [nuxtOutputEnv]: nuxtUrl.href,
            },
            stderr: 'inherit',
            stdout: 'inherit',
          }
        )

        server.on('exit', code => {
          if (code) {
            logger.error('Laravel server failed')

            if (server && !server.killed) {
              server.cancel()
            }

            return
          }

          logger.info('Laravel server shut down')
        })

        this.nuxt.hook('close', () => {
          server.cancel()
        })

        logger.success(`Started Laravel dev server on: ${laravelUrl.origin}`)

        addBadgeMessage(options)
      }
    )
  }

  if (process.static) {
    /* Generation behavior */

    // configure generation
    this.options.generate = {
      ...this.options.generate,
      dir: config.output.src,
    }

    if (this.options.mode === 'spa') {
      this.options.generate.exclude = [/.*/]
    }

    this.nuxt.hook('generate:done', async ({ nuxt }: { nuxt: any }) => {
      // generate assets
      logger.info('Copying nuxt assets...')

      if (config.output.dest.replace(config.laravel.public, '').length > 1) {
        fs.ensureDirSync(config.output.dest)
        fs.moveSync(config.output.src, config.output.dest, { overwrite: true })
      } else {
        fs.copySync(config.output.src, config.output.dest)
        fs.removeSync(config.output.src)
      }

      logger.success(`Nuxt assets copied to: ${config.output.dest}`)

      if (
        config.output.indexPath &&
        config.output.indexPath !== config.output.fallback
      ) {
        const indexPath = config.output.indexPath

        logger.info('Rendering index file...')

        try {
          const { html, error } = await nuxt.server.renderRoute('/')

          /* istanbul ignore if */
          if (error) {
            throw error
          }

          fs.ensureDirSync(path.dirname(indexPath))
          fs.writeFileSync(indexPath, html, 'utf-8')

          logger.success(`SPA index file rendered to: ${indexPath}`)
        } catch (error) {
          logger.error('Failed to render index file:', error)

          return
        }
      }

      // write to .env file
      if (config.options.dotEnvExport) {
        const envPath = path.join(config.laravel.root, '.env')

        if (!fs.existsSync(envPath)) {
          logger.warn(
            `Unable to find .env file in: ${envPath}\n.env export skipped`
          )

          return
        }

        const indexPath = config.output.indexPath || config.output.fallback

        const envInput = fs.readFileSync(envPath).toString()
        const envOutputPrefix = `${EOL}# Added by 'nuxt-laravel' module${EOL}${nuxtOutputEnv}`
        const envOutput = `${envOutputPrefix}=${indexPath}`

        fs.writeFileSync(
          envPath,
          envInput.includes(envOutputPrefix)
            ? envInput.replace(new RegExp(`${envOutputPrefix}.*`), envOutput)
            : envInput.includes(nuxtOutputEnv)
            ? envInput.replace(new RegExp(`${nuxtOutputEnv}.*`), envOutput)
            : envInput.concat(envOutput)
        )
      }
    })

    logger.info('Generation configured for Laravel SPA.')
  }
}

declare module '@nuxt/types' {
  interface Configuration {
    laravel?: Options
  }
}

export { Options, moduleKey, laravelAppEnv, nuxtOutputEnv }
export default laravelModule
export const meta = require('../package.json')
