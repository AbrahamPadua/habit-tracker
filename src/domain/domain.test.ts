import { describe, it, expect } from 'vitest';
import { addDays, daysBetween, describeDate, toDateKey, weekStart } from './dates';
import {
  cadenceOn, describeCadence, isActive, isDoneOn, isPaused, weekCount,
  withCadence, withPause, withResume,
} from './habits';
import { goalProgress, weekProgress } from './progress';
import { suggestionFor } from './suggestions';
import { reschedule } from './tasks';
import { buildToday } from './today';
import type { Goal, Habit, Item, Task } from './types';

const today = '2026-10-21';

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit', type: 'habit', title: 'Read', private: false, createdOn: '2026-09-01',
    goalId: null, cadences: [{ from: '2026-09-01', cadence: { kind: 'daily' } }],
    doneDates: [], pauses: [], reminder: null, snoozeSuggestionsUntil: null,
    ...overrides,
  };
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task', type: 'task', title: 'Book a visit', private: false, createdOn: '2026-09-01',
    goalId: null, due: null, pinned: false, doneOn: null, droppedOn: null,
    deferCount: 0, snoozeSuggestionsUntil: null,
    ...overrides,
  };
}

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal', type: 'goal', title: 'Feel better', private: false, createdOn: '2026-09-01',
    milestones: [], doneOn: null, ...overrides,
  };
}

describe('dates', () => {
  it('uses the local calendar date without mutating the date', () => {
    const date = new Date(2026, 9, 21, 23, 59);
    const timestamp = date.getTime();
    expect(toDateKey(date)).toBe(today);
    expect(date.getTime()).toBe(timestamp);
    expect(toDateKey(new Date(2026, 0, 2))).toBe('2026-01-02');
  });

  it('keeps day math stable across March and November DST boundaries', () => {
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09');
    expect(addDays('2026-03-09', -2)).toBe('2026-03-07');
    expect(addDays('2026-10-31', 2)).toBe('2026-11-02');
    expect(addDays('2026-11-02', -2)).toBe('2026-10-31');
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-11-02', '2026-10-31')).toBe(-2);
  });

  it('handles leap days, year boundaries and zero days', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays(today, 0)).toBe(today);
    expect(daysBetween(today, today)).toBe(0);
  });

  it('starts both Sunday and Monday weeks on Monday', () => {
    expect(weekStart('2026-10-25')).toBe('2026-10-19');
    expect(weekStart('2026-10-19')).toBe('2026-10-19');
    expect(weekStart('2027-01-03')).toBe('2026-12-28');
  });

  it.each([
    [today, 'Today'], ['2026-10-22', 'Tomorrow'], ['2026-10-20', 'Yesterday'],
    ['2026-10-23', 'Fri'], ['2026-10-27', 'Tue'], ['2026-10-28', 'Oct 28'],
    ['2026-10-19', 'Oct 19'], ['2027-10-21', 'Oct 21, 2027'],
  ])('describes %s as %s', (date, expected) => {
    expect(describeDate(date, today)).toBe(expected);
  });
});

describe('habits', () => {
  it('finds cadence on its inclusive start and returns null before creation or the first entry', () => {
    const h = habit({ createdOn: '2026-10-10', cadences: [
      { from: '2026-10-12', cadence: { kind: 'daily' } },
      { from: '2026-10-19', cadence: { kind: 'weekly', times: 3 } },
    ] });
    expect(cadenceOn(h, '2026-10-09')).toBeNull();
    expect(cadenceOn(h, '2026-10-11')).toBeNull();
    expect(cadenceOn(h, '2026-10-18')).toEqual({ kind: 'daily' });
    expect(cadenceOn(h, '2026-10-19')).toEqual({ kind: 'weekly', times: 3 });
    expect(cadenceOn(habit({ createdOn: '2026-10-10' }), '2026-10-09')).toBeNull();
    expect(cadenceOn(habit({ cadences: [] }), today)).toBeNull();
  });

  it('changes the current week while preserving the previous week and replacing later entries', () => {
    const h = habit({ cadences: [
      { from: '2026-09-01', cadence: { kind: 'weekly', times: 5 } },
      { from: '2026-10-19', cadence: { kind: 'daily' } },
      { from: '2026-10-26', cadence: { kind: 'flexible' } },
    ] });
    const before = structuredClone(h);
    const changed = { ...h, cadences: withCadence(h, { kind: 'weekly', times: 3 }, today) };
    expect(changed.cadences).toEqual([
      h.cadences[0], { from: '2026-10-19', cadence: { kind: 'weekly', times: 3 } },
    ]);
    expect(cadenceOn(changed, '2026-10-18')).toEqual({ kind: 'weekly', times: 5 });
    expect(cadenceOn(changed, '2026-10-19')).toEqual({ kind: 'weekly', times: 3 });
    expect(withCadence(changed, { kind: 'flexible' }, '2026-10-23')).toEqual([
      h.cadences[0], { from: '2026-10-19', cadence: { kind: 'flexible' } },
    ]);
    expect(h).toEqual(before);
  });

  it('starts a cadence change on creation when created mid-week', () => {
    const h = habit({ createdOn: today, cadences: [{ from: today, cadence: { kind: 'daily' } }] });
    const cadences = withCadence(h, { kind: 'weekly', times: 2 }, '2026-10-23');
    expect(cadences).toEqual([{ from: today, cadence: { kind: 'weekly', times: 2 } }]);
    expect(cadenceOn({ ...h, cadences }, '2026-10-20')).toBeNull();
  });

  it('excludes the pause start and includes the resume day without mutating history', () => {
    const h = habit({ pauses: [{ from: '2026-10-01', to: '2026-10-03' }] });
    const paused = { ...h, pauses: withPause(h, '2026-10-20') };
    expect(isActive(paused, '2026-10-19')).toBe(true);
    expect(isPaused(paused, '2026-10-20')).toBe(true);
    expect(isActive(paused, '2026-10-20')).toBe(false);
    expect(withPause(paused, today)).toEqual(paused.pauses);
    expect(withPause(paused, today)).not.toBe(paused.pauses);
    const resumed = { ...paused, pauses: withResume(paused, today) };
    expect(resumed.pauses).toEqual([h.pauses[0], { from: '2026-10-20', to: today }]);
    expect(isPaused(resumed, today)).toBe(false);
    expect(isActive(resumed, today)).toBe(true);
    expect(paused.pauses[1].to).toBeNull();
    expect(h.pauses).toHaveLength(1);
    expect(isActive(h, '2026-08-31')).toBe(false);
  });

  it('removes a same-day pause on resume and copies history when there is no open pause', () => {
    const h = habit();
    expect(withResume({ ...h, pauses: withPause(h, today) }, today)).toEqual([]);
    expect(withResume(h, today)).toEqual(h.pauses);
    expect(withResume(h, today)).not.toBe(h.pauses);
  });

  it('counts only check-ins inside the inclusive Monday to Sunday week', () => {
    const h = habit({ doneDates: ['2026-10-18', '2026-10-19', today, '2026-10-25', '2026-10-26'] });
    expect(weekCount(h, today)).toBe(3);
    expect(isDoneOn(h, today)).toBe(true);
    expect(isDoneOn(h, '2026-10-20')).toBe(false);
    expect(describeCadence({ kind: 'daily' })).toBe('Daily');
    expect(describeCadence({ kind: 'weekly', times: 3 })).toBe('3× weekly');
    expect(describeCadence({ kind: 'flexible' })).toBe('Flexible');
  });
});

describe('tasks', () => {
  it.each([
    { old: today, due: '2026-10-22', count: 4 },
    { old: today, due: today, count: 3 },
    { old: today, due: '2026-10-20', count: 3 },
    { old: today, due: null, count: 3 },
    { old: null, due: today, count: 3 },
    { old: null, due: null, count: 3 },
  ])('reschedules $old to $due with defer count $count', ({ old, due, count }) => {
    const t = task({ due: old, deferCount: 3 });
    expect(reschedule(t, due)).toEqual({ due, deferCount: count });
    expect(t.due).toBe(old);
    expect(t.deferCount).toBe(3);
  });
});

describe('Today', () => {
  it('orders groups, sorts overdue dates stably and shows pinned items once with correct metadata', () => {
    const items: Item[] = [
      task({ id: 'pinned-future', due: '2026-10-23', pinned: true }),
      task({ id: 'done-task-a', doneOn: today }),
      habit({ id: 'done-daily-a', doneDates: [today], goalId: 'goal' }),
      task({ id: 'due-a', due: today, pinned: true }),
      task({ id: 'recent-overdue', due: '2026-10-20', pinned: true }),
      habit({ id: 'weekly', cadences: [{ from: '2026-09-01', cadence: { kind: 'weekly', times: 3 } }],
        doneDates: ['2026-10-19', today], goalId: 'goal' }),
      task({ id: 'old-overdue-a', due: '2026-10-18', goalId: 'goal' }),
      habit({ id: 'daily-a' }),
      task({ id: 'old-overdue-b', due: '2026-10-18' }),
      task({ id: 'dropped', due: '2026-10-01', pinned: true, droppedOn: today }),
      task({ id: 'dropped-done', doneOn: today, droppedOn: today }),
      task({ id: 'future', due: '2026-10-22' }),
      habit({ id: 'paused', pauses: [{ from: '2026-10-20', to: null }], doneDates: [today] }),
      habit({ id: 'future-habit', createdOn: '2026-10-22' }),
      habit({ id: 'no-cadence', cadences: [] }),
      habit({ id: 'paused-weekly', pauses: [{ from: today, to: null }],
        cadences: [{ from: '2026-09-01', cadence: { kind: 'weekly', times: 3 } }] }),
      task({ id: 'due-b', due: today }),
      habit({ id: 'daily-b', goalId: 'missing-goal' }),
      task({ id: 'pinned-undated', pinned: true, goalId: 'goal' }),
      task({ id: 'completed-before', due: '2026-10-01', pinned: true, doneOn: '2026-10-20' }),
      task({ id: 'undated' }),
      habit({ id: 'flexible', cadences: [{ from: '2026-09-01', cadence: { kind: 'flexible' } }],
        doneDates: ['2026-10-19'] }),
      task({ id: 'done-task-b', due: today, doneOn: today, pinned: true }),
      habit({ id: 'done-daily-b', doneDates: [today] }),
      goal(),
    ];
    const before = structuredClone(items);
    const view = buildToday(items, today);
    expect(view.now.map((row) => row.item.id)).toEqual([
      'old-overdue-a', 'old-overdue-b', 'recent-overdue', 'daily-a', 'daily-b',
      'due-a', 'due-b', 'pinned-future', 'pinned-undated',
    ]);
    expect(view.thisWeek.map((row) => row.item.id)).toEqual(['weekly', 'flexible']);
    expect(view.done.map((row) => row.item.id)).toEqual([
      'done-daily-a', 'done-daily-b', 'done-task-a', 'done-task-b',
    ]);
    expect(view.now[0]).toMatchObject({
      done: false, overdueSince: '2026-10-18', goalTitle: 'Feel better', weekCount: null, weekTarget: null,
    });
    expect(view.now[4].goalTitle).toBeNull();
    expect(view.now[7].overdueSince).toBeNull();
    expect(view.thisWeek[0]).toMatchObject({ done: true, weekCount: 2, weekTarget: 3, goalTitle: 'Feel better' });
    expect(view.thisWeek[1]).toMatchObject({ done: false, weekCount: 1, weekTarget: null });
    expect(view.done.every((row) => row.done && row.overdueSince === null && row.weekCount === null)).toBe(true);
    expect(items).toEqual(before);
  });

  it('returns empty sections for no items', () => {
    expect(buildToday([], today)).toEqual({ now: [], thisWeek: [], done: [] });
  });
});

describe('progress', () => {
  it('counts only elapsed active days for a daily habit created mid-week with a paused day', () => {
    const h = habit({ createdOn: today, pauses: [{ from: '2026-10-22', to: '2026-10-23' }],
      doneDates: ['2026-10-20', today, '2026-10-22', '2026-10-23', '2026-10-24'] });
    expect(weekProgress([h], '2026-10-23')).toEqual({ done: 2, total: 2 });
    expect(weekProgress([habit({ pauses: [{ from: today, to: null }], doneDates: ['2026-10-19'] })], today))
      .toEqual({ done: 1, total: 2 });
  });

  it('caps weekly counts, ignores flexible habits and counts non-dropped tasks due anywhere this week', () => {
    const items: Item[] = [
      habit({ cadences: [{ from: '2026-09-01', cadence: { kind: 'weekly', times: 3 } }],
        doneDates: ['2026-10-19', '2026-10-20', today, '2026-10-22'] }),
      habit({ cadences: [{ from: '2026-09-01', cadence: { kind: 'flexible' } }], doneDates: [today] }),
      habit({ createdOn: '2026-10-26' }),
      task({ due: '2026-10-19', doneOn: '2026-10-18' }),
      task({ due: '2026-10-25' }),
      task({ due: '2026-10-18', doneOn: today }),
      task({ due: '2026-10-26' }),
      task({ due: today, droppedOn: today, doneOn: today }),
      task({ pinned: true, doneOn: today }),
      goal(),
    ];
    expect(weekProgress(items, today)).toEqual({ done: 4, total: 5 });
    expect(weekProgress([], today)).toEqual({ done: 0, total: 0 });
  });

  it('leaves a paused weekly habit out of the week, and counts it again once resumed', () => {
    const weekly = { cadences: [{ from: '2026-09-01', cadence: { kind: 'weekly' as const, times: 3 } }], doneDates: ['2026-10-19'] };
    expect(weekProgress([habit({ ...weekly, pauses: [{ from: '2026-10-20', to: null }] })], today))
      .toEqual({ done: 0, total: 0 });
    expect(weekProgress([habit({ ...weekly, pauses: [{ from: '2026-10-20', to: today }] })], today))
      .toEqual({ done: 1, total: 3 });
  });

  it('uses the historical target for the requested week and a full target in the creation week', () => {
    const h = habit({ cadences: [{ from: '2026-09-01', cadence: { kind: 'weekly', times: 5 } }],
      doneDates: ['2026-10-12', '2026-10-13', '2026-10-14'] });
    const changed = { ...h, cadences: withCadence(h, { kind: 'weekly', times: 2 }, today) };
    expect(weekProgress([changed], '2026-10-18')).toEqual({ done: 3, total: 5 });
    expect(weekProgress([changed], today)).toEqual({ done: 0, total: 2 });
    expect(weekProgress([habit({ createdOn: today,
      cadences: [{ from: today, cadence: { kind: 'weekly', times: 3 } }] })], today))
      .toEqual({ done: 0, total: 3 });
  });

  it('uses only milestones for goal progress, including zero milestones', () => {
    expect(goalProgress(goal())).toEqual({ done: 0, total: 0 });
    expect(goalProgress(goal({ doneOn: today, milestones: [
      { id: 'one', title: 'Start', doneOn: today },
      { id: 'two', title: 'Finish', doneOn: null },
    ] }))).toEqual({ done: 1, total: 2 });
  });
});

describe('suggestions', () => {
  const weekly = habit({ cadences: [{ from: '2026-09-01', cadence: { kind: 'weekly', times: 4 } }],
    doneDates: ['2026-10-05', '2026-10-06', '2026-10-12', '2026-10-13', '2026-10-14'] });
  const daily = habit({ doneDates: ['2026-10-08', '2026-10-10', '2026-10-12', '2026-10-14', '2026-10-16'] });
  const stuck = task({ deferCount: 3 });

  it('lowers a weekly target to the larger count in the two full previous weeks', () => {
    expect(suggestionFor({ ...weekly, createdOn: '2026-10-05', doneDates: [
      ...weekly.doneDates, '2026-10-04', '2026-10-19', '2026-10-20', today, '2026-10-22',
    ] }, today)).toEqual({ kind: 'lowerWeekly', itemId: weekly.id, from: 4, to: 3 });
    expect(suggestionFor({ ...weekly, doneDates: [] }, today))
      .toEqual({ kind: 'lowerWeekly', itemId: weekly.id, from: 4, to: 1 });
  });

  it.each(['2026-10-05', '2026-10-12'])('skips weekly advice if the target was met in the week of %s', (start) => {
    const doneDates = [0, 1, 2, 3].map((n) => addDays(start, n));
    expect(suggestionFor({ ...weekly, doneDates }, today)).toBeNull();
  });

  it('skips weekly advice for partial activity, changed targets or an already minimal target', () => {
    expect(suggestionFor({ ...weekly, createdOn: '2026-10-06' }, today)).toBeNull();
    expect(suggestionFor({ ...weekly, pauses: [{ from: '2026-10-06', to: '2026-10-07' }] }, today)).toBeNull();
    expect(suggestionFor({ ...weekly, cadences: [
      { from: '2026-09-01', cadence: { kind: 'weekly', times: 5 } },
      { from: '2026-10-12', cadence: { kind: 'weekly', times: 4 } },
    ] }, today)).toBeNull();
    expect(suggestionFor({ ...weekly, cadences: [
      { from: '2026-09-01', cadence: { kind: 'weekly', times: 1 } },
    ], doneDates: [] }, today)).toBeNull();
  });

  it('suggests a rounded weekly target from only the 14 days before today with a minimum of one', () => {
    expect(suggestionFor({ ...daily, createdOn: '2026-10-07', doneDates: [
      ...daily.doneDates, '2026-10-06', today,
    ] }, today)).toEqual({ kind: 'dailyToWeekly', itemId: daily.id, times: 3 });
    expect(suggestionFor(habit(), today)).toEqual({ kind: 'dailyToWeekly', itemId: 'habit', times: 1 });
  });

  it('skips daily advice at seven check-ins or with incomplete active daily history', () => {
    expect(suggestionFor(habit({ doneDates: Array.from({ length: 7 }, (_, n) => addDays(today, -n - 1)) }), today))
      .toBeNull();
    expect(suggestionFor({ ...daily, createdOn: '2026-10-08' }, today)).toBeNull();
    expect(suggestionFor({ ...daily, pauses: [{ from: '2026-10-10', to: '2026-10-11' }] }, today)).toBeNull();
    expect(suggestionFor({ ...daily, cadences: [
      { from: '2026-09-01', cadence: { kind: 'flexible' } },
      { from: '2026-10-08', cadence: { kind: 'daily' } },
    ] }, today)).toBeNull();
  });

  it('suggests a stuck task at three deferrals only while open and not dropped', () => {
    expect(suggestionFor(stuck, today)).toEqual({ kind: 'stuckTask', itemId: stuck.id });
    expect(suggestionFor({ ...stuck, deferCount: 2 }, today)).toBeNull();
    expect(suggestionFor({ ...stuck, doneOn: today }, today)).toBeNull();
    expect(suggestionFor({ ...stuck, droppedOn: today }, today)).toBeNull();
  });

  it.each([weekly, daily, stuck])('honors snooze through the day before expiry for $type', (item) => {
    expect(suggestionFor({ ...item, snoozeSuggestionsUntil: '2026-10-22' }, today)).toBeNull();
    expect(suggestionFor({ ...item, snoozeSuggestionsUntil: today }, today)).toEqual(suggestionFor(item, today));
    expect(suggestionFor(item, today)).not.toBeNull();
  });

  it.each([weekly, daily])('skips a currently paused $cadences.0.cadence.kind habit', (h) => {
    expect(suggestionFor({ ...h, pauses: [{ from: today, to: null }] }, today)).toBeNull();
  });

  it('never suggests for goals or flexible habits', () => {
    expect(suggestionFor(goal(), today)).toBeNull();
    expect(suggestionFor(habit({ cadences: [{ from: '2026-09-01', cadence: { kind: 'flexible' } }] }), today))
      .toBeNull();
  });
});
