import { defaultsDeep } from 'lodash'
import path from 'path'

import fs from 'fs-extra'
jest.mock('fs-extra')

import {
  buildSpy,
  configSpy,
  generateSpy,
  hookSpy,
  nuxtSpy,
  readySpy
} from '@nuxt/cli'
import NuxtConfiguration from '@nuxt/config'

import NuxtCommand from '../../../src/classes/NuxtCommand'
import buildCmd from '../../../src/subcommands/build'
import { CommandSimulator, createCommandSimulator } from '../../utils'

const html = '__render_test__'

const renderSpy = jest.fn().mockResolvedValue({ html })
const addHookSpy = jest.spyOn(buildCmd, 'addNuxtHook')
const fromSpy = jest.spyOn(NuxtCommand, 'from')

describe('nuxt laravel build', () => {
  let commandSimulator: CommandSimulator

  beforeAll(async () => {
    defineExpected()
    commandSimulator = await createCommandSimulator(buildCmd)
  })

  describe('full run', () => {
    beforeAll(async () => {
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      await envSetup(await commandSimulator())
    })

    afterAll(() => {
      ;(fs.existsSync as jest.Mock).mockReset()
      envTeardown()
    })

    test('generates files', () => {
      expect(nuxtSpy).toHaveBeenCalledTimes(1)
      expect(readySpy).toHaveBeenCalledTimes(1)
      expect(generateSpy).not.toHaveBeenCalled()
      expect(buildSpy).toHaveBeenCalledTimes(1)
    })

    describe('options test', () => {
      test('options are set', () => {
        expect(options).toBeDefined()
      })

      test('environment is correct', () => {
        expect(options!.dev).toBe(false)
        expect(options!.mode).toBe('spa')
      })
    })

    test('nuxt hook has been called three times', () => {
      expect(addHookSpy).toHaveBeenCalledTimes(3)
      expect(hookSpy).toHaveBeenCalledTimes(3)
    })

    describe('test hooks', () => {
      test('index file is generated and written to public path', () => {
        filePathTest()
      })

      describe('command finalization', () => {
        let instance: NuxtCommand
        beforeAll(() => {
          expect(fromSpy.mock.results[0].type).toBe('return')

          instance = fromSpy.mock.results[0].value
        })

        describe('information is collected', () => {
          test('asset folders and destinations are collected', () => {
            expect(instance.argv['public-path']).toEqual(
              expect.objectContaining({
                assetsRoot: expected.resolved!.assets.to,
                compiledAssets: expected.resolved!.assets.from,
                publicRoot: expected.resolved!.static.to,
                staticAssets: expected.resolved!.static.from
              })
            )
          })

          test('delete targets are collected', () => {
            expect(instance.argv.delete).toEqual(
              expect.arrayContaining([...expected.resolved!.remove])
            )
          })
        })

        describe('on command run', () => {
          beforeAll(async () => {
            await buildCmd!.run!(instance)
          })

          test('assets are deployed', () => {
            staticDirTest()
            publicPathTest()
          })

          test('delete targets are removed', () => {
            expected.resolved!.remove.forEach((rmPath, i) => {
              expect(fs.removeSync).toHaveBeenNthCalledWith(i + 1, rmPath)
            })
          })
        })
      })
    })
  })

  describe('test cli arguments', () => {
    afterEach(() => {
      envTeardown()
    })

    describe('sets analyze in nuxt config', () => {
      afterEach(() => {
        expect(options!.build).toEqual(
          expect.objectContaining({
            analyze: true
          })
        )
      })

      test('with option --analyze', async () => {
        options = await commandSimulator(['--analyze'])
      })

      test('with flag -a', async () => {
        options = await commandSimulator(['-a'])
      })
    })

    describe('does not delete build files', () => {
      afterEach(async () => {
        expect(fs.removeSync).not.toHaveBeenCalled()
      })

      test('with option --no-delete', async () => {
        await envSetup(await commandSimulator(['--no-delete']))
      })
    })

    describe('sets devtools on vue config', () => {
      afterEach(() => {
        expect(options!.vue).toEqual(
          expect.objectContaining({
            config: expect.objectContaining({
              devtools: true
            })
          })
        )
      })

      test('with option --devtools', async () => {
        options = await commandSimulator(['--devtools'])
      })
    })

    describe('changes file path', () => {
      afterEach(async () => {
        await buildCmd!.run!(fromSpy.mock.results[0].value)
        filePathTest()
        publicPathTest()
      })

      describe('with option --file-path', () => {
        test('relative path is resolved correctly', async () => {
          const relPath = 'path/index.html'
          await envSetup(await commandSimulator(['--file-path', relPath]), {
            filePath: relPath
          })
        })

        test('absolute path is resolved correctly', async () => {
          const absPath = '/path/index.html'
          await envSetup(await commandSimulator(['--file-path', absPath]), {
            filePath: absPath
          })
        })

        test('nonexistent path is created', async () => {
          const nullPath = '__test_path__/index.html'
          await envSetup(await commandSimulator(['--file-path', nullPath]), {
            filePath: nullPath
          })

          expect(fs.mkdirpSync).toHaveBeenCalledWith(
            path.dirname(expected.resolved!.filePath)
          )
        })
      })
    })

    describe('changes public path', () => {
      afterEach(async () => {
        await buildCmd!.run!(fromSpy.mock.results[0].value)
        filePathTest()
        staticDirTest()
        publicPathTest()
        ;(fs.existsSync as jest.Mock).mockReset()
      })

      describe('with option --public-path', () => {
        test('relative path is resolved correctly', async () => {
          const relPath = 'path'
          ;(fs.existsSync as jest.Mock).mockReturnValue(true)

          await envSetup(await commandSimulator(['--public-path', relPath]), {
            publicPath: relPath
          })
        })

        test('absolute path is resolved correctly', async () => {
          const absPath = '/path'
          ;(fs.existsSync as jest.Mock).mockReturnValue(true)

          await envSetup(await commandSimulator(['--public-path', absPath]), {
            publicPath: absPath
          })
        })

        test('nonexistent path is created', async () => {
          const nullPath = '__test_path__'
          ;(fs.existsSync as jest.Mock).mockImplementation(
            (value: string) => !value.endsWith(nullPath)
          )

          await envSetup(await commandSimulator(['--public-path', nullPath]), {
            publicPath: nullPath
          })

          expect(fs.mkdirpSync).toHaveBeenCalledWith(
            path.dirname(expected!.resolved!.assets.to)
          )
        })
      })
    })

    describe('sets quiet in nuxt config', () => {
      afterEach(() => {
        expect(options!.build).toEqual(
          expect.objectContaining({
            quiet: true
          })
        )
      })

      test('with option --quiet', async () => {
        options = await commandSimulator(['--quiet'])
      })

      test('with flag -q', async () => {
        options = await commandSimulator(['-q'])
      })
    })
  })

  describe('test with simulated nuxt.config', () => {
    describe('respects router.base setting', () => {
      beforeAll(async () => {
        ;(fs.existsSync as jest.Mock).mockReturnValue(true)
        await envSetup(
          await commandSimulator([], {
            router: {
              base: '/test/'
            }
          }),
          {
            publicPath: 'public/test'
          }
        )
      })

      afterAll(() => {
        ;(fs.existsSync as jest.Mock).mockReset()
        envTeardown()
      })

      test('deploys assets to router.base subdirectory in public folder', async () => {
        await buildCmd!.run!(fromSpy.mock.results[0].value)
        staticDirTest()
        publicPathTest()
      })
    })
  })
})

let options: NuxtConfiguration | undefined

let expected: {
  filePath?: string
  publicPath: string
  resolved?: {
    filePath: string
    assets: {
      from: string
      to: string
    }
    remove: string[]
    static: {
      from: string
      to: string
    }
  }
}

interface Expected {
  filePath?: string
  publicPath?: string
}

const filePathTest = () => {
  expect(renderSpy).toHaveBeenCalledWith('/', {
    url: '/'
  })
  expect(fs.writeFileSync).toHaveBeenCalledWith(
    expected.resolved!.filePath,
    html,
    'utf-8'
  )
}

const staticDirTest = () => {
  expect(fs.copySync).toHaveBeenNthCalledWith(
    1,
    expected.resolved!.static.from,
    expected.resolved!.static.to
  )
}

const publicPathTest = () => {
  expect(fs.copySync).toHaveBeenLastCalledWith(
    expected.resolved!.assets.from,
    expected.resolved!.assets.to
  )
}

const defineExpected = (custom?: Expected) => {
  expected = defaultsDeep(custom || {}, {
    publicPath: 'public'
  })
}

const runHooks = async () => {
  const generator = {
    nuxt: {
      server: {
        renderRoute: renderSpy
      }
    },
    options
  }

  await hookSpy.mock.calls.reduce(async (promise, call) => {
    await promise

    expect(call).toEqual(
      expect.arrayContaining(['build:done', expect.any(Function)])
    )
    return await call[1](generator)
  }, Promise.resolve())
}

const envSetup = async (config?: NuxtConfiguration, exp?: Expected) => {
  defineExpected(exp)

  options = config

  expect(options).toBeDefined()
  expect(options!.rootDir).toEqual(expect.any(String))
  expect(options!.buildDir).toEqual(expect.any(String))
  expect(options!.build).toEqual(
    expect.objectContaining({
      publicPath: expect.any(String)
    })
  )

  const publicRoot = path.join(
    path.resolve(options!.rootDir!, expected.publicPath),
    '/'
  )
  const assetsRoot = path.join(publicRoot, options!.build!.publicPath!)

  const filePath = expected.filePath
    ? path.resolve(options!.rootDir!, expected.filePath)
    : path.join(
        publicRoot,
        options!.router!.base!,
        `${
          options!.router!.base! && options!.router!.base!.length > 1
            ? 'index'
            : 'spa'
        }.html`
      )

  expected.resolved = {
    assets: {
      from: path.resolve(
        options!.rootDir!,
        options!.buildDir!,
        'dist',
        'client'
      ),
      to: assetsRoot
    },
    filePath,
    remove: [path.resolve(options!.rootDir!, options!.buildDir!)],
    static: {
      from: path.resolve(
        options!.rootDir!,
        options!.srcDir!,
        options!.dir.static
      ),
      to: publicRoot
    }
  }

  await runHooks()
}

const envTeardown = () => {
  options = undefined
  jest.clearAllMocks()
  expected.resolved = undefined
  configSpy.mockReset()
}
