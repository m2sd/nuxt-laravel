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
    // Optional cache module
    if (config.cache) {
        this.requireModule('@nuxtjs/pwa');
        const pwa = utils_1.getModuleOptions(this.options, '@nuxtjs/pwa');
        const routingExtensions = (pwa && pwa.workbox && pwa.workbox.routingExtensions) || [];
        const { dst } = this.addTemplate({
            src: path_1.default.join(__dirname, 'templates', 'workbox.cache.js'),
            options: config.cache,
            fileName: config.cache.fileName,
        });
        this.options.pwa = Object.assign(Object.assign({}, pwa), { workbox: Object.assign(Object.assign({}, (pwa && pwa.workbox)), { routingExtensions: [
                    ...(typeof routingExtensions === 'string'
                        ? [routingExtensions]
                        : routingExtensions),
                    path_1.default.join(this.options.buildDir, dst),
                ] }) });
    }
    /* Validation */
    // Fail with error if laravelRoot is invalid
    if (!fs_extra_1.default.existsSync(path_1.default.join(config.laravel.root, 'server.php'))) {
        utils_1.logger.error(`Unable to find 'server.php' file in Laravel path: ${config.laravel.root}`);
        utils_1.addBadgeMessage(this.options, false);
        return;
    }
    // Fail with error if publicDir cannot be found
    if (!fs_extra_1.default.existsSync(config.laravel.public)) {
        utils_1.logger.error(`Unable to find Laravel public dir: ${config.laravel.public}`);
        utils_1.addBadgeMessage(this.options, false);
        return;
    }
    // Fail with warning if laravel proxy is disabled
    if (!config.laravel.server) {
        utils_1.logger.warn('Laravel proxy is disabled');
        utils_1.addBadgeMessage(this.options, false);
        return;
    }
    /* Implementation */
    // resolve pertinent config parameters
    const laravelUrl = new url_1.URL(`http://${config.laravel.server.host || 'localhost'}:${config.laravel.server.port}`);
    // require axios module to implement proxy
    this.requireModule('@nuxtjs/axios');
    this.options.axios = Object.assign(Object.assign({}, (this.options.axios || {})), { proxy: true });
    // configure proxy to forward all requests without a x-laravel-nuxt-proxy header to Laravel
    this.options.proxy = [
        ...(this.options.proxy || []),
        [
            (_pathname, req) => {
                return req.headers.has('x-laravel-nuxt-proxy');
            },
            {
                target: laravelUrl.origin,
                ws: false,
                logLevel: 'debug',
            },
        ],
    ];
    utils_1.logger.info(`Proxying all routes to Laravel on: ${laravelUrl.origin}`);
    if (this.options.dev) {
        // start Laravel test server on first render:done
        let _serverInitialized = false;
        this.nuxt.hook('render:done', async ({ options }) => {
            /* istanbul ignore next */
            if (_serverInitialized) {
                return;
            }
            _serverInitialized = true;
            const nuxtServer = options.server;
            const nuxtHost = ['0.0.0.0', '127.0.0.1'].includes(`${nuxtServer.host}`)
                ? 'localhost'
                : nuxtServer.host;
            // retrieve dev server URL
            const nuxtUrl = new url_1.URL(config.nuxt.urlPath, `http${!!nuxtServer.https ? 's' : ''}://${nuxtHost}:${nuxtServer.port}`);
            // try to start artisan server from Laravel path
            utils_1.logger.debug(`Nuxt url: ${nuxtUrl.href}`);
            utils_1.logger.debug(`Laravel url: ${laravelUrl.href}`);
            const server = execa_1.default('php', [
                '-S',
                `${laravelUrl.hostname === 'localhost'
                    ? '127.0.0.1'
                    : laravelUrl.hostname}:${laravelUrl.port}`,
                `${config.laravel.root}/server.php`,
            ], {
                cwd: config.laravel.root,
                // forward render path and baseUrl as env variables
                env: Object.assign(Object.assign({}, process.env), { [constants_1.laravelAppEnv]: nuxtUrl.origin, [constants_1.nuxtOutputEnv]: nuxtUrl.href }),
                stderr: 'inherit',
                stdout: 'inherit',
            });
            server.on('exit', code => {
                if (code) {
                    utils_1.logger.error('Laravel server failed');
                    if (server && !server.killed) {
                        server.cancel();
                    }
                    return;
                }
                utils_1.logger.info('Laravel server shut down');
            });
            this.nuxt.hook('close', () => {
                server.cancel();
            });
            utils_1.logger.success(`Started Laravel dev server on: ${laravelUrl.origin}`);
            utils_1.addBadgeMessage(options);
        });
    }
    if (process.static) {
        /* Generation behavior */
        // configure generation
        this.options.generate = Object.assign(Object.assign({}, this.options.generate), { dir: config.output.src });
        if (this.options.mode === 'spa') {
            this.options.generate.exclude = [/.*/];
        }
        this.nuxt.hook('generate:done', async ({ nuxt }) => {
            // generate assets
            utils_1.logger.info('Copying nuxt assets...');
            if (config.output.dest.replace(config.laravel.public, '').length > 1) {
                fs_extra_1.default.ensureDirSync(config.output.dest);
                fs_extra_1.default.moveSync(config.output.src, config.output.dest, { overwrite: true });
            }
            else {
                fs_extra_1.default.copySync(config.output.src, config.output.dest);
                fs_extra_1.default.removeSync(config.output.src);
            }
            utils_1.logger.success(`Nuxt assets copied to: ${config.output.dest}`);
            if (config.output.indexPath &&
                config.output.indexPath !== config.output.fallback) {
                const indexPath = config.output.indexPath;
                utils_1.logger.info('Rendering index file...');
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
                    utils_1.logger.error('Failed to render index file:', error);
                    return;
                }
            }
            // write to .env file
            if (config.options.dotEnvExport) {
                const envPath = path_1.default.join(config.laravel.root, '.env');
                if (!fs_extra_1.default.existsSync(envPath)) {
                    utils_1.logger.warn(`Unable to find .env file in: ${envPath}\n.env export skipped`);
                    return;
                }
                const indexPath = config.output.indexPath || config.output.fallback;
                const envInput = fs_extra_1.default.readFileSync(envPath).toString();
                const envOutputPrefix = `${os_1.EOL}# Added by 'nuxt-laravel' module${os_1.EOL}${constants_1.nuxtOutputEnv}`;
                const envOutput = `${envOutputPrefix}=${indexPath}`;
                fs_extra_1.default.writeFileSync(envPath, envInput.includes(envOutputPrefix)
                    ? envInput.replace(new RegExp(`${envOutputPrefix}.*`), envOutput)
                    : envInput.includes(constants_1.nuxtOutputEnv)
                        ? envInput.replace(new RegExp(`${constants_1.nuxtOutputEnv}.*`), envOutput)
                        : envInput.concat(envOutput));
            }
        });
        utils_1.logger.info('Generation configured for Laravel SPA.');
    }
};
exports.default = laravelModule;
exports.meta = require('../package.json');
