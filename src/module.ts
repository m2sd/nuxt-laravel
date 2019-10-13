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
  publicPath?: string
  outputPath?: string
  server?: {
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
  /** CONFIGURATION **/
  // resolve module options
  const baseUrl = (
    (this.options.router && this.options.router.base) ||
    ''
  ).replace(/^\//, '')
  const moduleOptions: Required<Options> = merge(
    {
      root: process.cwd(),
      publicPath: 'public',
      outputPath: baseUrl,
      server:
        this.options.dev && this.options.server
          ? {
              host: this.options.server.host,
              port: +(this.options.server.port || 3000) + 1
            }
          : false,
      dotEnvExport: false
    },
    this.options.laravel,
    _moduleOptions
  )
  const laravelRoot = path.resolve(process.cwd(), moduleOptions.root)
  const generateDir = path.join(laravelRoot, moduleKey)
  const publicDir = path.resolve(laravelRoot, moduleOptions.publicPath)

  dotenv.config({ path: laravelRoot })
  moduleOptions.outputPath =
    process.env.NUXT_OUTPUT_PATH || moduleOptions.outputPath

  const outputDir = path.resolve(publicDir, moduleOptions.outputPath)

  /** IMPLEMENTATION **/

  // local helpers
  const enableLaravelSupport = (enabled: boolean = true) => {
    const status = enabled
      ? chalk.green.bold('enabled')
      : chalk.red.bold('disabled')

    this.options.cli!.badgeMessages.push(`Laravel support is ${status}`)
  }

  const findIndexRoute = (routes: NuxtRouteConfig[]) => {
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

    return index
  }

  // Fail with a warning if we are not in 'spa' mode
  if (this.options.mode !== 'spa') {
    logger.warn(`nuxt-laravel only supports 'spa' mode`)

    enableLaravelSupport(false)

    return
  }

  // DEV behavior
  if (moduleOptions.server && this.options.dev) {
    // resolve pertinent config parameters
    const laravelUrl = new URL(
      `http://${moduleOptions.server.host}:${moduleOptions.server.port}`
    )

    // fail if laravelRoot is invalid
    if (!fs.existsSync(path.join(laravelRoot, 'artisan'))) {
      logger.error(
        `Unable to find 'artisan' executable in laravel path ${laravelRoot}`
      )

      enableLaravelSupport(false)

      return
    }

    // extend nuxt configuration
    this.options.axios = this.options.axios || {}
    this.options.axios.proxy = true
    this.options.proxy = [
      ...(this.options.proxy || []),
      [
        ['**/*', `!/${path.join(baseUrl, moduleKey)}`],
        {
          target: laravelUrl.origin,
          ws: false
        }
      ]
    ]

    // require necessary modules
    this.requireModule('@nuxtjs/axios')
    this.requireModule('@nuxtjs/proxy')

    // extend routes to intercept proxied calls
    this.extendRoutes((routes: NuxtRouteConfig[]) => {
      let index = findIndexRoute(routes)

      // fail if index route can not be resolved
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

    this.nuxt.hook(
      'render:before',
      async ({ options }: { options: Configuration }) => {
        if (!options.server) {
          logger.warn('Dev server is not enabled')

          enableLaravelSupport(false)

          return
        }

        // retrieve dev server URL
        const nuxtUrl = new URL(
          path.join(baseUrl, moduleKey),
          `http${!!options.server.https ? 's' : ''}://${
            options.server.host
          }:${options.server.port || 3000}`
        )

        // try to start artisan serve from laravel path
        console.log(nuxtUrl.href)
        try {
          execa(
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
  if (!this.options.dev && moduleOptions.publicPath) {
    // fail if public dir cannot be found
    if (!fs.existsSync(publicDir)) {
      logger.error('Unable to find laravel public dir:', publicDir)

      return
    }

    // resolve fileName and destDir setting
    const [fileName, destDir]: [string, string] = outputDir.endsWith('.html')
      ? [path.basename(outputDir), path.dirname(outputDir)]
      : [outputDir === publicDir ? 'spa.html' : 'index.html', outputDir]

    // update nuxt router base if necessary
    const outputUrl = `${destDir.replace(publicDir, '')}/`
    if (!this.options.router || this.options.router.base !== outputUrl) {
      this.options.router = {
        ...(this.options.router || {}),
        base: outputUrl
      }
    }

    // exclude all routes from generation as we control nuxt from a single index file
    this.options.generate = {
      ...(this.options.generate || {}),
      dir: generateDir,
      exclude: [/.*/],
      fallback: fileName
    }
    logger.info('Generation configured for Laravel SPA.')

    this.nuxt.hook('generate:done', () => {
      logger.info('Generating SPA for laravel...')

      // ensure the destination folder exists and overwrite it with the contents from the generation folder
      fs.ensureDirSync(destDir)
      fs.moveSync(generateDir, destDir, { overwrite: true })

      logger.success(`SPA created in: ${destDir}`)

      if (
        moduleOptions.dotEnvExport &&
        fs.existsSync(path.join(laravelRoot, '.env'))
      ) {
        const envPath = path.join(laravelRoot, '.env')
        const envInput = fs.readFileSync(envPath).toString()
        const envOutputPrefix = `${EOL}# Added by 'nuxt-laravel' module${EOL}${nuxtOutputEnv}`
        const envOutput = `${envOutputPrefix}=${path.join(destDir, fileName)}`

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
