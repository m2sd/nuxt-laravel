# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [4.1.5](https://github.com/m2sd/nuxt-laravel/compare/v4.1.4...v4.1.5) (2019-10-13)


### Bug Fixes

* **build:** avoid overwriting the folder if destDir equals publicDir ([2d6b8fe](https://github.com/m2sd/nuxt-laravel/commit/2d6b8fefd4896aa42ad6a673283bfd5e77828cb1))

### [4.1.4](https://github.com/m2sd/nuxt-laravel/compare/v4.1.3...v4.1.4) (2019-10-13)

### [4.1.3](https://github.com/m2sd/nuxt-laravel/compare/v4.1.2...v4.1.3) (2019-10-13)


### Bug Fixes

* **routing:** adjust router base correction ([2575165](https://github.com/m2sd/nuxt-laravel/commit/2575165016198dc573b16c9372a0930c50a1518a))

### [4.1.2](https://github.com/m2sd/nuxt-laravel/compare/v4.1.1...v4.1.2) (2019-10-13)


### Bug Fixes

* **build:** use correct resolution for router base ([a1703f6](https://github.com/m2sd/nuxt-laravel/commit/a1703f68423f3130ae2bd22486d41fdf4a14dc52))

### [4.1.1](https://github.com/m2sd/nuxt-laravel/compare/v4.1.0...v4.1.1) (2019-10-13)

## [4.1.0](https://github.com/m2sd/nuxt-laravel/compare/v4.0.1...v4.1.0) (2019-10-13)


### Features

* **build:** update router configuration if necessary ([8b2b798](https://github.com/m2sd/nuxt-laravel/commit/8b2b798a5904579258281099025f5e3c30fe12a4))

### [4.0.1](https://github.com/m2sd/nuxt-laravel/compare/v4.0.0...v4.0.1) (2019-10-13)

## [4.0.0](https://github.com/m2sd/nuxt-laravel/compare/v3.1.3...v4.0.0) (2019-10-13)


### ⚠ BREAKING CHANGES

* **global:** cli tool no longer available, configuration via nuxt.config

### Features

* **global:** finalize module implementation and documentation ([52a64a4](https://github.com/m2sd/nuxt-laravel/commit/52a64a4a5c4e35d34f1f0672468f06672cbdc972))


### Bug Fixes

* **config:** fall back to empty object if proxy is not set ([e05350b](https://github.com/m2sd/nuxt-laravel/commit/e05350ba69713d2a9c20aa2c32371598bd02c033))


* **global:** migrate functionality into nuxt module ([39ea96c](https://github.com/m2sd/nuxt-laravel/commit/39ea96cf71dbfcab72e8fe4a50e443fa96d2ba24))

<a name="3.1.3"></a>
## [3.1.3](https://github.com/m2sd/nuxt-laravel/compare/v3.1.2...v3.1.3) (2019-06-20)



<a name="3.1.2"></a>
## [3.1.2](https://github.com/m2sd/nuxt-laravel/compare/v3.1.1...v3.1.2) (2019-06-20)



<a name="3.1.1"></a>
## [3.1.1](https://github.com/m2sd/nuxt-laravel/compare/v3.1.0...v3.1.1) (2019-06-20)



<a name="3.1.0"></a>
# [3.1.0](https://github.com/m2sd/nuxt-laravel/compare/v3.0.3...v3.1.0) (2019-06-19)


### Features

* **command/build:** move actual asset deployment out of hook stack ([a9eb4de](https://github.com/m2sd/nuxt-laravel/commit/a9eb4de))



<a name="3.0.3"></a>
## [3.0.3](https://github.com/m2sd/nuxt-laravel/compare/v3.0.2...v3.0.3) (2019-06-19)


### Bug Fixes

* **command/dev:** only ignore render path ([ecd4535](https://github.com/m2sd/nuxt-laravel/commit/ecd4535))



<a name="3.0.2"></a>
## [3.0.2](https://github.com/m2sd/nuxt-laravel/compare/v3.0.1...v3.0.2) (2019-06-19)


### Bug Fixes

* **command/dev:** move proxy path to respect router.base ([2844182](https://github.com/m2sd/nuxt-laravel/commit/2844182))



<a name="3.0.1"></a>
## [3.0.1](https://github.com/m2sd/nuxt-laravel/compare/v3.0.0...v3.0.1) (2019-06-19)


### Bug Fixes

* **command/dev:** load full nuxt config for laravel testserver settings ([4240d76](https://github.com/m2sd/nuxt-laravel/commit/4240d76))



<a name="3.0.0"></a>
# [3.0.0](https://github.com/m2sd/nuxt-laravel/compare/v2.2.0...v3.0.0) (2019-06-18)


### Features

* **command/dev:** implement support for router.base setting ([34e6fd5](https://github.com/m2sd/nuxt-laravel/commit/34e6fd5))


### BREAKING CHANGES

* **command/dev:** change file-path logic in command/build



<a name="2.2.0"></a>
# [2.2.0](https://github.com/m2sd/nuxt-laravel/compare/v2.1.3...v2.2.0) (2019-06-17)


### Features

* **command/build:** implement support for router.base setting ([115d4de](https://github.com/m2sd/nuxt-laravel/commit/115d4de))



<a name="2.1.3"></a>
## [2.1.3](https://github.com/m2sd/nuxt-laravel/compare/v2.1.2...v2.1.3) (2019-05-24)


### Bug Fixes

* **command/dev:** use ip for localhost to avoid ip6 conflicts ([ddd6fed](https://github.com/m2sd/nuxt-laravel/commit/ddd6fed))



<a name="2.1.2"></a>
## [2.1.2](https://github.com/m2sd/nuxt-laravel/compare/v2.1.1...v2.1.2) (2019-05-13)


### Bug Fixes

* **command/build:** optimize path resolution ([cc97a4b](https://github.com/m2sd/nuxt-laravel/commit/cc97a4b))



<a name="2.1.1"></a>
## [2.1.1](https://github.com/m2sd/nuxt-laravel/compare/v2.1.0...v2.1.1) (2019-05-13)


### Bug Fixes

* **command/build:** resolve static dir relative to root dir ([c07285e](https://github.com/m2sd/nuxt-laravel/commit/c07285e))



<a name="2.1.0"></a>
# [2.1.0](https://github.com/m2sd/nuxt-laravel/compare/v2.0.5...v2.1.0) (2019-05-13)


### Features

* **command/build:** copy static dir on build ([1bea8eb](https://github.com/m2sd/nuxt-laravel/commit/1bea8eb))



<a name="2.0.5"></a>
## [2.0.5](https://github.com/m2sd/nuxt-laravel/compare/v2.0.4...v2.0.5) (2019-05-05)



<a name="2.0.4"></a>
## [2.0.4](https://github.com/m2sd/nuxt-laravel/compare/v2.0.3...v2.0.4) (2019-05-05)


### Reverts

* **command/dev:** revert to previous implementation ([1d78dd8](https://github.com/m2sd/nuxt-laravel/commit/1d78dd8))



<a name="2.0.3"></a>
## [2.0.3](https://github.com/m2sd/nuxt-laravel/compare/v2.0.2...v2.0.3) (2019-05-04)



<a name="2.0.2"></a>
## [2.0.2](https://github.com/m2sd/nuxt-laravel/compare/v2.0.1...v2.0.2) (2019-05-04)


### Bug Fixes

* **command/dev:** update proxy settings after integration tests ([a93e1a1](https://github.com/m2sd/nuxt-laravel/commit/a93e1a1))



<a name="2.0.1"></a>
## [2.0.1](https://github.com/m2sd/nuxt-laravel/compare/v2.0.0...v2.0.1) (2019-05-03)


### Bug Fixes

* **command/dev:** remove awaiter for laravel dev server ([c65dfc8](https://github.com/m2sd/nuxt-laravel/commit/c65dfc8))



<a name="2.0.0"></a>
# [2.0.0](https://github.com/m2sd/nuxt-laravel/compare/v1.1.2...v2.0.0) (2019-05-03)


### Features

* add subcommand resolution and early fail ([74f70b9](https://github.com/m2sd/nuxt-laravel/commit/74f70b9))


### BREAKING CHANGES

* api adapted to nuxt command structure



<a name="1.1.2"></a>
## [1.1.2](https://github.com/m2sd/nuxt-laravel/compare/v1.1.1...v1.1.2) (2019-04-29)



<a name="1.1.1"></a>
## [1.1.1](https://github.com/m2sd/nuxt-laravel/compare/v1.1.0...v1.1.1) (2019-04-28)



<a name="1.1.0"></a>
# 1.1.0 (2019-04-28)


### Features

* **global:** first commit ([f8364ab](https://github.com/m2sd/nuxt-laravel/commit/f8364ab))



<a name="1.0.0"></a>
# 1.0.0 (2019-04-28)


### Features

* **global:** first commit ([f8364ab](https://github.com/m2sd/nuxt-laravel/commit/f8364ab))
