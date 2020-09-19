---
title: Routing
description: ''
position: 2
category: Guide
---

## Basics

By default, Laravel redirect to Nuxt instance using the following line:

```php[web.php]
Nuxt::route('{path?}')->name('nuxt')->where('path', '.*');
```

You can define your routes **before** this instruction or your routes will be skipped.  
Here is the default complete example:

```php[web.php]
Route::get('/', function () {
    return view('welcome');
});

Nuxt::route('{path?}')->name('nuxt')->where('path', '.*');
```

## Default path

Specify here how to change base path

## Ignore routes

Sometimes you might want to avoid certain routes. For example, if you are using Laravel Nova, the routes won't be accessible.

Here is how you fix it:
```php[web.php]
Nuxt::route('{path?}')->name('nuxt')->where('path', '^(?!nova.*$).*');
```
