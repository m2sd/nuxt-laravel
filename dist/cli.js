"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nuxtCommand_1 = require("./classes/nuxtCommand");
exports.commands = {
    build: () => require('./subcommands/build').default,
    dev: () => require('./subcommands/dev').default
};
exports.getCommand = (name) => {
    if (!name || !exports.commands[name]) {
        return exports.commands.dev();
    }
    return exports.commands[name]();
};
exports.run = () => {
    const argv = process.argv.slice(2);
    const cmd = exports.getCommand(argv[0]);
    if (Object.keys(exports.commands).includes(argv[0])) {
        argv.shift();
    }
    return nuxtCommand_1.NuxtCommand.run(cmd, argv);
};
exports.NuxtLaravelCommand = nuxtCommand_1.NuxtCommand;
