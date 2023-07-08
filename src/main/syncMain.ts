import { applyArrayMethods } from './arrayMethods'
import { BaseKey, initSync, send } from './send'
export { proxyMethods } from './proxyMethods'

export const toRaw = <T extends object>(obj: T) => {
  if (typeof obj !== "object" || obj === null) return obj
  return ((obj as any).__raw__ as T) ?? obj
}

const mappedMethods = [ "add", "set", "push", "unshift", "splice", "clear", "delete", "remove" ]
const mapMethod = (baseKey: BaseKey, target: any, prop: string) => {
  return (...args: any) => {
    const _args = args.map(toRaw)
    target[prop](..._args)
    send(baseKey, prop, ..._args)
  }
}

const returnMethods = [ "get", "find", "forEach", "slice", Symbol.iterator, "values", "entries" ]
const returnMethod = (baseKey: BaseKey, target: object, prop: string | Symbol) => {
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
  if (prop === "forEach" && Array.isArray(target)) {
    return (callback: (item: any, index: number, array: any) => void) => {
      return target.forEach((value, index, array) => callback(syncMain([ ...baseKey, index ], value), index, array))
    }
  }
  if (prop === "slice" && Array.isArray(target)) {
    return (start: number = 0, end: number | undefined) => {
      if (start < 0) start = target.length + start
      return target.slice(start, end).map((item, index) => syncMain([ ...baseKey, start+index ], item))
    }
  }
  if (prop === Symbol.iterator || ((prop === "values" || prop === "entries") && target instanceof Map)) {
    return () => {
      const innerIterator = (target as any)[Symbol.iterator]()
      if (target instanceof Map) {
        const values = prop === "values"
        const iterator: Iterator<any> = {
          next: () => {
            const { done, value } = innerIterator.next()
            if (done) return { done, value: undefined }
            const _value = syncMain([ ...baseKey, value[0] ], value[1])
            return {
              value: values? _value: [ value[0], _value ],
              done
            }
          }
        }
        if (prop === Symbol.iterator) return iterator
        return { [ Symbol.iterator ]: () => iterator }
      }
      let index = 0
      return {
        next: () => {
          const { done, value } = innerIterator.next()
          return { 
            done, 
            value: syncMain([ ...baseKey, index++ ], value)
          }
        }
      }
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