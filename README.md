# Nuxt Laravel

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](https://commitizen.github.io/cz-cli/)
[![npm](https://img.shields.io/npm/v/nuxt-laravel/next.svg)](https://www.npmjs.com/package/nuxt-laravel/v/next)

**Jest coverage:**

| Statements                  | Branches                | Functions                 | Lines             |
| --------------------------- | ----------------------- | ------------------------- | ----------------- |
| ![Statements](https://img.shields.io/badge/Coverage-0%25-red.svg) | ![Branches](https://img.shields.io/badge/Coverage-0%25-red.svg) | ![Functions](https://img.shields.io/badge/Coverage-0%25-red.svg) | ![Lines](https://img.shields.io/badge/Coverage-0%25-red.svg) |

Looking for the old CLI extension? [nuxt-laravel](https://github.com/m2sd/nuxt-laravel/tree/legacy).

This module makes it easy to integrate a [NuxtJS](https://nuxtjs.org) SPA into a [Laravel](https://laravel.com) application.  
The implementation is based on [laravel-nuxt-js](https://github.com/skyrpex/laravel-nuxt-js) by [skyrpex](https://github.com/skyrpex).

> **Hint:** Use his composer exension [laravel-nuxt](https://github.com/skyrpex/laravel-nuxt) if you want to forward multiple specific routes to nuxt.

## Features

* Easyly deploy an existing Nuxt app inside a Laravel application
* Test your Nuxt app with live reloading, HMR and the Laravel backend with a single command
* Seamlessly combine the URL resolution of Laravel and Nuxt
* Share cookies and session state between frontend (Nuxt) and backend (Laravel) without the need for an API token

## Setup

### Installation

Install this package and its peer dependencies.

```bash
npm install --save-dev @nuxtjs/axios @nuxtjs/proxy nuxt-laravel@next
```

### Configuration

Simply include `nuxt-laravel` in `buildModules` (or `modules` for `nuxt@^2.8`) and set the `mode` setting to `'spa'` in your `nuxt.config.js`

```js
export default {
  mode: 'spa',
  buildModules: [
    // if you are using @nuxtjs/axios or @nuxtjs/proxy in your config, make sure to include them above nuxt-laravel
    //'@nuxtjs/axios',
    //'@nuxtjs/proxy', (nuxt@^2.8 only as this should not be included in buildModules)
    'nuxt-laravel'
  ]
}
```

If your `package.json` lives in the Laravel root folder you are done.

Otherwise set the path to your Laravel root folder through the configuration.

```js
export default {
  mode: 'spa',
  modules: [
    'nuxt-laravel'
  ],
  laravel: {
    root: './path/to/laravel'
  }
}
```

### Module Options

| option         | type      | description                                                                                                | default                                                  |
| -------------- | --------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `root`         | `string`  | Path to laravel directory                                                                                  | `process.cwd()`                                          |
| `publicPath`   | `string`  | The folder where laravel serves assets from                                                                | `'public'`                                               |
| `outputPath`   | `string`  | Location of the SPA inside the public folder                                                               | `process.env.NUXT_OUTPUT_PATH || nuxtConfig.router.base` |
| `server`       | `object`  | Settings for the Laravel testserver                                                                        | *(see below)*                                            |
| `dotEnvExport` | `boolean` | Whether the `NUXT_OUTPUT_PATH` varibale should be written to the `.env` file in the laravel root directory | `false`                                                  |

The module loads the `.env` file from yout laravel root, so you can set the `NUXT_OUTPUT_PATH` environment variable from there.

#### `server` setting

| option | type     | description                 | default                      |
| ------ | -------- | --------------------------- | ---------------------------- |
| `host` | `string` | Hostname for the testserver | `nuxtConfig.server.host`     |
| `port` | `number` | Port for the testserver     | `nuxtConfig.server.port + 1` |

---
> **File and Folder resolution**:  
> `root` is resolved relative to `process.cwd()`, in other words: where you execute your `npx nuxt` command from.  
> `publicPath` is resolved relative to the resolved `root` path.  
> `outputPath` is resolved relative to the resolved `publicPath`.
>
> Additional `fileName` and `destDir` settings are set automatically according to the resolved `outputPath` following this ruleset:
>
> * __If `outputPath` ends with `'.html'`__  
>   `fileName = path.basename(outputPath)`  
>   `destDir = path.dirname(outputPath)`
> * __If `outputPath` is equal to `publicPath`__  
>   `fileName = 'spa.html'`  
>   `destDir = publicPath`
> * __Else__  
>   `fileName = index.html`  
>   `destDir = outputPath`

## Laravel integration

Laravel integration is accomplished through two environment variables.

* **`APP_URL`:**  
  Laravel uses this to generate asset URLs.  
  * When the Laravel test server is started through this module this variable is overwritten with the nuxt test server URL via putenv.

* **`NUXT_OUTPUT_PATH`:**  
  Use this variable to redirect all web traffic to, which you want handled by nuxt.  
  * When the Laravel test server is started through this module this variable is overwritten with the nuxt test server HMR endpoint via putenv.  
  * When nuxt is build through this module (and `dotEnvExport` is truthy) this variable will be written to the `.env` file in laravels root directory, containing the resolved `filePath` (`path.join(destDir, fileName)`, see above).

> **!!! Attention !!!:** You have to use PHPs native `getenv()` function, instead of Laravels `env()` helper to retrieve these varaibles, because the Laravel helper ignores putenv vars.

### Example Laravel configuration

`config/app.php`:

```php
    // ...
    /*
    |--------------------------------------------------------------------------
    | Application URL
    |--------------------------------------------------------------------------
    |
    | This URL is used by the console to properly generate URLs when using
    | the Artisan command line tool. You should set this to the root of
    | your application so that it is used when running Artisan tasks.
    |
    */

    'url' => getenv('APP_URL') ?: 'http://localhost:8000',

    // ...
```

#### Forwarding all undefined routes to nuxt

`routes/web.php`:

```php
// ...
// Add this route last as a catch all for undefined routes.
Route::get(
    '{uri}',
    function($request, $uri) {
      // ...
      // If the request expects JSON, it means that
      // someone sent a request to an invalid route.
      if ($request->expectsJson()) {
          abort(404);
      }

      // Fetch and display the page from the render path on nuxt dev server or fallback to static file
      return file_get_contents(getenv('NUXT_OUTPUT_PATH') ?: public_path('spa.html'));
    }
)->where('uri', '.*');
```

#### Forward multiple specific routes to nuxt (using [laravel-nuxt](https://github.com/skyrpex/laravel-nuxt))

`config/nuxt.php`:

```php
return [
    /**
     * In production, the SPA page will be located in the filesystem.
     * The location can be set by env variable NUXT_OUTPUT_PATH or falls back to a static file location
     *
     * In development, the SPA page will be fetched from the nuxt development server.
     * The nuxt server URL will be passed by overwriting the env variable NUXT_OUTPUT_PATH.
     */
    'page' => getenv('NUXT_OUTPUT_PATH') ?: public_path('spa.html')
];
```

`routes/web.php`:

```php
// Make sure nuxt path resolution of nuxt router corresponds to the defined routes

/**
 * Forward specific route to nuxt router
 *
 * This route could be defined:
 * - in `<nuxtRoot>/pages/app.vue` or `<nuxtRoot>/pages/app/index.vue`
 * - in `<nuxtRoot>/pages/index.vue` if `nuxtConfig.router.base = 'app'`
 */
Route::get(
    'app',
    '\\'.Pallares\LaravelNuxt\Controllers\NuxtController::class
);

/**
 * Forward all subpages of a specific route to nuxt router
 *
 * These routes could be defined ({uri} may contain slashes '/'):
 * - in `<nuxtRoot>/pages/app/subpage.vue` if `{uri} = '/'`
 * - in `<nuxtRoot>/pages/app/subpage/{uri}.vue` if `{uri} =  '/<subpages>'
 * - in `<nuxtRoot>/pages/subpage.vue` if `{uri} = '/'` and `nuxtConfig.router.base = 'app'`
 * - in `<nuxtRoot>/pages/subpage/{uri}.vue` if `{uri} = '/<subpages>'` and `nuxtConfig.router.base = 'app'`
 */
Route::get(
    'app/subpage{uri}',
    '\\'.Pallares\LaravelNuxt\Controllers\NuxtController::class
)->where('uri', '^\/.*');

// for missing trailing slash
Route::get(
    'app/subpage',
    '\\'.Pallares\LaravelNuxt\Controllers\NuxtController::class
);
```
