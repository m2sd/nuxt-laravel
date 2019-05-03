"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const execa_1 = __importDefault(require("execa"));
const fs_extra_1 = require("fs-extra");
const cli_1 = require("@nuxt/cli");
const nuxtCommand_1 = __importDefault(require("./classes/nuxtCommand"));
const _commands = {
    build: () => Promise.resolve(require('./subcommands/build')),
    dev: () => Promise.resolve(require('./subcommands/dev'))
};
const getCommand = async (name) => {
    if (!name || !_commands[name]) {
        return Promise.resolve(null);
    }
    return (await _commands[name]()).default;
};
exports.run = async (_argv) => {
    // Read from process.argv
    const argv = _argv ? Array.from(_argv) : process.argv.slice(2);
    // Check for internal command
    let cmd = await getCommand(argv[0]);
    // Matching `nuxt` or `nuxt [dir]` or `nuxt -*` for `nuxt dev` shortcut
    if (!cmd && (!argv[0] || argv[0][0] === '-' || fs_extra_1.existsSync(argv[0]))) {
        argv.unshift('dev');
        cmd = await getCommand('dev');
    }
    // Setup env
    cli_1.setup({ dev: argv[0] === 'dev' });
    // Try internal command
    if (cmd) {
        return nuxtCommand_1.default.run(cmd, argv.slice(1));
    }
    // Try external command
    try {
        await execa_1.default(`nuxt-laravel-${argv[0]}`, argv.slice(1), {
            stderr: process.stderr,
            stdin: process.stdin,
            stdout: process.stdout
        });
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            throw String(`Command not found: nuxt-laravel-${argv[0]}`);
        }
        throw String(`Failed to run command \`nuxt-laravel-${argv[0]}\`:\n${error}`);
    }
};
exports.NuxtLaravelCommand = nuxtCommand_1.default;
exports.commands = Object.freeze({
    default: getCommand
});
exports.default = exports.run;
//# sourceMappingURL=cli.js.map