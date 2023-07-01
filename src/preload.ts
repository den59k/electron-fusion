import { ipcRenderer, IpcRendererEvent } from 'electron'

type KeyOfType<T, V> = keyof {
  [P in keyof T as T[P] extends V? P: never]: any
}

export const proxy = <T, M extends KeyOfType<T, Function> = never, A extends KeyOfType<T, (...args: any) => Promise<any>> = never, S extends KeyOfType<T, (...args: any) => object | number | string> = never>(
  channel: string, 
  dummy: T,
  methods: M[] = [], 
  asyncMethods: A[] = [],
  syncMethods: S[] = []
): Pick<T, M | A | S> => {
    
  const obj: any = {}
  for (let method of methods) {
    obj[method] = (...args: any) => ipcRenderer.send("call", channel, method, ...args)
  }
  for (let method of asyncMethods) {
    obj[method] = (...args: any) => ipcRenderer.invoke("callAsync", channel, method, ...args)
  }
  for (let method of syncMethods) {
    obj[method] = (...args: any) => ipcRenderer.sendSync("callSync", channel, method, ...args)
  }
  return obj
}

type ListenerDisposer = () => void

export const bridge = {
  addListener(channel: string, listener: (e: IpcRendererEvent, ...args: any[]) => void): ListenerDisposer {
    ipcRenderer.addListener(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  },
  sync(channel: string) {
    return ipcRenderer.sendSync('sync', channel)
  }
}

export type electronAPI = typeof bridge