import fs from 'fs'

import { helpSpy, NuxtCommandConfig, versionSpy } from '@nuxt/cli'

import NuxtCommand from '../../src/classes/NuxtCommand'

import { commands, run } from '../../src/cli'
import buildCmd from '../../src/subcommands/build'
import devCmd from '../../src/subcommands/dev'

import execa from 'execa'

jest.mock('execa')

afterEach(() => {
  jest.clearAllMocks()
})

const fromSpy = jest.spyOn(NuxtCommand, 'from')

describe('entry point', () => {
  describe('getCommand test', () => {
    let cmd: NuxtCommandConfig | undefined | null

    afterEach(() => {
      cmd = undefined
    })

    describe('returns null', () => {
      afterEach(() => {
        expect(cmd).toBeNull()
      })

      test('without argument', async () => {
        cmd = await commands.default()
      })

      test('with argument "__unkown_command__"', async () => {
        cmd = await commands.default('__unkown_command__')
      })
    })

    test('returns dev command with argument "dev"', async () => {
      cmd = await commands.default('dev')

      expect(cmd).toEqual(devCmd)
    })

    test('returns build command with argument "build"', async () => {
      cmd = await commands.default('build')

      expect(cmd).toEqual(buildCmd)
    })
  })

  describe('run()', () => {
    const runTest = (cmd: NuxtCommandConfig, argv?: string[]) => {
      expect(fromSpy).toHaveBeenCalledTimes(1)
      expect(fromSpy).toHaveBeenCalledWith(
        cmd,
        argv || expect.arrayContaining([])
      )
    }

    describe('execution', () => {
      beforeEach(() => {
        fromSpy.mockReturnValueOnce({
          run: jest.fn().mockResolvedValue(undefined)
        } as any)
      })

      describe('from command line', () => {
        process.argv = process.argv.slice(0, 2)
        const executeWithCommandLineArgs = async (argv?: string[]) => {
          if (argv) {
            process.argv = [...process.argv, ...argv]
          }

          await run()

          process.argv = process.argv.slice(0, 2)
        }

        test('executes dev command without arguments', async () => {
          await executeWithCommandLineArgs()

          runTest(devCmd)
        })

        test('executes dev command with argument "dev"', async () => {
          await executeWithCommandLineArgs(['dev'])

          runTest(devCmd)
        })

        test('executes build command with argument "build"', async () => {
          await executeWithCommandLineArgs(['build'])

          runTest(buildCmd)
        })
      })

      describe('from api', () => {
        test('executes dev command without arguments', async () => {
          await run()

          runTest(devCmd)
        })

        test('executes dev command form api', async () => {
          await run(['dev'])

          runTest(devCmd)
        })

        test('executes build command form api', async () => {
          await run(['build'])

          runTest(buildCmd)
        })
      })
    })

    describe('subcommand execution', () => {
      const expectedCmd: string = '__test_cmd__'
      let expectedArgs: string[] = []

      afterEach(() => {
        expect(execa).toHaveBeenCalledWith(
          `nuxt-laravel-${expectedCmd}`,
          expectedArgs,
          expect.any(Object)
        )

        expectedArgs = []
      })

      test('proxies unresolved commands', async () => {
        await run([expectedCmd])
      })

      test('forwards arguments', async () => {
        expectedArgs = ['testArg', '--option', '-flag']
        await run([expectedCmd, ...expectedArgs])
      })

      describe('fails when', () => {
        test('command throws', async () => {
          const expectedErr = '__test_error__'
          execa.mockImplementationOnce(() => {
            throw String(expectedErr)
          })

          try {
            await run([expectedCmd])
          } catch (error) {
            expect(error).toBe(
              `Failed to run command \`nuxt-laravel-${expectedCmd}\`:\n${expectedErr}`
            )
          }
        })

        test('command not found', async () => {
          // @ts-ignore
          execa.mockImplementationOnce(() => {
            fs.readFileSync('nonexistent')
          })

          try {
            await run([expectedCmd])
          } catch (error) {
            expect(error).toBe(`Command not found: nuxt-laravel-${expectedCmd}`)
          }
        })
      })
    })

    describe('basic functionality', () => {
      describe('dev command', () => {
        afterEach(() => {
          runTest(devCmd)
        })

        describe('shows help', () => {
          afterEach(() => {
            expect(helpSpy).toHaveBeenCalledTimes(1)
          })

          test('with option --help', async () => {
            await run(['--help'])
          })

          test('with flag -h', async () => {
            await run(['-h'])
          })
        })

        describe('shows version', () => {
          afterEach(() => {
            expect(versionSpy).toHaveBeenCalledTimes(1)
          })

          test('with option --version', async () => {
            await run(['--version'])
          })

          test('with flag -v', async () => {
            await run(['-v'])
          })
        })
      })

      describe('build command', () => {
        afterEach(() => {
          runTest(buildCmd)
        })

        describe('shows help', () => {
          afterEach(() => {
            expect(helpSpy).toHaveBeenCalledTimes(1)
          })

          test('with option --help', async () => {
            await run(['build', '--help'])
          })

          test('with flag -h', async () => {
            await run(['build', '-h'])
          })
        })

        describe('shows version', () => {
          afterEach(() => {
            expect(versionSpy).toHaveBeenCalledTimes(1)
          })

          test('with option --version', async () => {
            await run(['build', '--version'])
          })

          test('with flag -v', async () => {
            await run(['build', '-v'])
          })
        })
      })
    })
  })
})
