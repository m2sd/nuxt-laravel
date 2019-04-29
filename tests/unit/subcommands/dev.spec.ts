import { defaultsDeep } from 'lodash'
import { URL } from 'url'

import { buildSpy, listenSpy, nuxtSpy, readySpy } from '@nuxt/cli'
import NuxtConfiguration from '@nuxt/config'
import { NuxtConfigurationModule } from '@nuxt/config/types/module'
import { NuxtConfigurationRouter } from '@nuxt/config/types/router'

import execa from 'execa'
import opener from 'opener'

jest.mock('execa')
jest.mock('opener')

import { NuxtCommand } from '../../../src/classes/nuxtCommand'
import dev from '../../../src/subcommands/dev'
import { CommandSimulator, createCommandSimulator } from '../../utils'

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

  test('throws error if execa fails', async () => {
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

    reset()
  })

  describe('full run', () => {
    beforeAll(async () => {
      delete process.env.NODE_ENV
      options = await commandSimulator()
    })

    afterAll(() => {
      process.env.NODE_ENV = 'test'
      reset()
    })

    test('starts server and builds', () => {
      expect(nuxtSpy).toHaveBeenCalledTimes(1)
      expect(readySpy).toHaveBeenCalledTimes(2)
      expect(listenSpy).toHaveBeenCalledTimes(1)
      expect(buildSpy).toHaveBeenCalledTimes(1)
    })

    test('starts laravel artisan testserver', () => {
      laravelTest()
    })

    describe('options test', () => {
      test('options are set', () => {
        expect(options).toBeDefined()
      })

      test('environment is correct', () => {
        expect(process.env.NODE_ENV).toBe('development')
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

        test('resolves route with name "index__en"', () => {
          extendRoutesTest(extendRoutes, { name: 'index__en' })
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

    describe('changes hostname', () => {
      beforeAll(() => {
        defineExpected({
          server: {
            host: 'testhost.tld'
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

    describe('changes port', () => {
      beforeAll(() => {
        defineExpected({
          server: {
            port: 8080
          }
        })
      })

      afterAll(() => {
        defineExpected()
      })

      test('with option --port', async () => {
        options = await commandSimulator(['--port', `${expected.server.port}`])
      })

      test('with flag -p', async () => {
        options = await commandSimulator(['-p', `${expected.server.port}`])
      })
    })

    describe('calls opener', () => {
      afterEach(() => {
        expect(opener).toHaveBeenCalled()
        expect(opener).toHaveBeenCalledWith('__listener_test__')
      })

      test('option --open calls opener', async () => {
        options = await commandSimulator(['--open'])
      })

      test('flag -o calls opener', async () => {
        options = await commandSimulator(['-o'])
      })
    })
  })

  describe('test with simulated nuxt.config', () => {
    afterEach(() => {
      reset()
    })

    test('does chain existing extendRoutes function', async () => {
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

      options = await commandSimulator([], {
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

    test('merges existing proxy rules correctly', async () => {
      const testRule = ['/__test_path__', { target: '__test_target__' }]

      options = await commandSimulator([], {
        proxy: [testRule]
      })

      expect(options).toBeDefined()
      expect(options!.proxy).toEqual(expect.arrayContaining([testRule]))
    })

    describe('does not override existing modules', () => {
      let m: NuxtConfigurationModule | undefined

      afterEach(async () => {
        expect(m).toBeDefined()

        options = await commandSimulator([], {
          modules: [m!]
        })

        expect(options).toBeDefined()
        expect(options!.modules).toEqual(
          expect.arrayContaining(['@nuxtjs/axios', m!])
        )

        m = undefined
        reset()
      })

      test('defined as plain string', () => {
        m = '__test_module__'
      })

      test('defined as array with configuration', () => {
        m = ['__test_module__', { testConfig: '__test_config__' }]
      })
    })

    describe('does not duplicate @nuxtjs/axios module', () => {
      let m: NuxtConfigurationModule | undefined

      afterEach(async () => {
        expect(m).toBeDefined()

        options = await commandSimulator([], {
          modules: [m!]
        })

        expect(options).toBeDefined()
        expect(options!.modules).toEqual([m])

        m = undefined
        reset()
      })

      test('defined as plain string', () => {
        m = '@nuxtjs/axios'
      })

      test('defined as array with configuration', () => {
        m = ['@nuxtjs/axios', { testConfig: '__test_config__' }]
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
          target: expected.laravel.url
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
      `--host=${expected.server.host}`,
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
