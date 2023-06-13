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
    await new Promise(res => nextTick(res))
    expect(dataRenderer).toEqual(toJS(_data))

    _data.map.delete("key")
    await new Promise(res => nextTick(res))
    expect(dataRenderer).toEqual(toJS(_data))
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
})

