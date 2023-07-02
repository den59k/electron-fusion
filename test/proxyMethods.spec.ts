import { expect, it, vi } from 'vitest'
import './mocks/electron'
import { proxy } from '../src/preload'
import { proxyMethods } from '../src/main'
import { WebContents, webContents } from 'electron'

const createTestService = (webContents?: WebContents, channel?: string) => {
  class TestService {
    constructor(webContents?: WebContents, channel?: string) {
      proxyMethods(this, channel ?? "test", webContents)
    }
    counter = 0
    increment() {
      this.counter++
    }

    getResult() {
      return this.counter
    }

    getNullResult() {
      return null
    }

    async request() {
      await new Promise(res => setTimeout(res, 100))
      return "success"
    }
  }
  return new TestService(webContents, channel)
}

it("proxy Methods", () => {

  const testService = createTestService()
  const increment = vi.spyOn(testService, "increment")

  const bridge = proxy("test", {} as typeof testService, ["increment"], [], ["getResult", "getNullResult"])

  bridge.increment()
  expect(increment).toHaveBeenCalledTimes(1)
})

it("proxy Methods", () => {

  const testService = createTestService()
  const increment = vi.spyOn(testService, "increment")
  const getResult = vi.spyOn(testService, "getResult")

  const bridge = proxy("test", {} as typeof testService, ["increment"], [], ["getResult", "getNullResult"])
  bridge.increment()
  bridge.increment()

  expect(increment).toBeCalledTimes(2)

  const result = bridge.getResult()
  expect(getResult).toHaveBeenCalledTimes(1)
  expect(result).toBe(2)

  expect(bridge.getNullResult()).toBeNull()
})

it("async methods", async () => {

  const testService = createTestService()
  const request = vi.spyOn(testService, "request")

  const bridge = proxy("test", {} as typeof testService, ["increment"], ["request"], ["getResult"])
  
  const result = await bridge.request()
  expect(request).toBeCalledTimes(1)
  expect(result).toBe("success")
})


it("proxy Methods to window", () => {

  const testService = createTestService(webContents.fromId(1), "currentTest")

  const increment = vi.spyOn(testService, "increment")

  const bridge = proxy("currentTest", {} as typeof testService, ["increment"], [], ["getResult", "getNullResult"])

  bridge.increment()
  expect(increment).toHaveBeenCalledTimes(1)
})