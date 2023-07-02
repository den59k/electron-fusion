import { IpcMainEvent, IpcMainInvokeEvent, WebContents, ipcMain } from "electron"

const services = new Map<string, object>()
const windows = new Map<string, Map<number, object>>()

const getTarget = (e: IpcMainEvent | IpcMainInvokeEvent, channel: string) => {
  const service = services.get(channel)
  if (service) return service
  
  const window = windows.get(channel)?.get(e.sender.id)
  if (window) return window

  return null
}

ipcMain.on("call", (e, channel: string, method: string, ...args: any) => {
  const service = getTarget(e, channel) as any
  if (!service) {
    console.warn(`Service ${channel} not registered for method ${method}`)
    return
  }
  service[method](...args)
})

ipcMain.handle("callAsync", (e, channel: string, method: string, ...args: any) => {
  const service = getTarget(e, channel) as any
  if (!service) {
    return Promise.reject(`Service ${channel} not registered for method ${method}`)
  }
  return service[method](...args)
})

ipcMain.on("callSync", (e, channel: string, method: string, ...args: any) => {
  const service = getTarget(e, channel) as any
  if (!service) {
    console.warn(`Service ${channel} not registered for method ${method}`)
    e.returnValue = null
    return
  }
  e.returnValue = service[method](...args) ?? null
})

export const proxyMethods = (service: object, name: string) => {
  services.set(name, service)
}

export const proxyMethodToWindow = (service: object, webContents: WebContents, name: string) => {
  const map = windows.get(name) ?? new Map()
  map.set(webContents.id, service)
  windows.set(name, map)

  webContents.once("destroyed", () => {
    map.delete(webContents.id)
  })
}