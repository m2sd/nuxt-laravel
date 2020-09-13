# Nuxt Laravel

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](https://commitizen.github.io/cz-cli/)
[![npm](https://img.shields.io/npm/v/nuxt-laravel)](https://www.npmjs.com/package/nuxt-laravel)

**Jest coverage:**

| Statements                  | Branches                | Functions                 | Lines             |
| --------------------------- | ----------------------- | ------------------------- | ----------------- |
| ![Statements](https://img.shields.io/badge/Coverage-90.8%25-brightgreen.svg "Make me better!") | ![Branches](https://img.shields.io/badge/Coverage-79.84%25-red.svg "Make me better!") | ![Functions](https://img.shields.io/badge/Coverage-76.47%25-red.svg "Make me better!") | ![Lines](https://img.shields.io/badge/Coverage-90.68%25-brightgreen.svg "Make me better!") |

Looking for the old CLI extension? [nuxt-laravel](https://github.com/m2sd/nuxt-laravel/tree/legacy).

This module makes it easy to integrate a [NuxtJS](https://nuxtjs.org) SPA into a [Laravel](https://laravel.com) application.  
The implementation is based on [laravel-nuxt-js](https://github.com/skyrpex/laravel-nuxt-js) by [skyrpex](https://github.com/skyrpex).

There is a companion extension also based on [skyrpex](https://github.com/skyrpex)'s work, which makes it very easy to set up nuxt inside an existing laravel project: [m2s/laravel-nuxt](https://github.com/m2sd/laravel-nuxt)

> *Hint*: Use the companion extension for routing integration with laravel.

## Features

* Easily deploy an existing Nuxt app inside a Laravel application or vice versa
* Test your Nuxt app with live reloading, HMR and the auto-configured Laravel test server
* Seamlessly integrate Nuxt into the URL resolution of Laravel
* Share cookies and session state between frontend (Nuxt) and backend (Laravel) without the need for an API token

## Setup

### Installation

> **Hint:** If your stating fresh consider cloning [nuxt-laravel-starter](https://github.com/m2sd/nuxt-laravel-starter)

Install this package and its peer dependencies.

```bash
npm install --save-dev @nuxtjs/axios @nuxtjs/proxy nuxt-laravel
```

or

```bash
yarn add --dev @nuxtjs/axios @nuxtjs/proxy nuxt-laravel
```

#### Typescript

To have code completion/type checking on the `Configuration` interface from `@nuxt/types`, include the package in your `tsconfig.json`.

```json
{
  "compilerOptions": {
    // ...
    "types": [
        "@nuxt/types",
        // ...
        "nuxt-laravel"
    ]
  }
}
```

### Configuration

Simply include `nuxt-laravel` in `modules` and set the `mode` setting to `'spa'` in your `nuxt.config.js`

```js
export default {
  mode: 'spa',
  modules: [
    // Include it first, so that configuration alterations are propagated to other modules
    'nuxt-laravel'
    // ... other modules
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

| option         | type                  | description                                                                                                                                                                   | default         |
| -------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `root`         | `string`              | Path to laravel directory (is resolved relative to `process.cwd()`)                                                                                                           | `process.cwd()` |
| `publicDir`    | `string`              | The folder where laravel serves assets from (is resolved relative to `root`)                                                                                                  | `'public'`      |
| `outputPath`   | `string`              | File location to which an additional index route will be rendered, useful if you want to store it in a folder outside of Laravels public dir (is resolved relative to `root`) | `null`          |
| `server`       | `boolean` or `object` | Settings for the Laravel testserver                                                                                                                                           | *(see below)*   |
| `swCache`      | `boolean` or `object` | Settings for a cache endpoint workbox extensions using `@nuxtjs/pwa`                                                                                                          | *(see below)*   |
| `dotEnvExport` | `boolean`             | Whether the `NUXT_OUTPUT_PATH` varibale should be written to the `.env` file in the laravel root directory                                                                    | `false`         |

The module loads the `.env` file from your laravel root, so you can set the `NUXT_OUTPUT_PATH` environment variable from there.

#### The `server` setting

If this setting is set to `false` the module will be disabled for development.  
Setting this to `true` is equivalent to omitting it and will simply use the default configuration.

| option | type     | description                 | default                      |
| ------ | -------- | --------------------------- | ---------------------------- |
| `host` | `string` | Hostname for the testserver | `nuxtConfig.server.host`     |
| `port` | `number` | Port for the testserver     | `nuxtConfig.server.port + 1` |

#### The `swCache` setting

To use this setting you have to install the optional dependency `@nuxtjs/pwa`.

```bash
npm install --save-dev @nuxtjs/pwa
```

or

```bash
yarn add --dev @nuxtjs/pwa
```

If this setting is set to `true` the caching endpoint will be added with the default configuration.

| option     | type     | description                                                                               | default                   |
| ---------- | -------- | ----------------------------------------------------------------------------------------- | ------------------------- |
| `name`     | `string` | The name for the cache to which values are written                                        | `'__nuxt_laravel'`        |
| `fileName` | `string` | The name for the file generated in the nuxt buildDir                                      | `'workbox.cache.js'`      |
| `endpoint` | `string` | The endpoint to which values can be `post`ed/from which values can be gotten (`get`) from | `'/__nuxt_laravel_cache'` |

#### Path resolution inside `publicDir`

If `nuxtConfig.router.base` is not set the SPA will be generated in the `publicDir` root with an index file name of `spa.html`.  
If `nuxtConfig.router.base` is set the SPA will be generated in a corresponding location inside `publicDir` with the default index file name `index.html`.

## Laravel integration

Laravel integration is accomplished through two environment variables.

* **`APP_URL`:**  
  Laravel uses this to generate asset URLs.  
  * When the Laravel test server is started through this module this variable is overwritten with the nuxt test server URL origin via `putenv`.

* **`NUXT_OUTPUT_PATH`:**  
  Use this variable to redirect all web traffic to, which you want handled by nuxt.  
  * When the Laravel test server is started through this module this variable is overwritten with a special index route on the nuxt test server via `putenv`.  
  * When nuxt is build through this module (and `dotEnvExport` is truthy) this variable will be written to the `.env` file in laravels root directory, containing the resolved `outputPath` (see above).

> **❗❗❗ Attention ❗❗❗:**  
> Make sure your `putenv` is in the `disabled_functions` in your `php.ini`  
> and that `putenv` support is enabled for the laravel `env()` helper.
>
> Alternatively (still: if `putenv` is enabled in PHP) you can just use the `getenv()` function directly.  
> If you want to use `putenv` directly you should update your `config/app.php` to get `APP_URL` that way.

### Example scaffolding in existent Laravel application

#### The easy way

1. Install [m2s/laravel-nuxt](https://github.com/m2sd/laravel-nuxt):

   ```sh
   composer require m2s/laravel-nuxt
   ```

2. Execute the install command (`<source>` can be omitted and defaults to `resources/nuxt`)

   ```sh
   php artisan nuxt:install <source>
   ```

#### The hard (all configuration in project root) way

1. Create a new nuxt app in `resources/nuxt`

   ```bash
   npx create-nuxt-app resources/nuxt
   ```

2. Migrate all dependencies and scipts (most importantly `dev` and `build`) from `resources/nuxt/package.json` into `package.json` in Laravel root and delete it
3. Move all configuration files from `resources/nuxt` to Laravel root (or merge where appropiate, e.g. `.editorconfig`)
4. Install the module and it's peer dependencies

   ```bash
   npm i -D nuxt-laravel@next @nuxtjs/axios @nuxtjs/proxy
   ```

5. Update `nuxt.config.js`

   ```js
   module.exports = {
     srcDir: 'resources/nuxt',
     mode: 'spa',
     // ... other config
     modules: [
       'nuxt-laravel',
       // ... other modules
     ]
   }
   ```

6. (Optional) If you use jest, or other tools that reference the Nuxt root independently, you have to update thier respective configuration to make them work correctly.  
   Example `jest.config.js`:

   ```js
   module.exports = {
     rootDir: 'resources/nuxt',
     // ... other configurtion
   }
   ```

### Example Laravel configuration

#### Forwarding all undefined routes to nuxt

`routes/web.php`:

```php
// ...
// Add this route last as a catch all for undefined routes.
Route::get(
    '/{path?}',
    function($request) {
      // ...
      // If the request expects JSON, it means that
      // someone sent a request to an invalid route.
      if ($request->expectsJson()) {
          abort(404);
      }

      // Fetch and display the page from the render path on nuxt dev server or fallback to static file
      return file_get_contents(env('NUXT_OUTPUT_PATH', public_path('spa.html'));
    }
)->where('path', '.*')
 // Redirect to Nuxt from within Laravel
 // by using Laravels route helper
 // e.g.: `route('nuxt', ['path' => '/<nuxtPath>'])`
 ->name('nuxt');
```

#### Forward multiple specific routes to nuxt (using [laravel-nuxt](https://github.com/m2sd/laravel-nuxt))

This example assumes option `nuxtConfig.router.base` to have been set to `'/app/'`

> **❗❗❗ Attention ❗❗❗:**  
> Nuxt router has problems resolving the root route without a trailing slash.  
> You will have to handle this in your server configuration:
>
> * **Nginx:** `rewrite ^/app$ /app/ last;`
> * **Apache:** `RewriteRule ^/app$ /app/ [L]`
> * **Artisan:**
>   In `server` file:
>
>   ```php
>   // ...
>
>   // This file allows us to emulate Apache's "mod_rewrite" functionality from the
>   // built-in PHP web server. This provides a convenient way to test a Laravel
>   // application without having installed a "real" web server software here.
>   if ('/app' === $uri) {
>       header('Status: 301 Moved Permanently', false, 301);
>       header('Location: '.$uri.'/');
>
>       return true;
>   } elseif ('/' !== $uri && file_exists(__DIR__.'/public'.$uri)) {
>       return false;
>   }
>
>   // ...
>   ```

`config/nuxt.php`:

```php
return [
    'routing' => false,
    'prefix'  => 'app'
    'source'  => env('NUXT_OUTPUT_PATH', public_path('app/index.html'))
];
```

`routes/web.php`:

```php

use M2S\LaravelNuxt\Facades\Nuxt;
/**
 * Forward specific route to nuxt router
 *
 * This route is redered by `<nuxtRoot>/pages/index.vue`
 */
Nuxt::route('/')->name('nuxt');

/**
 * Forward all paths under a specific URI to nuxt router
 *
 * These routes are rendered by:
 * - if `{path} = '/'`
 *   `<nuxtRoot>/pages/subpage.vue`
 *    or
 *   `<nuxtRoot>/pages/subpage/index.vue`
 *
 * - if `{path} = '/<path>'` (`<path>` may contain slashes '/')
 *   `<nuxtRoot>/pages/subpage/<path>.vue`
 *   or
 *   `<nuxtRoot>/pages/subpage/<path>/index.vue`
 */
Nuxt::route('subpage/{path?}')->where('path', '.*')
 // Redirect to a spcific subpage/<path> from within Laravel
 // by using Laravels route helper
 // e.g.: `route('nuxt.subpage', ['path' => '/<path>'])`
 ->name('nuxt.subpage');
```
