declare type BaseKey = (string | number)[];

export declare type FusionArray<T> = Array<T> & {
    _filter: (filterFunc: (item: T, index: number) => boolean) => T[];
};

export declare const proxyMethods: (service: object, name: string) => void;

export declare const syncMain: <T extends object>(baseKey: BaseKey, obj: T) => T;

export declare const toRaw: (obj: any) => any;

export { }
