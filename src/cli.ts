import { NuxtCommandConfig } from '@nuxt/cli'

import { NuxtCommand } from './classes/nuxtCommand'

export const commands: {
  [command: string]: () => NuxtCommandConfig<NuxtCommand>
} = {
  build: () => require('./subcommands/build').default,
  dev: () => require('./subcommands/dev').default
}

export const getCommand = (name?: string) => {
  if (!name || !commands[name]) {
    return commands.dev()
  }

  return commands[name]()
}

export const run = () => {
  const argv = process.argv.slice(2)

  const cmd = getCommand(argv[0])

  if (Object.keys(commands).includes(argv[0])) {
    argv.shift()
  }

  return NuxtCommand.run(cmd, argv)
}

export const NuxtLaravelCommand = NuxtCommand
