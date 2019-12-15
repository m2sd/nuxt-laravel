import consola from 'consola';
import { Configuration } from '@nuxt/types';
export declare const logger: typeof consola;
export declare const addBadgeMessage: (options: Configuration, enabled?: boolean) => void;
export declare const getModuleOptions: (options: Configuration, moduleKey: string, optionsKey?: string | undefined) => any;
