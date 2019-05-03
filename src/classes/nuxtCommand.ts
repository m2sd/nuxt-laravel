import { imports, NuxtCommand, NuxtCommandConfig } from '@nuxt/cli'
import NuxtConfiguration from '@nuxt/config'
import { NuxtConfigurationModule } from '@nuxt/config/types/module'
import { isArray } from 'lodash'

export interface NuxtLaravelCommandConfig
  extends NuxtCommandConfig<NuxtLaravelCommand> {
  addNuxtHook?: (name: string, handler: (...args: any) => void) => void
}

export interface NuxtLaravelCommand {
  cmd: NuxtLaravelCommandConfig
}

export class NuxtLaravelCommand extends NuxtCommand {
  public static readonly CONFIG_KEY = '__nuxt_laravel__'

  public static from(
    cmd: NuxtLaravelCommandConfig | NuxtLaravelCommand,
    _argv?: string[]
  ) {
    if (cmd instanceof NuxtLaravelCommand) {
      return cmd
    }
    return new NuxtLaravelCommand(cmd, _argv)
  }

  public static run(
    cmd: NuxtLaravelCommandConfig | NuxtLaravelCommand,
    _argv?: string[]
  ) {
    return NuxtLaravelCommand.from(cmd, _argv).run()
  }

  public constructor(cmd: NuxtLaravelCommandConfig, _argv?: string[]) {
    super(cmd, _argv)
  }

  public async getNuxt(options: NuxtConfiguration) {
    // get Nuxt from cli imports
    const { Nuxt } = await imports.core()

    // disable auto init
    options._ready = false
    const nuxt = new Nuxt(options)

    // apply nuxt hooks if they have been provided
    if (typeof this.cmd._nuxtHooks === 'object') {
      for (const name in this.cmd._nuxtHooks) {
        if (this.cmd._nuxtHooks.hasOwnProperty(name)) {
          for (const hook of this.cmd._nuxtHooks[name]) {
            nuxt.hook(name, hook)
          }
        }
      }
    }

    // initialize the nuxt instance
    await nuxt.ready()

    return nuxt
  }

  public async getNuxtConfig(extraOptions: NuxtConfiguration = {}) {
    // call original getNuxtConfig to retrieve options
    const options = await super.getNuxtConfig(extraOptions)

    // force spa mode
    options.mode = 'spa'

    // add axios module if it is not already present
    options.modules = options.modules || []
    if (
      !options.modules.find(
        (m: NuxtConfigurationModule) =>
          (isArray(m) && m[0] === '@nuxtjs/axios') || m === '@nuxtjs/axios'
      )
    ) {
      options.modules.push('@nuxtjs/axios')
    }

    return options
  }
}

export default NuxtLaravelCommand
