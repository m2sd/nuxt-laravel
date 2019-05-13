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
        }, generate: {
            type: 'boolean',
            default: true,
            description: "Don't generate static version for SPA mode (useful for nuxt start)"
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
                    cmd.cmd.addNuxtHook('generate:done', ({ options }) => {
                        cmd.argv.delete = [
                            path_1.default.resolve(options.rootDir, options.generate.dir),
                            path_1.default.resolve(options.rootDir, options.buildDir)
                        ];
                    });
                }
            }
        }, 'file-path': {
            type: 'string',
            default: process.env.NUXT_URL || 'storage/app/index.html',
            description: 'Location for the SPA index file',
            prepare: (cmd, _, argv) => {
                // add hook to output index file
                cmd.cmd.addNuxtHook('generate:done', async ({ options, nuxt }) => {
                    const { html } = await nuxt.server.renderRoute('/', {
                        url: '/'
                    });
                    // resolve the file path relative to configured rootDir
                    const destination = path_1.default.resolve(options.rootDir, `${argv['file-path']}`);
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
                // add hook move built assets to public path
                cmd.cmd.addNuxtHook('generate:done', ({ options }) => {
                    const destination = path_1.default.resolve(path_1.default.resolve(options.rootDir, `${argv['public-path']}`) +
                        options.build.publicPath);
                    // create directory if it does not exist
                    const dir = path_1.default.dirname(destination);
                    if (!fs_extra_1.default.existsSync(dir)) {
                        fs_extra_1.default.mkdirpSync(dir);
                    }
                    const staticDir = path_1.default.join(options.srcDir, 'static');
                    if (fs_extra_1.default.existsSync(staticDir)) {
                        fs_extra_1.default.copySync(path_1.default.resolve(options.srcDir, 'static'), destination);
                    }
                    fs_extra_1.default.moveSync(path_1.default.resolve(path_1.default.resolve(options.rootDir, options.generate.dir) +
                        options.build.publicPath), destination, {
                        overwrite: true
                    });
                });
            }
        } }),
    async run(cmd) {
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