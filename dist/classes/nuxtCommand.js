"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cli_1 = require("@nuxt/cli");
const lodash_1 = require("lodash");
class NuxtLaravelCommand extends cli_1.NuxtCommand {
    constructor(cmd, _argv) {
        super(cmd, _argv);
    }
    static from(cmd, _argv) {
        if (cmd instanceof NuxtLaravelCommand) {
            return cmd;
        }
        return new NuxtLaravelCommand(cmd, _argv);
    }
    static run(cmd, _argv) {
        return NuxtLaravelCommand.from(cmd, _argv).run();
    }
    async getNuxt(options) {
        // get Nuxt from cli imports
        const { Nuxt } = await cli_1.imports.core();
        // initialize the nuxt instance
        const nuxt = new Nuxt(options);
        await nuxt.ready();
        // apply nuxt hooks if they have been provided
        if (typeof this.cmd._nuxtHooks === 'object') {
            for (const name in this.cmd._nuxtHooks) {
                if (this.cmd._nuxtHooks.hasOwnProperty(name)) {
                    for (const hook of this.cmd._nuxtHooks[name]) {
                        nuxt.hook(name, hook);
                    }
                }
            }
        }
        return nuxt;
    }
    async getNuxtConfig(extraOptions = {}) {
        // call original getNuxtConfig to retrieve options
        const options = await super.getNuxtConfig(extraOptions);
        // force spa mode
        options.mode = 'spa';
        // add axios module if it is not already present
        options.modules = options.modules || [];
        if (!options.modules.find((m) => (lodash_1.isArray(m) && m[0] === '@nuxtjs/axios') || m === '@nuxtjs/axios')) {
            options.modules.push('@nuxtjs/axios');
        }
        return options;
    }
}
NuxtLaravelCommand.CONFIG_KEY = '__nuxt_laravel__';
exports.NuxtLaravelCommand = NuxtLaravelCommand;
exports.default = NuxtLaravelCommand;
//# sourceMappingURL=nuxtCommand.js.map