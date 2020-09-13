import chalk from 'chalk'
import consola from 'consola'

import { NuxtConfig } from '@nuxt/types'

import { scope } from './constants'

export const logger = consola.withScope(scope)

export const addBadgeMessage = (
  options: NuxtConfig,
  enabled: boolean = true
) => {
  const status = enabled
    ? chalk.green.bold('enabled')
    : chalk.red.bold('disabled')

  options.cli!.badgeMessages.push(`Laravel support is ${status}`)
}

export const getModuleOptions = (
  options: NuxtConfig,
  moduleKey: string,
  optionsKey?: string
) => {
  if (options.modules) {
    const nuxtModule = options.modules.find(
      (m) => (Array.isArray(m) && m[0] === moduleKey) || m === moduleKey
    )

    if (nuxtModule) {
      const optKey = optionsKey || (moduleKey.split(/[-/]/).pop() as 'string')

      const moduleOptions = {
        ...options[optKey],
        ...((Array.isArray(nuxtModule) && nuxtModule[1]) || {}),
      }

      if (Object.keys(moduleOptions).length) {
        return moduleOptions
      }
    }
  }

  return null
}
