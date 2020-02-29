"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
const defaults = {
    root: process.cwd(),
    publicDir: 'public',
    server: true,
    swCache: false,
    dotEnvExport: false
};
exports.swCacheDefaults = {
    name: constants_1.moduleKey,
    fileName: 'workbox.cache.js',
    endpoint: `/${constants_1.moduleKey}_cache`
};
exports.default = defaults;
