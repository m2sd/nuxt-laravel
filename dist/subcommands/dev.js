"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const execa_1 = __importDefault(require("execa"));
const lodash_1 = require("lodash");
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const cli_1 = require("@nuxt/cli");
const cli_chunk3_1 = require("@nuxt/cli/dist/cli-chunk3");
const nuxtCommand_1 = require("../classes/nuxtCommand");
delete cli_chunk3_1.common.spa;
delete cli_chunk3_1.common.universal;
const config = {
    /* tslint:disable:object-literal-sort-keys */
    name: 'nuxt-laravel-dev',
    description: 'Start laravel development server and run the application in development mode (e.g. hot-code reloading, error reporting)',
    options: Object.assign({}, cli_chunk3_1.common, cli_chunk3_1.server, { open: {
            alias: 'o',
            description: 'Opens the server listeners url in the default browser',
            type: 'boolean'
        }, 'laravel-path': {
            default: process.cwd(),
            description: 'Path to laravel directory',
            type: 'string'
        }, 'render-path': {
            default: `/${nuxtCommand_1.NuxtLaravelCommand.CONFIG_KEY}`,
            description: 'URL path used to render the SPA',
            prepare: (_, options, argv) => {
                // save existing extend routes function
                const extendRoutesActual = options.router
                    ? options.router.extendRoutes
                    : undefined;
                const extendRoutes = function (routes, resolve) {
                    // call original extendRoutes function
                    // if it was defined
                    if (typeof extendRoutesActual === 'function') {
                        extendRoutesActual.apply(this, [routes, resolve]);
                    }
                    // Try our best to find the root route.
                    let index = routes.find(
                    // First, check if there is an unnamed route
                    // Then, check if there's a route at /
                    // Finally, check for a name with first segment index
                    route => route.name === '' ||
                        route.path === '/' ||
                        !!(route.name && route.name.match(/^index(-\w+)?$/)));
                    if (!index && options.modules) {
                        // resolve i18n config
                        const i18n = (m => lodash_1.isArray(m) && m[1])(options.modules.find(m => lodash_1.isArray(m) && m[0] === 'nuxt-i18n'));
                        // find translated route
                        if (i18n && i18n.defaultLocale) {
                            const separator = i18n.routesNameSeparator || '___';
                            index = routes.find(route => !!(route.name &&
                                route.name.match(new RegExp(`^index${separator}${i18n.defaultLocale}`))));
                        }
                    }
                    // fail if index route can not be resolved
                    if (!index) {
                        throw String('Unable to resolve index route');
                    }
                    // add a copy of the index route
                    // on the specified render path
                    routes.push(Object.assign({}, index, {
                        name: nuxtCommand_1.NuxtLaravelCommand.CONFIG_KEY,
                        path: argv['render-path']
                    }));
                };
                const overrides = {
                    // use @nuxtjs/proxy module
                    axios: {
                        proxy: true
                    },
                    // proxy all calls except the render path to laravel
                    proxy: [
                        [
                            ['**/*', `!${argv['render-path']}`],
                            {
                                target: `http://${options.server.host}:${+options.server
                                    .port + 1}`
                            }
                        ]
                    ],
                    router: {
                        extendRoutes
                    }
                };
                // apply concatenating arrays
                // this way string values may be preserved
                lodash_1.mergeWith(options, overrides, (obj, src) => {
                    if (lodash_1.isArray(obj)) {
                        return obj.concat(src);
                    }
                });
            },
            type: 'string'
        } }),
    usage: 'laravel dev <dir>',
    async run(cmd) {
        const options = await cli_1.loadNuxtConfig(cmd.argv);
        // retrieve dev server URL
        const nuxtUrl = new url_1.URL(cmd.argv['render-path'], `http://${options.server.host}:${options.server.port}`);
        // resolve relative to working directory
        const laravelPath = path_1.default.resolve(process.cwd(), `${cmd.argv['laravel-path']}`);
        // try to start artisan serve from laravel path
        try {
            await execa_1.default('php', [
                'artisan',
                'serve',
                `--host=${nuxtUrl.hostname}`,
                `--port=${+nuxtUrl.port + 1}`
            ], {
                cwd: laravelPath,
                // forward render path and baseUrl as env variables
                env: Object.assign({}, process.env, {
                    APP_URL: nuxtUrl.origin,
                    NUXT_URL: nuxtUrl.href
                }),
                stderr: process.stderr,
                stdin: process.stdin,
                stdout: process.stdout
            });
        }
        catch (error) {
            throw String(`Failed to run command \`php artisan serve\`:\n${error}`);
        }
        // start dev server
        const devCmd = await cli_1.commands.default('dev');
        await devCmd.startDev(cmd, cmd.argv);
    }
};
exports.default = config;
//# sourceMappingURL=dev.js.map