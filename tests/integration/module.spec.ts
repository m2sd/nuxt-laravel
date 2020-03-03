import chalk from 'chalk'
import { resolve } from 'path'
import { setup, loadConfig } from '@nuxtjs/module-test-utils'

import { Configuration } from '@nuxt/types'

import { logger } from '../../src/utils'

const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {})
const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {})

describe('module tests', () => {
  describe('validation', () => {
    let nuxt: any
    const disabledMessage = `Laravel support is ${chalk.red.bold('disabled')}`

    const setNuxt = async (options?: Configuration) => {
      nuxt = (
        await setup(loadConfig(resolve(__dirname, '..'), null, options || {}))
      ).nuxt
    }

    afterEach(async () => {
      expect(nuxt.options.cli).toBeDefined()

      expect(nuxt.options.cli.badgeMessages).toContain(disabledMessage)

      await nuxt.close()
      nuxt = null
    })

    test('disabled with warning message for mode `universal`', async () => {
      await setNuxt({ mode: 'universal' })

      expect(warnSpy).toHaveBeenCalledWith(
        `nuxt-laravel currently only supports 'spa' mode`
      )
    }, 60000)

    test('disabled with error message for missing `artisan` executable', async () => {
      await setNuxt()

      expect(errorSpy).toHaveBeenCalledWith(
        `Unable to find 'artisan' executable in Laravel path: ${process.cwd()}`
      )
    }, 60000)

    test('disbaled with error message for missing `public` dir', async () => {
      const root = resolve(__dirname, '../fixture')
      await setNuxt({ laravel: { root } })

      expect(errorSpy).toHaveBeenCalledWith(
        `Unable to find Laravel public dir: ${root}/public`
      )
    }, 60000)
  })

  describe.skip('implementation', () => {})
})
