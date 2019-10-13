import { Module } from '@nuxt/types';
export interface Options {
    root?: string;
    publicPath?: string;
    outputPath?: string;
    server?: {
        host?: string;
        port?: number;
    };
    dotEnvExport?: boolean;
}
declare const laravelModule: Module<Options>;
export default laravelModule;
export declare const meta: any;
//# sourceMappingURL=module.d.ts.map