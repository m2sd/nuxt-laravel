import execa from 'execa'
import { defaultsDeep, merge } from 'lodash'
import { URL } from 'url'

import {
  buildSpy,
  listenSpy,
  loadNuxtConfig,
  nuxtSpy,
  readySpy
} from '@nuxt/cli'
import NuxtConfiguration from '@nuxt/config'
import { NuxtConfigurationModule } from '@nuxt/config/types/module'
import { NuxtConfigurationRouter } from '@nuxt/config/types/router'

import NuxtCommand from '../../../src/classes/nuxtCommand'
import dev from '../../../src/subcommands/dev'
import { CommandSimulator, createCommandSimulator } from '../../utils'

jest.mock('execa')

const cwd = process.cwd()

describe('nuxt laravel dev', () => {
  let options: NuxtConfiguration | undefined
  let commandSimulator: CommandSimulator

  const reset = () => {
    defineExpected()
    options = undefined
    jest.clearAllMocks()
  }

  beforeAll(async () => {
    commandSimulator = await createCommandSimulator(dev)
    defineExpected()
  })

  test('throws error if laravel can not be found', async () => {
    const testError = '__ERROR__'

    execa.mockImplementationOnce(() => {
      throw testError
    })

    try {
      await commandSimulator()
    } catch (error) {
      expect(error).toBe(
        `Failed to run command \`php artisan serve\`:\n${testError}`
      )
    }

    expect(nuxtSpy).not.toHaveBeenCalled()

    reset()
  })

  describe('full run', () => {
    beforeAll(async () => {
      options = await commandSimulator()
    })

    afterAll(() => {
      reset()
    })

    test('starts laravel artisan testserver', () => {
      laravelTest()
    })

    test('starts server and builds', () => {
      expect(nuxtSpy).toHaveBeenCalledTimes(1)
      expect(readySpy).toHaveBeenCalledTimes(2)
      expect(listenSpy).toHaveBeenCalledTimes(1)
      expect(buildSpy).toHaveBeenCalledTimes(1)
    })

    describe('options test', () => {
      test('options are set', () => {
        expect(options).toBeDefined()
      })

      test('environment settings are correct', () => {
        expect(options!.dev).toBe(true)
        expect(options!.mode).toBe('spa')
      })

      test('axios is setup for proxy', () => {
        expect(options!.axios).toBeDefined()
        expect(options!.axios).toEqual(
          expect.objectContaining({
            proxy: true
          })
        )
      })

      test('proxy setup is correct', () => {
        proxyTest(options!)
      })

      test('server config is correct', () => {
        serverTest(options!)
      })

      describe('extendRoutes', () => {
        let extendRoutes: NuxtConfigurationRouter['extendRoutes']

        test('extendRoutes is present', () => {
          expect(options!.router).toBeDefined()
          expect(options!.router).toEqual(
            expect.objectContaining({
              extendRoutes: expect.any(Function)
            })
          )

          extendRoutes = options!.router!.extendRoutes
        })

        test('resolves unnamed route', () => {
          extendRoutesTest(extendRoutes)
        })

        test('resolves root path', () => {
          extendRoutesTest(extendRoutes, { path: '/' })
        })

        test('resolves route with name "index"', () => {
          extendRoutesTest(extendRoutes, { name: 'index' })
        })

        test('resolves route with name "index-locale"', () => {
          extendRoutesTest(extendRoutes, { name: 'index-locale' })
        })

        test('throws if index could not be resolved', () => {
          try {
            extendRoutesTest(extendRoutes, { path: '/subpage' })
          } catch (error) {
            expect(error).toBe('Unable to resolve index route')
          }
        })
      })
    })
  })

  describe('test cli arguments', () => {
    afterEach(() => {
      expect(options).toBeDefined()

      proxyTest(options!)
      serverTest(options!)
      laravelTest()

      options = undefined
      jest.clearAllMocks()
    })

    describe('changes server host', () => {
      beforeAll(() => {
        defineExpected({
          server: {
            host: '__test_host__'
          }
        })
      })

      afterAll(() => {
        defineExpected()
      })

      test('with option --hostname', async () => {
        options = await commandSimulator(['--hostname', expected.server.host])
      })

      test('with flag -H', async () => {
        options = await commandSimulator(['-H', expected.server.host])
      })
    })

    describe('changes server port', () => {
      beforeAll(() => {
        defineExpected({
          server: {
            port: 1234
          }
        })
      })

      afterAll(() => {
        defineExpected()
      })

      test('with option --port', async () => {
        options = await commandSimulator(['--port', expected.server.port])
      })

      test('with flag -p', async () => {
        options = await commandSimulator(['-p', expected.server.port])
      })
    })

    describe('changes render path', () => {
      beforeAll(() => {
        defineExpected({
          server: {
            path: '/__render_path_test__'
          }
        })
      })

      afterAll(() => {
        defineExpected()
      })

      test('with option --render-path', async () => {
        options = await commandSimulator([
          '--render-path',
          expected.server.path
        ])
      })
    })

    describe('changes laravel path', () => {
      beforeAll(() => {
        defineExpected({
          laravel: {
            path: '/test/path/to/laravel'
          }
        })
      })

      afterAll(() => {
        defineExpected()
      })

      test('with option --laravel-path', async () => {
        options = await commandSimulator([
          '--laravel-path',
          expected.laravel.path
        ])
      })
    })
  })

  describe.skip('test with simulated nuxt.config', () => {
    afterEach(() => {
      reset()
    })

    test('respects router.base setting', async () => {
      defineExpected({
        server: {
          path: `/test/path/${NuxtCommand.CONFIG_KEY}`
        }
      })

      const config = {
        router: {
          base: '/test/path/'
        }
      }
      ;(loadNuxtConfig as jest.Mock).mockImplementationOnce(async args => {
        const nuxtConfig = await loadNuxtConfig(args)

        merge(nuxtConfig, config)

        return nuxtConfig
      })

      await commandSimulator(config)

      laravelTest()
    })

    test('merges existing proxy rules correctly', async () => {
      const testRule = ['/__test_path__', { target: '__test_target__' }]

      options = await commandSimulator({
        proxy: [testRule]
      })

      expect(options).toBeDefined()
      expect(options!.proxy).toEqual(expect.arrayContaining([testRule]))
    })

    describe('extendRoutes', () => {
      test('does chain existing function', async () => {
        const testRoute = {
          component: '__extend_routes_test__',
          name: 'extended',
          path: '/__extend_routes_test__'
        }
        const testExtendRoutes: jest.Mock<
          NuxtConfigurationRouter['extendRoutes']
        > = jest.fn().mockImplementation(routes => {
          routes.push(testRoute)
        })

        options = await commandSimulator({
          router: {
            extendRoutes: testExtendRoutes
          }
        })

        expect(options).toBeDefined()
        expect(options!.router).toBeDefined()

        const resolvedRoutes = extendRoutesTest(options!.router!.extendRoutes)

        expect(testExtendRoutes).toHaveBeenCalled()
        expect(resolvedRoutes).toEqual(expect.arrayContaining([testRoute]))
      })

      describe('i18n compatibility', () => {
        const getExtendRoutesFromI18nConfigCommand = async (
          i18nConf: object = {}
        ) => {
          return (await commandSimulator({
            modules: [['nuxt-i18n', i18nConf]]
          }))!.router!.extendRoutes
        }

        test('does not resolve without default locale', async () => {
          const extendRoutes = await getExtendRoutesFromI18nConfigCommand()

          try {
            extendRoutesTest(extendRoutes, { name: 'index___test' })
          } catch (error) {
            expect(error).toBe('Unable to resolve index route')
          }
        })

        test('resolves i18n routes if locale is configured', async () => {
          const extendRoutes = await getExtendRoutesFromI18nConfigCommand({
            defaultLocale: 'test'
          })

          extendRoutesTest(extendRoutes, { name: 'index___test' })
        })

        test('respects name separator setting', async () => {
          const extendRoutes = await getExtendRoutesFromI18nConfigCommand({
            defaultLocale: 'test',
            routesNameSeparator: '#'
          })

          extendRoutesTest(extendRoutes, { name: 'index#test' })
        })
      })
    })

    describe('does not override existing modules', () => {
      let nuxtModule: NuxtConfigurationModule | undefined

      afterEach(async () => {
        expect(nuxtModule).toBeDefined()

        options = await commandSimulator([], {
          modules: [nuxtModule!]
        })

        expect(options).toBeDefined()
        expect(options!.modules).toEqual(
          expect.arrayContaining(['@nuxtjs/axios', nuxtModule!])
        )

        nuxtModule = undefined
        reset()
      })

      test('defined as plain string', () => {
        nuxtModule = '__test_module__'
      })

      test('defined as array with configuration', () => {
        nuxtModule = ['__test_module__', { testConfig: '__test_config__' }]
      })
    })

    describe('does not duplicate @nuxtjs/axios module', () => {
      let axiosModule: NuxtConfigurationModule | undefined

      afterEach(async () => {
        expect(axiosModule).toBeDefined()

        options = await commandSimulator([], {
          modules: [axiosModule!]
        })

        expect(options).toBeDefined()
        expect(options!.modules).toEqual([axiosModule])

        axiosModule = undefined
        reset()
      })

      test('defined as plain string', () => {
        axiosModule = '@nuxtjs/axios'
      })

      test('defined as array with configuration', () => {
        axiosModule = ['@nuxtjs/axios', { testConfig: '__test_config__' }]
      })
    })
  })
})

let expected: {
  server: {
    url: URL
    host: string
    path: string
    port: number
  }
  laravel: {
    path: string
    url: string
  }
}

const defineExpected = (custom?: {
  server?: {
    url?: URL
    host?: string
    path?: string
    port?: number
  }
  laravel?: {
    path?: string
    url?: string
  }
}) => {
  expected = defaultsDeep(custom || {}, {
    laravel: {
      path: cwd
    },
    server: {
      host: 'localhost',
      path: '/__nuxt_laravel__',
      port: 3000
    }
  })

  expected.server.url = new URL(
    expected.server.path,
    `http://${expected.server.host}:${expected.server.port}`
  )
  expected.laravel.url = `http://${expected.server.host}:${expected.server
    .port + 1}`
}

const proxyTest = (options: NuxtConfiguration) => {
  expect(options!.proxy).toBeDefined()
  expect(options!.proxy).toEqual(
    expect.arrayContaining([
      [
        ['**/*', `!${expected.server.path}`],
        {
          target: expected.laravel.url,
          ws: false
        }
      ]
    ])
  )
}

const serverTest = (options: NuxtConfiguration) => {
  expect(options!.server).toBeDefined()
  expect(options!.server).toEqual(
    expect.objectContaining({
      host: expected.server.host,
      port: expected.server.port
    })
  )
}

const laravelTest = () => {
  expect(execa).toHaveBeenCalledTimes(1)
  expect(execa).toHaveBeenCalledWith(
    'php',
    expect.arrayContaining([
      'artisan',
      'serve',
      `--host=${
        expected.server.host === 'localhost'
          ? '127.0.0.1'
          : expected.server.host
      }`,
      `--port=${expected.server.port + 1}`
    ]),
    expect.objectContaining({
      cwd: expected.laravel.path,
      env: expect.objectContaining({
        APP_URL: expected.server.url.origin,
        NUXT_URL: expected.server.url.href
      })
    })
  )
}

const { r } = jest.requireActual('@nuxt/utils')
const extendRoutesTest = (
  extendRoutes: NuxtConfigurationRouter['extendRoutes'],
  route?: { name?: string; path?: string }
) => {
  expect(extendRoutes).toBeDefined()

  const routes = [
    {
      component: '__test_component__',
      fullPath: '',
      hash: '',
      matched: [],
      name: '',
      params: {},
      path: '',
      query: {},
      ...route
    },
    {
      component: '__never_resolved__',
      fullPath: '',
      hash: '',
      matched: [],
      name: 'page',
      params: {},
      path: '/page',
      query: {}
    }
  ]

  extendRoutes!(routes, r)
  expect(routes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        component: '__test_component__',
        name: NuxtCommand.CONFIG_KEY,
        path: expected.server.path
      }),
      expect.not.objectContaining({
        component: '__never_resolved__',
        name: NuxtCommand.CONFIG_KEY,
        path: expected.server.path
      })
    ])
  )

  return routes
}
