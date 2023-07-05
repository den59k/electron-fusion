import { expect, it } from "vitest";
import './mocks/electron' 
import { applyIndexes, isSorted } from "../src/utils/applyIndexes";
import { syncMain, toRaw } from '../src/main/syncMain'

it("applyIndexes", () => {
  const array = [ 10, 20, 30, 40, 50 ]

  applyIndexes(array, [ 4, 3, 2, 1, 0 ])
  expect(array).toEqual([ 50, 40, 30, 20, 10 ])

  applyIndexes(array, [ 0, 1, 2, 4  ])
  expect(array).toEqual([ 50, 40, 30, 10 ])
})

it("toRaw", () => {
  const source = { test: "test" } as any
  expect(source.__raw__).toBeUndefined()

  const item = syncMain(["testing"], source)
  expect(item.__isReactive__).toBe(true)
  expect(item.__raw__).not.toBeUndefined()

  const raw = toRaw(item)
  expect(raw.__raw__).toBeUndefined()
  expect(raw).toBe(source)
})

it("isSorted", () => {

  expect(isSorted([ 1, 2, 3, 4 ])).toBeTruthy();
  
  expect(isSorted([ 4, 2, 3, 1 ])).toBeFalsy();
})