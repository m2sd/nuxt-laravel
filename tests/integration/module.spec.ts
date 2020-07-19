import chalk from 'chalk'
import execa from 'execa'
import fs from 'fs-extra'
import { resolve } from 'path'
import { setup, loadConfig, generate } from '@nuxtjs/module-test-utils'

import { Configuration } from '@nuxt/types'

import { logger } from '../../src/utils'
import { moduleKey, laravelAppEnv, nuxtOutputEnv } from '../../src/constants'

jest.mock('execa')

const execaMock = (execa as unknown) as jest.Mock
const execaOnMock = jest.fn()
const execaCancelMock = jest.fn()
execaMock.mockImplementation(() => ({
  on: execaOnMock,
  cancel: execaCancelMock,
}))

const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {})
const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {})
const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {})
const successSpy = jest.spyOn(logger, 'success').mockImplementation(() => {})

const writeFileSpy = jest.spyOn(fs, 'writeFileSync')

describe('module tests', () => {
  const disabledMessage = `Laravel support is ${chalk.red.bold('disabled')}`
  const enabledMessage = `Laravel support is ${chalk.green.bold('enabled')}`

  describe('validation', () => {
    let nuxt: any
    const validRoot = resolve(__dirname, '../fixture/default')

    const setNuxt = async (options?: Configuration) => {
      nuxt = (
        await setup(
          loadConfig(resolve(__dirname, '..'), 'default', options || {})
        )
      ).nuxt
    }

    afterEach(async () => {
      expect(nuxt.options.cli).toBeDefined()

      expect(nuxt.options.cli.badgeMessages).toContain(disabledMessage)

      await nuxt.close()
      nuxt = null

      jest.clearAllMocks()
    })

    test('disabled with error message for missing `server.php` file', async () => {
      await setNuxt()

      expect(errorSpy).toHaveBeenCalledWith(
        `Unable to find 'server.php' file in Laravel path: ${process.cwd()}`
      )
    }, 60000)

    test('disabled with error message for missing `public` dir', async () => {
      await setNuxt({ laravel: { root: validRoot, publicDir: 'missing' } })

      expect(errorSpy).toHaveBeenCalledWith(
        `Unable to find Laravel public dir: ${validRoot}/missing`
      )
    }, 60000)

    test('disabled with warning message if laravel proxy is disabled', async () => {
      await setNuxt({ laravel: { root: validRoot, server: false } })

      expect(warnSpy).toHaveBeenCalledWith('Laravel proxy is disabled')
    }, 60000)
  })

  describe('swCache extension', () => {
    test.todo('swCache implementation')
  })

  describe('proxy', () => {
    let nuxt: any
    const laravelRoot = resolve(__dirname, '../fixture/default')

    const setNuxt = async (options?: Configuration) => {
      const config = {
        dev: true,
        ...options,
        laravel: {
          root: laravelRoot,
          ...(options && options.laravel),
        },
      }

      process.env.NODE_ENV = config.dev ? 'development' : 'production'

      nuxt = (
        await setup(loadConfig(resolve(__dirname, '..'), 'default', config))
      ).nuxt
    }

    const testProxy = (proxy: any, host = 'http://localhost:3001') => {
      expect(proxy).toBeDefined()
      expect(proxy).toContainEqual([
        expect.any(Function),
        {
          target: host,
          ws: false,
          logLevel: 'debug',
        },
      ])
    }

    const testServer = (
      overrides: {
        host?: string
        port?: number
        origin?: string
        path?: string
      } = {}
    ) => {
      const config = {
        host: '127.0.0.1',
        port: 3001,
        origin: 'http://localhost:3000',
        path: moduleKey,
        ...overrides,
      }
      expect(execaMock).toHaveBeenCalledTimes(1)
      expect(execaMock).toHaveBeenCalledWith(
        'php',
        ['-S', `${config.host}:${config.port}`, `${laravelRoot}/server.php`],
        expect.objectContaining({
          cwd: laravelRoot,
          env: expect.objectContaining({
            [laravelAppEnv]: config.origin,
            [nuxtOutputEnv]: `${config.origin}/${moduleKey}`,
          }),
        })
      )
      expect(execaOnMock).toHaveBeenCalledTimes(1)
    }

    describe('dev behavior', () => {
      beforeAll(async () => {
        await setNuxt()
      }, 60000)

      afterAll(async () => {
        await nuxt.close()
        nuxt = null

        expect(execaCancelMock).toHaveBeenCalledTimes(1)

        jest.clearAllMocks()
      })

      test('axios is configured correctly', () => {
        expect(nuxt.options.axios).toBeDefined()
        expect(nuxt.options.axios.proxy).toBe(true)
      })

      test('proxy is configured correctly', () => {
        testProxy(nuxt.options.proxy)
      })

      test('testserver is started with correct configuration', () => {
        testServer()
      })

      test('badge message is enabled', () => {
        expect(nuxt.options.cli).toBeDefined()
        expect(nuxt.options.cli!.badgeMessages).toContain(enabledMessage)
      })
    })

    describe('configuration', () => {
      afterEach(async () => {
        await nuxt.close()
        nuxt = null

        jest.clearAllMocks()
      })

      test('custom port', async () => {
        await setNuxt({ laravel: { server: { port: 10 } } })

        testProxy(nuxt.options.proxy, 'http://localhost:10')
        testServer({ port: 10 })
      }, 60000)

      test('custom host', async () => {
        const testHost = 'host.test'
        const testPort = 3000
        await setNuxt({
          laravel: { server: { host: testHost, port: testPort } },
        })

        testProxy(nuxt.options.proxy, `http://${testHost}:${testPort}`)
        testServer({ host: testHost, port: testPort })
      }, 60000)

      test('nuxt testserver with https', async () => {
        await setNuxt({ server: { https: {} } })

        testProxy(nuxt.options.proxy)
        testServer({ origin: 'https://localhost:3000' })
      }, 60000)

      test('nuxt testserver with custom port', async () => {
        const nuxtPort = 10
        await setNuxt({ server: { port: nuxtPort } })

        testProxy(nuxt.options.proxy, `http://localhost:${nuxtPort + 1}`)
        testServer({
          port: nuxtPort + 1,
          origin: `http://localhost:${nuxtPort}`,
        })
      }, 60000)

      test('testserver not started if not in dev mode', async () => {
        await setNuxt({ dev: false })

        expect(execaMock).toHaveBeenCalledTimes(0)
      }, 60000)
    })
  })

  describe('generation', () => {
    let nuxt: any
    let laravelRoot: string
    let nuxtTeardown: (() => Promise<void>) | null = null

    process.env.NODE_ENV = 'production'

    const nuxtSetup = async (
      options?: Configuration,
      fixture: string = 'default'
    ) => {
      laravelRoot = resolve(__dirname, `../fixture/${fixture}`)
      process.static = true

      nuxt = (
        await generate(
          loadConfig(resolve(__dirname, '..'), fixture, {
            dev: false,
            ...options,
            laravel: {
              root: laravelRoot,
              ...(options && options.laravel),
            },
          })
        )
      ).nuxt

      nuxtTeardown = async () => {
        const buildDirectory = nuxt.options.router.base

        nuxt.close()
        nuxt = null

        if (buildDirectory.length > 1) {
          fs.removeSync(`${laravelRoot}/public${buildDirectory}`)
        } else {
          fs.removeSync(`${laravelRoot}/public/_nuxt`)
          fs.removeSync(`${laravelRoot}/public/.nojekyll`)
          fs.removeSync(`${laravelRoot}/public/200.html`)
        }

        if (fs.existsSync(`${laravelRoot}/storage`)) {
          fs.removeSync(`${laravelRoot}/storage`)
        }

        jest.clearAllMocks()
      }
    }

    const containsHtml = (file: string) => {
      expect(fs.readFileSync(file).toString()).toEqual(
        expect.stringMatching(
          /^<\!doctype html>\s*<html[^>]*>\s*<head[^>]*>[\s\S]*<\/head>\s*<body[^>]*>[\s\S]*<\/body>\s*<\/html>\s*$/
        )
      )
    }

    describe('implementation', () => {
      beforeAll(async () => {
        await nuxtSetup()
      }, 60000)

      afterAll(async () => {
        if (nuxtTeardown) await nuxtTeardown()
      })

      test('proxy is set up', () => {
        expect(infoSpy).toHaveBeenNthCalledWith(
          1,
          'Proxying all routes to Laravel on: http://localhost:3001'
        )
      })

      test('generation is configured correctly', () => {
        expect(nuxt.options.generate).toBeDefined()
        expect(nuxt.options.generate).toEqual(
          expect.objectContaining({
            dir: `${laravelRoot}/${moduleKey}`,
            exclude: [/.*/],
          })
        )
        expect(infoSpy).toHaveBeenNthCalledWith(
          2,
          'Generation configured for Laravel SPA.'
        )
      })

      test('generation is executed', () => {
        expect(infoSpy).toHaveBeenNthCalledWith(3, 'Copying nuxt assets...')
        expect(successSpy).toBeCalledTimes(1)
        expect(successSpy).toBeCalledWith(
          `Nuxt assets copied to: ${laravelRoot}/public/`
        )
      })

      test('files are generated correctly', () => {
        expect(fs.existsSync(`${laravelRoot}/${moduleKey}`)).toBe(false)

        const outRoot = `${laravelRoot}/public/`

        expect(fs.existsSync(`${outRoot}_nuxt`)).toBe(true)
        expect(fs.existsSync(`${outRoot}200.html`)).toBe(true)
        containsHtml(`${outRoot}200.html`)
      })
    })

    describe('configuration', () => {
      let outRoot: string

      afterEach(async () => {
        if (!outRoot) {
          outRoot = `${laravelRoot}/public/`
        }

        expect(nuxt.options.generate).toEqual(
          expect.objectContaining({
            dir: `${laravelRoot}/${moduleKey}`,
            exclude: [/.*/],
          })
        )
        expect(infoSpy).toHaveBeenNthCalledWith(
          2,
          'Generation configured for Laravel SPA.'
        )
        expect(infoSpy).toHaveBeenNthCalledWith(3, 'Copying nuxt assets...')

        expect(successSpy).toHaveBeenNthCalledWith(
          1,
          `Nuxt assets copied to: ${outRoot}`
        )

        expect(fs.existsSync(`${laravelRoot}/${moduleKey}`)).toBe(false)

        expect(fs.existsSync(`${outRoot}_nuxt`)).toBe(true)
        expect(fs.existsSync(`${outRoot}200.html`)).toBe(true)
        containsHtml(`${outRoot}200.html`)

        if (nuxtTeardown) await nuxtTeardown()
        outRoot = ''
      })

      test('custom router base', async () => {
        await nuxtSetup({ router: { base: '/test/' } })

        outRoot = `${laravelRoot}/public/test/`
      }, 60000)

      test('additional output file', async () => {
        await nuxtSetup({
          laravel: {
            outputPath: 'storage/spa.html',
          },
        })

        expect(infoSpy).toHaveBeenNthCalledWith(4, 'Rendering index file...')
        expect(successSpy).toHaveBeenNthCalledWith(
          2,
          `SPA index file rendered to: ${laravelRoot}/storage/spa.html`
        )
        expect(fs.existsSync(`${laravelRoot}/storage/spa.html`)).toBe(true)
        containsHtml(`${laravelRoot}/storage/spa.html`)
      }, 60000)

      describe('.env export', () => {
        afterEach(() => {
          fs.writeFileSync(
            resolve(__dirname, '../fixture/dotEnvExport/.env'),
            ''
          )
          fs.writeFileSync(
            resolve(__dirname, '../fixture/dotEnvOverride/.env'),
            `${nuxtOutputEnv}=/outputTestOverwritten`
          )
        })

        test(`appends output if '${nuxtOutputEnv}' is missing`, async () => {
          await nuxtSetup({ laravel: { dotEnvExport: true } }, 'dotEnvExport')

          const expectedRegEx = new RegExp(
            `${nuxtOutputEnv}=${laravelRoot}/public/200.html`,
            'g'
          )

          const dotEnvContent = fs
            .readFileSync(`${laravelRoot}/.env`)
            .toString()

          expect(dotEnvContent).toMatch(expectedRegEx)

          const matches = dotEnvContent.match(expectedRegEx)
          expect(matches).toBeTruthy()
          expect(matches!.length).toBe(1)

          delete process.env[nuxtOutputEnv]
        }, 60000)

        test('writes custom output path', async () => {
          await nuxtSetup(
            { laravel: { dotEnvExport: true, outputPath: 'storage/spa.html' } },
            'dotEnvExport'
          )

          const expectedRegEx = new RegExp(
            `${nuxtOutputEnv}=${laravelRoot}/storage/spa.html`,
            'g'
          )

          const dotEnvContent = fs
            .readFileSync(`${laravelRoot}/.env`)
            .toString()

          expect(dotEnvContent).toMatch(expectedRegEx)

          const matches = dotEnvContent.match(expectedRegEx)
          expect(matches).toBeTruthy()
          expect(matches!.length).toBe(1)

          delete process.env[nuxtOutputEnv]
        }, 60000)

        test('fails with warning for missing .env file', async () => {
          await nuxtSetup({ laravel: { dotEnvExport: true } })

          expect(warnSpy).toHaveBeenCalledWith(
            `Unable to find .env file in: ${laravelRoot}/.env\n.env export skipped`
          )
          expect(fs.existsSync(`${laravelRoot}/.env`)).toBe(false)
        }, 60000)
      })
    })

    describe.skip('error handling', () => {
      test('additional output is skipped if it corresponds to default output', async () => {
        await nuxtSetup({
          laravel: {
            outputPath: 'public/spa.html',
          },
        })

        expect(infoSpy).toHaveBeenNthCalledWith(
          3,
          'Skipping index file output, because output path corresponds to default location'
        )
        expect(successSpy).toHaveBeenLastCalledWith(
          `SPA assets generated in: ${laravelRoot}/public/`
        )

        if (nuxtTeardown) await nuxtTeardown()
      }, 60000)

      test('additional output fails with error message', async () => {
        const testError = String('Error')
        writeFileSpy.mockImplementationOnce(() => {
          throw testError
        })

        await nuxtSetup({
          laravel: {
            outputPath: 'storage/spa.html',
          },
        })

        expect(infoSpy).toHaveBeenNthCalledWith(
          3,
          'Rendering additional output file...'
        )

        expect(errorSpy).toHaveBeenCalledWith(
          'Failed to render index route:',
          testError
        )
        expect(successSpy).toHaveBeenLastCalledWith(
          `SPA assets generated in: ${laravelRoot}/public/`
        )

        if (nuxtTeardown) await nuxtTeardown()
      }, 60000)
    })
  })
})
