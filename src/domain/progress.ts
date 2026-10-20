import { addDays, weekStart } from './dates';
import { cadenceOn, isActive, isDoneOn, weekCount } from './habits';
import type { DateKey, Goal, Item } from './types';

export function weekProgress(items: Item[], today: DateKey): { done: number; total: number } {
  const start = weekStart(today);
  const end = addDays(start, 7);
  let done = 0;
  let total = 0;

  for (const item of items) {
    if (item.type === 'habit') {
      const cadence = cadenceOn(item, today);
      if (cadence?.kind === 'daily') {
        for (let date = start; date <= today; date = addDays(date, 1)) {
          if (isActive(item, date)) {
            total++;
            if (isDoneOn(item, date)) done++;
          }
        }
      } else if (cadence?.kind === 'weekly') {
        total += cadence.times;
        done += Math.min(weekCount(item, today), cadence.times);
      }
    } else if (item.type === 'task' && item.droppedOn === null && item.due !== null) {
      if (item.due >= start && item.due < end) {
        total++;
        if (item.doneOn !== null) done++;
      }
    }
  }
  return { done, total };
}

export function goalProgress(g: Goal): { done: number; total: number } {
  return {
    done: g.milestones.filter((milestone) => milestone.doneOn !== null).length,
    total: g.milestones.length,
  };
}
