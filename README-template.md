# Nuxt Laravel

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](https://commitizen.github.io/cz-cli/)
[![npm](https://img.shields.io/npm/v/nuxt-laravel/next.svg)](https://www.npmjs.com/package/nuxt-laravel)

**Jest coverage:**

| Statements                  | Branches                | Functions                 | Lines             |
| --------------------------- | ----------------------- | ------------------------- | ----------------- |
| ![Statements](#statements#) | ![Branches](#branches#) | ![Functions](#functions#) | ![Lines](#lines#) |

This module makes it easy to integrate a [NuxtJS](https://nuxtjs.org) SPA into a [Laravel](https://laravel.com) application.  
The implementation is based on [laravel-nuxt-js](https://github.com/skyrpex/laravel-nuxt-js) by [skyrpex](https://github.com/skyrpex).

## Features

* Easyly deploy an existing Nuxt app inside a Laravel application
* Test your Nuxt app with live reloading, HMR and the Laravel backend with a single command
* Seamlessly combine the URL resolution of Laravel and Nuxt
* Share cookies and session state between frontend (Nuxt) and backend (Laravel) without the need for an API token

## Setup

### Installation

Install this package and its peer dependencies.

```bash
npm install --save-dev @nuxtjs/axios @nuxtjs/proxy nuxt-laravel
```

### Configuration

Simply include `nuxt-laravel` in `modules` and set the `mode` setting to `'spa'` in your `nuxt.config.js`

```js
export default {
  mode: 'spa',
  modules: [
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

#### `server` setting

| option | type     | description                 | default                      |
| ------ | -------- | --------------------------- | ---------------------------- |
| `host` | `string` | Hostname for the testserver | `nuxtConfig.server.host`     |
| `port` | `number` | Port for the testserver     | `nuxtConfig.server.port + 1` |

### Laravel integration

Laravel integration is accomplished through two environment variables.

* **`APP_URL`:**  
  Laravel uses this to generate asset URLs.  
  When the Laravel test server is started through this module this variable is overwritten with the nuxt test server URL via putenv.
* **`NUXT_OUTPUT_PATH`:**  
  Use this variable to redirect all web traffic to, which you want handled by nuxt.  
  When the Laravel test server is started through this module this variable is overwritten with the nuxt test server HMR endpoint via putenv.  
  Wehn nuxt is build through this module (and `exportDotEnv = true`) this variable will be written to the `.env` file in laravels root directory, containing the resolved `filePath` (`path.join(destDir, fileName)`, see above).

> **!!! Attention !!!:** You have to use PHPs native `getenv()` function, instead of Laravels `env()` helper to retrieve these varaibles, because the Laravel helper ignores putenv vars.

#### Example Laravel configuration

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
