declare module '@nuxt/cli' {
  import NuxtConfiguration from '@nuxt/config'

  export interface NuxtCommandConfigOptions<
    C extends NuxtCommand = NuxtCommand
  > {
    [key: string]: {
      alias?: string
      type: string
      description?: string
      default?: any
      prepare?: (
        cmd: C,
        options: NuxtConfiguration,
        argv: NuxtCommandArguments
      ) => void
    }
  }

  export interface NuxtCommandConfig<C extends NuxtCommand = NuxtCommand> {
    name: string
    usage?: string
    description?: string
    options?: NuxtCommandConfigOptions<C>
    run?: (cmd: C) => Promise<void>
    [property: string]: any
  }

  export interface NuxtCommandArguments {
    _: string[]
    [key: string]: string[] | boolean | string | object
    'public-path':
      | string
      | {
          publicRoot: string
          assetsRoot: string
          staticAssets: string
          compiledAssets: string
        }
  }

  export abstract class NuxtCommand {
    public static run(
      cmd: NuxtCommandConfig | NuxtCommand,
      _argv?: string[]
    ): Promise<void>
    public static from(
      cmd: NuxtCommandConfig | NuxtCommand,
      _argv?: string[]
    ): NuxtCommand

    public cmd: NuxtCommandConfig
    public argv: NuxtCommandArguments

    protected _argv: string[]
    protected _parsedArgv?: NuxtCommandArguments

    public constructor(cmd: NuxtCommandConfig, argv?: string[])
    public run(): Promise<void>

    public showVersion(): void
    public showHelp(): void

    public getNuxtConfig(
      extraOptions?: NuxtConfiguration
    ): Promise<NuxtConfiguration>

    public getNuxt(options: NuxtConfiguration): Promise<any>
    public getBuilder(nuxt: any): Promise<any>
    public getGenerator(nuxt: any): Promise<any>

    public setLock(lockRelease: () => Promise<void>): Promise<void>
    public releaseLock(): Promise<void>

    public isUserSuppliedArg(option: string): boolean
  }

  export const imports: {
    [module: string]: () => Promise<any>
  }
  export const commands: {
    default(command: string): Promise<NuxtCommandConfig | null>
  }

  export const setup: (config: NuxtConfiguration) => void
  export const loadNuxtConfig: (
    argv: NuxtCommandArguments
  ) => Promise<NuxtConfiguration>

  export const run: (_argv?: string[]) => Promise<undefined>
}
