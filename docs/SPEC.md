# Our Space: V1 spec

Source: the ChatGPT design conversation ("Habit tracker idea"). Built for two people first.

**Goals give direction. Habits build consistency. Tasks move you forward.**

## Principles (from the design conversation)

- Unchecked means "not recorded", never "failed". No red marks, no streak shaming.
- Backfilling past days is easy (last 14 days on the habit's edit screen).
- Missing things never creates a growing backlog. Overdue tasks show once, marked, with one-tap reschedule / defer / drop.
- One add button for goal, habit or task. Goals are optional; habits and tasks can stand alone.
- One-tap completion, no required notes.
- Partner lists are read-only. Private items never reach the partner.
- Goal progress comes from milestones only, never from habit check-ins.
- Suggestions after repeated misses are private to the owner and dismissible.

## Item types

`DateKey` is `YYYY-MM-DD` in the owner's local time. Weeks start Monday.

| Type | Key fields | Appears on Today |
|------|-----------|------------------|
| Habit, daily | `cadences`, `doneDates` | Yes, every active day |
| Habit, weekly (N times) | same | Compact "This week" section with `count/N` |
| Habit, flexible (no target) | same | "This week" section with count only |
| Task with due date | `due`, `doneOn`, `droppedOn` | On its due date; after that as overdue until done, rescheduled or dropped |
| Task without date | `pinned` | Only when pinned |
| Goal | `milestones` | No. Its tasks and habits show their goal name |
| Completed today | | Collapsed into "Done" (partner view shows them checked) |

Habit rules:
- Active on a date when `date >= createdOn` and not inside a pause.
- Pauses: `pauses: {from, to|null}[]`; paused on `d` when `from <= d` and (`to` is null or `d < to`). Resume sets `to = today`.
- Cadence history: `cadences: {from, cadence}[]` ascending. The cadence on `d` is the last entry with `from <= d`. Changing the cadence takes effect from the start of the current week (or `createdOn` if later) and replaces any entry at or after that date. Past weeks keep their old target.
  - Deviation from the chat mock ("starting next week"): applying it to the current week is less confusing, because the change shows immediately. Past weeks are still untouched.

Task rules:
- Reschedule sets `due` and increments `deferCount` when the new date is later than the old one.
- Drop sets `droppedOn`. Dropped tasks leave Today and the goal lists and wait in a "Dropped" list at the bottom of Goals (owner only), where they can be brought back.
- Finished tasks leave the Goals lists a week after `doneOn`.

Goal rules:
- `milestones: {id, title, doneOn}[]`. Progress = done milestones / total.
- Marking the goal achieved sets `doneOn`.

## Weekly progress ("This week: X of Y")

- Daily habit: Y += active days from week start through today; X += those days checked.
- Weekly habit: Y += N; X += min(count, N).
- Flexible habit: not counted.
- Tasks due this week (not dropped): Y += 1; X += 1 if done.

## Suggestions (private)

Snoozed while `snoozeSuggestionsUntil > today`. Paused habits get none.
- Weekly habit with target N: the two full weeks before this one were both fully active with target N, and both had count < N → suggest lowering to `max(1, max of the two counts)` (skip if that is not lower than N).
- Daily habit: the 14 days before today were all active and daily, and fewer than 7 were checked → suggest weekly with `max(1, round(checked / 2))`.
- Task: not done or dropped and `deferCount >= 3` → suggest dropping it or breaking it down.
- Dismiss sets `snoozeSuggestionsUntil = today + 14 days`.

## Sharing model (Firestore)

```
users/{uid}                 { name, spaceId: string|null, sharing: bool }
users/{uid}/items/{itemId}  Item without `id` (doc id is the id)
spaces/{code}               { members: [uid] | [uid, uid], createdAt }
```

- The space doc id is the invite code (8 chars, no ambiguous characters). Any signed-in user may `get` a space (needed to join), nobody may `list`.
- Create: `members == [me]`.
- Join: space has exactly 1 member; new members = old + [me]; only `members` changes.
- Unlink: a member sets `members` to a single uid that was already a member. The app's Unlink gives the old space to the partner and moves me to a fresh space with a new code, in one batch, so the old code cannot relink us.
- Two users are linked when both user docs have the same `spaceId` and both uids are in that space's `members`.
- Partner may read your user doc when linked; may read your items when linked, your `sharing == true`, and the item has `private == false`. The partner client queries `where('private', '==', false)`.
- Only the owner writes their user doc and items.

## Screens

- **Today**: your list (daily habits + today's tasks, then "This week", then collapsed "Done") and your partner's list (read-only). Header: today count and "This week: X of Y". Private suggestions appear as a small card on your own rows.
- **Goals**: your goals with milestones and linked habits/tasks, then "Not in a goal"; partner's goals read-only.
- **Add / edit** (one sheet): type, title, cadence or due date, goal link, private, reminder (habits). Edit adds: backfill strip, pause/resume, drop, delete, milestones.
- **Space / settings**: name, create or join a space with a code, share toggle (stop sharing), unlink, sign out.

## Out of scope for V1 (by design)

Reactions, widgets, shared goals, reflections, AI coach, leaderboards, messaging, analytics dashboards.
