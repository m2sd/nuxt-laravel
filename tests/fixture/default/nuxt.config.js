const { resolve } = require('path')

module.exports = {
  mode: 'spa',
  rootDir: __dirname,
  buildDir: resolve(__dirname, '.nuxt'),
  modules: [require('../../../src/module').default]
}
