"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nuxtOutputEnv = exports.laravelAppEnv = exports.moduleKey = exports.scope = void 0;
exports.scope = 'nuxt:laravel';
exports.moduleKey = `__${exports.scope.replace(':', '_')}`;
exports.laravelAppEnv = 'APP_URL';
exports.nuxtOutputEnv = 'NUXT_OUTPUT_PATH';
