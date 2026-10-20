/**
 * The entries of `next` that differ from `opened` (the item as an edit form first showed it).
 * Writing only these keeps a change made meanwhile on another device, e.g. marking the item private.
 */
export function changedFields<T extends object>(opened: object, next: T): Partial<T> {
  const was = opened as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(next).filter(([k, v]) => JSON.stringify(was[k]) !== JSON.stringify(v)),
  ) as Partial<T>;
}
