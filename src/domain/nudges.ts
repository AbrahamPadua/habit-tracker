import type { DateKey } from './types';

// Reminder lines in the app's voice: teasing and a little crude, never guilt or "you failed".
export const NUDGES = [
  "The cat sat on this plan again. Shove it off and get going.",
  "Hey, you. Yes, you, scrolling in bed. This one's waiting.",
  "Do it now so you can be insufferably smug about it later.",
  "Future you says thanks, you absolute legend.",
  "Ten minutes of this beats an hour of doomscrolling. Probably.",
  "No pressure. Okay, a little pressure. Cat-sized pressure.",
  "Up off that cute butt. Just for a minute.",
  "The couch will survive without you. Go.",
  "Do the damn thing, then do nothing at all, proudly.",
  "The cat has done nothing all day. Show it how it's done.",
  "This won't do itself. The cat checked twice.",
  "Hell yeah, it's that time again.",
  "Stamp it, then strut around like you own the place.",
  "Skipping is fine. Doing it is finer.",
  "Quick one, then back to your regularly scheduled chaos.",
  "Somebody on this app thinks you're cute. Prove them right.",
];

/** The same line for a habit all day (reschedules keep it), a different spin on other days. */
export function nudgeFor(habitId: string, day: DateKey): string {
  let h = 0;
  for (const ch of habitId + day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return NUDGES[h % NUDGES.length];
}
