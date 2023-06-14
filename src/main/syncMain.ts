import { ipcMain, webContents } from 'electron'
import { applyArrayMethods } from './arrayMethods'
export { proxyMethods } from './proxyMethods'

const objects = new Map<string | number, object>()
const subs = new Map<number, Set<string>>()

export type BaseKey = (string | number)[]

ipcMain.on("sync", (e, channel: string) => {
  const set = subs.get(e.sender.id) || new Set()
  set.add(channel)
  subs.set(e.sender.id, set)
  e.returnValue = objects.get(channel) || null
})

function* getObjectByBaseKey (baseKey: BaseKey) {
  let obj: any = objects.get(baseKey[0])
  for (let i = 1; i < baseKey.length; i++) {
    if (typeof obj["get"] === "function") {
      obj = obj.get(baseKey[i])
      yield obj
      continue
    }
    obj = obj[baseKey[i]]
    yield obj
  }
}

const setCommands = [ "set", "_set", "push", "unshift", "splice" ]
let flagNextTick = false
let toSend: [ BaseKey, string, ...any ][] = []
export const send = (baseKey: BaseKey, command: string, ...args: any) => {

  for (let item of toSend) {
    if (setCommands.includes(item[1])) {
      for (let i = 2; i < item.length; i++) {
        if (typeof item[i] !== "object" || item[i] === null) continue
        for (let affected of getObjectByBaseKey(baseKey)) {
          if (item[i] === affected) return
        }
      }
    }
  }

  toSend.push([ baseKey, command, ...args ])
  if (!flagNextTick) {
    process.nextTick(sendOnNextTick)
    flagNextTick = true
  }
}

const sendOnNextTick = () => {
  for (let [ id, set ] of subs) {
    const webContent = webContents.fromId(id)
    if (!webContent || webContent.isDestroyed()) {
      subs.delete(id) 
      continue
    }
    const arr = toSend.filter(i => set.has(i[0][0] as string))
    if (arr.length === 0) continue
    webContent.send('sync', arr)
  }

  flagNextTick = false
  toSend = []
}

export const toRaw = (obj: any) => {
  if (typeof obj !== "object" || obj === null) return obj
  return obj.__isReactive__? obj.__raw__: obj
}

const mapMethod = (baseKey: BaseKey, target: any, prop: string) => {
  return (...args: any) => {
    const _args = args.map(toRaw)
    target[prop](..._args)
    send(baseKey, prop, ..._args)
  }
}

export const syncMain = <T extends object>(baseKey: BaseKey, obj: T): T => {
  if (typeof obj !== "object" || obj === null) return obj
  if (baseKey.length === 1) {
    objects.set(baseKey[0], obj)
  }

  return new Proxy<T>(obj, {
    get(target, prop: string, receiver) {
      if (prop === "__raw__") return target
      if (prop === "__basekey__") return baseKey
      if (prop === "__isReactive__") return true

      if (Array.isArray(target) && [ "sort", "_filter" ].includes(prop)) {
        return applyArrayMethods(target, prop as "sort" | "_filter", baseKey)
      }

      const value = (target as any)[prop]
      if (typeof value === "function") {
        if ([ "add", "set", "push", "unshift", "splice", "clear", "delete" ].includes(prop)) {
          return mapMethod(baseKey, target, prop)
        }
        if (target instanceof Map && [ "get" ].includes(prop)) {
          return (key: string) => syncMain([ ...baseKey, key ], target.get(key))
        }
        return value.bind(target)
      }

      return syncMain([ ...baseKey, prop ], value)
    },
    set(target, prop: string, value, receiver) {
      const _value = toRaw(value)
      const success = Reflect.set(target, prop, _value, receiver)
      if (success) {
        send([ ...baseKey, prop ], "_set", _value)
      }
      return success
    }
  });
}