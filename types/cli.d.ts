import NuxtCommand, { NuxtLaravelCommandConfig } from './classes/NuxtCommand';
export declare const run: (_argv?: string[] | undefined) => Promise<void>;
export declare const NuxtLaravelCommand: typeof NuxtCommand;
export declare const commands: Readonly<{
    default: (name?: string | undefined) => Promise<NuxtLaravelCommandConfig | null>;
}>;
export default run;
//# sourceMappingURL=cli.d.ts.map