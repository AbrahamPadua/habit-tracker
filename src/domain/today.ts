import { cadenceOn, isActive, isDoneOn, weekCount } from './habits';
import type { DateKey, Habit, Item, Task } from './types';

export interface TodayRow {
  item: Habit | Task;
  done: boolean;
  goalTitle: string | null;
  overdueSince: DateKey | null;
  weekCount: number | null;
  weekTarget: number | null;
}

export interface TodayView {
  now: TodayRow[];
  thisWeek: TodayRow[];
  done: TodayRow[];
}

export function buildToday(items: Item[], today: DateKey): TodayView {
  const goals = new Map(items.filter((item) => item.type === 'goal').map((g) => [g.id, g.title]));
  const overdue: TodayRow[] = [];
  const daily: TodayRow[] = [];
  const dueToday: TodayRow[] = [];
  const pinned: TodayRow[] = [];
  const thisWeek: TodayRow[] = [];
  const doneHabits: TodayRow[] = [];
  const doneTasks: TodayRow[] = [];

  for (const item of items) {
    if (item.type === 'goal') continue;
    const row: TodayRow = {
      item,
      done: item.type === 'habit' ? isDoneOn(item, today) : item.doneOn !== null,
      goalTitle: item.goalId === null ? null : goals.get(item.goalId) ?? null,
      overdueSince: null,
      weekCount: null,
      weekTarget: null,
    };
    if (item.type === 'habit') {
      if (!isActive(item, today)) continue;
      const cadence = cadenceOn(item, today);
      if (cadence === null) continue;
      if (cadence.kind === 'daily') {
        (row.done ? doneHabits : daily).push(row);
      } else {
        row.weekCount = weekCount(item, today);
        row.weekTarget = cadence.kind === 'weekly' ? cadence.times : null;
        thisWeek.push(row);
      }
    } else {
      if (item.droppedOn !== null) continue;
      if (item.doneOn === today) {
        doneTasks.push(row);
      } else if (item.doneOn === null) {
        if (item.due !== null && item.due < today) {
          row.overdueSince = item.due;
          overdue.push(row);
        } else if (item.due === today) {
          dueToday.push(row);
        } else if (item.pinned) {
          pinned.push(row);
        }
      }
    }
  }

  overdue.sort((a, b) => a.overdueSince!.localeCompare(b.overdueSince!));
  return {
    now: [...overdue, ...daily, ...dueToday, ...pinned],
    thisWeek,
    done: [...doneHabits, ...doneTasks],
  };
}
