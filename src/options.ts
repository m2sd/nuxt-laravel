import path from 'path'
import dotenv from 'dotenv'
import { merge } from 'lodash'

import { Configuration } from '@nuxt/types'

import defaults from './defaults'
import { moduleKey } from './constants'

export interface Options {
  root?: string
  publicDir?: string
  outputPath?: string
  server?:
    | boolean
    | {
        host?: string
        port: number
      }
  swCache?:
    | boolean
    | {
        name: string
        fileName?: string
        endpoint?: string
      }
  dotEnvExport?: boolean
}

export const getConfiguration = (
  nuxtOptions: Configuration,
  overwrites?: Options
) => {
  const routerBase = (nuxtOptions.router && nuxtOptions.router.base) || '/'

  const options: Options = merge(defaults, nuxtOptions.laravel, overwrites)

  const nuxt = {
    urlPath: path.posix.join(routerBase, moduleKey),
    routerPath: `/${moduleKey}`
  }

  const laravel = (() => {
    const laravelRoot = path.resolve(process.cwd(), options.root || '')
    const server =
      typeof options.server === 'boolean' && options.server
        ? nuxtOptions.server
          ? {
              host: nuxtOptions.server.host,
              port: +(nuxtOptions.server.port || 3000) + 1
            }
          : (false as false)
        : options.server

    return {
      root: laravelRoot,
      public: path.resolve(laravelRoot, options.publicDir || 'public'),
      server
    }
  })()

  dotenv.config({ path: laravel.root })
  const output = (() => {
    const outputPath = process.env.NUXT_OUTPUT_PATH || options.outputPath

    return {
      src: path.join(laravel.root, moduleKey),
      dest: path.join(laravel.public, routerBase),
      fallback: `${routerBase.length > 1 ? 'index' : 'spa'}.html`,
      additional: outputPath
        ? path.resolve(laravel.root, outputPath)
        : (false as false)
    }
  })()

  const cache:
    | false
    | {
        name: string
        fileName: string
        endpoint: string
      } = (() => {
    const defaults = {
      name: moduleKey,
      fileName: 'workbox.cache.js',
      endpoint: `/${moduleKey}_cache`
    }

    if (typeof options.swCache === 'boolean') {
      if (options.swCache) {
        return defaults
      }

      return false
    }

    return merge(defaults, options.swCache)
  })()

  return {
    options,
    nuxt,
    laravel,
    output,
    cache,
    routerBase
  }
}

declare module '@nuxt/types' {
  export interface Configuration {
    laravel?: Options
  }
}
