import execa from 'execa'
import { isArray, mergeWith } from 'lodash'
import path from 'path'
import { URL } from 'url'

import { commands, loadNuxtConfig } from '@nuxt/cli'
import { common, server } from '@nuxt/cli/dist/cli-chunk3'
import { NuxtConfigurationRouter } from '@nuxt/config/types/router'

import {
  NuxtLaravelCommand,
  NuxtLaravelCommandConfig
} from '../classes/nuxtCommand'

delete common.spa
delete common.universal

const config: NuxtLaravelCommandConfig = {
  /* tslint:disable:object-literal-sort-keys */
  name: 'nuxt-laravel-dev',
  description:
    'Start laravel development server and run the application in development mode (e.g. hot-code reloading, error reporting)',
  usage: 'laravel dev <dir>',
  options: {
    ...common,
    ...server,
    open: {
      alias: 'o',
      description: 'Opens the server listeners url in the default browser',
      type: 'boolean'
    },
    'laravel-path': {
      default: process.cwd(),
      description: 'Path to laravel directory',
      type: 'string'
    },
    'render-path': {
      default: `/${NuxtLaravelCommand.CONFIG_KEY}`,
      description: 'URL path used to render the SPA',
      prepare: (_, options, argv) => {
        // save existing extend routes function
        const extendRoutesActual = options.router
          ? options.router.extendRoutes
          : undefined

        const extendRoutes: NuxtConfigurationRouter['extendRoutes'] = function(
          this: NuxtConfigurationRouter,
          routes,
          resolve
        ) {
          // call original extendRoutes function
          // if it was defined
          if (typeof extendRoutesActual === 'function') {
            extendRoutesActual.apply(this, [routes, resolve])
          }

          // Try our best to find the root route.
          let index = routes.find(
            // First, check if there is an unnamed route
            // Then, check if there's a route at /
            // Finally, check for a name with first segment index
            route =>
              route.name === '' ||
              route.path === '/' ||
              !!(route.name && route.name.match(/^index(-\w+)?$/))
          )

          if (!index && options.modules) {
            // resolve i18n config
            const i18n = (m => isArray(m) && m[1])(
              options.modules.find(m => isArray(m) && m[0] === 'nuxt-i18n')
            )

            // find translated route
            if (i18n && i18n.defaultLocale) {
              const separator = i18n.routesNameSeparator || '___'
              index = routes.find(
                route =>
                  !!(
                    route.name &&
                    route.name.match(
                      new RegExp(`^index${separator}${i18n.defaultLocale}`)
                    )
                  )
              )
            }
          }

          // fail if index route can not be resolved
          if (!index) {
            throw String('Unable to resolve index route')
          }

          // add a copy of the index route
          // on the specified render path
          routes.push(
            Object.assign({}, index, {
              name: NuxtLaravelCommand.CONFIG_KEY,
              path: argv['render-path']
            })
          )
        }

        const renderRoot = (options.router && options.router.base) || ''

        const overrides: typeof options = {
          // use @nuxtjs/proxy module
          axios: {
            proxy: true
          },
          // proxy all calls except the render path to laravel
          proxy: [
            [
              ['**/*', `!${path.join(renderRoot, `${argv['render-path']}`)}`],
              {
                target: `http://${options.server!.host}:${+options.server!
                  .port! + 1}`,
                ws: false
              }
            ]
          ],
          router: {
            extendRoutes
          }
        }

        // apply concatenating arrays
        // this way string values may be preserved
        mergeWith(options, overrides, (obj, src) => {
          if (isArray(obj)) {
            return obj.concat(src)
          }
        })
      },
      type: 'string'
    }
  },
  async run(cmd) {
    const options = await cmd.getNuxtConfig(cmd.argv)

    // retrieve dev server URL
    const basePrefix = (options.router && options.router.base) || '/'
    const nuxtUrl = new URL(
      path.join(basePrefix, cmd.argv['render-path'] as string),
      `http://${options.server!.host}:${options.server!.port}`
    )

    // resolve relative to working directory
    const laravelPath = path.resolve(
      process.cwd(),
      `${cmd.argv['laravel-path']}`
    )

    // try to start artisan serve from laravel path
    try {
      execa(
        'php',
        [
          'artisan',
          'serve',
          `--host=${
            nuxtUrl.hostname === 'localhost' ? '127.0.0.1' : nuxtUrl.hostname
          }`,
          `--port=${+nuxtUrl.port + 1}`
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
      throw String(`Failed to run command \`php artisan serve\`:\n${error}`)
    }

    // start dev server
    const devCmd = await commands.default('dev')
    await devCmd!.startDev(cmd, cmd.argv)
  }
}

export default config
