"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const services = /* @__PURE__ */ new Map();
electron.ipcMain.on("call", (e, channel, method, ...args) => {
  const service = services.get(channel);
  if (!service) {
    console.warn(`Service ${channel} not registered for method ${method}`);
    return;
  }
  service[method](...args);
});
electron.ipcMain.handle("callAsync", (e, channel, method, ...args) => {
  const service = services.get(channel);
  if (!service) {
    return Promise.reject(`Service ${channel} not registered for method ${method}`);
  }
  return service[method](...args);
});
electron.ipcMain.on("callSync", (e, channel, method, ...args) => {
  const service = services.get(channel);
  if (!service) {
    console.warn(`Service ${channel} not registered for method ${method}`);
    e.returnValue = null;
    return;
  }
  e.returnValue = service[method](...args) ?? null;
});
const proxyMethods = (service, name) => {
  services.set(name, service);
};
const applyIndexes = (arr, indexes) => {
  for (let i = 0; i < indexes.length; i++) {
    if (i === indexes[i])
      continue;
    let j = i;
    let oldValue = arr[j];
    let _j = j;
    let count = 0;
    while (j < indexes.length && count < 1e5) {
      if (indexes[j] === i) {
        arr[j] = oldValue;
        indexes[j] = j;
        break;
      }
      arr[j] = arr[indexes[j]];
      _j = indexes[j];
      indexes[j] = j;
      j = _j;
      count++;
    }
    if (count === 1e5) {
      throw new Error("Stack exteed");
    }
  }
  arr.length = indexes.length;
  return arr;
};
const isSorted = (arr) => {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < arr[i - 1])
      return false;
  }
  return true;
};
const applyArrayMethods = (target, prop, baseKey) => {
  const items = target.map((item, index) => [index, item]);
  if (prop === "sort") {
    return (sortFunc) => {
      const indexes = items.sort((a, b) => sortFunc(a[1], b[1])).map((item) => item[0]);
      if (isSorted(indexes))
        return target;
      send(baseKey, prop, [...indexes]);
      applyIndexes(target, indexes);
      return target;
    };
  }
  return (filterFunc) => {
    const indexes = items.filter((a) => filterFunc(a[1], a[0])).map((item) => item[0]);
    if (indexes.length === target.length)
      return target;
    send(baseKey, prop, [...indexes]);
    applyIndexes(target, indexes);
    return target;
  };
};
const objects = /* @__PURE__ */ new Map();
const subs = /* @__PURE__ */ new Map();
electron.ipcMain.on("sync", (e, channel) => {
  const set = subs.get(e.sender.id) || /* @__PURE__ */ new Set();
  set.add(channel);
  subs.set(e.sender.id, set);
  e.returnValue = objects.get(channel) || null;
});
function* getObjectByBaseKey(baseKey) {
  let obj = objects.get(baseKey[0]);
  for (let i = 1; i < baseKey.length; i++) {
    if (typeof obj["get"] === "function") {
      obj = obj.get(baseKey[i]);
      yield obj;
      continue;
    }
    obj = obj[baseKey[i]];
    yield obj;
  }
}
const setCommands = ["set", "_set", "push", "unshift"];
let flagNextTick = false;
let toSend = [];
const send = (baseKey, command, ...args) => {
  for (let item of toSend) {
    if (setCommands.includes(item[1])) {
      for (let i = 2; i < item.length; i++) {
        for (let affected of getObjectByBaseKey(baseKey)) {
          if (item[i] === affected)
            return;
        }
      }
    }
  }
  toSend.push([baseKey, command, ...args]);
  if (!flagNextTick) {
    process.nextTick(sendOnNextTick);
    flagNextTick = true;
  }
};
const sendOnNextTick = () => {
  for (let [id, set] of subs) {
    const webContent = electron.webContents.fromId(id);
    if (!webContent || webContent.isDestroyed()) {
      subs.delete(id);
      continue;
    }
    const arr = toSend.filter((i) => set.has(i[0][0]));
    if (arr.length === 0)
      continue;
    webContent.send("sync", arr);
  }
  flagNextTick = false;
  toSend = [];
};
const toRaw = (obj) => {
  if (typeof obj !== "object" || obj === null)
    return obj;
  return obj.__isReactive__ ? obj.__raw__ : obj;
};
const mapMethod = (baseKey, target, prop) => {
  return (...args) => {
    const _args = args.map(toRaw);
    target[prop](..._args);
    send(baseKey, prop, ..._args);
  };
};
const syncMain = (baseKey, obj) => {
  if (typeof obj !== "object" || obj === null)
    return obj;
  if (baseKey.length === 1) {
    objects.set(baseKey[0], obj);
  }
  return new Proxy(obj, {
    get(target, prop, receiver) {
      if (prop === "__raw__")
        return target;
      if (prop === "__basekey__")
        return baseKey;
      if (prop === "__isReactive__")
        return true;
      if (Array.isArray(target) && ["sort", "_filter"].includes(prop)) {
        return applyArrayMethods(target, prop, baseKey);
      }
      const value = target[prop];
      if (typeof value === "function") {
        if (["add", "set", "push", "unshift", "splice", "clear", "delete"].includes(prop)) {
          return mapMethod(baseKey, target, prop);
        }
        if (target instanceof Map && ["get"].includes(prop)) {
          return (key) => syncMain([...baseKey, key], target.get(key));
        }
        return value.bind(target);
      }
      return syncMain([...baseKey, prop], value);
    },
    set(target, prop, value, receiver) {
      const _value = toRaw(value);
      const success = Reflect.set(target, prop, _value, receiver);
      if (success) {
        send([...baseKey, prop], "_set", _value);
      }
      return success;
    }
  });
};
exports.proxyMethods = proxyMethods;
exports.syncMain = syncMain;
exports.toRaw = toRaw;
