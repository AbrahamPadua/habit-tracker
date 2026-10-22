import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type WriteBatch,
} from 'firebase/firestore';
import type { DateKey, Habit, Item, Task } from '../domain/types';
import { db } from '../lib/firebase';

type NewItem = Item extends infer T ? (T extends Item ? Omit<T, 'id'> : never) : never;

const itemRef = (uid: string, id: string) => doc(db, 'users', uid, 'items', id);

export function addItem(uid: string, item: NewItem) {
  return addDoc(collection(db, 'users', uid, 'items'), { ...item, createdAt: Date.now() });
}

export function updateItem(uid: string, id: string, patch: Partial<NewItem>) {
  return updateDoc(itemRef(uid, id), patch);
}

/** Deleting a goal unlinks its habits and tasks instead of deleting them. */
export async function deleteItem(uid: string, id: string, items: Item[]) {
  const batch = writeBatch(db);
  for (const it of items) {
    if (it.type !== 'goal' && it.goalId === id) batch.update(itemRef(uid, it.id), { goalId: null });
  }
  batch.delete(itemRef(uid, id));
  await batch.commit();
}

// arrayUnion/arrayRemove keep check-ins from two quick taps (or two devices) from clobbering each other.
export function toggleHabit(uid: string, habit: Habit, date: DateKey) {
  const done = habit.doneDates.includes(date);
  return updateDoc(itemRef(uid, habit.id), { doneDates: done ? arrayRemove(date) : arrayUnion(date) });
}

export function toggleTask(uid: string, task: Task, today: DateKey) {
  return updateDoc(itemRef(uid, task.id), { doneOn: task.doneOn ? null : today });
}

export function setProfile(uid: string, patch: { name?: string; sharing?: boolean }) {
  return updateDoc(doc(db, 'users', uid), patch);
}

// No 0/O/1/I/L so codes survive being read aloud or typed from a screenshot.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function newCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return code;
}

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// The space doc id is the invite code; the rules accept exactly { members: [me], createdAt } on create.
function addSpace(batch: WriteBatch, uid: string) {
  const code = newCode();
  batch.set(doc(db, 'spaces', code), { members: [uid], createdAt: serverTimestamp() });
  batch.update(doc(db, 'users', uid), { spaceId: code });
  return code;
}

export async function createSpace(uid: string) {
  const batch = writeBatch(db);
  const code = addSpace(batch, uid);
  await batch.commit();
  return code;
}

export async function joinSpace(uid: string, rawCode: string) {
  const code = normalizeCode(rawCode);
  if (code.length !== 8) throw new Error('Codes are 8 letters and numbers.');
  const snap = await getDoc(doc(db, 'spaces', code));
  if (!snap.exists()) throw new Error('No space has that code. Check it with your partner.');
  if (snap.data().closed) throw new Error('That code no longer works. Ask your partner for their new one.');
  const members = (snap.data().members as string[]) ?? [];
  if (members.includes(uid)) {
    await updateDoc(doc(db, 'users', uid), { spaceId: code });
    return;
  }
  if (members.length >= 2) throw new Error('That space already has two people in it.');
  const batch = writeBatch(db);
  batch.update(doc(db, 'spaces', code), { members: arrayUnion(uid) });
  batch.update(doc(db, 'users', uid), { spaceId: code });
  await batch.commit();
}

/**
 * I leave the old space to my partner, closed so nobody can join it with the old code (me included),
 * and move to a fresh one. My partner then sees "Start your space" and gets a new code too.
 */
export async function unlink(uid: string, spaceId: string, partnerId: string) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'spaces', spaceId), { members: [partnerId], closed: true });
  addSpace(batch, uid);
  await batch.commit();
}

export const newId = () => Math.random().toString(36).slice(2, 10);
