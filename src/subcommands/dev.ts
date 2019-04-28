import execa from 'execa'
import { isArray, mergeWith } from 'lodash'
import path from 'path'
import { URL } from 'url'

import { commands, NuxtCommandConfig, setup } from '@nuxt/cli'
import { common, server } from '@nuxt/cli/dist/cli-chunk3'
import { NuxtConfigurationRouter } from '@nuxt/config/types/router'

import { NuxtCommand } from '../classes/nuxtCommand'

delete common.spa
delete common.universal

const config: NuxtCommandConfig<NuxtCommand> = {
  description:
    'Start nuxt dev server for the frontend and laravel dev server for backend',
  name: 'nuxt-laravel-dev',
  options: {
    ...common,
    ...server,
    'laravel-path': {
      default: process.cwd(),
      description: 'Path to laravel directory',
      type: 'string'
    },
    open: {
      alias: 'o',
      description: 'Opens the server listeners url in the default browser',
      type: 'boolean'
    },
    'render-path': {
      default: `/${NuxtCommand.CONFIG_KEY}`,
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
          const index = routes.find(
            // First, check if there is an unnamed route
            // Then, check if there's a route at /
            // Finally, check for a name with first segment index
            route =>
              route.name === '' ||
              route.path === '/' ||
              !!(route.name && route.name.match(/^index/))
          )

          // add a copy of the index route
          // on the specified render path
          routes.push(
            Object.assign({}, index, {
              name: NuxtCommand.CONFIG_KEY,
              path: argv['render-path']
            })
          )
        }

        const overrides: typeof options = {
          // use @nuxtjs/proxy module
          axios: {
            proxy: true
          },
          // proxy all calls except the render path to laravel
          proxy: [
            [
              ['**/*', `!${argv['render-path']}`],
              {
                target: `http://${options.server!.host}:${+options.server!
                  .port! + 1}`
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
  usage: 'laravel dev <dir>',
  async run(cmd) {
    // get default dev command
    const devCmd = await commands.default('dev')

    // setup environment for development
    setup({ dev: true })

    // start dev server
    const nuxt = await devCmd!.startDev(cmd, cmd.argv)

    // retrieve dev server URL
    const nuxtUrl = new URL(
      cmd.argv['render-path'] as string,
      `http://${nuxt.options.server.host}:${nuxt.options.server.port}`
    )

    // resolve relative to working directory
    const laravelPath = path.resolve(
      process.cwd(),
      `${cmd.argv['laravel-path']}`
    )

    // try to start artisan serve from laravel path
    try {
      await execa(
        'php',
        [
          'artisan',
          'serve',
          `--host=${nuxtUrl.hostname}`,
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
  }
}

export default config
