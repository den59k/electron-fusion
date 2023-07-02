import EventEmitter from "events";
import { vi } from "vitest";
import { toJS } from '../../src/utils/toJS'

vi.mock("electron", async () => {
  const actual = (await vi.importActual("electron")) as any;

  const mainEmitter = new EventEmitter()
  const handles = new Map<string, (...args: any[]) => Promise<any>>()

  const rendererEmitter = new EventEmitter()

  const sender = { 
    id: 1, 
    isDestroyed: () => false, 
    send: (channel: string, ...args: any[]) => rendererEmitter.emit(channel, {}, ...args.map(toJS)),
    once: vi.fn()
  }

  return {
    ...actual,
    ipcMain: {
      on: (channel: string, listener: (event: any, ...args: any[]) => void) => {
        mainEmitter.on(channel, listener)
      },
      handle: (channel: string, listener: (event: any, ...args: any[]) => (Promise<void>) | (any)) => {
        handles.set(channel, listener)
      }
    },
    ipcRenderer: {
      send: (channel: string, ...args: any[]) => {
        const e = { returnValue: undefined, sender }
        mainEmitter.emit(channel, e, ...args)
      },
      sendSync: (channel: string, ...args: any[]) => {
        const e = { returnValue: undefined, sender }
        mainEmitter.emit(channel, e, ...args)
        if (e.returnValue === undefined) {
          throw new Error("returnValue is undefined")
        }
        return toJS(e.returnValue)
      },
      invoke: (channel: string, ...args: any[]) => {
        const handle = handles.get(channel)
        if (!handle) {
          throw new Error(`Handles ${channel} not registered`)
        }
        return handle({}, ...args)
      },
      addListener(eventName: string | symbol, listener: (...args: any[]) => void) {
        rendererEmitter.on(eventName, listener)
      }
    },
    webContents: {
      fromId: (id: number) => id === 1? sender: null
    }
  };
});