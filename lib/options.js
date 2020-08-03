"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfiguration = void 0;
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const lodash_1 = require("lodash");
const defaults_1 = __importStar(require("./defaults"));
const constants_1 = require("./constants");
const validateOptions = (options) => {
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
const resolveNuxtConfig = nuxt => {
    const routerBase = (nuxt.router && nuxt.router.base) || '/';
    return {
        routerBase,
        urlPath: path_1.default.posix.join(routerBase, constants_1.moduleKey),
        routerPath: `/${constants_1.moduleKey}`,
    };
};
const resolveLaravelConfig = (options, nuxt) => {
    const laravelRoot = path_1.default.resolve(process.cwd(), options.root);
    const server = typeof options.server === 'object'
        ? options.server
        : options.server && nuxt.server
            ? {
                host: nuxt.server.host,
                port: +(nuxt.server.port || 3000) + 1,
            }
            : false;
    if (server &&
        nuxt.server &&
        server.host === nuxt.server.host &&
        server.port === nuxt.server.port) {
        server.port = server.port + 1;
    }
    return {
        root: laravelRoot,
        public: path_1.default.resolve(laravelRoot, options.publicDir),
        server,
    };
};
const resolveOutputConfig = (options, laravel, nuxt, nuxtFallback) => {
    const outputPath = process.env[constants_1.nuxtOutputEnv] || options.outputPath;
    const dest = path_1.default.join(laravel.public, nuxt.routerBase);
    const fallback = path_1.default.join(dest, typeof nuxtFallback === 'string'
        ? nuxtFallback
        : nuxtFallback
            ? '404.html'
            : '200.html');
    return {
        src: path_1.default.join(laravel.root, constants_1.moduleKey),
        dest,
        indexPath: outputPath && outputPath !== fallback
            ? path_1.default.resolve(laravel.root, outputPath)
            : false,
        fallback,
    };
};
const resolveCacheConfig = options => {
    if (typeof options.swCache === 'boolean') {
        return options.swCache && defaults_1.swCacheDefaults;
    }
    return lodash_1.merge(defaults_1.swCacheDefaults, options.swCache);
};
exports.getConfiguration = (nuxtOptions, overwrites) => {
    const options = lodash_1.merge({}, defaults_1.default, nuxtOptions.laravel, overwrites);
    if (!validateOptions(options)) {
        throw new Error('[nuxt-laravel] Invalid configuration');
    }
    const nuxt = resolveNuxtConfig(nuxtOptions);
    const laravel = resolveLaravelConfig(options, nuxtOptions);
    const cache = resolveCacheConfig(options);
    dotenv_1.default.config({ path: `${laravel.root}/.env` });
    const output = resolveOutputConfig(options, laravel, nuxt, nuxtOptions.generate && nuxtOptions.generate.fallback);
    return {
        options,
        nuxt,
        laravel,
        cache,
        output,
    };
};
