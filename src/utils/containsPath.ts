import { BaseKey } from "../main/send";

export const isSubPath = (baseKey: BaseKey, child: BaseKey ) => {
  
  if (child.length <= baseKey.length) return false
  for (let i = 0; i < baseKey.length; i++) {
    if (baseKey[i] !== child[i]) return false
  }

  return true
}