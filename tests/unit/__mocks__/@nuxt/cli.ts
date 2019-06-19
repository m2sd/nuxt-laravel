import NuxtConfiguration from '@nuxt/config'

const cli = jest.requireActual('@nuxt/cli')
const config = jest.requireActual('@nuxt/config')

export const setup = cli.setup
export const commands = cli.commands
export const NuxtCommand = cli.NuxtCommand
export const loadNuxtConfig = cli.loadNuxtConfig

export const helpSpy = jest.fn()
export const versionSpy = jest.fn()
export const buildSpy = jest.fn().mockResolvedValue(undefined)
export const generateSpy = jest.fn().mockResolvedValue(undefined)

NuxtCommand.prototype.showHelp = helpSpy
NuxtCommand.prototype.showVersion = versionSpy
NuxtCommand.prototype.getBuilder = jest.fn().mockReturnValue({
  build: buildSpy
})
NuxtCommand.prototype.getGenerator = jest.fn().mockReturnValue({
  generate: generateSpy
})

export const configSpy = jest.spyOn(NuxtCommand.prototype, 'getNuxtConfig')

export const hookSpy = jest.fn()
export const readySpy = jest.fn().mockResolvedValue(undefined)
export const listenSpy = jest.fn().mockResolvedValue(undefined)

export const nuxtSpy = jest.fn((options: NuxtConfiguration) => ({
  hook: hookSpy,
  options: config.getNuxtConfig(options),
  ready: readySpy,
  server: {
    listen: listenSpy,
    listeners: [
      {
        url: '__listener_test__'
      }
    ]
  }
}))

export const imports = {
  ...cli.imports,
  core: jest.fn().mockResolvedValue({
    Nuxt: nuxtSpy
  })
}
