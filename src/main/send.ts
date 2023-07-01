import { ipcMain, webContents } from 'electron'
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

export const initSync = (baseKey: BaseKey, obj: any) => {
  objects.set(baseKey[0], obj)
}

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

const setCommands = [ "set", "_set", "push", "unshift", "splice", "add" ]
let flagNextTick = false
let toSend: [ BaseKey, string, ...any ][] = []
export const send = (baseKey: BaseKey, command: string, ...args: any) => {
  for (let item of toSend) {
    if (!setCommands.includes(item[1])) continue
    for (let i = 2; i < item.length; i++) {
      if (typeof item[i] !== "object" || item[i] === null) continue
      for (let affected of getObjectByBaseKey(baseKey)) {
        if (item[i] === affected) return
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