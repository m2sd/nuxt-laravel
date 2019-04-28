import { defaultsDeep } from 'lodash'
import path from 'path'

import { buildSpy, generateSpy, hookSpy, nuxtSpy, readySpy } from '@nuxt/cli'
import NuxtConfiguration from '@nuxt/config'

import fs from 'fs-extra'

jest.mock('fs-extra')

import { NuxtCommand } from '../../../src/classes/nuxtCommand'
import buildCmd from '../../../src/subcommands/build'
import { CommandSimulator, createCommandSimulator } from '../../utils'

const html = '__render_test__'

const renderSpy = jest.fn().mockResolvedValue({ html })
const addHookSpy = jest.spyOn(NuxtCommand.prototype, 'addNuxtHook')
const fromSpy = jest.spyOn(NuxtCommand, 'from')

describe('nuxt laravel build', () => {
  let commandSimulator: CommandSimulator

  beforeAll(async () => {
    defineExpected()
    commandSimulator = await createCommandSimulator(buildCmd)
  })

  describe('full run', () => {
    beforeAll(async () => {
      delete process.env.NODE_ENV

      envSetup(await commandSimulator())
    })

    afterAll(() => {
      process.env.NODE_ENV = 'test'

      envTeardown()
    })

    test('generates files', () => {
      expect(nuxtSpy).toHaveBeenCalledTimes(1)
      expect(readySpy).toHaveBeenCalledTimes(1)
      expect(buildSpy).not.toHaveBeenCalled()
      expect(generateSpy).toHaveBeenCalledTimes(1)
    })

    describe('options test', () => {
      test('options are set', () => {
        expect(options).toBeDefined()
      })

      test('environment is correct', () => {
        expect(process.env.NODE_ENV).toBe('production')
        expect(options!.dev).toBe(false)
        expect(options!.mode).toBe('spa')
      })

      test('nuxt hook has been called three times', () => {
        expect(addHookSpy).toHaveBeenCalledTimes(3)
        expect(hookSpy).toHaveBeenCalledTimes(3)
      })

      describe('test hooks', () => {
        test('index file is generated and written to path', () => {
          filePathTest()
        })

        test('assets are deployed', () => {
          publicPathTest()
        })

        describe('build files are removed', () => {
          let instance: NuxtCommand
          beforeAll(() => {
            expect(fromSpy.mock.results[0].type).toBe('return')

            instance = fromSpy.mock.results[0].value
          })

          test('destinations are collected', () => {
            expect(instance.argv.delete).toEqual(
              expect.arrayContaining([...expected.resolved!.remove])
            )
          })

          test('destinations are removed on command run', async () => {
            await buildCmd!.run!(instance)

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
        envSetup(await commandSimulator(['--no-delete']))
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
        filePathTest()
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
        publicPathTest()
      })

      describe('with option --public-path', () => {
        test('relative path is resolved correctly', async () => {
          const relPath = 'path'
          await envSetup(await commandSimulator(['--public-path', relPath]), {
            publicPath: relPath
          })
        })

        test('absolute path is resolved correctly', async () => {
          const absPath = '/path'
          await envSetup(await commandSimulator(['--public-path', absPath]), {
            publicPath: absPath
          })
        })

        test('nonexistent path is created', async () => {
          const nullPath = '__test_path__'
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
})

let options: NuxtConfiguration | undefined

let expected: {
  filePath: string
  publicPath: string
  resolved?: {
    filePath: string
    assets: {
      from: string
      to: string
    }
    remove: string[]
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

const publicPathTest = () => {
  expect(fs.moveSync).toHaveBeenCalledWith(
    expected.resolved!.assets.from,
    expected.resolved!.assets.to,
    {
      overwrite: true
    }
  )
}

const defineExpected = (custom?: Expected) => {
  expected = defaultsDeep(custom || {}, {
    filePath: 'storage/app/index.html',
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
      expect.arrayContaining(['generate:done', expect.any(Function)])
    )
    return await call[1](generator)
  }, Promise.resolve())
}

const envSetup = async (config?: NuxtConfiguration, exp?: Expected) => {
  defineExpected(exp)

  options = config

  expect(options).toBeDefined()
  expect(options!.rootDir).toEqual(expect.any(String))
  expect(options!.generate).toEqual(
    expect.objectContaining({
      dir: expect.any(String)
    })
  )
  expect(options!.build).toEqual(
    expect.objectContaining({
      publicPath: expect.any(String)
    })
  )

  const publicRoot = path.resolve(options!.rootDir!, expected.publicPath)

  expected.resolved = {
    assets: {
      from: path.resolve(options!.generate!.dir + options!.build!.publicPath!),
      to: path.resolve(publicRoot + options!.build!.publicPath!)
    },
    filePath: path.resolve(options!.rootDir!, expected.filePath),
    remove: [
      path.resolve(options!.rootDir!, options!.generate!.dir!),
      path.resolve(options!.rootDir!, options!.buildDir!)
    ]
  }

  await runHooks()
}

const envTeardown = () => {
  options = undefined
  jest.clearAllMocks()
  expected.resolved = undefined
}
