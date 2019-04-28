"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const cli_1 = require("@nuxt/cli");
const cli_chunk3_1 = require("@nuxt/cli/dist/cli-chunk3");
delete cli_chunk3_1.common.spa;
delete cli_chunk3_1.common.universal;
// tslint:disable-next-line:no-var-requires
require('dotenv').config();
const config = {
    name: 'nuxt-laravel-build',
    options: Object.assign({}, cli_chunk3_1.common, cli_chunk3_1.locking, { analyze: {
            alias: 'a',
            description: 'Launch webpack-bundle-analyzer to optimize your bundles',
            type: 'boolean',
            prepare(_, options, argv) {
                // Analyze option
                options.build = options.build || {};
                if (argv.analyze && typeof options.build.analyze !== 'object') {
                    options.build.analyze = true;
                }
            }
        }, delete: {
            default: true,
            description: 'Do not delete build files after generation',
            prepare: (cmd, _, argv) => {
                if (argv.delete) {
                    // add hook to delete build files after generation
                    cmd.addNuxtHook('generate:done', ({ options }) => {
                        fs_extra_1.default.removeSync(path_1.default.resolve(options.rootDir, options.generate.dir));
                        fs_extra_1.default.removeSync(path_1.default.resolve(options.rootDir, options.buildDir));
                    });
                }
            },
            type: 'boolean'
        }, devtools: {
            default: false,
            description: 'Enable Vue devtools',
            type: 'boolean',
            prepare(_, options, argv) {
                options.vue = options.vue || {};
                options.vue.config = options.vue.config || {};
                if (argv.devtools) {
                    options.vue.config.devtools = true;
                }
            }
        }, 'file-path': {
            default: process.env.NUXT_URL || 'storage/app/index.html',
            description: 'Location for the SPA index file',
            prepare: (cmd, _, argv) => {
                // add hook to output index file
                cmd.addNuxtHook('generate:done', async ({ options, nuxt }) => {
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
                }, true);
            },
            type: 'string'
        }, 'public-path': {
            default: 'public',
            description: 'The folder where laravel serves assets from',
            prepare: (cmd, _, argv) => {
                // add hook move built assets to public path
                cmd.addNuxtHook('generate:done', ({ options }) => {
                    const destination = path_1.default.resolve(path_1.default.resolve(options.rootDir, `${argv['public-path']}`) +
                        options.build.publicPath);
                    // create directory if it does not exist
                    const dir = path_1.default.dirname(destination);
                    if (!fs_extra_1.default.existsSync(dir)) {
                        fs_extra_1.default.mkdirpSync(dir);
                    }
                    fs_extra_1.default.moveSync(path_1.default.resolve(path_1.default.resolve(options.rootDir, options.generate.dir) +
                        options.build.publicPath), destination, {
                        overwrite: true
                    });
                }, true);
            },
            type: 'string'
        }, quiet: {
            alias: 'q',
            description: 'Disable output except for errors',
            type: 'boolean',
            prepare(_, options, argv) {
                // Silence output when using --quiet
                if (argv.quiet && options.build) {
                    options.build.quiet = !!argv.quiet;
                }
            }
        } }),
    usage: 'laravel build <dir>',
    async run(cmd) {
        const buildCmd = await cli_1.commands.default('build');
        cli_1.setup({ dev: false });
        await buildCmd.run(cmd);
    }
};
exports.default = config;
