import { helpSpy, NuxtCommandConfig, versionSpy } from '@nuxt/cli'

import { NuxtCommand } from '../../src/classes/nuxtCommand'

import { getCommand, run } from '../../src/cli'
import buildCmd from '../../src/subcommands/build'
import devCmd from '../../src/subcommands/dev'

afterEach(() => {
  jest.clearAllMocks()
})

const fromSpy = jest.spyOn(NuxtCommand, 'from')

process.argv = process.argv.slice(0, 2)
const executeWithArgs = async (argv?: string[]) => {
  if (argv) {
    process.argv = [...process.argv, ...argv]
  }

  await run()

  process.argv = process.argv.slice(0, 2)
}

describe('entry point', () => {
  describe('getCommand()', () => {
    const getCommandTest = (
      argument?: string,
      expected?: NuxtCommandConfig
    ) => {
      const cmd = getCommand(argument)

      expect(cmd).not.toBeNull()
      expect(cmd).toEqual(expected)
    }

    describe('returns dev command', () => {
      test('without argument', () => {
        getCommandTest(undefined, devCmd)
      })

      test('with argument "unknown"', () => {
        getCommandTest('unknown', devCmd)
      })
    })

    describe('returns the appropiate command', () => {
      test('with argument "dev"', () => {
        getCommandTest('dev', devCmd)
      })

      test('with argument "build"', () => {
        getCommandTest('build', buildCmd)
      })
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

      test('executes dev command without arguments', async () => {
        await executeWithArgs()

        runTest(devCmd)
      })

      test('executes dev command with argument "dev"', async () => {
        await executeWithArgs(['dev'])

        runTest(devCmd)
      })

      test('executes build command with argument "build"', async () => {
        await executeWithArgs(['build'])

        runTest(buildCmd)
      })

      describe('preserves commands that are not known commands', () => {
        const expected = '__test_command__'
        test('plain argumens', async () => {
          executeWithArgs([expected])

          runTest(devCmd, [expected])
        })

        test('arguments prefixed with --', async () => {
          executeWithArgs([`--${expected}`])

          runTest(devCmd, [`--${expected}`])
        })

        test('arguments prefixed with -', async () => {
          executeWithArgs([`-${expected}`])

          runTest(devCmd, [`-${expected}`])
        })
      })

      describe('resolves and unshifts known commands', () => {
        test('dev', async () => {
          executeWithArgs(['dev'])

          runTest(devCmd, [])
        })

        test('build', async () => {
          executeWithArgs(['build'])

          runTest(buildCmd, [])
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
            await executeWithArgs(['--help'])
          })

          test('with flag -h', async () => {
            await executeWithArgs(['-h'])
          })

          test('with invalid option', async () => {
            await executeWithArgs(['--__invalid__'])
          })

          test('with invalid flag', async () => {
            await executeWithArgs(['-.'])
          })

          test('with excessive arguments', async () => {
            await executeWithArgs(['__test__', '__exessive__'])
          })
        })

        describe('shows version', () => {
          afterEach(() => {
            expect(versionSpy).toHaveBeenCalledTimes(1)
          })

          test('with option --version', async () => {
            await executeWithArgs(['--version'])
          })

          test('with flag -v', async () => {
            await executeWithArgs(['-v'])
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
            await executeWithArgs(['build', '--help'])
          })

          test('with flag -h', async () => {
            await executeWithArgs(['build', '-h'])
          })

          test('with invalid option', async () => {
            await executeWithArgs(['build', '--__invalid__'])
          })

          test('with invalid flag', async () => {
            await executeWithArgs(['build', '-.'])
          })

          test('with excessive arguments', async () => {
            await executeWithArgs(['build', '__test__', '__exessive__'])
          })
        })

        describe('shows version', () => {
          afterEach(() => {
            expect(versionSpy).toHaveBeenCalledTimes(1)
          })

          test('with option --version', async () => {
            await executeWithArgs(['build', '--version'])
          })

          test('with flag -v', async () => {
            await executeWithArgs(['build', '-v'])
          })
        })
      })
    })
  })
})
