"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
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
const objects = /* @__PURE__ */ new Map();
const onSyncEvent = (e, arr) => {
  for (let [baseKey, command, ...args] of arr) {
    const item = objects.get(baseKey[0]);
    if (!item)
      continue;
    let obj = item;
    const key = baseKey[baseKey.length - 1];
    for (let i = 1; i < baseKey.length - 1; i++) {
      if (typeof obj["get"] === "function") {
        obj = obj.get(baseKey[i]);
        continue;
      }
      obj = obj[baseKey[i]];
    }
    if (command === "_set") {
      obj[key] = args[0];
    }
    if (obj instanceof Map) {
      obj = obj.get(key);
    } else {
      obj = obj[key];
    }
    if (["push", "unshift", "pop", "shift", "splice", "set", "add", "delete", "clear"].includes(command)) {
      obj[command](...args);
    }
    if (["sort", "_filter"].includes(command)) {
      applyIndexes(obj, args[0]);
    }
  }
};
const _window = globalThis.window;
let syncEventDispose = _window.electron.addListener("sync", onSyncEvent);
const setActionWrapper = (wrapper) => {
  syncEventDispose();
  syncEventDispose = _window.electron.addListener("sync", wrapper(onSyncEvent));
};
const syncRenderer = (channel, callback) => {
  const item = objects.get(channel);
  if (item)
    return item;
  const _obj = _window.electron.sync(channel);
  const obj = callback ? callback(_obj) : _obj;
  objects.set(channel, obj);
  return obj;
};
exports.setActionWrapper = setActionWrapper;
exports.syncRenderer = syncRenderer;
