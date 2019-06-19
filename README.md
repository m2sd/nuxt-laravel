# Nuxt Laravel

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

**Jest coverage**

| Statements                  | Branches                | Functions                 | Lines             |
| --------------------------- | ----------------------- | ------------------------- | ----------------- |
| ![Statements](https://img.shields.io/badge/Coverage-91.3%25-brightgreen.svg) | ![Branches](https://img.shields.io/badge/Coverage-71.93%25-red.svg) | ![Functions](https://img.shields.io/badge/Coverage-86.67%25-yellow.svg) | ![Lines](https://img.shields.io/badge/Coverage-92.11%25-brightgreen.svg) |

This package allows to develop a nuxt SPA as frontend for a laravel backend.  
The implementation is based on [laravel-nuxt-js](https://github.com/skyrpex/laravel-nuxt-js) by [skyrpex](https://github.com/skyrpex).
> **Hint:** Use his composer exension [laravel-nuxt](https://github.com/skyrpex/laravel-nuxt) for dotenv support

## Installation

Install the package and its peer dependencies.

```bash
npm install --save nuxt @nuxtjs/axios @nuxtjs/proxy nuxt-laravel
```

## Usage

The package provides a binary which extends the `@nuxt/cli`, therefore you can use it directly with the nuxt cli command.

In you package json:

```json
{
  "scripts": {
    "dev": "nuxt laravel",
    "start": "npm run dev",
    "build": "nuxt laravel build"
  }
}
```

## Commands

### Development

```bash
npx nuxt laravel
```

or

```bash
npx nuxt laravel dev
```

Starts both Nuxt and Laravel artisan servers in development mode (hot-code reloading, error reporting, etc).

#### Additional `dev` options

In addition to the default `nuxt dev` command, the following options are provided:

| option           | description                     | default               |
| ---------------- | ------------------------------- | --------------------- |
| `--render-path`  | URL path used to render the SPA | `'/__nuxt_laravel__'` |
| `--laravel-path` | Path to laravel directory       | `process.cwd()`       |

If laravel path is relative it is resolved relative to `process.cwd()`.

#### Laravel integration in development

Render path and app url are provided as environment variables `NUXT_URL` and `APP_URL` respectively to `php artisan serve`.  
Use it in your `routes/web.php` to redirect all web traffic to or just use [laravel-nuxt](https://github.com/skyrpex/laravel-nuxt).

> **!!! Attention !!!:** You have to use PHPs `getenv()` instead of laravels `env()` as it ignores putenv vars.

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

    'url' => getenv('APP_URL') ?: 'http://localhost',

    // ...
```

**Example without `nuxt-laravel`:**

`routes/web.php`:

```php
// ...
// Add this route last, so it doesn't interfere with your other routes.
Route::get(
    '{uri}',
    function($request, $uri) {
      // ...
      // If the request expects JSON, it means that
      // someone sent a request to an invalid route.
      if ($request->expectsJson()) {
          abort(404);
      }

      // Fetch and display the page from the render path on nuxt dev server
      return file_get_contents(getenv('NUXT_URL') ?: storage_path('app/index.html'));
    }
)->where('uri', '.*');
```

**Example with `nuxt-laravel`:**

`routes/web.php`:

```php
// ...
// Add this route last, so it doesn't interfere with your other routes.
Route::get(
    '{uri}',
    '\\'.Pallares\LaravelNuxt\Controllers\NuxtController::class
)->where('uri', '.*');
```

`config/nuxt.php`:

```php
return [
    /**
     * In production, the SPA page will be located in the filesystem.
     *
     * In development, the SPA page will be on an external server. This
     * page will be passed as an environment variable (NUXT_URL).
     */
    'page' => getenv('NUXT_URL') ?: storage_path('app/index.html')
];
```

### Production

```bash
laravel-nuxt build
```

Compiles the application for production deployment.

#### Additional `build` options

In addition to the default `nuxt build` command, the following options are provided:

| option          | description                                 | default                       |
| --------------- | ------------------------------------------- | ----------------------------- |
| `--no-delete`   | Do not delete build files after generation  | *boolean option has no value* |
| `--file-path`   | Location for the SPA index file             | `'storage/app/index.html'`    |
| `--public-path` | The folder where laravel serves assets from | `'public'`                    |

If file path or public path are relative they are resolved relative to `rootDir` from `nuxt.config`.

> **!!! Attention !!!:** If either path does not exists it is created recursively

#### Laravel integration in production

If not provided, the file path is first checked against `process.env.NUXT_URL`, so you can also set it using the environment variable.  
The command loads `require('dotenv').config()` so you can provide `NUXT_URL` through an `.env` file.

Or just use [laravel-nuxt](https://github.com/skyrpex/laravel-nuxt).