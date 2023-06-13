import type { IpcRendererEvent } from 'electron';

declare type IOverload = {
    <T extends object>(channel: string): T;
    <T extends object, V extends object>(channel: string, callback: (obj: T) => V): V;
};

export declare const setActionWrapper: (wrapper: SyncWrapper) => void;

declare type SyncArgs = [string[], string, ...any][];

export declare const syncRenderer: IOverload;

declare type SyncWrapper = (callback: (e: IpcRendererEvent, arr: SyncArgs) => void) => (e: IpcRendererEvent, arr: SyncArgs) => void;

export { }
