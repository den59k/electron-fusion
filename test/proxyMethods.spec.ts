import { expect, it, vi } from 'vitest'
import './mocks/electron'
import { proxy } from '../src/preload'
import { proxyMethods } from '../src/main'

const createTestService = () => {
  class TestService {
    constructor() {
      proxyMethods(this, "test")
    }
    counter = 0
    increment() {
      this.counter++
    }

    getResult() {
      return this.counter
    }

    async request() {
      await new Promise(res => setTimeout(res, 100))
      return "success"
    }
  }
  return new TestService()
}

it("proxy Methods", () => {

  const testService = createTestService()
  const increment = vi.spyOn(testService, "increment")

  const bridge = proxy("test", {} as typeof testService, ["increment"], [], ["getResult"])

  bridge.increment()
  expect(increment).toHaveBeenCalledTimes(1)
})

it("proxy Methods", () => {

  const testService = createTestService()
  const increment = vi.spyOn(testService, "increment")
  const getResult = vi.spyOn(testService, "getResult")

  const bridge = proxy("test", {} as typeof testService, ["increment"], [], ["getResult"])
  bridge.increment()
  bridge.increment()

  expect(increment).toBeCalledTimes(2)

  const result = bridge.getResult()
  expect(getResult).toHaveBeenCalledTimes(1)
  expect(result).toBe(2)
})

it("async methods", async () => {

  const testService = createTestService()
  const request = vi.spyOn(testService, "request")

  const bridge = proxy("test", {} as typeof testService, ["increment"], ["request"], ["getResult"])
  
  const result = await bridge.request()
  expect(request).toBeCalledTimes(1)
  expect(result).toBe("success")
})
