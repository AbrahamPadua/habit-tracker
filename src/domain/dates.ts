import type { DateKey } from './types';

function utcDate(key: DateKey): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(key: DateKey, n: number): DateKey {
  const date = utcDate(key);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

export function weekStart(key: DateKey): DateKey {
  return addDays(key, -((utcDate(key).getUTCDay() + 6) % 7));
}

export function daysBetween(a: DateKey, b: DateKey): number {
  return (utcDate(b).getTime() - utcDate(a).getTime()) / 86_400_000;
}

export function describeDate(key: DateKey, today: DateKey): string {
  const distance = daysBetween(today, key);
  if (distance === 0) return 'Today';
  if (distance === 1) return 'Tomorrow';
  if (distance === -1) return 'Yesterday';
  const date = utcDate(key);
  if (distance >= 2 && distance <= 6) {
    return date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(key.slice(0, 4) !== today.slice(0, 4) ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
}
