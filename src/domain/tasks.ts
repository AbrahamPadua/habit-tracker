import type { DateKey, Task } from './types';

export function reschedule(t: Task, due: DateKey | null): { due: DateKey | null; deferCount: number } {
  const later = t.due !== null && due !== null && due > t.due;
  return { due, deferCount: t.deferCount + (later ? 1 : 0) };
}
