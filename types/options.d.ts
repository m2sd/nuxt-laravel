import { Configuration } from '@nuxt/types';
export interface Options {
    root?: string;
    publicDir?: string;
    outputPath?: string;
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
export declare const getConfiguration: (nuxtOptions: Configuration, overwrites?: Options | undefined) => {
    options: Options;
    nuxt: {
        urlPath: string;
        routerPath: string;
    };
    laravel: {
        root: string;
        public: string;
        server: false | {
            host?: string | undefined;
            port: number;
        } | undefined;
    };
    output: {
        src: string;
        dest: string;
        fallback: string;
        additional: string | false;
    };
    cache: false | {
        name: string;
        fileName: string;
        endpoint: string;
    };
    routerBase: string;
};
declare module '@nuxt/types' {
    interface Configuration {
        laravel?: Options;
    }
}
