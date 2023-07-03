import { WebContents } from 'electron';

declare type BaseKey = (string | number)[];

export declare type FusionArray<T> = Array<T> & {
    _filter: (filterFunc: (item: T, index: number) => boolean) => T[];
    remove: (item: T) => void;
};

/**
 * Mark object as receiver methods from renderer
 *
 * @param service Target object
 * @param channel Must be unique for each `service`, if `webContents` are not provided
 * @param webContents `WebContents`, from which to handle requests
 */
export declare const proxyMethods: (service: object, channel: string, webContents?: WebContents) => void;

export declare const syncMain: <T extends object>(baseKey: BaseKey, obj: T) => T;

export declare const toRaw: <T extends object>(obj: T) => T;

export { }
