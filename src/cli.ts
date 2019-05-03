import execa from 'execa'
import { existsSync } from 'fs-extra'

import { setup } from '@nuxt/cli'

import NuxtCommand, { NuxtLaravelCommandConfig } from './classes/nuxtCommand'

const _commands: {
  [command: string]: () => Promise<{
    default: NuxtLaravelCommandConfig
  }>
} = {
  build: () => Promise.resolve(require('./subcommands/build')),
  dev: () => Promise.resolve(require('./subcommands/dev'))
}

const getCommand = async (name?: string) => {
  if (!name || !_commands[name]) {
    return Promise.resolve(null)
  }

  return (await _commands[name]()).default
}

export const run = async (_argv?: string[]) => {
  // Read from process.argv
  const argv = _argv ? Array.from(_argv) : process.argv.slice(2)

  // Check for internal command
  let cmd = await getCommand(argv[0])

  // Matching `nuxt` or `nuxt [dir]` or `nuxt -*` for `nuxt dev` shortcut
  if (!cmd && (!argv[0] || argv[0][0] === '-' || existsSync(argv[0]))) {
    argv.unshift('dev')
    cmd = await getCommand('dev')
  }

  // Setup env
  setup({ dev: argv[0] === 'dev' })

  // Try internal command
  if (cmd) {
    return NuxtCommand.run(cmd, argv.slice(1))
  }

  // Try external command
  try {
    await execa(`nuxt-laravel-${argv[0]}`, argv.slice(1), {
      stderr: process.stderr,
      stdin: process.stdin,
      stdout: process.stdout
    })
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw String(`Command not found: nuxt-laravel-${argv[0]}`)
    }
    throw String(`Failed to run command \`nuxt-laravel-${argv[0]}\`:\n${error}`)
  }
}

export const NuxtLaravelCommand = NuxtCommand
export const commands = /*#__PURE__*/ Object.freeze({
  default: getCommand
})
export default run
