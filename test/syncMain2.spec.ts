import { vi, describe, it, expect } from 'vitest'
import './mocks/electron'

import { webContents } from 'electron'

import { syncMain } from '../src/main'
import { bridge } from "../src/preload";
import { nextTick } from "process";


describe("test", async () => {

  vi.stubGlobal('window', { 
    electron: {
      ...bridge
    }
  })

  const { syncRenderer } = await import('../src/renderer')

  it("prevent repeat send", async () => {
    const sender = webContents.fromId(1)!
    const sendMethod = vi.spyOn(sender, "send")

    const data = {
      a: "one",
      b: "two"
    }
    const _data = syncMain(["test"], data)

    const dataRenderer = syncRenderer<typeof _data>("test")

    expect(dataRenderer).not.toBe(data)
    expect(dataRenderer).toEqual(_data)
    
    _data.a = "one-edit"
    await new Promise(res => nextTick(res))
    
    expect(dataRenderer.a).toBe("one-edit")

    expect(sendMethod).toBeCalledTimes(1)
  })

})