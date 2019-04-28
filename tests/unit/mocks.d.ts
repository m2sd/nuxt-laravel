declare module '@nuxt/cli' {
  import { NuxtCommandConfig } from '@nuxt/cli'
  import NuxtConfiguration from '@nuxt/config'

  export const helpSpy: jest.Mock<void>
  export const versionSpy: jest.Mock<void>
  export const buildSpy: jest.Mock<Promise<void>>
  export const generateSpy: jest.Mock<Promise<void>>
  export const configSpy: jest.SpyInstance<
    Promise<NuxtConfiguration>,
    [NuxtConfiguration]
  >

  export const hookSpy: jest.Mock<void>
  export const readySpy: jest.Mock<Promise<void>>
  export const listenSpy: jest.Mock<Promise<void>>

  export const nuxtSpy: jest.Mock<
    (
      options: NuxtConfiguration
    ) => {
      hook: typeof hookSpy
      options: NuxtConfiguration
      ready: typeof readySpy
      server: {
        listen: typeof listenSpy
        listeners: [
          {
            url: string
          }
        ]
      }
    }
  >
}

declare module 'execa' {
  const value: jest.Mock<typeof import('execa/index')>

  export default value
}

declare module 'opener' {
  const value: jest.Mock<typeof import('opener/index')>

  export default value
}
