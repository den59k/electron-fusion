import { ipcMain, webContents } from "electron";
const services = /* @__PURE__ */ new Map();
const windows = /* @__PURE__ */ new Map();
const getTarget = (e, channel) => {
  var _a;
  const service = services.get(channel);
  if (service)
    return service;
  const window = (_a = windows.get(channel)) == null ? void 0 : _a.get(e.sender.id);
  if (window)
    return window;
  return null;
};
ipcMain.on("call", (e, channel, method, ...args) => {
  const service = getTarget(e, channel);
  if (!service) {
    console.warn(`Service ${channel} not registered for method ${method}`);
    return;
  }
  service[method](...args);
});
ipcMain.handle("callAsync", (e, channel, method, ...args) => {
  const service = getTarget(e, channel);
  if (!service) {
    return Promise.reject(`Service ${channel} not registered for method ${method}`);
  }
  return service[method](...args);
});
ipcMain.on("callSync", (e, channel, method, ...args) => {
  const service = getTarget(e, channel);
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
const proxyMethodToWindow = (service, webContents2, name) => {
  const map = windows.get(name) ?? /* @__PURE__ */ new Map();
  map.set(webContents2.id, service);
  windows.set(name, map);
  webContents2.once("destroyed", () => {
    map.delete(webContents2.id);
  });
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
const objects = /* @__PURE__ */ new Map();
const subs = /* @__PURE__ */ new Map();
ipcMain.on("sync", (e, channel) => {
  const set = subs.get(e.sender.id) || /* @__PURE__ */ new Set();
  set.add(channel);
  subs.set(e.sender.id, set);
  e.returnValue = objects.get(channel) || null;
});
const initSync = (baseKey, obj) => {
  objects.set(baseKey[0], obj);
};
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
const setCommands = ["set", "_set", "push", "unshift", "splice", "add"];
let flagNextTick = false;
let toSend = [];
const send = (baseKey, command, ...args) => {
  for (let item of toSend) {
    if (!setCommands.includes(item[1]))
      continue;
    for (let i = 2; i < item.length; i++) {
      if (typeof item[i] !== "object" || item[i] === null)
        continue;
      for (let affected of getObjectByBaseKey(baseKey)) {
        if (item[i] === affected)
          return;
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
    const webContent = webContents.fromId(id);
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
const mapArrayMethods = (baseKey, target, prop) => {
  return (...args) => {
    const _args = args.map(toRaw);
    if (prop === "remove" && Array.isArray(target)) {
      const index = target.indexOf(_args[0]);
      if (index < 0)
        return;
      target.splice(index, 1);
      send(baseKey, "splice", index, 1);
    }
  };
};
const toRaw = (obj) => {
  if (typeof obj !== "object" || obj === null)
    return obj;
  return obj.__isReactive__ ? obj.__raw__ : obj;
};
const mappedMethods = ["add", "set", "push", "unshift", "splice", "clear", "delete", "remove"];
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
    initSync(baseKey, obj);
  }
  return new Proxy(obj, {
    get(target, prop, receiver) {
      if (prop === "__raw__")
        return target;
      if (prop === "__basekey__")
        return baseKey;
      if (prop === "__isReactive__")
        return true;
      if (["sort", "_filter"].includes(prop) && Array.isArray(target)) {
        return applyArrayMethods(target, prop, baseKey);
      }
      if (["remove"].includes(prop) && Array.isArray(target)) {
        return mapArrayMethods(baseKey, target, prop);
      }
      const value = target[prop];
      if (typeof value === "function") {
        if (mappedMethods.includes(prop)) {
          return mapMethod(baseKey, target, prop);
        }
        if (target instanceof Map && prop === "get") {
          return (key) => syncMain([...baseKey, key], target.get(key));
        }
        return value.bind(target);
      }
      return syncMain([...baseKey, prop], value);
    },
    deleteProperty(target, prop) {
      if (!Reflect.deleteProperty(target, prop))
        return false;
      send([...baseKey], "_delete", prop);
      return true;
    },
    set(target, prop, value, receiver) {
      const _value = toRaw(value);
      if (!Reflect.set(target, prop, _value, receiver))
        return false;
      send([...baseKey], "_set", prop, _value);
      return true;
    }
  });
};
export {
  proxyMethodToWindow,
  proxyMethods,
  syncMain,
  toRaw
};
