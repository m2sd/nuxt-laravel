"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const execa_1 = __importDefault(require("execa"));
const consola_1 = __importDefault(require("consola"));
const chalk_1 = __importDefault(require("chalk"));
const dotenv_1 = __importDefault(require("dotenv"));
const lodash_1 = require("lodash");
const url_1 = require("url");
const os_1 = require("os");
const moduleScope = 'nuxt:laravel';
const logger = consola_1.default.withScope(moduleScope);
const moduleKey = `__${moduleScope.replace(':', '_')}`;
const laravelAppEnv = 'APP_URL';
const nuxtOutputEnv = 'NUXT_OUTPUT_PATH';
const laravelModule = function (_moduleOptions) {
    /** OPTIONS RESOLUTION **/
    const baseUrl = ((this.options.router && this.options.router.base) ||
        '').replace(/^\/|\/$/g, '');
    const moduleOptions = lodash_1.merge({
        root: process.cwd(),
        publicDir: 'public',
        publicPath: baseUrl,
        outputPath: path_1.default.join(process.cwd(), 'public', baseUrl, '_spa.html'),
        server: true,
        dotEnvExport: false
    }, this.options.laravel, _moduleOptions);
    if (typeof moduleOptions.server === 'boolean' && moduleOptions.server) {
        moduleOptions.server =
            this.options.dev && this.options.server
                ? {
                    host: this.options.server.host,
                    port: +(this.options.server.port || 3000) + 1
                }
                : false;
    }
    const laravelRoot = path_1.default.resolve(process.cwd(), moduleOptions.root);
    const generateDir = path_1.default.join(laravelRoot, moduleKey);
    const publicDir = path_1.default.resolve(laravelRoot, moduleOptions.publicDir);
    const publicPath = path_1.default.resolve(publicDir, moduleOptions.publicPath);
    const publicUrl = `${publicPath.replace(publicDir, '')}/`;
    dotenv_1.default.config({ path: laravelRoot });
    moduleOptions.outputPath =
        process.env.NUXT_OUTPUT_PATH || moduleOptions.outputPath;
    const outputPath = path_1.default.resolve(laravelRoot, moduleOptions.outputPath);
    const outputDir = path_1.default.dirname(outputPath);
    const indexRoute = (router => {
        if (!router || !router.routes) {
            return null;
        }
        let index = router.routes.find(
        // First, check if there is an unnamed route
        // Then, check if there's a route at /
        // Finally, check for a name with first segment index
        route => route.name === '' ||
            route.path === '/' ||
            !!(route.name && route.name.match(/^index(-\w+)?$/)));
        // If we were unable to resolve the index route,
        // but modules are present
        if (!index && this.options.modules) {
            // we check for nuxt-i18n module
            const i18nModuleOptions = this.options.modules.find(m => (Array.isArray(m) && m[0] === 'nuxt-i18n') || m === 'nuxt-i18n');
            const i18nOptions = Object.assign({}, i18nModuleOptions, this.options.i18n);
            // if i18n module is present, we try to find the translated index route
            if (i18nOptions.defaultLocale) {
                const separator = i18nOptions.routesNameSeparator || '___';
                index = router.routes.find(route => !!(route.name &&
                    route.name.match(new RegExp(`^index${separator}${i18nOptions.defaultLocale}`))));
            }
        }
        return index;
    })(this.options.router);
    // cli helper
    const enableLaravelSupport = (enabled = true) => {
        const status = enabled
            ? chalk_1.default.green.bold('enabled')
            : chalk_1.default.red.bold('disabled');
        this.options.cli.badgeMessages.push(`Laravel support is ${status}`);
    };
    /** VALIDATION **/
    // Fail with a warning if we are not in 'spa' mode
    if (this.options.mode !== 'spa') {
        logger.warn(`nuxt-laravel only supports 'spa' mode`);
        enableLaravelSupport(false);
        return;
    }
    // Fail with error if laravelRoot is invalid
    if (!fs_extra_1.default.existsSync(path_1.default.join(laravelRoot, 'artisan'))) {
        logger.error(`Unable to find 'artisan' executable in Laravel path ${laravelRoot}`);
        enableLaravelSupport(false);
        return;
    }
    // Fail with error if index route cannot be resolved
    if (!indexRoute) {
        logger.error('Unable to resolve index route');
        enableLaravelSupport(false);
        return;
    }
    // Fail with error if publicDir cannot be found
    if (!fs_extra_1.default.existsSync(publicDir)) {
        logger.error('Unable to find Laravel public dir:', publicDir);
        return;
    }
    // Fail with error if publicPath is not under publicDir
    if (!publicPath.includes(publicDir)) {
        logger.error(`Public path (${publicPath}) is not under Laravel public dir (${publicDir})`);
    }
    /** IMPLEMENTATION **/
    // Global configuration
    if (!this.options.router || this.options.router.base !== publicUrl) {
        this.options.router = Object.assign({}, (this.options.router || {}), { base: publicUrl });
    }
    // DEV behavior
    if (this.options.dev) {
        // Fail with warning if server is not configured
        if (!moduleOptions.server) {
            logger.warn('Laravel testserver is disabled');
            enableLaravelSupport(false);
            return;
        }
        // resolve pertinent config parameters
        const laravelUrl = new url_1.URL(`http://${moduleOptions.server.host}:${moduleOptions.server.port}`);
        // configure proxy
        this.requireModule('@nuxtjs/axios');
        this.options.axios = Object.assign({}, (this.options.axios || {}), { proxy: true });
        this.options.proxy = [
            ...(this.options.proxy || []),
            [
                ['**/*', `!${path_1.default.join(publicUrl, moduleKey)}`],
                {
                    target: laravelUrl.origin,
                    ws: false
                }
            ]
        ];
        // extend routes to provide an endpoint for Laravel
        this.extendRoutes((routes) => {
            // add a copy of the index route
            // on the specified render path
            routes.push(Object.assign({}, indexRoute, {
                name: moduleKey,
                path: `/${moduleKey}`
            }));
        });
        // start Laravel test server on render:before
        let _serverInitialized = false;
        this.nuxt.hook('render:before', async ({ options }) => {
            if (_serverInitialized) {
                return;
            }
            _serverInitialized = true;
            // Fail with warining if dev server is not enabled
            if (!options.server) {
                logger.warn('Nuxt dev server is not enabled');
                enableLaravelSupport(false);
                return;
            }
            // retrieve dev server URL
            const nuxtUrl = new url_1.URL(path_1.default.join(publicUrl, moduleKey), `http${!!options.server.https ? 's' : ''}://${options.server.host}:${options.server.port || 80}`);
            // try to start artisan server from Laravel path
            logger.debug(`Laravel url: ${laravelUrl.href}`);
            logger.debug(`Nuxt url: ${nuxtUrl.href}`);
            try {
                const testserver = execa_1.default('php', [
                    'artisan',
                    'serve',
                    `--host=${laravelUrl.hostname === 'localhost'
                        ? '127.0.0.1'
                        : laravelUrl.hostname}`,
                    `--port=${laravelUrl.port}`
                ], {
                    cwd: laravelRoot,
                    // forward render path and baseUrl as env variables
                    env: Object.assign({}, process.env, {
                        [laravelAppEnv]: nuxtUrl.origin,
                        [nuxtOutputEnv]: nuxtUrl.href
                    }),
                    stderr: process.stderr,
                    stdin: process.stdin,
                    stdout: process.stdout
                });
                testserver.on('error', () => {
                    logger.error(`Failed to start Laravel server`);
                });
            }
            catch (error) {
                logger.error(`Failed to start Laravel server`);
                enableLaravelSupport(false);
                return;
            }
            enableLaravelSupport();
        });
    }
    // PROD behaviour
    if (!this.options.dev) {
        // configure generation
        this.options.generate = Object.assign({}, (this.options.generate || {}), { dir: generateDir, exclude: [/.*/] });
        logger.info('Generation configured for Laravel SPA.');
        this.nuxt.hook('generate:done', async ({ nuxt }) => {
            // generate assets
            logger.info('Generating SPA assets...');
            if (publicPath !== publicDir) {
                fs_extra_1.default.ensureDirSync(publicDir);
                fs_extra_1.default.moveSync(generateDir, publicDir, { overwrite: true });
            }
            else {
                fs_extra_1.default.copySync(generateDir, publicDir);
                fs_extra_1.default.removeSync(generateDir);
            }
            logger.success(`SPA assets generated in: ${publicDir}`);
            // render index route
            logger.info('Rendering index route...');
            fs_extra_1.default.ensureDirSync(outputDir);
            try {
                const { html, error } = await nuxt.server.renderRoute(indexRoute.path);
                if (error) {
                    throw error;
                }
                fs_extra_1.default.writeFileSync(outputPath, html, 'utf-8');
            }
            catch (error) {
                logger.error('Failed to render index route:', error);
                return;
            }
            logger.success(`SPA index file rendered to: ${outputPath}`);
            // write to .env file
            if (moduleOptions.dotEnvExport &&
                fs_extra_1.default.existsSync(path_1.default.join(laravelRoot, '.env'))) {
                const envPath = path_1.default.join(laravelRoot, '.env');
                const envInput = fs_extra_1.default.readFileSync(envPath).toString();
                const envOutputPrefix = `${os_1.EOL}# Added by 'nuxt-laravel' module${os_1.EOL}${nuxtOutputEnv}`;
                const envOutput = `${envOutputPrefix}=${outputPath}`;
                fs_extra_1.default.writeFileSync(envPath, envInput.includes(envOutputPrefix)
                    ? envInput.replace(new RegExp(`${envOutputPrefix}.*`), envOutput)
                    : envInput.includes(nuxtOutputEnv)
                        ? envInput.replace(new RegExp(`${nuxtOutputEnv}.*`), envOutput)
                        : envInput.concat(envOutput));
            }
        });
    }
};
exports.default = laravelModule;
exports.meta = require('../package.json');
