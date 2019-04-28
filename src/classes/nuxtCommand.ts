import {
  imports,
  NuxtCommand as _NuxtCommand,
  NuxtCommandConfig
} from '@nuxt/cli'
import NuxtConfiguration from '@nuxt/config'
import { NuxtConfigurationModule } from '@nuxt/config/types/module'
import { isArray } from 'lodash'

export interface NuxtLaravelHooks {
  [hook: string]: Array<(...args: any) => void | Promise<void>>
}

export type NuxtLaravelOverridesFunction = (
  cmd: NuxtCommand,
  options: NuxtConfiguration
) => NuxtConfiguration | Promise<NuxtConfiguration>

export interface NuxtCommand {
  cmd: NuxtCommandConfig<NuxtCommand>
}

export class NuxtCommand extends _NuxtCommand {
  public static readonly CONFIG_KEY = '__nuxt_laravel__'

  public static from(
    cmd: NuxtCommandConfig<NuxtCommand> | NuxtCommand,
    _argv?: string[]
  ) {
    if (cmd instanceof NuxtCommand) {
      return cmd
    }
    return new NuxtCommand(cmd, _argv)
  }
  public static run(
    cmd: NuxtCommandConfig<NuxtCommand> | NuxtCommand,
    _argv?: string[]
  ) {
    return NuxtCommand.from(cmd, _argv).run()
  }

  private _nuxtHooks?: NuxtLaravelHooks

  public constructor(cmd: NuxtCommandConfig<NuxtCommand>, _argv?: string[]) {
    super(cmd, _argv)

    this._nuxtHooks = {}
  }

  public async run() {
    // show help if called with invalid arguments
    if (!this.checkArgs!()) {
      this.showHelp()

      return
    }

    await super.run()
  }

  public async getNuxt(options: NuxtConfiguration) {
    // get Nuxt from cli imports
    const { Nuxt } = await imports.core()

    // disable auto init
    options._ready = false
    const nuxt = new Nuxt(options)

    // apply nuxt hooks if they have been provided
    if (this._nuxtHooks && typeof this._nuxtHooks === 'object') {
      for (const name in this._nuxtHooks) {
        if (this._nuxtHooks.hasOwnProperty(name)) {
          for (const hook of this._nuxtHooks[name]) {
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

  public addNuxtHook?(
    name: string,
    handler: (...args: any) => void,
    addBefore?: boolean
  ) {
    this._nuxtHooks![name] = this._nuxtHooks![name] || []

    if (addBefore) {
      this._nuxtHooks![name].unshift(handler)
    } else {
      this._nuxtHooks![name].push(handler)
    }
  }

  public checkArgs?() {
    // only allow one additional argument
    if (this.argv._.length > 1) {
      return false
    }

    // resolve acceptable aliases (flags)
    const allowedAliases = Object.values(this.cmd.options!).reduce(
      (aliases, option) => {
        if (option.alias) {
          aliases.push(option.alias)
        }

        return aliases
      },
      [] as string[]
    )

    // resolve acceptable argv keys from options and aliases
    const allowedOptions = [
      '_',
      ...Object.keys(this.cmd.options!),
      ...allowedAliases
    ]

    // returns false if argv contains additional options
    return !Object.keys(this.argv).filter(key => !allowedOptions.includes(key))
      .length
  }
}

export default NuxtCommand
