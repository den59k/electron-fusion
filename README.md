# Electron Fusion

A laconic solution for synchronizing data between the main and renderer processes of Electron

Powered by JS Proxy. Designed for TypeScript developers

## Performance

This package was inspired by the reactivity of vue. Objects stored in memory are not proxies, but become proxies only when they are accessed

The package sends to the `ipcRenderer` only those data that have been changed, trying to minimize the information

Also, all sync commands are not sent immediately to ipcMain, but are collected in batching and sent to nextTick

## Structure

Code splited on 3 parts: Main, Renderer and Preload. Let's see how to use them

### Main

`electron-fusion/main` containts methods for main process. Here you can declare the sync data that will be synchronized with the renderer

#### How to use

```
import { syncMain } from "electron-fusion/main"

class CounterData {
  value = 1
}

const counterData = syncMain(new CounterData(), [ "counter" ])
export { counterData, CounterData }
```

Also in main you should declare objects whose methods can be used from renderer

#### How to use
```
import { proxyMethods } from 'electron-fusion/main'
import { counterData } from '../data/counter'

class CounterService {
  
  constructor() {
    proxyMethods(this, "counter")
  }

  increment() {
    counterData.value++
  }
}

export const counterService = new CounterService()
```

### Preload

For synchronization to be available, you must define the necessary fields in the preloader

Note: If you are not using a package builder like vite or webpack, you will not be able to import into preload. In this case, instead of importing, just copy the code from `dist/preload.js` into your `preload.js`


#### How to use

```
import { bridge, proxy } from 'electron-fusion/preload'

const electronBridge = {
  ...bridge,
  counter: counter: proxy("counter", {} as typeof counterService, [ "increment" ], [], []))
}

contextBridge.exposeInMainWorld('electron', electronBridge)
```

P.S. Sorry about the dummy second argument hack. It is necessary because typescript does not allow to make partial generic types

The beauty is that you can also use the `electronBridge` type from here, and drop the necessary types into `renderer`:

```
export type electronAPI = typeof electronBridge
```

```
import type { electronAPI } from '../../../main/preload'

declare global {
  interface Window { // eslint-disable-line no-unused-vars
    electron: electronAPI
  }
}

export {}
```

### Renderer

As you noticed in the previous step, you now have a `window.electron` object with defined methods. You can use them as normal methods and not worry.

Now let's deal with the data. You need to get the synchronized data from the main. It doesn't matter how many windows are open - the data is synchronized in each window.

#### How to use

```
import { syncRenderer } from 'electron-fusion/renderer'
import { reactive } from 'vue'

const counterData = syncRenderer('counter', (obj: CounterData) => reactive(obj))

```

Now you have a reactive counterData object, which immediately changes following the changes in main


#### React + Mobx

If you use React and Mobx, you know that all observable mutations must take place in action. Here this is provided: to do this you need to call setActionWrapper

```
import { syncRenderer, setActionWrapper } from 'electron-fusion/renderer'
import { observable, action } from 'mobx'

setActionWrapper(action)

const counterData = syncRenderer('counter', (obj: CounterData) => observable(obj))

```

## Goals

This package has only one goal - to get rid of a lot of unnecessary routine that developers have to write. Using this package, you will most likely forget the lines of code with `ipcMain` and `ipcRenderer` like a bad dream