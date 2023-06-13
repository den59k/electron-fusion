import { ipcMain } from "electron"

const services = new Map<string, object>()
ipcMain.on("call", (e, channel: string, method: string, ...args: any) => {
  const service = services.get(channel) as any
  if (!service) {
    console.warn(`Service ${channel} not registered for method ${method}`)
    return
  }
  service[method](...args)
})

ipcMain.handle("callAsync", (e, channel: string, method: string, ...args: any) => {
  const service = services.get(channel) as any
  if (!service) {
    return Promise.reject(`Service ${channel} not registered for method ${method}`)
  }
  return service[method](...args)
})

ipcMain.on("callSync", (e, channel: string, method: string, ...args: any) => {
  const service = services.get(channel) as any
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