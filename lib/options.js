"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const lodash_1 = require("lodash");
const defaults_1 = __importStar(require("./defaults"));
const constants_1 = require("./constants");
exports.validateOptions = (options) => {
    return (typeof options.root === 'string' &&
        typeof options.publicDir === 'string' &&
        (typeof options.server === 'boolean' ||
            (typeof options.server === 'object' &&
                typeof options.server.port === 'number')) &&
        (typeof options.swCache === 'boolean' ||
            (typeof options.swCache === 'object' &&
                typeof options.swCache.name === 'string')) &&
        typeof options.dotEnvExport === 'boolean');
};
exports.getConfiguration = (nuxtOptions, overwrites) => {
    const routerBase = (nuxtOptions.router && nuxtOptions.router.base) || '/';
    const options = lodash_1.merge({}, defaults_1.default, nuxtOptions.laravel, overwrites);
    if (!exports.validateOptions(options)) {
        throw new Error('[nuxt-laravel] Invalid configuration');
    }
    const nuxt = {
        urlPath: path_1.default.posix.join(routerBase, constants_1.moduleKey),
        routerPath: `/${constants_1.moduleKey}`
    };
    const laravel = (() => {
        const laravelRoot = path_1.default.resolve(process.cwd(), options.root);
        const server = typeof options.server === 'object'
            ? options.server
            : options.server && nuxtOptions.server
                ? {
                    host: nuxtOptions.server.host,
                    port: +(nuxtOptions.server.port || 3000) + 1
                }
                : false;
        if (server &&
            nuxtOptions.server &&
            server.host === nuxtOptions.server.host &&
            server.port === nuxtOptions.server.port) {
            server.port = server.port + 1;
        }
        return {
            root: laravelRoot,
            public: path_1.default.resolve(laravelRoot, options.publicDir),
            server
        };
    })();
    dotenv_1.default.config({ path: `${laravel.root}/.env` });
    const output = (() => {
        const outputPath = options.outputPath || process.env[constants_1.nuxtOutputEnv];
        return {
            src: path_1.default.join(laravel.root, constants_1.moduleKey),
            dest: path_1.default.join(laravel.public, routerBase),
            fallback: `${routerBase.length > 1 ? 'index' : 'spa'}.html`,
            additional: outputPath
                ? path_1.default.resolve(laravel.root, outputPath)
                : false
        };
    })();
    const cache = (() => {
        if (typeof options.swCache === 'boolean') {
            return options.swCache && defaults_1.swCacheDefaults;
        }
        return lodash_1.merge(defaults_1.swCacheDefaults, options.swCache);
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
