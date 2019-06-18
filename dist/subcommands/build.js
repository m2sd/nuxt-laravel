"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = require("lodash");
const path_1 = __importDefault(require("path"));
const cli_1 = require("@nuxt/cli");
const cli_chunk3_1 = require("@nuxt/cli/dist/cli-chunk3");
delete cli_chunk3_1.common.spa;
delete cli_chunk3_1.common.universal;
// tslint:disable-next-line:no-var-requires
require('dotenv').config();
const config = {
    /* tslint:disable:object-literal-sort-keys */
    name: 'nuxt-laravel-build',
    description: 'Compiles the application for use with laravel backend',
    usage: 'laravel build <dir>',
    options: Object.assign({}, cli_chunk3_1.common, cli_chunk3_1.locking, { analyze: {
            alias: 'a',
            type: 'boolean',
            description: 'Launch webpack-bundle-analyzer to optimize your bundles',
            prepare(_, options, argv) {
                // Analyze option
                options.build = options.build || {};
                if (argv.analyze && typeof options.build.analyze !== 'object') {
                    options.build.analyze = true;
                }
            }
        }, devtools: {
            type: 'boolean',
            default: false,
            description: 'Enable Vue devtools',
            prepare(_, options, argv) {
                options.vue = options.vue || {};
                options.vue.config = options.vue.config || {};
                if (argv.devtools) {
                    options.vue.config.devtools = true;
                }
            }
        }, quiet: {
            alias: 'q',
            type: 'boolean',
            description: 'Disable output except for errors',
            prepare(_, options, argv) {
                // Silence output when using --quiet
                if (argv.quiet && options.build) {
                    options.build.quiet = !!argv.quiet;
                }
            }
        }, delete: {
            default: true,
            type: 'boolean',
            description: 'Do not delete build files after generation',
            prepare: (cmd, _, argv) => {
                if (argv.delete) {
                    // add hook to callect files to delete after generation
                    cmd.cmd.addNuxtHook('build:done', ({ options }) => {
                        cmd.argv.delete = [path_1.default.resolve(options.rootDir, options.buildDir)];
                    });
                }
            }
        }, 'file-path': {
            type: 'string',
            default: process.env.NUXT_URL,
            description: 'Location for the SPA index file',
            prepare: (cmd, _, argv) => {
                // add hook to output index file
                cmd.cmd.addNuxtHook('build:done', async ({ options, nuxt }) => {
                    // get html for single page app
                    const { html } = await nuxt.server.renderRoute('/', {
                        url: '/'
                    });
                    let filePath = argv['file-path'];
                    // fallback to public path if file path option is not set
                    if (!filePath) {
                        filePath = path_1.default.join(`${argv['public-path']}`, options.router.base, 'index.html');
                    }
                    // resolve the file path relative to configured rootDir
                    const destination = path_1.default.resolve(options.rootDir, filePath);
                    // create directory if it does not exist
                    const dir = path_1.default.dirname(destination);
                    if (!fs_extra_1.default.existsSync(dir)) {
                        fs_extra_1.default.mkdirpSync(dir);
                    }
                    fs_extra_1.default.writeFileSync(destination, html, 'utf-8');
                });
            }
        }, 'public-path': {
            type: 'string',
            default: 'public',
            description: 'The folder where laravel serves assets from',
            prepare: (cmd, _, argv) => {
                if (argv['public-path']) {
                    // add hook move built assets to public path
                    cmd.cmd.addNuxtHook('build:done', ({ options }) => {
                        // resolve public path for assets
                        const publicPath = path_1.default.join(path_1.default.resolve(options.rootDir, `${argv['public-path']}`), options.router.base, options.build.publicPath);
                        // create directory if it does not exist
                        if (!fs_extra_1.default.existsSync(publicPath)) {
                            fs_extra_1.default.mkdirpSync(publicPath);
                        }
                        // resolve static assets path
                        const staticDir = path_1.default.resolve(options.rootDir, options.srcDir, options.dir.static);
                        // copy static assets to public path if folder exists
                        if (fs_extra_1.default.existsSync(staticDir)) {
                            fs_extra_1.default.copySync(staticDir, publicPath);
                        }
                        // copy compiled assets to public path
                        fs_extra_1.default.copySync(path_1.default.resolve(options.rootDir, options.buildDir, 'dist', 'client'), publicPath);
                    });
                }
            }
        } }),
    async run(cmd) {
        cmd.argv.generate = false;
        const buildCmd = await cli_1.commands.default('build');
        await buildCmd.run(cmd);
        if (cmd.argv.delete && lodash_1.isArray(cmd.argv.delete)) {
            cmd.argv.delete.forEach(delPath => {
                fs_extra_1.default.removeSync(delPath);
            });
        }
    },
    addNuxtHook(name, handler) {
        this._nuxtHooks = this._nuxtHooks || {};
        this._nuxtHooks[name] = this._nuxtHooks[name] || [];
        this._nuxtHooks[name].push(handler);
    }
    /* tslint:enable:object-literal-sort-keys */
};
exports.default = config;
//# sourceMappingURL=build.js.map