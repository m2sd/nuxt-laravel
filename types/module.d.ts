import { Module } from '@nuxt/types';
export interface Options {
    root?: string;
    publicDir?: string;
    outputPath?: string;
    server?: boolean | {
        host?: string;
        port?: number;
    };
    dotEnvExport?: boolean;
}
declare const laravelModule: Module<Options>;
export default laravelModule;
export declare const meta: any;
