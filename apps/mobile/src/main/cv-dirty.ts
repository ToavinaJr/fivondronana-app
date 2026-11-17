export function isCvDirty<T>(current: T, saved: T): boolean {
  return JSON.stringify(current) !== JSON.stringify(saved);
}
