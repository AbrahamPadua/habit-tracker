import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

const ALICE = 'alice';
const BOB = 'bob';
const CAROL = 'carol';
const CODE = 'ABCD2345';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-our-space',
    firestore: { rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8') },
  });
});
beforeEach(() => env.clearFirestore());
afterAll(() => env.cleanup());

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

const userDoc = (spaceId: string | null = null, sharing = true) => ({ name: 'Name', spaceId, sharing });
const item = (over: Record<string, unknown> = {}) => ({
  type: 'task',
  title: 'Do thing',
  private: false,
  createdOn: '2026-01-01',
  createdAt: 1,
  ...over,
});

async function seed(fn: (db: any) => Promise<void>) {
  await env.withSecurityRulesDisabled(async (ctx) => fn(ctx.firestore()));
}

/** Alice and Bob in one space, alice sharing, with one public and one private alice item. */
async function seedLinked(opts: { aliceSharing?: boolean; bobSpaceId?: string | null } = {}) {
  await seed(async (db) => {
    await setDoc(doc(db, 'spaces', CODE), { members: [ALICE, BOB], createdAt: 1 });
    await setDoc(doc(db, 'users', ALICE), userDoc(CODE, opts.aliceSharing ?? true));
    await setDoc(doc(db, 'users', BOB), userDoc(opts.bobSpaceId === undefined ? CODE : opts.bobSpaceId));
    await setDoc(doc(db, 'users', ALICE, 'items', 'pub'), item());
    await setDoc(doc(db, 'users', ALICE, 'items', 'priv'), item({ private: true }));
  });
}

async function seedSpace(members: string[]) {
  await seed((db) => setDoc(doc(db, 'spaces', CODE), { members, createdAt: 1 }));
}

describe('owner: user doc and items', () => {
  it('owner can create, read and update own user doc', async () => {
    const db = as(ALICE);
    await assertSucceeds(setDoc(doc(db, 'users', ALICE), userDoc()));
    await assertSucceeds(getDoc(doc(db, 'users', ALICE)));
    await assertSucceeds(updateDoc(doc(db, 'users', ALICE), { name: 'New', sharing: false }));
  });

  it('rejects user doc with an extra key', async () => {
    await assertFails(setDoc(doc(as(ALICE), 'users', ALICE), { ...userDoc(), extra: 1 }));
  });

  it('rejects user doc with name over 60 chars', async () => {
    await assertFails(setDoc(doc(as(ALICE), 'users', ALICE), { ...userDoc(), name: 'x'.repeat(61) }));
  });

  it('accepts user doc with name of exactly 60 chars', async () => {
    await assertSucceeds(setDoc(doc(as(ALICE), 'users', ALICE), { ...userDoc(), name: 'x'.repeat(60) }));
  });

  it('owner can create, read, update and delete own items', async () => {
    const db = as(ALICE);
    const ref = doc(db, 'users', ALICE, 'items', 'i1');
    await assertSucceeds(setDoc(ref, item()));
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(updateDoc(ref, { title: 'Renamed' }));
    await assertSucceeds(deleteDoc(ref));
  });

  it('owner can addDoc to items and list own items unfiltered', async () => {
    const db = as(ALICE);
    await assertSucceeds(addDoc(collection(db, 'users', ALICE, 'items'), item({ private: true })));
    await assertSucceeds(getDocs(collection(db, 'users', ALICE, 'items')));
  });

  it('rejects item with bad type', async () => {
    await assertFails(setDoc(doc(as(ALICE), 'users', ALICE, 'items', 'i'), item({ type: 'chore' })));
  });

  it('rejects item with empty title', async () => {
    await assertFails(setDoc(doc(as(ALICE), 'users', ALICE, 'items', 'i'), item({ title: '' })));
  });

  it('rejects item with title over 200 chars', async () => {
    await assertFails(setDoc(doc(as(ALICE), 'users', ALICE, 'items', 'i'), item({ title: 'x'.repeat(201) })));
  });

  it('accepts item with title of exactly 200 chars', async () => {
    await assertSucceeds(setDoc(doc(as(ALICE), 'users', ALICE, 'items', 'i'), item({ title: 'x'.repeat(200) })));
  });

  it('rejects item missing private', async () => {
    const { private: _p, ...noPrivate } = item();
    await assertFails(setDoc(doc(as(ALICE), 'users', ALICE, 'items', 'i'), noPrivate));
  });
});

describe('strangers and unauthenticated', () => {
  beforeEach(() =>
    seed(async (db) => {
      await setDoc(doc(db, 'users', ALICE), userDoc());
      await setDoc(doc(db, 'users', ALICE, 'items', 'i1'), item());
    }),
  );

  it('stranger cannot read another user doc', async () => {
    await assertFails(getDoc(doc(as(CAROL), 'users', ALICE)));
  });

  it('stranger cannot read or list another user items', async () => {
    await assertFails(getDoc(doc(as(CAROL), 'users', ALICE, 'items', 'i1')));
    await assertFails(getDocs(query(collection(as(CAROL), 'users', ALICE, 'items'), where('private', '==', false))));
  });

  it('stranger cannot write to another user doc or items', async () => {
    await assertFails(setDoc(doc(as(CAROL), 'users', ALICE), userDoc()));
    await assertFails(setDoc(doc(as(CAROL), 'users', ALICE, 'items', 'x'), item()));
  });

  it('unauthenticated cannot read user docs, items or write', async () => {
    await assertFails(getDoc(doc(anon(), 'users', ALICE)));
    await assertFails(getDoc(doc(anon(), 'users', ALICE, 'items', 'i1')));
    await assertFails(setDoc(doc(anon(), 'users', ALICE), userDoc()));
  });
});

describe('spaces: basic access', () => {
  it('create with members [self] succeeds', async () => {
    await assertSucceeds(setDoc(doc(as(ALICE), 'spaces', CODE), { members: [ALICE], createdAt: serverTimestamp() }));
  });

  it('create with someone else uid is denied', async () => {
    await assertFails(setDoc(doc(as(ALICE), 'spaces', CODE), { members: [BOB], createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(as(ALICE), 'spaces', CODE), { members: [ALICE, BOB], createdAt: serverTimestamp() }));
  });

  it('create with an extra key is denied', async () => {
    await assertFails(setDoc(doc(as(ALICE), 'spaces', CODE), { members: [ALICE], createdAt: 1, x: 1 }));
  });

  it('list is denied', async () => {
    await seedSpace([ALICE]);
    await assertFails(getDocs(collection(as(ALICE), 'spaces')));
  });

  it('get by any signed-in user succeeds', async () => {
    await seedSpace([ALICE]);
    await assertSucceeds(getDoc(doc(as(CAROL), 'spaces', CODE)));
  });

  it('get when unauthenticated is denied', async () => {
    await seedSpace([ALICE]);
    await assertFails(getDoc(doc(anon(), 'spaces', CODE)));
  });

  it('delete is denied, even for a member', async () => {
    await seedSpace([ALICE]);
    await assertFails(deleteDoc(doc(as(ALICE), 'spaces', CODE)));
  });
});

describe('spaces: join', () => {
  it('succeeds via arrayUnion when there is 1 member', async () => {
    await seedSpace([ALICE]);
    await assertSucceeds(updateDoc(doc(as(BOB), 'spaces', CODE), { members: arrayUnion(BOB) }));
  });

  it('full join batch (space + user doc) succeeds', async () => {
    await seedSpace([ALICE]);
    await seed((db) => setDoc(doc(db, 'users', BOB), userDoc()));
    const db = as(BOB);
    const batch = writeBatch(db);
    batch.update(doc(db, 'spaces', CODE), { members: arrayUnion(BOB) });
    batch.update(doc(db, 'users', BOB), { spaceId: CODE });
    await assertSucceeds(batch.commit());
  });

  it('is denied when the space already has 2 members', async () => {
    await seedSpace([ALICE, BOB]);
    await assertFails(updateDoc(doc(as(CAROL), 'spaces', CODE), { members: arrayUnion(CAROL) }));
  });

  it('is denied when adding a different uid than self', async () => {
    await seedSpace([ALICE]);
    await assertFails(updateDoc(doc(as(BOB), 'spaces', CODE), { members: arrayUnion(CAROL) }));
  });

  it('is denied when also changing createdAt', async () => {
    await seedSpace([ALICE]);
    await assertFails(updateDoc(doc(as(BOB), 'spaces', CODE), { members: arrayUnion(BOB), createdAt: 999 }));
  });

  it('is denied when the joiner is already a member', async () => {
    await seedSpace([ALICE]);
    // Note: arrayUnion(ALICE) on [ALICE] would be a harmless no-op that the unlink rule allows,
    // so duplicate the member explicitly.
    await assertFails(updateDoc(doc(as(ALICE), 'spaces', CODE), { members: [ALICE, ALICE] }));
  });

  it('is denied when unauthenticated', async () => {
    await seedSpace([ALICE]);
    await assertFails(updateDoc(doc(anon(), 'spaces', CODE), { members: arrayUnion(BOB) }));
  });
});

describe('spaces: unlink', () => {
  it('member can set members to [self]', async () => {
    await seedSpace([ALICE, BOB]);
    await assertSucceeds(updateDoc(doc(as(ALICE), 'spaces', CODE), { members: [ALICE] }));
  });

  it('member can set members to [partner]', async () => {
    await seedSpace([ALICE, BOB]);
    await assertSucceeds(updateDoc(doc(as(ALICE), 'spaces', CODE), { members: [BOB] }));
  });

  it('outsider is denied', async () => {
    await seedSpace([ALICE, BOB]);
    await assertFails(updateDoc(doc(as(CAROL), 'spaces', CODE), { members: [CAROL] }));
    await assertFails(updateDoc(doc(as(CAROL), 'spaces', CODE), { members: [ALICE] }));
  });

  it('setting members to a uid that was never a member is denied', async () => {
    await seedSpace([ALICE, BOB]);
    await assertFails(updateDoc(doc(as(ALICE), 'spaces', CODE), { members: [CAROL] }));
  });

  it('unlink that also changes createdAt is denied', async () => {
    await seedSpace([ALICE, BOB]);
    await assertFails(updateDoc(doc(as(ALICE), 'spaces', CODE), { members: [ALICE], createdAt: 999 }));
  });
});

describe('partner reads', () => {
  const pubRef = (db: any) => doc(db, 'users', ALICE, 'items', 'pub');
  const privRef = (db: any) => doc(db, 'users', ALICE, 'items', 'priv');

  it('non-private item get succeeds', async () => {
    await seedLinked();
    await assertSucceeds(getDoc(pubRef(as(BOB))));
  });

  it('private item get fails', async () => {
    await seedLinked();
    await assertFails(getDoc(privRef(as(BOB))));
  });

  it('list filtered by private == false succeeds', async () => {
    await seedLinked();
    await assertSucceeds(
      getDocs(query(collection(as(BOB), 'users', ALICE, 'items'), where('private', '==', false))),
    );
  });

  it('unfiltered list fails', async () => {
    await seedLinked();
    await assertFails(getDocs(collection(as(BOB), 'users', ALICE, 'items')));
  });

  it('get fails after owner sets sharing=false', async () => {
    await seedLinked();
    await assertSucceeds(updateDoc(doc(as(ALICE), 'users', ALICE), { sharing: false }));
    await assertFails(getDoc(pubRef(as(BOB))));
  });

  it('get fails when owner was seeded with sharing=false', async () => {
    await seedLinked({ aliceSharing: false });
    await assertFails(getDoc(pubRef(as(BOB))));
  });

  it('get fails after unlink', async () => {
    await seedLinked();
    await assertSucceeds(updateDoc(doc(as(ALICE), 'spaces', CODE), { members: [ALICE] }));
    await assertFails(getDoc(pubRef(as(BOB))));
  });

  it('get fails when partner user doc points at a different spaceId', async () => {
    await seedLinked({ bobSpaceId: 'OTHER234' });
    await assertFails(getDoc(pubRef(as(BOB))));
  });

  it('get fails when partner user doc has no space', async () => {
    await seedLinked({ bobSpaceId: null });
    await assertFails(getDoc(pubRef(as(BOB))));
  });

  it('partner cannot create, update or delete owner items', async () => {
    await seedLinked();
    const db = as(BOB);
    await assertFails(setDoc(doc(db, 'users', ALICE, 'items', 'new'), item()));
    await assertFails(updateDoc(pubRef(db), { title: 'Hacked' }));
    await assertFails(deleteDoc(pubRef(db)));
  });

  it('partner cannot update or delete owner user doc', async () => {
    await seedLinked();
    await assertFails(updateDoc(doc(as(BOB), 'users', ALICE), { name: 'Hacked' }));
    await assertFails(deleteDoc(doc(as(BOB), 'users', ALICE)));
  });

  it('stranger cannot read items even when others are linked', async () => {
    await seedLinked();
    await assertFails(getDoc(pubRef(as(CAROL))));
  });
});

describe('user doc reads across the link', () => {
  it('linked partner can read owner user doc', async () => {
    await seedLinked();
    await assertSucceeds(getDoc(doc(as(BOB), 'users', ALICE)));
    await assertSucceeds(getDoc(doc(as(ALICE), 'users', BOB)));
  });

  it('stranger cannot read a linked user doc', async () => {
    await seedLinked();
    await assertFails(getDoc(doc(as(CAROL), 'users', ALICE)));
  });

  it('partner cannot read user doc after unlink', async () => {
    await seedLinked();
    await assertSucceeds(updateDoc(doc(as(ALICE), 'spaces', CODE), { members: [ALICE] }));
    await assertFails(getDoc(doc(as(BOB), 'users', ALICE)));
  });
});
