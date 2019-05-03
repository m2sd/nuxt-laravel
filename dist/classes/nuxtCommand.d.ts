import { NuxtCommand, NuxtCommandConfig } from '@nuxt/cli';
import NuxtConfiguration from '@nuxt/config';
export interface NuxtLaravelCommandConfig extends NuxtCommandConfig<NuxtLaravelCommand> {
    addNuxtHook?: (name: string, handler: (...args: any) => void) => void;
}
export interface NuxtLaravelCommand {
    cmd: NuxtLaravelCommandConfig;
}
export declare class NuxtLaravelCommand extends NuxtCommand {
    static readonly CONFIG_KEY = "__nuxt_laravel__";
    static from(cmd: NuxtLaravelCommandConfig | NuxtLaravelCommand, _argv?: string[]): NuxtLaravelCommand;
    static run(cmd: NuxtLaravelCommandConfig | NuxtLaravelCommand, _argv?: string[]): Promise<void>;
    constructor(cmd: NuxtLaravelCommandConfig, _argv?: string[]);
    getNuxt(options: NuxtConfiguration): Promise<any>;
    getNuxtConfig(extraOptions?: NuxtConfiguration): Promise<NuxtConfiguration>;
}
export default NuxtLaravelCommand;
//# sourceMappingURL=nuxtCommand.d.ts.map