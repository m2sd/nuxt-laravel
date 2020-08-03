import { Configuration } from '@nuxt/types';
export interface Options {
    root?: string;
    publicDir?: string;
    outputPath?: string;
    devServer?: boolean;
    server?: boolean | {
        host?: string;
        port: number;
    };
    swCache?: boolean | {
        name: string;
        fileName?: string;
        endpoint?: string;
    };
    dotEnvExport?: boolean;
}
declare type ValidOptions = Required<Omit<Options, 'outputPath'>> & Pick<Options, 'outputPath'>;
declare type CacheConfig = false | {
    name: string;
    fileName: string;
    endpoint: string;
};
interface NuxtConfig {
    routerBase: string;
    urlPath: string;
    routerPath: string;
}
interface LaravelConfig {
    root: string;
    public: string;
    server: false | {
        host?: string;
        port: number;
    };
}
interface OutputConfig {
    src: string;
    dest: string;
    indexPath: false | string;
    fallback: string;
}
export interface ModuleConfig {
    options: ValidOptions;
    nuxt: NuxtConfig;
    laravel: LaravelConfig;
    cache: CacheConfig;
    output: OutputConfig;
}
export declare const getConfiguration: (nuxtOptions: Configuration, overwrites?: Options) => ModuleConfig;
export {};
