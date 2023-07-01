import { IpcRendererEvent } from 'electron';

export declare const bridge: {
    addListener(channel: string, listener: (e: IpcRendererEvent, ...args: any[]) => void): ListenerDisposer;
    sync(channel: string): any;
};

export declare type electronAPI = typeof bridge;

declare type ListenerDisposer = () => void;

export declare const proxy: <T, M extends keyof { [P in keyof T as T[P] extends Function ? P : never]: any; } = never, A extends keyof { [P_1 in keyof T as T[P_1] extends (...args: any) => Promise<any> ? P_1 : never]: any; } = never, S extends keyof { [P_2 in keyof T as T[P_2] extends (...args: any) => object | number | string ? P_2 : never]: any; } = never>(channel: string, dummy: T, methods?: M[], asyncMethods?: A[], syncMethods?: S[]) => Pick<T, M | A | S>;

export { }
