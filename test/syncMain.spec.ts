import { describe, expect, it, vi } from "vitest";
import './mocks/electron'

import { FusionArray, syncMain } from '../src/main'
import { bridge } from "../src/preload";
import { nextTick } from "process";
import { toJS } from "../src/utils/toJS";

describe("test", async () => {

  vi.stubGlobal('window', { 
    electron: {
      ...bridge
    }
  })

  const { syncRenderer } = await import('../src/renderer')

  it("syncMain test", async () => {
    const data = {
      a: "test1",
      b: "test2"
    }
  
    const _data = syncMain(["test"], data)

    const dataRenderer = syncRenderer<typeof data>("test")
  
    expect(dataRenderer).not.toBe(data)
    expect(dataRenderer).toEqual(_data)
  
    _data.a = "test10"
    await new Promise(res => nextTick(res))

    expect(dataRenderer.a).toBe("test10")
  })

  it("deepSync test", async () => {
    class Data {
      name = "test"
      info: { test: string } | null = null
    }
  
    const _data = syncMain(["test2"], new Data())

    const dataRenderer = syncRenderer<Data>("test2")

    expect(dataRenderer).not.toBe(_data)
    expect(dataRenderer).toEqual(_data)
    
    _data.info = { test: "value" }
    await new Promise(res => nextTick(res))
    expect(dataRenderer.info).toEqual({ test: "value" })
  
    _data.info.test = "changedValue"
    
    await new Promise(res => nextTick(res))
    expect(dataRenderer.info?.test).toBe("changedValue")
  })

  it("map test", async () => {
    class Data {
      map = new Map<string, any>()
    }
  
    const _data = syncMain(["test3"], new Data())
    const dataRenderer = syncRenderer<Data>("test3")

    _data.map.set("key", { key: "value" })
    await new Promise(res => nextTick(res))
    expect(dataRenderer).toEqual(toJS(_data))
    
    _data.map.get("key").key = "value2"
    _data.map.set("key2", { key: "value" })
    await new Promise(res => nextTick(res))
    expect(dataRenderer).toEqual(toJS(_data))

    _data.map.delete("key")
    await new Promise(res => nextTick(res))
    expect(dataRenderer).toEqual(toJS(_data))
    expect(dataRenderer.map.size).toBe(1)

    _data.map.clear()
    await new Promise(res => nextTick(res))
    expect(dataRenderer.map.size).toBe(0)

  })

  it("array test", async () => {
    class Data {
      array: number[] = []
    }
  
    const _data = syncMain(["test4"], new Data())
    const dataRenderer = syncRenderer<Data>("test4")

    _data.array.push(10)
    await new Promise(res => nextTick(res))
    expect(dataRenderer).toEqual(toJS(_data))

    _data.array[0] = 20
    await new Promise(res => nextTick(res))
    expect(dataRenderer).toEqual(toJS(_data))
    
    _data.array.push(50)
    _data.array.push(40)
    _data.array.push(30)
    await new Promise(res => nextTick(res))

    expect(dataRenderer).toEqual(toJS(_data))
    
    _data.array.sort((a, b) => (a-b))
    expect(_data.array).toEqual([ 20, 30, 40, 50 ])
    await new Promise(res => nextTick(res))
    expect(dataRenderer).toEqual(toJS(_data))

    const array = _data.array as FusionArray<number>

    array._filter((item) => item > 40)
    expect(_data.array).toEqual([ 50 ])
    await new Promise(res => nextTick(res))
    expect(dataRenderer).toEqual(toJS(_data))
  })

  it("inner map test", async () => {
    class Data {
      map = new Map<string, any>()
    }
  
    const _data = syncMain(["test5"], new Data())
    const dataRenderer = syncRenderer<Data>("test5")

    _data.map.set("array", [])
    _data.map.get("array").push({ item: "one" })

    await new Promise(res => nextTick(res))

    expect(dataRenderer.map.get("array").length).toBe(1)
    expect(dataRenderer).toEqual(toJS(_data))
  })

  it("inner array test", async () => {
    class Data {
      array: any[] = []
    }
  
    const _data = syncMain(["test6"], new Data())
    const dataRenderer = syncRenderer<Data>("test6")

    _data.array.push([])
    _data.array[0].push({ item: "one" })

    await new Promise(res => nextTick(res))
    expect(dataRenderer.array[0].length).toBe(1)
    expect(dataRenderer).toEqual(toJS(_data))

    _data.array.push([])
    _data.array[1].push({ item: "one" })
    _data.array[0].push({ item: "two" })

    await new Promise(res => nextTick(res))
    expect(dataRenderer.array[0].length).toBe(2)
    expect(dataRenderer).toEqual(toJS(_data))
  })


  it("inner array test", async () => {
    class Data {
      array1: any = []
      array2: any = []
    }
  
    const _data = syncMain(["test7"], new Data())
    const dataRenderer = syncRenderer<Data>("test7")

    _data.array1.push("one")
    _data.array2.push("two")

    await new Promise(res => nextTick(res))
    expect(dataRenderer).toEqual(toJS(_data))

    _data.array1.length = 0
    _data.array2.length = 0

    await new Promise(res => nextTick(res))
    expect(dataRenderer).toEqual(toJS(_data))
  })

  it("delete object props", async () => {
    class Data {
      obj: any = {}
    }
  
    const _data = syncMain(["test8"], new Data())
    const dataRenderer = syncRenderer<Data>("test8")

    _data.obj.test1 = "value1"
    _data.obj.test2 = "value2"

    await new Promise(res => nextTick(res))
    expect(dataRenderer).toEqual(toJS(_data))

    _data.obj.test1 = "value1"
    delete _data.obj.test2

    await new Promise(res => nextTick(res))
    expect(dataRenderer).toEqual(toJS(_data))
  })

  it("arrayFusion methods", async () => {
    class Data {
      numbers: Array<number> = []
      objects: Array<any> = []
    }
  
    const _data = syncMain(["test9"], new Data())
    const dataRenderer = syncRenderer<Data>("test9")

    _data.numbers.push(1, 2, 3)
    await new Promise(res => nextTick(res))
    expect(dataRenderer).toEqual(toJS(_data))

    const _numbers = _data.numbers as FusionArray<number>
    _numbers.remove(2)

    await new Promise(res => nextTick(res))
    expect(dataRenderer).toEqual(toJS(_data))

    const _objects = _data.objects as FusionArray<any>
    const firstItem = { test: "test" }
    _objects.push(firstItem)
    _objects.push(2)
    _objects.push(3)

    await new Promise(res => nextTick(res))
    expect(dataRenderer).toEqual(toJS(_data))

    _objects.remove(firstItem)

    await new Promise(res => nextTick(res))
    expect(dataRenderer).toEqual(toJS(_data))
  })
})

