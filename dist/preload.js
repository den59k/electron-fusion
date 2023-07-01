import { ipcRenderer } from "electron";
const proxy = (channel, dummy, methods = [], asyncMethods = [], syncMethods = []) => {
  const obj = {};
  for (let method of methods) {
    obj[method] = (...args) => ipcRenderer.send("call", channel, method, ...args);
  }
  for (let method of asyncMethods) {
    obj[method] = (...args) => ipcRenderer.invoke("callAsync", channel, method, ...args);
  }
  for (let method of syncMethods) {
    obj[method] = (...args) => ipcRenderer.sendSync("callSync", channel, method, ...args);
  }
  return obj;
};
const bridge = {
  addListener(channel, listener) {
    ipcRenderer.addListener(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  sync(channel) {
    return ipcRenderer.sendSync("sync", channel);
  }
};
export {
  bridge,
  proxy
};
