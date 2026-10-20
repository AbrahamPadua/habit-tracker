import { addDays, weekStart } from './dates';
import { cadenceOn, isActive, isDoneOn, weekCount } from './habits';
import type { DateKey, Item } from './types';

export type Suggestion =
  | { kind: 'lowerWeekly'; itemId: string; from: number; to: number }
  | { kind: 'dailyToWeekly'; itemId: string; times: number }
  | { kind: 'stuckTask'; itemId: string };

export function suggestionFor(item: Item, today: DateKey): Suggestion | null {
  if (item.type === 'goal') return null;
  if (item.snoozeSuggestionsUntil !== null && item.snoozeSuggestionsUntil > today) return null;
  if (item.type === 'task') {
    return item.doneOn === null && item.droppedOn === null && item.deferCount >= 3
      ? { kind: 'stuckTask', itemId: item.id }
      : null;
  }
  if (!isActive(item, today)) return null;
  const cadence = cadenceOn(item, today);
  if (cadence?.kind === 'weekly') {
    const start = addDays(weekStart(today), -14);
    for (let offset = 0; offset < 14; offset++) {
      const date = addDays(start, offset);
      const previous = cadenceOn(item, date);
      if (!isActive(item, date) || previous?.kind !== 'weekly' || previous.times !== cadence.times) {
        return null;
      }
    }
    const first = weekCount(item, start);
    const second = weekCount(item, addDays(start, 7));
    const to = Math.max(1, first, second);
    if (first < cadence.times && second < cadence.times && to < cadence.times) {
      return { kind: 'lowerWeekly', itemId: item.id, from: cadence.times, to };
    }
  } else if (cadence?.kind === 'daily') {
    let checked = 0;
    for (let offset = 1; offset <= 14; offset++) {
      const date = addDays(today, -offset);
      if (!isActive(item, date) || cadenceOn(item, date)?.kind !== 'daily') return null;
      if (isDoneOn(item, date)) checked++;
    }
    if (checked < 7) {
      return { kind: 'dailyToWeekly', itemId: item.id, times: Math.max(1, Math.round(checked / 2)) };
    }
  }
  return null;
}
