import { isArray, merge } from 'lodash'

import { configSpy, NuxtCommand, NuxtCommandConfig, nuxtSpy } from '@nuxt/cli'
import NuxtConfiguration from '@nuxt/config'

import NuxtLaravelCommand from '../src/classes/nuxtCommand'

export type CommandSimulator = (
  argv?: string[] | NuxtConfiguration,
  nuxtConf?: NuxtConfiguration
) => Promise<NuxtConfiguration | undefined>

export const createCommandSimulator = (cmdConfig: NuxtCommandConfig) => async (
  _argv: string[] | NuxtConfiguration = [],
  nuxtConfig?: NuxtConfiguration
) => {
  let argv: string[]

  if (isArray(_argv)) {
    argv = _argv
  } else {
    argv = []
    nuxtConfig = _argv
  }

  cmdConfig._nuxtHooks = {}
  const cmd = NuxtLaravelCommand.from(cmdConfig, argv)

  if (nuxtConfig) {
    configSpy.mockImplementationOnce(async extraOptions => {
      merge(extraOptions, nuxtConfig)

      const resolved = await NuxtCommand.prototype.getNuxtConfig.apply(cmd, [
        extraOptions
      ])

      return resolved
    })
  }

  await cmd.run()

  if (!nuxtSpy.mock.results[0] || nuxtSpy.mock.results[0].type !== 'return') {
    return
  }

  return nuxtSpy.mock.results[0].value.options
}
