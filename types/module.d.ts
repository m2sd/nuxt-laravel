import { NuxtConfigurationModuleFunction } from '@nuxt/config/types/module';
export interface LaravelModuleOptions {
    root?: string;
    publicPath?: string;
    renderPath?: string;
    server?: {
        host: string;
        port?: number;
        https?: boolean;
    };
}
declare const laravelModule: NuxtConfigurationModuleFunction;
export default laravelModule;
export declare const meta: any;
