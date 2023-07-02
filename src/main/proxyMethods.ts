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

/**
 * Mark object as receiver methods from renderer
 * 
 * @param service Target object
 * @param channel Must be unique for each `service`, if `webContents` are not provided
 * @param webContents `WebContents`, from which to handle requests
 */
export const proxyMethods = (service: object, channel: string, webContents?: WebContents) => {
  if (!webContents) {
    services.set(channel, service)
    return
  }

  const map = windows.get(channel) ?? new Map()
  map.set(webContents.id, service)
  windows.set(channel, map)

  webContents.once("destroyed", () => {
    map.delete(webContents.id)
  })
}