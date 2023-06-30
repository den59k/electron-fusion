export type FusionArray<T> = Array<T> & {
  _filter: (filterFunc: (item: T, index: number) => boolean) => T[],
  remove: (item: T) => void
}
