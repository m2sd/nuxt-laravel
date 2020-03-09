import path from 'path'
import dotenv from 'dotenv'
import { merge } from 'lodash'

import { Configuration } from '@nuxt/types'

import defaults, { swCacheDefaults } from './defaults'
import { moduleKey, nuxtOutputEnv } from './constants'

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

export const validateOptions = (
  options: Options
): options is Required<Omit<Options, 'outputPath'>> &
  Pick<Options, 'outputPath'> => {
  return (
    typeof options.root === 'string' &&
    typeof options.publicDir === 'string' &&
    (typeof options.server === 'boolean' ||
      (typeof options.server === 'object' &&
        typeof options.server.port === 'number')) &&
    (typeof options.swCache === 'boolean' ||
      (typeof options.swCache === 'object' &&
        typeof options.swCache.name === 'string')) &&
    typeof options.dotEnvExport === 'boolean'
  )
}

export const getConfiguration = (
  nuxtOptions: Configuration,
  overwrites?: Options
) => {
  const routerBase = (nuxtOptions.router && nuxtOptions.router.base) || '/'

  const options = merge({}, defaults, nuxtOptions.laravel, overwrites)

  if (!validateOptions(options)) {
    throw new Error('[nuxt-laravel] Invalid configuration')
  }

  const nuxt = {
    urlPath: path.posix.join(routerBase, moduleKey),
    routerPath: `/${moduleKey}`
  }

  const laravel = (() => {
    const laravelRoot = path.resolve(process.cwd(), options.root)
    const server =
      typeof options.server === 'object'
        ? options.server
        : options.server && nuxtOptions.server
        ? {
            host: nuxtOptions.server.host,
            port: +(nuxtOptions.server.port || 3000) + 1
          }
        : (false as false)

    if (
      server &&
      nuxtOptions.server &&
      server.host === nuxtOptions.server.host &&
      server.port === nuxtOptions.server.port
    ) {
      server.port = server.port + 1
    }

    return {
      root: laravelRoot,
      public: path.resolve(laravelRoot, options.publicDir),
      server
    }
  })()

  dotenv.config({ path: `${laravel.root}/.env` })
  const output = (() => {
    const outputPath = options.outputPath || process.env[nuxtOutputEnv]

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
    if (typeof options.swCache === 'boolean') {
      return options.swCache && swCacheDefaults
    }

    return merge(swCacheDefaults, options.swCache)
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
