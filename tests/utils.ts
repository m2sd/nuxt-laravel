import { isArray, merge } from 'lodash'

import {
  configSpy,
  loadNuxtConfig,
  NuxtCommandConfig,
  nuxtSpy
} from '@nuxt/cli'
import NuxtConfiguration from '@nuxt/config'

import NuxtLaravelCommand from '../src/classes/NuxtCommand'

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
    nuxtConfig = nuxtConfig || {}
  } else {
    argv = []
    nuxtConfig = _argv
  }

  cmdConfig._nuxtHooks = undefined
  const cmd = NuxtLaravelCommand.from(cmdConfig, argv)

  configSpy.mockImplementation(async extraOptions => {
    const config = await loadNuxtConfig(cmd.argv)
    merge(config, nuxtConfig)
    const options = Object.assign(config, extraOptions)

    for (const name of Object.keys(cmd.cmd.options!)) {
      if (cmd.cmd.options![name].prepare) {
        cmd.cmd.options![name].prepare!(cmd, options, cmd.argv)
      }
    }

    return options
  })

  await cmd.run()

  if (!nuxtSpy.mock.results[0] || nuxtSpy.mock.results[0].type !== 'return') {
    return
  }

  return nuxtSpy.mock.results[0].value.options
}
