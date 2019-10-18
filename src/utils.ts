import chalk from 'chalk'
import consola from 'consola'

import { Configuration } from '@nuxt/types'

import { scope } from './constants'

export const logger = consola.withScope(scope)

export const addBadgeMessage = (
  options: Configuration,
  enabled: boolean = true
) => {
  const status = enabled
    ? chalk.green.bold('enabled')
    : chalk.red.bold('disabled')

  options.cli!.badgeMessages.push(`Laravel support is ${status}`)
}
