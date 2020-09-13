"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.meta = exports.nuxtOutputEnv = exports.laravelAppEnv = exports.moduleKey = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const execa_1 = __importDefault(require("execa"));
const url_1 = require("url");
const os_1 = require("os");
const constants_1 = require("./constants");
Object.defineProperty(exports, "moduleKey", { enumerable: true, get: function () { return constants_1.moduleKey; } });
Object.defineProperty(exports, "laravelAppEnv", { enumerable: true, get: function () { return constants_1.laravelAppEnv; } });
Object.defineProperty(exports, "nuxtOutputEnv", { enumerable: true, get: function () { return constants_1.nuxtOutputEnv; } });
const utils_1 = require("./utils");
const options_1 = require("./options");
const laravelModule = function (overwrites) {
    const config = options_1.getConfiguration(this.options, overwrites);
    /** GLOBAL CONTEXT **/
    /* Validation */
    // Fail with a warning if we are not in 'spa' mode
    if (this.options.mode !== 'spa') {
        utils_1.logger.warn(`nuxt-laravel currently only supports 'spa' mode`);
        utils_1.addBadgeMessage(this.options, false);
        return;
    }
    // Fail with error if laravelRoot is invalid
    if (!fs_extra_1.default.existsSync(path_1.default.join(config.laravel.root, 'artisan'))) {
        utils_1.logger.error(`Unable to find 'artisan' executable in Laravel path: ${config.laravel.root}`);
        utils_1.addBadgeMessage(this.options, false);
        return;
    }
    // Fail with error if publicDir cannot be found
    if (!fs_extra_1.default.existsSync(config.laravel.public)) {
        utils_1.logger.error(`Unable to find Laravel public dir: ${config.laravel.public}`);
        utils_1.addBadgeMessage(this.options, false);
        return;
    }
    /* Implementation */
    // Optional cache module
    if (config.cache) {
        const pwa = utils_1.getModuleOptions(this.options, '@nuxtjs/pwa');
        const routingExtensions = (pwa && pwa.workbox && pwa.workbox.routingExtensions) || [];
        const { dst } = this.addTemplate({
            src: path_1.default.join(__dirname, 'templates', 'workbox.cache.ejs'),
            options: config.cache,
            fileName: config.cache.fileName,
        });
        this.options.pwa = Object.assign(Object.assign({}, pwa), { workbox: Object.assign(Object.assign({}, (pwa && pwa.workbox)), { routingExtensions: [
                    ...(typeof routingExtensions === 'string'
                        ? [routingExtensions]
                        : routingExtensions),
                    path_1.default.join(this.options.buildDir, dst),
                ] }) });
        this.requireModule('@nuxtjs/pwa');
    }
    /** DEV behavior **/
    if (this.options.dev) {
        /* Validation */
        // Fail with warning if server is not configured
        if (!config.laravel.server) {
            utils_1.logger.warn('Laravel test server is disabled');
            utils_1.addBadgeMessage(this.options, false);
            return;
        }
        // Fail with error if nuxt dev server is not configured
        if (!this.options.server) {
            utils_1.logger.warn('Nuxt dev server is disabled');
            utils_1.addBadgeMessage(this.options, false);
            return;
        }
        /* Implementation */
        // resolve pertinent config parameters
        const laravelUrl = new url_1.URL(`http://${config.laravel.server.host || 'localhost'}:${config.laravel.server.port}`);
        this.options.axios = Object.assign(Object.assign({}, (this.options.axios || {})), { proxy: true });
        this.options.proxy = [
            ...(this.options.proxy || []),
            [
                [
                    '**',
                    `!${config.nuxt.urlPath}`,
                    `!${path_1.default.posix.join(config.routerBase, '_loading')}/**`,
                ],
                {
                    target: laravelUrl.origin,
                    ws: false,
                    logLevel: 'debug',
                },
            ],
        ];
        // configure proxy
        this.requireModule('@nuxtjs/axios');
        // extend routes to provide an endpoint for Laravel
        this.extendRoutes((routes) => {
            let index = routes.find(
            // First, check if there is an unnamed route
            // Then, check if there's a route at /
            // Finally, check for a name with first segment index
            (route) => route.name === '' ||
                route.path === '/' ||
                !!(route.name && route.name.match(/^index(-\w+)?$/)));
            // If we were unable to resolve the index route,
            // but modules are present
            if (!index && this.options.modules) {
                const i18nOptions = utils_1.getModuleOptions(this.options, 'nuxt-i18n');
                // if i18n module is present, we try to find the translated index route
                if (i18nOptions && i18nOptions.defaultLocale) {
                    const separator = i18nOptions.routesNameSeparator || '___';
                    index = routes.find((route) => !!(route.name &&
                        route.name.match(new RegExp(`^index${separator}${i18nOptions.defaultLocale}`))));
                }
            }
            // Fail with error if index route cannot be resolved
            if (!index) {
                utils_1.logger.error('Unable to resolve index route');
                utils_1.addBadgeMessage(this.options, false);
                return;
            }
            // add a copy of the index route
            // on the specified render path
            routes.push(Object.assign(Object.assign({}, index), { name: constants_1.moduleKey, path: config.nuxt.routerPath }));
        });
        // start Laravel test server on render:before
        let _serverInitialized = false;
        this.nuxt.hook('render:before', async ({ options }) => {
            /* istanbul ignore next */
            if (_serverInitialized) {
                return;
            }
            _serverInitialized = true;
            const nuxtServer = options.server;
            if (fs_extra_1.default.existsSync(config.output.dest) &&
                config.output.dest.replace(config.laravel.public, '').length > 1) {
                utils_1.logger.warn(`Removing production build from: ${config.output.dest}
            to avoid conflicts with dev server`);
                fs_extra_1.default.removeSync(config.output.dest);
            }
            const nuxtHost = ['0.0.0.0', '127.0.0.1'].includes(`${nuxtServer.host}`)
                ? 'localhost'
                : nuxtServer.host;
            // retrieve dev server URL
            const nuxtUrl = new url_1.URL(config.nuxt.urlPath, `http${!!nuxtServer.https ? 's' : ''}://${nuxtHost}:${nuxtServer.port}`);
            // try to start artisan server from Laravel path
            utils_1.logger.debug(`Nuxt url: ${nuxtUrl.href}`);
            utils_1.logger.debug(`Laravel url: ${laravelUrl.href}`);
            try {
                const server = execa_1.default('php', [
                    'artisan',
                    'serve',
                    `--host=${laravelUrl.hostname === 'localhost'
                        ? '127.0.0.1'
                        : laravelUrl.hostname}`,
                    `--port=${laravelUrl.port}`,
                ], {
                    cwd: config.laravel.root,
                    // forward render path and baseUrl as env variables
                    env: Object.assign(Object.assign({}, process.env), { [constants_1.laravelAppEnv]: nuxtUrl.origin, [constants_1.nuxtOutputEnv]: nuxtUrl.href }),
                    stderr: process.stderr,
                    stdout: process.stdout,
                });
                /* istanbul ignore next */
                server.on('error', () => {
                    utils_1.logger.error(`Laravel server failed`);
                    if (server && !server.killed) {
                        server.kill('SIGKILL');
                    }
                });
            }
            catch (error) {
                utils_1.logger.error(`Failed to start Laravel server`);
                utils_1.addBadgeMessage(options, false);
                return;
            }
            utils_1.addBadgeMessage(options);
        });
        return;
    }
    // PROD behavior
    // configure generation
    this.options.generate = Object.assign(Object.assign({}, this.options.generate), { dir: config.output.src, exclude: [/.*/], fallback: config.output.fallback });
    this.nuxt.hook('generate:done', async ({ nuxt }) => {
        // generate assets
        utils_1.logger.info('Generating SPA assets...');
        if (config.output.dest.replace(config.laravel.public, '').length > 1) {
            fs_extra_1.default.ensureDirSync(config.output.dest);
            fs_extra_1.default.moveSync(config.output.src, config.output.dest, { overwrite: true });
        }
        else {
            fs_extra_1.default.copySync(config.output.src, config.output.dest);
            fs_extra_1.default.removeSync(config.output.src);
        }
        utils_1.logger.success(`SPA assets generated in: ${config.output.dest}`);
        const defaultOutput = path_1.default.join(config.output.dest, config.output.fallback);
        if (config.output.additional) {
            if (defaultOutput === config.output.additional) {
                utils_1.logger.info('Skipping index file output, because output path corresponds to default location');
            }
            else {
                const indexPath = config.output.additional;
                // render index route
                utils_1.logger.info('Rendering additional output file...');
                try {
                    const { html, error } = await nuxt.server.renderRoute('/');
                    /* istanbul ignore if */
                    if (error) {
                        throw error;
                    }
                    fs_extra_1.default.ensureDirSync(path_1.default.dirname(indexPath));
                    fs_extra_1.default.writeFileSync(indexPath, html, 'utf-8');
                    utils_1.logger.success(`SPA index file rendered to: ${indexPath}`);
                }
                catch (error) {
                    utils_1.logger.error('Failed to render index route:', error);
                    return;
                }
            }
        }
        // write to .env file
        if (config.options.dotEnvExport) {
            const envPath = path_1.default.join(config.laravel.root, '.env');
            if (fs_extra_1.default.existsSync(envPath)) {
                const indexPath = config.output.additional || defaultOutput;
                const envInput = fs_extra_1.default.readFileSync(envPath).toString();
                const envOutputPrefix = `${os_1.EOL}# Added by 'nuxt-laravel' module${os_1.EOL}${constants_1.nuxtOutputEnv}`;
                const envOutput = `${envOutputPrefix}=${indexPath}`;
                fs_extra_1.default.writeFileSync(envPath, envInput.includes(envOutputPrefix)
                    ? envInput.replace(new RegExp(`${envOutputPrefix}.*`), envOutput)
                    : envInput.includes(constants_1.nuxtOutputEnv)
                        ? envInput.replace(new RegExp(`${constants_1.nuxtOutputEnv}.*`), envOutput)
                        : envInput.concat(envOutput));
            }
        }
    });
    utils_1.logger.info('Generation configured for Laravel SPA.');
};
exports.default = laravelModule;
exports.meta = require('../package.json');
