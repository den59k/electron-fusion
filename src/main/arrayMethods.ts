import { toRaw } from "./syncMain"
import { applyIndexes, isSorted } from "../utils/applyIndexes"
import { BaseKey, send } from "./send"

export const applyArrayMethods = (target: Array<any>, prop: "sort" | "_filter" | "remove", baseKey: BaseKey) => {

  if (prop === "remove") {
    return (...args: any) => {
      const _args = args.map(toRaw)
      if (prop === "remove" && Array.isArray(target)) {
        const index = target.indexOf(_args[0])
        if (index < 0) return
        target.splice(index, 1)
        send(baseKey, "splice", index, 1)
      } 
    }
  }

  const items = target.map((item, index) => [ index, item ] as [ number, string ])
  if (prop === "sort") {
    return (sortFunc: (a: any, b: any) => number) => {
      const indexes = items.sort((a, b) => sortFunc(a[1], b[1])).map(item => item[0])
      if (isSorted(indexes)) return target

      send(baseKey, prop, [ ...indexes ])
      applyIndexes(target, indexes)
      return target
    }
  }

  return (filterFunc: (a: any, index: number) => number) => {
    const indexes = items.filter((a) => filterFunc(a[1], a[0])).map(item => item[0])
    if (indexes.length === target.length) return target

    send(baseKey, prop, [ ...indexes ])
    applyIndexes(target, indexes)
    return target
  }
}