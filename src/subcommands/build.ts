import fs from 'fs-extra'
import path from 'path'

import { commands, NuxtCommandConfig, setup } from '@nuxt/cli'
import { common, locking } from '@nuxt/cli/dist/cli-chunk3'

import { NuxtCommand } from '../classes/nuxtCommand'

delete common.spa
delete common.universal

// tslint:disable-next-line:no-var-requires
require('dotenv').config()

const config: NuxtCommandConfig<NuxtCommand> = {
  name: 'nuxt-laravel-build',
  options: {
    ...common,
    ...locking,
    analyze: {
      alias: 'a',
      description: 'Launch webpack-bundle-analyzer to optimize your bundles',
      type: 'boolean',
      prepare(_, options, argv) {
        // Analyze option
        options.build = options.build || {}
        if (argv.analyze && typeof options.build.analyze !== 'object') {
          options.build.analyze = true
        }
      }
    },
    delete: {
      default: true,
      description: 'Do not delete build files after generation',
      prepare: (cmd, _, argv) => {
        if (argv.delete) {
          // add hook to delete build files after generation
          cmd.addNuxtHook!('generate:done', ({ options }) => {
            fs.removeSync(
              path.resolve(options.rootDir!, options.generate!.dir!)
            )
            fs.removeSync(path.resolve(options.rootDir!, options.buildDir!))
          })
        }
      },
      type: 'boolean'
    },
    devtools: {
      default: false,
      description: 'Enable Vue devtools',
      type: 'boolean',
      prepare(_, options, argv) {
        options.vue = options.vue || {}
        options.vue.config = options.vue.config || {}
        if (argv.devtools) {
          options.vue.config.devtools = true
        }
      }
    },
    'file-path': {
      default: process.env.NUXT_URL || 'storage/app/index.html',
      description: 'Location for the SPA index file',
      prepare: (cmd, _, argv) => {
        // add hook to output index file
        cmd.addNuxtHook!(
          'generate:done',
          async ({ options, nuxt }) => {
            const { html } = await nuxt.server.renderRoute('/', {
              url: '/'
            })

            // resolve the file path relative to configured rootDir
            const destination = path.resolve(
              options.rootDir!,
              `${argv['file-path']}`
            )

            // create directory if it does not exist
            const dir = path.dirname(destination)
            if (!fs.existsSync(dir)) {
              fs.mkdirpSync(dir)
            }

            fs.writeFileSync(destination, html, 'utf-8')
          },
          true
        )
      },
      type: 'string'
    },
    'public-path': {
      default: 'public',
      description: 'The folder where laravel serves assets from',
      prepare: (cmd, _, argv) => {
        // add hook move built assets to public path
        cmd.addNuxtHook!(
          'generate:done',
          ({ options }) => {
            const destination = path.resolve(
              path.resolve(options.rootDir!, `${argv['public-path']}`) +
                options.build!.publicPath
            )

            // create directory if it does not exist
            const dir = path.dirname(destination)
            if (!fs.existsSync(dir)) {
              fs.mkdirpSync(dir)
            }

            fs.moveSync(
              path.resolve(
                path.resolve(options.rootDir!, options.generate!.dir) +
                  options.build!.publicPath!
              ),
              destination,
              {
                overwrite: true
              }
            )
          },
          true
        )
      },
      type: 'string'
    },
    quiet: {
      alias: 'q',
      description: 'Disable output except for errors',
      type: 'boolean',
      prepare(_, options, argv) {
        // Silence output when using --quiet
        if (argv.quiet && options.build) {
          options.build.quiet = !!argv.quiet
        }
      }
    }
  },
  usage: 'laravel build <dir>',
  async run(cmd) {
    const buildCmd = await commands.default('build')

    setup({ dev: false })

    await buildCmd!.run!(cmd)
  }
}

export default config
