import chalk from 'chalk'
import execa from 'execa'
import fs from 'fs-extra'
import { resolve } from 'path'
import { setup, loadConfig, build, generate } from '@nuxtjs/module-test-utils'

import { Configuration } from '@nuxt/types'

import { logger } from '../../src/utils'
import { moduleKey, laravelAppEnv, nuxtOutputEnv } from '../../src/constants'

jest.mock('execa')

const execaMock = (execa as unknown) as jest.Mock
const execaOnMock = jest.fn()
const laravelMock = jest.fn().mockReturnValue({
  on: execaOnMock
})
execaMock.mockImplementation((program: string, params: string[]) => {
  if (program === 'php' && params[0] && params[0] === 'artisan')
    return laravelMock()

  return { on: jest.fn() }
})

const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {})
const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {})
const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {})
const successSpy = jest.spyOn(logger, 'success').mockImplementation(() => {})

const writeFileSpy = jest.spyOn(fs, 'writeFileSync')

describe('module tests', () => {
  const disabledMessage = `Laravel support is ${chalk.red.bold('disabled')}`
  const enabledMessage = `Laravel support is ${chalk.green.bold('enabled')}`

  describe('global validation', () => {
    let nuxt: any

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

    test('disabled with error message for missing `public` dir', async () => {
      const root = resolve(__dirname, '../fixture/default')
      await setNuxt({ laravel: { root, publicDir: 'missing' } })

      expect(errorSpy).toHaveBeenCalledWith(
        `Unable to find Laravel public dir: ${root}/missing`
      )
    }, 60000)
  })

  describe('swCache extension', () => {
    test.todo('swCache implementation')
  })

  describe('dev functionality', () => {
    let nuxt: any
    const laravelRoot = resolve(__dirname, '../fixture/default')

    process.env.NODE_ENV = 'development'

    const setNuxt = async (options?: Configuration) => {
      nuxt = (
        await setup(
          loadConfig(resolve(__dirname, '..'), 'default', {
            dev: true,
            ...options,
            laravel: {
              root: laravelRoot,
              ...(options && options.laravel)
            }
          })
        )
      ).nuxt
    }

    const testProxy = (proxy: any, host = 'http://localhost:3001') => {
      expect(proxy).toBeDefined()
      expect(proxy).toContainEqual([
        ['**/*', `!/${moduleKey}`, '!/_loading'],
        {
          target: host,
          ws: false,
          logLevel: 'debug'
        }
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
        ...overrides
      }
      expect(execaMock).toHaveBeenCalledTimes(1)
      expect(execaMock).toHaveBeenCalledWith(
        'php',
        ['artisan', 'serve', `--host=${config.host}`, `--port=${config.port}`],
        expect.objectContaining({
          cwd: laravelRoot,
          env: expect.objectContaining({
            [laravelAppEnv]: config.origin,
            [nuxtOutputEnv]: `${config.origin}/${moduleKey}`
          })
        })
      )
      expect(execaOnMock).toHaveBeenCalledTimes(1)
    }

    describe('validation', () => {
      test('disabled with warning message for disabled laravel server', async () => {
        await setNuxt({ laravel: { server: false } })

        expect(warnSpy).toHaveBeenCalledWith('Laravel test server is disabled')

        expect(nuxt.options.cli).toBeDefined()
        expect(nuxt.options.cli.badgeMessages).toContain(disabledMessage)

        await nuxt.close()
        nuxt = null

        jest.clearAllMocks()
      }, 60000)

      test('disabled with error message for disabled nuxt dev server', async () => {
        nuxt = (
          await build(
            loadConfig(resolve(__dirname, '..'), 'default', {
              dev: true,
              server: false as any,
              laravel: {
                root: laravelRoot,
                server: {
                  host: 'host.test',
                  port: 8080
                }
              }
            })
          )
        ).nuxt

        expect(warnSpy).toHaveBeenCalledWith('Nuxt dev server is disabled')

        expect(nuxt.options.cli).toBeDefined()
        expect(nuxt.options.cli.badgeMessages).toContain(disabledMessage)

        await nuxt.close()
        nuxt = null

        jest.clearAllMocks()
      }, 60000)
    })

    describe('implementation', () => {
      beforeAll(async () => {
        await setNuxt()
      }, 60000)

      afterAll(async () => {
        await nuxt.close()
        nuxt = null

        jest.clearAllMocks()
      })

      test('axios is configured correctly', () => {
        expect(nuxt.options.axios).toBeDefined()
        expect(nuxt.options.axios.proxy).toBe(true)
      })

      test('proxy is configured correctly', () => {
        testProxy(nuxt.options.proxy)
      })

      test('routes are extended with render url', () => {
        expect(nuxt.options.router.routes).toContainEqual(
          expect.objectContaining({
            name: moduleKey,
            path: `/${moduleKey}`,
            component: expect.stringMatching(/index\.vue$/)
          })
        )
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
          laravel: { server: { host: testHost, port: testPort } }
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
          origin: `http://localhost:${nuxtPort}`
        })
      }, 60000)

      test.todo('Routing tests')
    })

    describe('error handling', () => {
      test('disabled with error message if execa throws', async () => {
        laravelMock.mockReturnValueOnce(() => {
          throw String('Error')
        })

        await setNuxt()

        expect(errorSpy).toHaveBeenCalledWith(`Failed to start Laravel server`)

        expect(nuxt.options.cli).toBeDefined()
        expect(nuxt.options.cli.badgeMessages).toContain(disabledMessage)

        await nuxt.close()
        nuxt = null

        jest.clearAllMocks()
      }, 60000)
    })
  })

  describe('prod functionality', () => {
    let nuxt: any
    let laravelRoot: string
    let nuxtTeardown: (() => Promise<void>) | null = null

    process.env.NODE_ENV = 'production'

    const nuxtSetup = async (
      options?: Configuration,
      fixture: string = 'default'
    ) => {
      laravelRoot = resolve(__dirname, `../fixture/${fixture}`)

      nuxt = (
        await generate(
          loadConfig(resolve(__dirname, '..'), fixture, {
            dev: false,
            ...options,
            laravel: {
              root: laravelRoot,
              ...(options && options.laravel)
            }
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
          fs.removeSync(`${laravelRoot}/public/spa.html`)
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

      test('generation is configured correctly', () => {
        expect(nuxt.options.generate).toBeDefined()
        expect(nuxt.options.generate).toEqual(
          expect.objectContaining({
            dir: `${laravelRoot}/${moduleKey}`,
            exclude: [/.*/],
            fallback: 'spa.html'
          })
        )
        expect(infoSpy).toHaveBeenNthCalledWith(
          1,
          'Generation configured for Laravel SPA.'
        )
      })

      test('generation is executed', () => {
        expect(infoSpy).toHaveBeenNthCalledWith(2, 'Generating SPA assets...')
        expect(successSpy).toBeCalledTimes(1)
        expect(successSpy).toBeCalledWith(
          `SPA assets generated in: ${laravelRoot}/public/`
        )
      })

      test('files are generated correctly', () => {
        expect(fs.existsSync(`${laravelRoot}/${moduleKey}`)).toBe(false)

        const outRoot = `${laravelRoot}/public/`

        expect(fs.existsSync(`${outRoot}_nuxt`)).toBe(true)
        expect(fs.existsSync(`${outRoot}spa.html`)).toBe(true)
        containsHtml(`${outRoot}spa.html`)
      })
    })

    describe('configuration', () => {
      let outRoot: string

      afterEach(async () => {
        if (!outRoot) {
          outRoot = `${laravelRoot}/public/`
        }

        const outName =
          outRoot === `${laravelRoot}/public/` ? 'spa.html' : 'index.html'

        expect(nuxt.options.generate).toEqual(
          expect.objectContaining({
            dir: `${laravelRoot}/${moduleKey}`,
            exclude: [/.*/],
            fallback: outName
          })
        )
        expect(infoSpy).toHaveBeenNthCalledWith(
          1,
          'Generation configured for Laravel SPA.'
        )
        expect(infoSpy).toHaveBeenNthCalledWith(2, 'Generating SPA assets...')

        expect(successSpy).toHaveBeenNthCalledWith(
          1,
          `SPA assets generated in: ${outRoot}`
        )

        expect(fs.existsSync(`${laravelRoot}/${moduleKey}`)).toBe(false)

        expect(fs.existsSync(`${outRoot}_nuxt`)).toBe(true)
        expect(fs.existsSync(`${outRoot}${outName}`)).toBe(true)
        containsHtml(`${outRoot}${outName}`)

        if (nuxtTeardown) await nuxtTeardown()
        outRoot = ''
      })

      test('custom router base', async () => {
        await nuxtSetup({ router: { base: '/test/' } })

        outRoot = `${laravelRoot}/public/test/`

        expect(nuxt.options.generate).toEqual(
          expect.objectContaining({
            fallback: 'index.html'
          })
        )
      }, 60000)

      test('additional output file', async () => {
        await nuxtSetup({
          laravel: {
            outputPath: 'storage/spa.html'
          }
        })

        expect(infoSpy).toHaveBeenNthCalledWith(
          3,
          'Rendering additional output file...'
        )

        expect(fs.existsSync(`${laravelRoot}/storage/spa.html`)).toBe(true)
        containsHtml(`${laravelRoot}/storage/spa.html`)
      }, 60000)

      describe('.env export', () => {
        afterAll(() => {
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
            `${nuxtOutputEnv}=${laravelRoot}/public/spa.html`,
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

        test('overwrites previous output', async () => {
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

        test(`overwrites manually defined '${nuxtOutputEnv}'`, async () => {
          await nuxtSetup(
            { laravel: { dotEnvExport: true, outputPath: 'public/spa.html' } },
            'dotEnvOverride'
          )

          const expectedRegEx = new RegExp(
            `${nuxtOutputEnv}=${laravelRoot}/public/spa.html`,
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

        test('fails silently with missing .env file', async () => {
          await nuxtSetup({ laravel: { dotEnvExport: true } })

          expect(fs.existsSync(`${laravelRoot}/.env`)).toBe(false)
        })
      })
    })

    describe('error handling', () => {
      test('additional output is skipped if it corresponds to default output', async () => {
        await nuxtSetup({
          laravel: {
            outputPath: 'public/spa.html'
          }
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
            outputPath: 'storage/spa.html'
          }
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
