import path from 'path'
import { Configuration } from '@nuxt/types'

import defaults, { swCacheDefaults } from '../../src/defaults'
import { moduleKey } from '../../src/constants'
import { getConfiguration, Options } from '../../src/options'

describe('getConfiguration() method', () => {
  describe('default behavior', () => {
    const testHost = 'test'
    const config = getConfiguration({
      server: {
        host: testHost
      }
    })

    test("routerBase is set to `'/'`", () => {
      expect(config.routerBase).toEqual('/')
    })

    test('option defaults are applied', () => {
      expect(config.options).toEqual(defaults)
    })

    test('nuxt property is configured correctly', () => {
      expect(config.nuxt).toMatchObject({
        routerPath: `/${moduleKey}`,
        urlPath: `/${moduleKey}`
      })
    })

    test('laravel property is configured correctly', () => {
      expect(config.laravel).toMatchObject({
        root: process.cwd(),
        public: `${config.laravel.root}/public`,
        server: expect.objectContaining({
          host: testHost,
          port: 3001
        })
      })
    })

    test('output property is configured correctly', () => {
      expect(config.output).toMatchObject({
        src: `${config.laravel.root}/${moduleKey}`,
        dest: `${config.laravel.public}/`,
        fallback: 'spa.html',
        additional: false
      })
    })

    test('cache helper is disabled', () => {
      expect(config.cache).toBeFalsy()
    })

    test('direct configuration overwrites nuxt config property', () => {
      const config = getConfiguration(
        {
          laravel: {
            root: 'test'
          }
        },
        { root: 'testOverwrite' }
      )

      expect(config.laravel.root).toMatch(/testOverwrite$/)
    })
  })

  describe('respects relevant nuxt configuration values', () => {
    test('nuxtConfig.router.base', () => {
      const testBase = '/test/'
      const config = getConfiguration({
        router: {
          base: testBase
        }
      })

      expect(config.routerBase).toBe(testBase)
      expect(config.nuxt.urlPath).toEqual(`${testBase}${moduleKey}`)
      expect(config.output).toMatchObject({
        dest: `${config.laravel.public}${testBase}`,
        fallback: 'index.html'
      })
    })

    test('nuxtConfig.server', () => {
      const testHost = 'test'
      const testPort = 10
      const config = getConfiguration({
        server: {
          host: testHost,
          port: testPort
        }
      })

      expect(config.laravel).toMatchObject({
        server: {
          host: testHost,
          port: testPort + 1
        }
      })
    })

    describe('nuxtConfig.laravel', () => {
      const executeWithConfig = (
        laravel: Options,
        additional?: Configuration
      ) => getConfiguration({ laravel, ...additional })

      describe('root configuration', () => {
        const testRootDependentSettings = (
          config: ReturnType<typeof getConfiguration>,
          expected: string
        ) => {
          expect(config.laravel.root).toBe(expected)
          expect(config.laravel.public).toBe(`${expected}/public`)
          expect(config.output.src).toBe(`${expected}/${moduleKey}`)
          expect(config.output.dest).toBe(`${expected}/public/`)
        }

        test('resolves path relative to `process.cwd()`', () => {
          const expected = path.resolve(process.cwd(), '../test')
          const config = executeWithConfig({ root: '../test' })

          testRootDependentSettings(config, expected)
        })

        test('accepts absolute path', () => {
          const config = executeWithConfig({ root: '/test' })

          testRootDependentSettings(config, '/test')
        })

        test('throws with invalid value', () => {
          expect(() => {
            executeWithConfig({ root: null as any })
          }).toThrow()
        })
      })

      describe('publicDir configuration', () => {
        const testPublicDirDependentSettings = (
          config: ReturnType<typeof getConfiguration>,
          expected: string
        ) => {
          expect(config.laravel.public).toBe(expected)
          expect(config.output.dest).toBe(`${expected}/`)
        }

        test('resolves path relative to `config.root`', () => {
          const config = executeWithConfig({
            root: '/root/test',
            publicDir: '../publicTest'
          })

          testPublicDirDependentSettings(config, '/root/publicTest')
        })

        test('accepts absolute path', () => {
          const expected = '/publicTest'

          const config = executeWithConfig({ publicDir: expected })

          testPublicDirDependentSettings(config, expected)
        })

        test('throws with invalid value', () => {
          expect(() => {
            executeWithConfig({ publicDir: null as any })
          }).toThrow()
        })
      })

      describe('outputPath configuration', () => {
        test('resolves path relative to `config.root`', () => {
          const config = executeWithConfig({
            root: '/root/test',
            outputPath: '../outputTest.html'
          })

          expect(config.output.additional).toBe('/root/outputTest.html')
        })

        test('accepts absolute path', () => {
          const expected = '/outputTest'
          const config = executeWithConfig({
            outputPath: expected
          })

          expect(config.output.additional).toBe(expected)
        })

        test('output defaults to .env setting', () => {
          const config = executeWithConfig({
            root: 'tests/fixture/dotEnvOverride'
          })

          expect(config.output.additional).toBe('/outputTestOverwritten')
        })
      })

      describe('server configuration', () => {
        const server = { host: 'test', port: 10 }

        test('setting to `false` disables dev server', () => {
          const config = executeWithConfig({ server: false }, { server })

          expect(config.laravel.server).toBe(false)
        })

        test('overrides nuxtConfig settings', () => {
          const config = executeWithConfig(
            { server: { host: 'other', port: 15 } },
            { server }
          )

          expect(config.laravel.server).toMatchObject({
            host: 'other',
            port: 15
          })
        })

        test('avoids conflicting ports', () => {
          const config = executeWithConfig({ server }, { server })

          expect(config.laravel.server).toMatchObject({
            host: 'test',
            port: 11
          })
        })

        test('throws with invalid value', () => {
          expect(() => {
            executeWithConfig({ server: null as any })
          }).toThrow()

          expect(() => {
            executeWithConfig({ server: {} as any })
          }).toThrow()

          expect(() => {
            executeWithConfig({ server: { port: 'test' as any } })
          }).toThrow()
        })
      })

      describe('swCache configuration', () => {
        test('setting to `true` activates default configuration', () => {
          const config = executeWithConfig({ swCache: true })

          expect(config.cache).toMatchObject(swCacheDefaults)
        })

        test('defaults are merged with custom configuration', () => {
          expect(
            executeWithConfig({ swCache: { name: 'test' } }).cache
          ).toMatchObject({
            ...swCacheDefaults,
            name: 'test'
          })

          expect(
            executeWithConfig({ swCache: { name: 'test', endpoint: '/test' } })
              .cache
          ).toMatchObject({
            ...swCacheDefaults,
            name: 'test',
            endpoint: '/test'
          })

          expect(
            executeWithConfig({
              swCache: { name: 'test', fileName: 'test.cache.js' }
            }).cache
          ).toMatchObject({
            ...swCacheDefaults,
            name: 'test',
            fileName: 'test.cache.js'
          })
        })

        test('throws with invalid value', () => {
          expect(() => {
            executeWithConfig({ swCache: null as any })
          }).toThrow()

          expect(() => {
            executeWithConfig({ swCache: {} as any })
          }).toThrow()

          expect(() => {
            executeWithConfig({ swCache: { name: 10 as any } })
          }).toThrow()
        })
      })

      describe('devEnvExport flag', () => {
        test('throws with invalid value', () => {
          expect(() => {
            executeWithConfig({ dotEnvExport: null as any })
          }).toThrow()
        })
      })
    })
  })
})
