# Nuxt Laravel

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](https://commitizen.github.io/cz-cli/)
[![npm](https://img.shields.io/npm/v/nuxt-laravel/next.svg)](https://www.npmjs.com/package/nuxt-laravel/v/next)

**Jest coverage:**

| Statements                  | Branches                | Functions                 | Lines             |
| --------------------------- | ----------------------- | ------------------------- | ----------------- |
| ![Statements](#statements#) | ![Branches](#branches#) | ![Functions](#functions#) | ![Lines](#lines#) |

> **Disclaimer:** I failed to tag previous versions of this module as a prerelease, please do not consider the api as stable.  
> Once the stable release is cut this disclaimer will be removed and the module will be versioned correctly.

Looking for the old CLI extension? [nuxt-laravel](https://github.com/m2sd/nuxt-laravel/tree/legacy).

This module makes it easy to integrate a [NuxtJS](https://nuxtjs.org) SPA into a [Laravel](https://laravel.com) application.  
The implementation is based on [laravel-nuxt-js](https://github.com/skyrpex/laravel-nuxt-js) by [skyrpex](https://github.com/skyrpex).

> **Hint:** Use his composer exension [laravel-nuxt](https://github.com/skyrpex/laravel-nuxt) if you want to forward multiple specific routes to nuxt.

## Features

* Easyly deploy an existing Nuxt app inside a Laravel application
* Test your Nuxt app with live reloading, HMR and the Laravel test server with a single command
* Seamlessly integrate Nuxt into the URL resolution of Laravel
* Share cookies and session state between frontend (Nuxt) and backend (Laravel) without the need for an API token

## Setup

### Installation

Install this package and its peer dependencies.

```bash
npm install --save-dev @nuxtjs/axios @nuxtjs/proxy nuxt-laravel@next
```

### Configuration

Simply include `nuxt-laravel` in `modules` and set the `mode` setting to `'spa'` in your `nuxt.config.js`

```js
export default {
  mode: 'spa',
  modules: [
    // if you are using @nuxtjs/axios in your config, make sure to include them above nuxt-laravel
    //'@nuxtjs/axios',
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

| option         | type      | description                                                                                                   | default                                                  |
| -------------- | --------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `root`         | `string`  | Path to laravel directory (is resolved relative to `process.cwd()`)                                           | `process.cwd()`                                          |
| `publicDir`    | `string`  | The folder where laravel serves assets from (is resolved relative to `root`)                                  | `'public'`                                               |
| `publicPath`   | `string`  | Folder location to which generated assets are output (is resolved relative to and must reside in `publicDir`) | `process.env.NUXT_OUTPUT_PATH || nuxtConfig.router.base` |
| `outputPath`   | `string`  | File location to which the index route will be rendered, (is resolved relative to `root`)                     | `path.join(publicDir, publicPath, '_spa.html')`          |
| `server`       | `object`  | Settings for the Laravel testserver                                                                           | *(see below)*                                            |
| `dotEnvExport` | `boolean` | Whether the `NUXT_OUTPUT_PATH` varibale should be written to the `.env` file in the laravel root directory    | `false`                                                  |

The module loads the `.env` file from yout laravel root, so you can set the `NUXT_OUTPUT_PATH` environment variable from there.

#### The `server` setting

| option | type     | description                 | default                      |
| ------ | -------- | --------------------------- | ---------------------------- |
| `host` | `string` | Hostname for the testserver | `nuxtConfig.server.host`     |
| `port` | `number` | Port for the testserver     | `nuxtConfig.server.port + 1` |

#### The `publicPath` setting

If `publicPath` is set manually and does not reside inside configured `publicDir` the module will be deactivated.  
If `publicPath` is set manually and is valid `nuxtConfig.router.base` will be overwritten with the resolved URL.

## Laravel integration

Laravel integration is accomplished through two environment variables.

* **`APP_URL`:**  
  Laravel uses this to generate asset URLs.  
  * When the Laravel test server is started through this module this variable is overwritten with the nuxt test server URL origin via putenv.

* **`NUXT_OUTPUT_PATH`:**  
  Use this variable to redirect all web traffic to, which you want handled by nuxt.  
  * When the Laravel test server is started through this module this variable is overwritten with a special index route on the nuxt test server via putenv.  
  * When nuxt is build through this module (and `dotEnvExport` is truthy) this variable will be written to the `.env` file in laravels root directory, containing the resolved `outputPath` (see above).

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
    '{path}',
    function($request) {
      // ...
      // If the request expects JSON, it means that
      // someone sent a request to an invalid route.
      if ($request->expectsJson()) {
          abort(404);
      }

      // Fetch and display the page from the render path on nuxt dev server or fallback to static file
      return file_get_contents(getenv('NUXT_OUTPUT_PATH') ?: public_path('_spa.html'));
    }
)->where('path', '.*')
 // Redirect to Nuxt from within Laravel
 // by using Laravels route helper
 // e.g.: `route('nuxt', ['path' => '/<nuxtPath>'])`
 ->name('nuxt');
```

#### Forward multiple specific routes to nuxt (using [laravel-nuxt](https://github.com/skyrpex/laravel-nuxt))

Make sure nuxt path resolution of nuxt router corresponds to the defined routes.  

> **IMPORTANT:** This example assumes the module option `publicPath` to have been set to `'app'`.

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
    'page' => getenv('NUXT_OUTPUT_PATH') ?: public_path('_spa.html')
];
```

`routes/web.php`:

```php
/**
 * Forward specific route to nuxt router
 *
 * This route is redered by `<nuxtRoot>/pages/index.vue`
 */
Route::get(
    'app',
    '\\'.Pallares\LaravelNuxt\Controllers\NuxtController::class
)->name('nuxt');

/**
 * Forward all subpages of a specific route to nuxt router
 *
 * These routes are rendered by:
 * - if `{uri} = '/'`
 *   `<nuxtRoot>/pages/subpage.vue`
 *    or
 *   `<nuxtRoot>/pages/subpage/index.vue`
 *
 * - if `{uri} = '/<subpages>'` (`<subpages>` may contain slashes '/')
 *   `<nuxtRoot>/pages/subpage/<subpages>.vue`
 *   or
 *   `<nuxtRoot>/pages/subpage/<subpages>/index.vue`
 */
Route::get(
    'app/subpage{path}',
    '\\'.Pallares\LaravelNuxt\Controllers\NuxtController::class
)->where('path', '^\/.*')
 // Redirect to a spcific subpage/<path> from within Laravel
 // by using Laravels route helper
 // e.g.: `route('nuxt.subpage.path', ['path' => '/<path>'])`
 ->name('nuxt.subpage.path');

// Catch missing trailing slash
Route::get(
    'app/subpage',
    '\\'.Pallares\LaravelNuxt\Controllers\NuxtController::class
)->name('nuxt.subpage');
```
