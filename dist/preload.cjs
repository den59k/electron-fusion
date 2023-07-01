"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const proxy = (channel, dummy, methods = [], asyncMethods = [], syncMethods = []) => {
  const obj = {};
  for (let method of methods) {
    obj[method] = (...args) => electron.ipcRenderer.send("call", channel, method, ...args);
  }
  for (let method of asyncMethods) {
    obj[method] = (...args) => electron.ipcRenderer.invoke("callAsync", channel, method, ...args);
  }
  for (let method of syncMethods) {
    obj[method] = (...args) => electron.ipcRenderer.sendSync("callSync", channel, method, ...args);
  }
  return obj;
};
const bridge = {
  addListener(channel, listener) {
    electron.ipcRenderer.addListener(channel, listener);
    return () => electron.ipcRenderer.removeListener(channel, listener);
  },
  sync(channel) {
    return electron.ipcRenderer.sendSync("sync", channel);
  }
};
exports.bridge = bridge;
exports.proxy = proxy;
