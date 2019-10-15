import { Module, Configuration } from '@nuxt/types'
import { NuxtRouteConfig } from '@nuxt/types/config/router'

import fs from 'fs-extra'
import path from 'path'
import execa from 'execa'
import consola from 'consola'
import chalk from 'chalk'
import dotenv from 'dotenv'
import { merge } from 'lodash'
import { URL } from 'url'
import { EOL } from 'os'

export interface Options {
  root?: string
  publicDir?: string
  outputPath?: string
  server?:
    | boolean
    | {
        host?: string
        port?: number
      }
  dotEnvExport?: boolean
}

const moduleScope = 'nuxt:laravel'
const logger = consola.withScope(moduleScope)
const moduleKey = `__${moduleScope.replace(':', '_')}`
const laravelAppEnv = 'APP_URL'
const nuxtOutputEnv = 'NUXT_OUTPUT_PATH'

const laravelModule: Module<Options> = function(_moduleOptions) {
  /** OPTIONS RESOLUTION **/
  const baseUrl = (this.options.router && this.options.router.base) || ''

  const moduleOptions: Required<Options> = merge(
    {
      root: process.cwd(),
      publicDir: 'public',
      server: true,
      dotEnvExport: false
    },
    this.options.laravel,
    _moduleOptions
  )

  if (typeof moduleOptions.server === 'boolean' && moduleOptions.server) {
    moduleOptions.server =
      this.options.dev && this.options.server
        ? {
            host: this.options.server.host,
            port: +(this.options.server.port || 3000) + 1
          }
        : false
  }

  /** CONFIGURATION **/
  const laravelRoot = path.resolve(process.cwd(), moduleOptions.root)
  const generateDir = path.join(laravelRoot, moduleKey)
  const publicDir = path.resolve(laravelRoot, moduleOptions.publicDir)
  const publicPath = path.join(publicDir, baseUrl)
  const defaultFileName = `${publicDir === publicPath ? 'spa' : 'index'}.html`

  dotenv.config({ path: laravelRoot })
  moduleOptions.outputPath =
    process.env.NUXT_OUTPUT_PATH ||
    moduleOptions.outputPath ||
    path.join(publicPath, defaultFileName)

  const outputPath = path.resolve(laravelRoot, moduleOptions.outputPath)

  // cli helper
  const enableLaravelSupport = (enabled: boolean = true) => {
    const status = enabled
      ? chalk.green.bold('enabled')
      : chalk.red.bold('disabled')

    this.options.cli!.badgeMessages.push(`Laravel support is ${status}`)
  }

  /** VALIDATION **/

  // Fail with a warning if we are not in 'spa' mode
  if (this.options.mode !== 'spa') {
    logger.warn(`nuxt-laravel only supports 'spa' mode`)

    enableLaravelSupport(false)

    return
  }

  // Fail with error if laravelRoot is invalid
  if (!fs.existsSync(path.join(laravelRoot, 'artisan'))) {
    logger.error(
      `Unable to find 'artisan' executable in Laravel path ${laravelRoot}`
    )

    enableLaravelSupport(false)

    return
  }

  // Fail with error if publicDir cannot be found
  if (!fs.existsSync(publicDir)) {
    logger.error('Unable to find Laravel public dir:', publicDir)

    return
  }

  /** IMPLEMENTATION **/

  // DEV behavior
  if (this.options.dev) {
    // Fail with warning if server is not configured
    if (!moduleOptions.server) {
      logger.warn('Laravel testserver is disabled')

      enableLaravelSupport(false)

      return
    }

    // resolve pertinent config parameters
    const laravelUrl = new URL(
      `http://${moduleOptions.server.host}:${moduleOptions.server.port}`
    )

    console.log(laravelUrl.origin)

    this.options.axios = {
      ...(this.options.axios || {}),
      proxy: true
    }
    this.options.proxy = [
      ...(this.options.proxy || []),
      [
        ['**/*', `!${path.join(baseUrl, moduleKey)}`],
        {
          target: laravelUrl.origin,
          ws: false,
          logLevel: 'debug'
        }
      ]
    ]

    // configure proxy
    this.requireModule('@nuxtjs/axios')

    // extend routes to provide an endpoint for Laravel
    this.extendRoutes((routes: NuxtRouteConfig[]) => {
      let index = routes.find(
        // First, check if there is an unnamed route
        // Then, check if there's a route at /
        // Finally, check for a name with first segment index
        route =>
          route.name === '' ||
          route.path === '/' ||
          !!(route.name && route.name.match(/^index(-\w+)?$/))
      )

      // If we were unable to resolve the index route,
      // but modules are present
      if (!index && this.options.modules) {
        // we check for nuxt-i18n module
        const i18nModuleOptions = this.options.modules.find(
          m => (Array.isArray(m) && m[0] === 'nuxt-i18n') || m === 'nuxt-i18n'
        )
        const i18nOptions = Object.assign(
          {},
          i18nModuleOptions,
          this.options.i18n
        )

        // if i18n module is present, we try to find the translated index route
        if (i18nOptions.defaultLocale) {
          const separator = i18nOptions.routesNameSeparator || '___'
          index = routes.find(
            route =>
              !!(
                route.name &&
                route.name.match(
                  new RegExp(`^index${separator}${i18nOptions.defaultLocale}`)
                )
              )
          )
        }
      }

      // Fail with error if index route cannot be resolved
      if (!index) {
        logger.error('Unable to resolve index route')

        enableLaravelSupport(false)

        return
      }

      // add a copy of the index route
      // on the specified render path
      routes.push(
        Object.assign({}, index, {
          name: moduleKey,
          path: `/${moduleKey}`
        })
      )
    })

    // start Laravel test server on render:before
    let _serverInitialized = false
    this.nuxt.hook(
      'render:before',
      async ({ options }: { options: Configuration }) => {
        if (_serverInitialized) {
          return
        }
        _serverInitialized = true

        // Fail with warining if dev server is not enabled
        if (!options.server) {
          logger.warn('Nuxt dev server is not enabled')

          enableLaravelSupport(false)

          return
        }

        if (fs.existsSync(publicPath) && publicPath !== publicDir) {
          logger.warn(
            'Removing production build to avoid conficts with dev server'
          )
          fs.removeSync(publicPath)
        }

        // retrieve dev server URL
        const nuxtUrl = new URL(
          path.join(baseUrl, moduleKey),
          `http${!!options.server.https ? 's' : ''}://${
            options.server.host
          }:${options.server.port || 80}`
        )

        // try to start artisan server from Laravel path
        logger.debug(`Nuxt url: ${nuxtUrl.href}`)
        logger.debug(`Laravel url: ${laravelUrl.href}`)
        try {
          const testserver = execa(
            'php',
            [
              'artisan',
              'serve',
              `--host=${
                laravelUrl.hostname === 'localhost'
                  ? '127.0.0.1'
                  : laravelUrl.hostname
              }`,
              `--port=${laravelUrl.port}`
            ],
            {
              cwd: laravelRoot,
              // forward render path and baseUrl as env variables
              env: Object.assign({}, process.env, {
                [laravelAppEnv]: nuxtUrl.origin,
                [nuxtOutputEnv]: nuxtUrl.href
              }),
              stderr: process.stderr,
              stdin: process.stdin,
              stdout: process.stdout
            }
          )

          testserver.on('error', () => {
            logger.error(`Failed to start Laravel server`)
          })
        } catch (error) {
          logger.error(`Failed to start Laravel server`)

          enableLaravelSupport(false)

          return
        }

        enableLaravelSupport()
      }
    )
  }

  // PROD behaviour
  if (!this.options.dev) {
    // configure generation
    this.options.generate = {
      ...(this.options.generate || {}),
      dir: generateDir,
      exclude: [/.*/],
      fallback: defaultFileName
    }
    logger.info('Generation configured for Laravel SPA.')

    this.nuxt.hook('generate:done', async ({ nuxt }: { nuxt: any }) => {
      // generate assets
      logger.info('Generating SPA assets...')

      if (publicPath !== publicDir) {
        fs.ensureDirSync(publicPath)
        fs.moveSync(generateDir, publicPath, { overwrite: true })
      } else {
        fs.copySync(generateDir, publicDir)
        fs.removeSync(generateDir)
      }

      logger.success(`SPA assets generated in: ${publicPath}`)

      if (path.join(publicPath, defaultFileName) === outputPath) {
        logger.info(
          'Skipping index file output, because output path corresponds to default location'
        )

        return
      } else {
        // render index route
        logger.info('Rendering index route...')

        try {
          const { html, error } = await nuxt.server.renderRoute('/')

          if (error) {
            throw error
          }

          fs.ensureDirSync(path.dirname(outputPath))
          fs.writeFileSync(outputPath, html, 'utf-8')
        } catch (error) {
          logger.error('Failed to render index route:', error)

          return
        }

        logger.success(`SPA index file rendered to: ${outputPath}`)
      }

      // write to .env file
      if (
        moduleOptions.dotEnvExport &&
        fs.existsSync(path.join(laravelRoot, '.env'))
      ) {
        const envPath = path.join(laravelRoot, '.env')
        const envInput = fs.readFileSync(envPath).toString()
        const envOutputPrefix = `${EOL}# Added by 'nuxt-laravel' module${EOL}${nuxtOutputEnv}`
        const envOutput = `${envOutputPrefix}=${outputPath}`

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
  }
}

export default laravelModule
export const meta = require('../package.json')
