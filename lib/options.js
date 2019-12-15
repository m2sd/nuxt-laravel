"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const lodash_1 = require("lodash");
const defaults_1 = __importDefault(require("./defaults"));
const constants_1 = require("./constants");
exports.getConfiguration = (nuxtOptions, overwrites) => {
    const routerBase = (nuxtOptions.router && nuxtOptions.router.base) || '/';
    const options = lodash_1.merge(defaults_1.default, nuxtOptions.laravel, overwrites);
    const nuxt = {
        urlPath: path_1.default.posix.join(routerBase, constants_1.moduleKey),
        routerPath: `/${constants_1.moduleKey}`
    };
    const laravel = (() => {
        const laravelRoot = path_1.default.resolve(process.cwd(), options.root || '');
        const server = typeof options.server === 'boolean' && options.server
            ? nuxtOptions.server
                ? {
                    host: nuxtOptions.server.host,
                    port: +(nuxtOptions.server.port || 3000) + 1
                }
                : false
            : options.server;
        return {
            root: laravelRoot,
            public: path_1.default.resolve(laravelRoot, options.publicDir || 'public'),
            server
        };
    })();
    dotenv_1.default.config({ path: laravel.root });
    const output = (() => {
        const outputPath = process.env.NUXT_OUTPUT_PATH || options.outputPath;
        return {
            src: path_1.default.join(laravel.root, constants_1.moduleKey),
            dest: path_1.default.join(laravel.public, routerBase),
            fallback: `${routerBase.length > 1 ? 'spa' : 'index'}.html`,
            additional: outputPath
                ? path_1.default.resolve(laravel.root, outputPath)
                : false
        };
    })();
    const cache = (() => {
        const defaults = {
            name: constants_1.moduleKey,
            fileName: 'workbox.cache.js',
            endpoint: `/${constants_1.moduleKey}_cache`
        };
        if (typeof options.swCache === 'boolean') {
            if (options.swCache) {
                return defaults;
            }
            return false;
        }
        return lodash_1.merge(defaults, options.swCache);
    })();
    return {
        options,
        nuxt,
        laravel,
        output,
        cache,
        routerBase
    };
};
