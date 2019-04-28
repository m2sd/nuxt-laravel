"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cli_1 = require("@nuxt/cli");
const lodash_1 = require("lodash");
class NuxtCommand extends cli_1.NuxtCommand {
    constructor(cmd, _argv) {
        super(cmd, _argv);
        this._nuxtHooks = {};
    }
    static from(cmd, _argv) {
        if (cmd instanceof NuxtCommand) {
            return cmd;
        }
        return new NuxtCommand(cmd, _argv);
    }
    static run(cmd, _argv) {
        return NuxtCommand.from(cmd, _argv).run();
    }
    async run() {
        // show help if called with invalid arguments
        if (!this.checkArgs()) {
            this.showHelp();
            return;
        }
        await super.run();
    }
    async getNuxt(options) {
        // get Nuxt from cli imports
        const { Nuxt } = await cli_1.imports.core();
        // disable auto init
        options._ready = false;
        const nuxt = new Nuxt(options);
        // apply nuxt hooks if they have been provided
        if (this._nuxtHooks && typeof this._nuxtHooks === 'object') {
            for (const name in this._nuxtHooks) {
                if (this._nuxtHooks.hasOwnProperty(name)) {
                    for (const hook of this._nuxtHooks[name]) {
                        nuxt.hook(name, hook);
                    }
                }
            }
        }
        // initialize the nuxt instance
        await nuxt.ready();
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
    addNuxtHook(name, handler, addBefore) {
        this._nuxtHooks[name] = this._nuxtHooks[name] || [];
        if (addBefore) {
            this._nuxtHooks[name].unshift(handler);
        }
        else {
            this._nuxtHooks[name].push(handler);
        }
    }
    checkArgs() {
        // only allow one additional argument
        if (this.argv._.length > 1) {
            return false;
        }
        // resolve acceptable aliases (flags)
        const allowedAliases = Object.values(this.cmd.options).reduce((aliases, option) => {
            if (option.alias) {
                aliases.push(option.alias);
            }
            return aliases;
        }, []);
        // resolve acceptable argv keys from options and aliases
        const allowedOptions = [
            '_',
            ...Object.keys(this.cmd.options),
            ...allowedAliases
        ];
        // returns false if argv contains additional options
        return !Object.keys(this.argv).filter(key => !allowedOptions.includes(key))
            .length;
    }
}
NuxtCommand.CONFIG_KEY = '__nuxt_laravel__';
exports.NuxtCommand = NuxtCommand;
exports.default = NuxtCommand;
//# sourceMappingURL=nuxtCommand.js.map