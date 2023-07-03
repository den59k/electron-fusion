import { applyArrayMethods } from './arrayMethods'
import { BaseKey, initSync, send } from './send'
export { proxyMethods } from './proxyMethods'

export const toRaw = (obj: any) => {
  if (typeof obj !== "object" || obj === null) return obj
  return obj.__isReactive__? obj.__raw__: obj
}

const mappedMethods = [ "add", "set", "push", "unshift", "splice", "clear", "delete", "remove" ]
const mapMethod = (baseKey: BaseKey, target: any, prop: string) => {
  return (...args: any) => {
    const _args = args.map(toRaw)
    target[prop](..._args)
    send(baseKey, prop, ..._args)
  }
}

const returnMethods = [ "get", "find" ]
const returnMethod = (baseKey: BaseKey, target: object, prop: string) => {
  if (prop === "get" && target instanceof Map) {
    return (key: string) => syncMain([ ...baseKey, key ], target.get(key))
  }
  if (prop === "find" && Array.isArray(target)) {
    return (callback: (item: any) => boolean) => {
      const index = target.findIndex(callback)
      if (index < 0) return undefined
      return syncMain([ ...baseKey, index ], target[index])
    }
  }
}

export const syncMain = <T extends object>(baseKey: BaseKey, obj: T): T => {
  if (typeof obj !== "object" || obj === null) return obj
  if (baseKey.length === 1) {
    initSync(baseKey, obj)
  }

  return new Proxy<T>(obj, {
    get(target, prop: string, receiver) {
      if (prop === "__raw__") return target
      if (prop === "__basekey__") return baseKey
      if (prop === "__isReactive__") return true

      if ([ "sort", "_filter", "remove" ].includes(prop) && Array.isArray(target)) {
        return applyArrayMethods(target, prop as "sort" | "_filter" | "remove", baseKey)
      }

      const value = (target as any)[prop]
      if (typeof value === "function") {
        if (mappedMethods.includes(prop)) {
          return mapMethod(baseKey, target, prop)
        }
        if (returnMethods.includes(prop)) {
          return returnMethod(baseKey, target, prop)
        }

        return value.bind(target)
      }

      return syncMain([ ...baseKey, prop ], value)
    },
    deleteProperty(target, prop: string) {
      if (!Reflect.deleteProperty(target, prop)) return false
      send([ ...baseKey ], "_delete", prop)
      return true
    },
    set(target, prop: string, value, receiver) {
      const _value = toRaw(value)
      if (!Reflect.set(target, prop, _value, receiver)) return false

      send([ ...baseKey ], "_set", prop, _value)
      return true
    }
  });
}