import { Module } from '@nuxt/types';
import { Options } from './options';
declare const laravelModule: Module<Options>;
export default laravelModule;
export { Options } from './options';
export { moduleKey, laravelAppEnv, nuxtOutputEnv } from './constants';
declare module '@nuxt/types' {
    interface Configuration {
        laravel?: Options;
    }
}
export declare const meta: any;
