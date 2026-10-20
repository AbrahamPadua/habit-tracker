import { addDays, weekStart } from './dates';
import type { Cadence, CadenceChange, DateKey, Habit, Pause } from './types';

export function cadenceOn(h: Habit, d: DateKey): Cadence | null {
  if (d < h.createdOn) return null;
  for (let i = h.cadences.length - 1; i >= 0; i--) {
    if (h.cadences[i].from <= d) return h.cadences[i].cadence;
  }
  return null;
}

export function isPaused(h: Habit, d: DateKey): boolean {
  return h.pauses.some((pause) => pause.from <= d && (pause.to === null || d < pause.to));
}

export function isActive(h: Habit, d: DateKey): boolean {
  return d >= h.createdOn && !isPaused(h, d);
}

export function isDoneOn(h: Habit, d: DateKey): boolean {
  return h.doneDates.includes(d);
}

export function weekCount(h: Habit, d: DateKey): number {
  const start = weekStart(d);
  const end = addDays(start, 7);
  return h.doneDates.filter((date) => date >= start && date < end).length;
}

export function withCadence(h: Habit, cadence: Cadence, today: DateKey): CadenceChange[] {
  const start = weekStart(today);
  const from = h.createdOn > start ? h.createdOn : start;
  return [...h.cadences.filter((entry) => entry.from < from), { from, cadence }];
}

export function withPause(h: Habit, today: DateKey): Pause[] {
  return isPaused(h, today) ? [...h.pauses] : [...h.pauses, { from: today, to: null }];
}

export function withResume(h: Habit, today: DateKey): Pause[] {
  return h.pauses.flatMap((pause) => {
    if (pause.to !== null || pause.from > today) return [pause];
    return pause.from === today ? [] : [{ ...pause, to: today }];
  });
}

export function describeCadence(c: Cadence): string {
  if (c.kind === 'daily') return 'Daily';
  if (c.kind === 'weekly') return `${c.times}× weekly`;
  return 'Flexible';
}
