import chalk from 'chalk'

import { Configuration } from '@nuxt/types'

import { addBadgeMessage, getModuleOptions } from '../../src/utils'

describe('test utility functions', () => {
  describe('addBadgeMessage()', () => {
    const options: Configuration = {
      cli: {
        badgeMessages: [],
        bannerColor: 'white'
      }
    }

    beforeEach(() => {
      options.cli!.badgeMessages = []
    })

    test('Adds enabled message', () => {
      addBadgeMessage(options)

      expect(options.cli!.badgeMessages[0]).toBe(
        `Laravel support is ${chalk.green.bold('enabled')}`
      )
    })

    test('Adds disabled message', () => {
      addBadgeMessage(options, false)

      expect(options.cli!.badgeMessages[0]).toBe(
        `Laravel support is ${chalk.red.bold('disabled')}`
      )
    })
  })

  describe('getModuleOptions()', () => {
    const options: Configuration = {
      modules: [
        'test-empty',
        [
          'test-module',
          {
            test: 'config'
          }
        ],
        'test-global',
        'test-custom',
        [
          'test-merge',
          {
            overwrite: 'direct',
            direct: 'config'
          }
        ]
      ],

      global: {
        global: 'config'
      },

      customKey: {
        custom: 'config'
      },

      merge: {
        overwrite: 'global',
        global: 'config'
      }
    }

    test('returns `null` if nuxt config has no modules property', () => {
      expect(getModuleOptions({}, 'anything')).toBe(null)
    })

    test('returns `null` for missing module', () => {
      expect(getModuleOptions(options, 'test-missing')).toBe(null)
    })

    test('returns `null` for missing module with specified global config', () => {
      expect(getModuleOptions(options, 'test-missing', 'customKey')).toBe(null)
    })

    test('returns `null` for module with empty configuration', () => {
      expect(getModuleOptions(options, 'test-empty')).toBe(null)
    })

    test('returns direct configuration', () => {
      expect(getModuleOptions(options, 'test-module')).toEqual({
        test: 'config'
      })
    })

    test('returns global configuration resolved automatically', () => {
      expect(getModuleOptions(options, 'test-global')).toEqual({
        global: 'config'
      })
    })

    test('returns global configuration specified manually', () => {
      expect(getModuleOptions(options, 'test-custom', 'customKey')).toEqual({
        custom: 'config'
      })
    })

    test('returns merged config if both direct and global configuration is present', () => {
      expect(getModuleOptions(options, 'test-merge')).toEqual({
        overwrite: 'direct',
        direct: 'config',
        global: 'config'
      })
    })
  })
})
