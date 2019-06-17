import fs from 'fs-extra'
import { isArray } from 'lodash'
import path from 'path'

import { commands } from '@nuxt/cli'
import { common, locking } from '@nuxt/cli/dist/cli-chunk3'

import { NuxtLaravelCommandConfig } from '../classes/nuxtCommand'

delete common.spa
delete common.universal

// tslint:disable-next-line:no-var-requires
require('dotenv').config()

const config: NuxtLaravelCommandConfig = {
  /* tslint:disable:object-literal-sort-keys */
  name: 'nuxt-laravel-build',
  description: 'Compiles the application for use with laravel backend',
  usage: 'laravel build <dir>',
  options: {
    ...common,
    ...locking,
    analyze: {
      alias: 'a',
      type: 'boolean',
      description: 'Launch webpack-bundle-analyzer to optimize your bundles',
      prepare(_, options, argv) {
        // Analyze option
        options.build = options.build || {}
        if (argv.analyze && typeof options.build.analyze !== 'object') {
          options.build.analyze = true
        }
      }
    },
    devtools: {
      type: 'boolean',
      default: false,
      description: 'Enable Vue devtools',
      prepare(_, options, argv) {
        options.vue = options.vue || {}
        options.vue.config = options.vue.config || {}
        if (argv.devtools) {
          options.vue.config.devtools = true
        }
      }
    },
    quiet: {
      alias: 'q',
      type: 'boolean',
      description: 'Disable output except for errors',
      prepare(_, options, argv) {
        // Silence output when using --quiet
        if (argv.quiet && options.build) {
          options.build.quiet = !!argv.quiet
        }
      }
    },
    delete: {
      default: true,
      type: 'boolean',
      description: 'Do not delete build files after generation',
      prepare: (cmd, _, argv) => {
        if (argv.delete) {
          // add hook to callect files to delete after generation
          cmd.cmd.addNuxtHook!('build:done', ({ options }) => {
            cmd.argv.delete = [path.resolve(options.rootDir, options.buildDir)]
          })
        }
      }
    },
    'file-path': {
      type: 'string',
      default: process.env.NUXT_URL || 'storage/app/index.html',
      description: 'Location for the SPA index file',
      prepare: (cmd, _, argv) => {
        // add hook to output index file
        cmd.cmd.addNuxtHook!('build:done', async ({ options, nuxt }) => {
          const { html } = await nuxt.server.renderRoute('/', {
            url: '/'
          })

          // resolve the file path relative to configured rootDir
          const destination = path.resolve(
            options.rootDir,
            `${argv['file-path']}`
          )

          // create directory if it does not exist
          const dir = path.dirname(destination)
          if (!fs.existsSync(dir)) {
            fs.mkdirpSync(dir)
          }

          fs.writeFileSync(destination, html, 'utf-8')
        })
      }
    },
    'public-path': {
      type: 'string',
      default: 'public',
      description: 'The folder where laravel serves assets from',
      prepare: (cmd, _, argv) => {
        if (argv['public-path']) {
          // add hook move built assets to public path
          cmd.cmd.addNuxtHook!('build:done', ({ options }) => {
            // resolve public root for static assets
            const publicRoot = path.resolve(
              options.rootDir,
              `${argv['public-path']}`
            )

            // resolve public path for compiled assets
            let assetsPath = ''
            if (options.router && options.router.base) {
              assetsPath = options.router.base.replace(/^\/$/g, '') + '/'
            }
            assetsPath += options.build.publicPath.replace(/^\//, '')
            const publicPath = path.resolve(
              publicRoot,
              assetsPath.replace(/^\//, '')
            )

            // create directory if it does not exist
            if (!fs.existsSync(publicPath)) {
              fs.mkdirpSync(publicPath)
            }

            // copy static assets to public root
            const staticDir = path.resolve(
              options.rootDir,
              options.srcDir,
              options.dir.static
            )
            if (fs.existsSync(staticDir)) {
              fs.copySync(staticDir, publicRoot)
            }

            // move compiled assets to public path
            fs.moveSync(
              path.resolve(options.rootDir, options.buildDir, 'dist', 'client'),
              publicPath,
              {
                overwrite: true
              }
            )
          })
        }
      }
    }
  },
  async run(cmd) {
    cmd.argv.generate = false

    const buildCmd = await commands.default('build')

    await buildCmd!.run!(cmd)

    if (cmd.argv.delete && isArray(cmd.argv.delete)) {
      cmd.argv.delete.forEach(delPath => {
        fs.removeSync(delPath)
      })
    }
  },
  addNuxtHook(name, handler) {
    this._nuxtHooks = this._nuxtHooks || {}
    this._nuxtHooks[name] = this._nuxtHooks[name] || []

    this._nuxtHooks[name].push(handler)
  }
  /* tslint:enable:object-literal-sort-keys */
}

export default config
