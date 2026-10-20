/** `YYYY-MM-DD` in the owner's local time. */
export type DateKey = string;

export type Cadence =
  | { kind: 'daily' }
  | { kind: 'weekly'; times: number }
  | { kind: 'flexible' };

export interface CadenceChange {
  from: DateKey;
  cadence: Cadence;
}

export interface Pause {
  from: DateKey;
  /** Exclusive. Null while still paused. */
  to: DateKey | null;
}

interface BaseItem {
  id: string;
  title: string;
  private: boolean;
  createdOn: DateKey;
}

export interface Milestone {
  id: string;
  title: string;
  doneOn: DateKey | null;
}

export interface Goal extends BaseItem {
  type: 'goal';
  milestones: Milestone[];
  doneOn: DateKey | null;
}

export interface Habit extends BaseItem {
  type: 'habit';
  goalId: string | null;
  cadences: CadenceChange[];
  doneDates: DateKey[];
  pauses: Pause[];
  /** `HH:MM` local time, or null for no reminder. */
  reminder: string | null;
  snoozeSuggestionsUntil: DateKey | null;
}

export interface Task extends BaseItem {
  type: 'task';
  goalId: string | null;
  due: DateKey | null;
  pinned: boolean;
  doneOn: DateKey | null;
  droppedOn: DateKey | null;
  deferCount: number;
  snoozeSuggestionsUntil: DateKey | null;
}

export type Item = Goal | Habit | Task;
