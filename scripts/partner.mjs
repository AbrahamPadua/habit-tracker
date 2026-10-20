// Plays the second partner against the local emulators, so one person can test sharing.
// Usage: node scripts/partner.mjs join <CODE> | check "<habit title>" | peek
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  addDoc, arrayUnion, collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, setDoc, updateDoc, writeBatch,
} from 'firebase/firestore';

// Emulator-only demo accounts; never point this at a real project.
// For the other side, sign up in the app as abe@example.test with the same password.
const EMAIL = 'sam@example.test';
const PASSWORD = 'demo-password';

const app = initializeApp({ apiKey: 'demo-key', projectId: 'demo-our-space' });
const auth = getAuth(app);
const db = getFirestore(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8080);

const pad = (n) => String(n).padStart(2, '0');
const d = new Date();
const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

async function signIn() {
  try {
    return (await signInWithEmailAndPassword(auth, EMAIL, PASSWORD)).user.uid;
  } catch {
    const uid = (await createUserWithEmailAndPassword(auth, EMAIL, PASSWORD)).user.uid;
    await setDoc(doc(db, 'users', uid), { name: 'Sam', spaceId: null, sharing: true });
    const items = collection(db, 'users', uid, 'items');
    const habit = (title, cadence, extra = {}) => ({
      type: 'habit', title, private: false, createdOn: today, goalId: null,
      cadences: [{ from: today, cadence }], doneDates: [], pauses: [], reminder: null, snoozeSuggestionsUntil: null,
      createdAt: Date.now(), ...extra,
    });
    await addDoc(items, habit('Morning walk', { kind: 'daily' }, { doneDates: [today] }));
    await addDoc(items, habit('Practice drawing', { kind: 'daily' }));
    await addDoc(items, habit('Gym', { kind: 'weekly', times: 3 }));
    await addDoc(items, {
      type: 'task', title: 'Finish lesson 4', private: false, createdOn: today, goalId: null, due: today, pinned: false,
      doneOn: null, droppedOn: null, deferCount: 0, snoozeSuggestionsUntil: null, createdAt: Date.now(),
    });
    await addDoc(items, {
      type: 'task', title: 'Buy a birthday gift (secret)', private: true, createdOn: today, goalId: null, due: today,
      pinned: false, doneOn: null, droppedOn: null, deferCount: 0, snoozeSuggestionsUntil: null, createdAt: Date.now(),
    });
    return uid;
  }
}

const [cmd, arg] = process.argv.slice(2);
const uid = await signIn();

if (cmd === 'join') {
  const code = arg.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const batch = writeBatch(db);
  batch.update(doc(db, 'spaces', code), { members: arrayUnion(uid) });
  batch.update(doc(db, 'users', uid), { spaceId: code });
  await batch.commit();
  console.log('Sam joined', code);
} else if (cmd === 'check') {
  const snap = await getDocs(collection(db, 'users', uid, 'items'));
  const hit = snap.docs.find((s) => s.data().title === arg);
  if (!hit) throw new Error(`No item titled ${arg}`);
  await updateDoc(hit.ref, { doneDates: arrayUnion(today) });
  console.log('Sam checked', arg);
} else if (cmd === 'peek') {
  // Try to read the partner's private items directly; the rules must refuse.
  const me = (await getDoc(doc(db, 'users', uid))).data();
  const space = (await getDoc(doc(db, 'spaces', me.spaceId))).data();
  const partner = space.members.find((m) => m !== uid);
  try {
    const all = await getDocs(collection(db, 'users', partner, 'items'));
    console.log('LEAK: read', all.size, 'items without the private filter');
  } catch (e) {
    console.log('Unfiltered read refused:', e.code);
  }
} else {
  console.log('Sam is signed in as', uid);
}
process.exit(0);
