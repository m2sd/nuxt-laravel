import NuxtCommand from '../../../src/classes/NuxtCommand'
import { commands } from '../../../src/cli'

describe('NuxtCommand class', () => {
  test('from returns identity if called with existing instance', async () => {
    const testConfig = await commands.default('dev')

    const cmd = NuxtCommand.from(testConfig!, [])
    const test = NuxtCommand.from(cmd)

    expect(test).toEqual(cmd)
  })

  describe('getNuxtConfig()', () => {
    describe('returns config containing correct defaults', () => {
      let cmd: NuxtCommand | undefined

      afterEach(async () => {
        const config = await cmd!.getNuxtConfig()
        expect(config).toBeDefined()
        expect(config).toEqual(
          expect.objectContaining({
            mode: 'spa',
            modules: expect.arrayContaining(['@nuxtjs/axios'])
          })
        )

        cmd = undefined
      })

      test('for dev command', async () => {
        const cmdConf = await commands.default('dev')
        cmd = NuxtCommand.from(cmdConf!)
      })

      test('for build command', async () => {
        const cmdConf = await commands.default('build')
        cmd = NuxtCommand.from(cmdConf!)
      })
    })
  })
})
