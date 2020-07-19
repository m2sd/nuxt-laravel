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
  devServer?: boolean
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

type ValidOptions = Required<Omit<Options, 'outputPath'>> &
  Pick<Options, 'outputPath'>

type CacheConfig =
  | false
  | {
      name: string
      fileName: string
      endpoint: string
    }

interface NuxtConfig {
  routerBase: string
  urlPath: string
  routerPath: string
}

interface LaravelConfig {
  root: string
  public: string
  server:
    | false
    | {
        host?: string
        port: number
      }
}

interface OutputConfig {
  src: string
  dest: string
  indexPath: false | string
  fallback: string
}

export interface ModuleConfig {
  options: ValidOptions
  nuxt: NuxtConfig
  laravel: LaravelConfig
  cache: CacheConfig
  output: OutputConfig
}

const validateOptions = (options: Options): options is ValidOptions => {
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

const resolveNuxtConfig: (nuxt: Configuration) => NuxtConfig = nuxt => {
  const routerBase = (nuxt.router && nuxt.router.base) || '/'

  return {
    routerBase,
    urlPath: path.posix.join(routerBase, moduleKey),
    routerPath: `/${moduleKey}`,
  }
}

const resolveLaravelConfig: (
  options: ValidOptions,
  nuxt: Configuration
) => LaravelConfig = (options, nuxt) => {
  const laravelRoot = path.resolve(process.cwd(), options.root)
  const server =
    typeof options.server === 'object'
      ? options.server
      : options.server && nuxt.server
      ? {
          host: nuxt.server.host,
          port: +(nuxt.server.port || 3000) + 1,
        }
      : false

  if (
    server &&
    nuxt.server &&
    server.host === nuxt.server.host &&
    server.port === nuxt.server.port
  ) {
    server.port = server.port + 1
  }

  return {
    root: laravelRoot,
    public: path.resolve(laravelRoot, options.publicDir),
    server,
  }
}

const resolveOutputConfig: (
  options: ValidOptions,
  laravel: LaravelConfig,
  nuxt: NuxtConfig,
  nuxtFallback?: string | boolean
) => OutputConfig = (options, laravel, nuxt, nuxtFallback) => {
  const outputPath = process.env[nuxtOutputEnv] || options.outputPath
  const dest = path.join(laravel.public, nuxt.routerBase)
  const fallback = path.join(
    dest,
    typeof nuxtFallback === 'string'
      ? nuxtFallback
      : nuxtFallback
      ? '404.html'
      : '200.html'
  )

  return {
    src: path.join(laravel.root, moduleKey),
    dest,
    indexPath:
      outputPath && outputPath !== fallback
        ? path.resolve(laravel.root, outputPath)
        : false,
    fallback,
  }
}

const resolveCacheConfig: (options: ValidOptions) => CacheConfig = options => {
  if (typeof options.swCache === 'boolean') {
    return options.swCache && swCacheDefaults
  }

  return merge(swCacheDefaults, options.swCache)
}

export const getConfiguration: (
  nuxtOptions: Configuration,
  overwrites?: Options
) => ModuleConfig = (nuxtOptions, overwrites) => {
  const options = merge({}, defaults, nuxtOptions.laravel, overwrites)

  if (!validateOptions(options)) {
    throw new Error('[nuxt-laravel] Invalid configuration')
  }

  const nuxt = resolveNuxtConfig(nuxtOptions)
  const laravel = resolveLaravelConfig(options, nuxtOptions)
  const cache = resolveCacheConfig(options)

  dotenv.config({ path: `${laravel.root}/.env` })
  const output = resolveOutputConfig(
    options,
    laravel,
    nuxt,
    nuxtOptions.generate && nuxtOptions.generate.fallback
  )

  return {
    options,
    nuxt,
    laravel,
    cache,
    output,
  }
}
