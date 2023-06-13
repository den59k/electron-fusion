export const applyIndexes = <T>(arr: T[], indexes: number[]) => {

  for (let i = 0; i < indexes.length; i++) {
    if (i === indexes[i]) continue
    let j = i
    
    let oldValue = arr[j]
    let _j = j

    let count = 0

    while (j < indexes.length && count < 100000) {
      if (indexes[j] === i) {
        arr[j] = oldValue
        indexes[j] = j
        break;
      }
      arr[j] = arr[indexes[j]]

      _j = indexes[j]
      indexes[j] = j
      j = _j

      count++
    }

    if (count === 100000) {
      throw new Error("Stack exteed")
    }
  }
  arr.length = indexes.length
  return arr
}