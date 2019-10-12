import { Route } from 'vue-router'
import NuxtConfiguration from '@nuxt/config'
import { NuxtConfigurationRouter } from '@nuxt/config/types/router'
import { NuxtConfigurationModuleFunction } from '@nuxt/config/types/module'

import fs from 'fs'
import { mkdirp } from 'fs-extra'
import path from 'path'
import execa from 'execa'
import consola from 'consola'
import { merge } from 'lodash'
import { URL } from 'url'

interface Nuxt {
  options: NuxtConfiguration
  hook: (name: string, callback: (...args: any) => void) => void
}

interface ModuleContainer {
  options: NuxtConfiguration
  nuxt: Nuxt
  extendRoutes: (callback: NuxtConfigurationRouter['extendRoutes']) => void
  requireModule: (module: string | [string, { [key: string]: any }]) => void
}

export interface LaravelModuleOptions {
  root?: string
  publicPath?: string
  renderPath?: string
  server?: { host: string; port?: number; https?: boolean }
}

const moduleScope = 'nuxt:laravel'
const logger = consola.withScope(moduleScope)
const moduleKey = `__${moduleScope.replace(':', '_')}`

const laravelModule: NuxtConfigurationModuleFunction = function(
  this: ModuleContainer,
  moduleOptions
) {
  // resolve module options
  const options: Required<LaravelModuleOptions> = merge(
    {
      root: process.cwd(),
      publicPath: 'public',
      renderPath: process.env.NUXT_URL,
      server:
        this.options.dev && this.options.server
          ? {
              host: this.options.server.host,
              port: +(this.options.server.port || 3000) + 1
            }
          : false
    },
    this.options.laravel,
    moduleOptions
  )
  const laravelPath = path.resolve(process.cwd(), options.root)

  // local helpers
  const findIndexRoute = (routes: Route[]) => {
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

  // start laravel server if defined in options
  if (options.server) {
    // resolve pertinent config parameters
    const renderRoot = (this.options.router && this.options.router.base) || ''
    const laravelUrl = new URL(
      `http${options.server.https ? 's' : ''}://${options.server.host}:${
        options.server.port
      }`
    )

    // fail if laravelPath is invalid
    if (!fs.existsSync(path.join(laravelPath, 'artisan'))) {
      logger.error(
        'Unable to find artisan executable in laravel path:',
        laravelPath
      )

      return
    }

    // extend nuxt configuration
    this.options.axios = this.options.axios || {}
    this.options.axios.proxy = true
    this.options.proxy = [
      ...(this.options.proxy || {}),
      [
        ['**/*', `!${path.join(renderRoot, moduleKey)}`],
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
    this.extendRoutes(routes => {
      let index = findIndexRoute(routes)

      // fail if index route can not be resolved
      if (!index) {
        logger.error('Unable to resolve index route')

        return
      }

      logger.debug('Index route resolved on path:', index.path)

      // add a copy of the index route
      // on the specified render path
      routes.push(
        Object.assign({}, index, {
          name: moduleKey,
          path: `/${moduleKey}`
        })
      )
    })

    this.nuxt.hook('render:before', async nuxt => {
      if (nuxt.options.server) {
        // retrieve dev server URL
        const basePrefix =
          (nuxt.options.router && nuxt.options.router.base) || '/'

        const nuxtUrl = new URL(
          path.join(basePrefix, moduleKey),
          `http${nuxt.options.server.https ? 's' : ''}://${
            nuxt.options.server.host
          }:${nuxt.options.server.port || 3000}`
        )

        // try to start artisan serve from laravel path
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
              cwd: laravelPath,
              // forward render path and baseUrl as env variables
              env: Object.assign({}, process.env, {
                APP_URL: nuxtUrl.origin,
                NUXT_URL: nuxtUrl.href
              }),
              stderr: process.stderr,
              stdin: process.stdin,
              stdout: process.stdout
            }
          )
        } catch (error) {
          logger.error('Failed to run command `php artisan serve`:', error)
        }
      }
    })
  }

  // generate spa html if configured accordingly
  if (!this.options.dev && this.options.mode === 'spa' && options.publicPath) {
    const publicDir = path.dirname(
      path.resolve(laravelPath, options.publicPath)
    )

    if (!fs.existsSync(publicDir)) {
      logger.error('Unable to find laravel public dir:', publicDir)

      return
    }

    let filePath = options.renderPath
    this.nuxt.hook('build:done', async ({ server, router, options }) => {
      const index = findIndexRoute(router.options.routes)

      // fail if index route can not be resolved
      if (!index) {
        logger.error('Unable to resolve index route')

        return
      }

      // render index route
      const { html, error } = await server.renderRoute(index.path)

      if (error) {
        logger.error('Error while rendering index route:', error)

        return
      }

      // fall back to autogenerated file path if it was not set manually
      if (!filePath) {
        if (
          options.router &&
          options.router.base &&
          options.router.base !== '/'
        ) {
          filePath = path.join(options.router.base, 'index.html')
        } else {
          filePath = 'spa.html'
        }
      }

      // resolve the destination inside laravels public folder
      const dest = path.join(publicDir, filePath)

      // create directory if it does not exist
      const destDir = path.dirname(dest)
      if (!fs.existsSync(destDir)) {
        mkdirp(destDir)
      }

      // write generated file to destination
      fs.writeFileSync(dest, html, 'utf-8')
    })
  }
}

export default laravelModule
export const meta = require('../package.json')
