import { Options } from './options'

const defaults: Options = {
  root: process.cwd(),
  publicDir: 'public',
  server: true,
  swCache: false,
  dotEnvExport: false
}

export default defaults
