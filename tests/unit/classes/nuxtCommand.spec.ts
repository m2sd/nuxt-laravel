import NuxtConfiguration from '@nuxt/config'

import { NuxtCommand } from '../../../src/classes/nuxtCommand'
import { commands } from '../../../src/cli'

describe('NuxtCommand class', () => {
  test('from returns identity if called with existing instance', () => {
    const cmd = NuxtCommand.from(commands.dev(), [])
    const test = NuxtCommand.from(cmd)

    expect(test).toEqual(cmd)
  })

  describe('getNuxtConfig()', () => {
    describe('returns config containing correct defaults', () => {
      let config: NuxtConfiguration | undefined
      afterEach(() => {
        expect(config).toBeDefined()
        expect(config).toEqual(
          expect.objectContaining({
            mode: 'spa',
            modules: expect.arrayContaining(['@nuxtjs/axios'])
          })
        )

        config = undefined
      })

      test('for dev command', async () => {
        const cmd = NuxtCommand.from(commands.dev())

        config = await cmd.getNuxtConfig()
      })

      test('for build command', async () => {
        const cmd = NuxtCommand.from(commands.build())

        config = await cmd.getNuxtConfig()
      })
    })
  })
})
