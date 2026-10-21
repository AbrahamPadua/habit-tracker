import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { toDateKey } from '../domain/dates';
import type { DateKey, Item } from '../domain/types';
import { auth, db } from '../lib/firebase';

export interface Profile {
  name: string;
  spaceId: string | null;
  sharing: boolean;
}

export interface Session {
  /** undefined while Firebase restores the signed-in user. */
  user: User | null | undefined;
  profile: Profile | null;
  /** Members of my space; null when I have none or am not in it (or it was closed), undefined while it loads. */
  members: string[] | null | undefined;
  partnerId: string | null;
  /** null when there is no partner or their profile is out of reach (e.g. mid-unlink), undefined while it loads. */
  partner: Profile | null | undefined;
  myItems: Item[] | null;
  partnerItems: Item[] | null;
  today: DateKey;
}

const SessionContext = createContext<Session | null>(null);

// Set by sign-up before the account exists, so the first profile write already has the chosen name.
let pendingName: string | null = null;
export const setPendingName = (name: string) => {
  pendingName = name;
};

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useSession outside SessionProvider');
  return s;
}

/** The signed-in uid; only call from screens behind the auth guard. */
export function useUid(): string {
  const { user } = useSession();
  if (!user) throw new Error('No signed-in user');
  return user.uid;
}

function useToday(): DateKey {
  const [today, setToday] = useState(() => toDateKey(new Date()));
  useEffect(() => {
    const tick = () => setToday(toDateKey(new Date()));
    const sub = AppState.addEventListener('change', (s) => s === 'active' && tick());
    const timer = setInterval(tick, 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);
  return today;
}

function useItems(uid: string | null, sharedOnly: boolean): Item[] | null {
  const [items, setItems] = useState<Item[] | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- drop the previous list until the new listener answers
    setItems(null);
    if (!uid) return;
    const col = collection(db, 'users', uid, 'items');
    // The partner query must filter on `private` or the security rules reject it.
    const q = sharedOnly ? query(col, where('private', '==', false)) : col;
    return onSnapshot(
      q,
      (snap) =>
        setItems(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as Item & { createdAt?: number })
            .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)),
        ),
      (err) => {
        console.warn('items listener', uid, err.code);
        setItems([]);
      },
    );
  }, [uid, sharedOnly]);
  return items;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);
  // Each answer is tagged with the doc it came from, so a new space or partner reads as loading in the
  // same render instead of showing the previous answer (or a "no partner" screen) until an effect clears it.
  const [space, setSpace] = useState<{ id: string; members: string[] | null } | null>(null);
  const [partnerDoc, setPartnerDoc] = useState<{ id: string; profile: Profile | null } | null>(null);
  const today = useToday();

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const uid = user?.uid ?? null;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- drop the old user's profile until the new listener answers
    setProfile(null);
    if (!uid) return;
    const ref = doc(db, 'users', uid);
    // Metadata-only snapshots can repeat "missing" before our own write shows up; create once, or the
    // second create overwrites the chosen name with the email fallback.
    let created = false;
    return onSnapshot(
      ref,
      // Metadata changes too, so a cached "missing" is followed by the server's answer.
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.exists()) return setProfile(snap.data() as Profile);
        // A cache miss while offline is not "no profile"; writing one then would wipe the space link.
        if (snap.metadata.fromCache || created) return;
        created = true;
        // First sign-in, or sign-up was interrupted before the profile was written.
        const u = auth.currentUser;
        const name = (pendingName || u?.displayName || u?.email?.split('@')[0] || 'Me').slice(0, 60);
        pendingName = null;
        setDoc(ref, { name, spaceId: null, sharing: true }).catch((e) => console.warn('create profile', e));
      },
      (err) => console.warn('profile listener', err.code),
    );
  }, [uid]);

  const spaceId = profile?.spaceId ?? null;
  useEffect(() => {
    if (!uid || !spaceId) return;
    return onSnapshot(
      doc(db, 'spaces', spaceId),
      { includeMetadataChanges: true },
      (snap) => {
        // An optimistic join would start partner listeners the server still refuses; listeners never retry.
        if (snap.metadata.hasPendingWrites) return;
        const m = (snap.data()?.members as string[] | undefined) ?? [];
        // A closed space is where my partner unlinked from me; I start over with a new code.
        setSpace({ id: spaceId, members: m.includes(uid) && !snap.data()?.closed ? m : null });
      },
      (err) => {
        console.warn('space listener', err.code);
        setSpace({ id: spaceId, members: null });
      },
    );
  }, [uid, spaceId]);
  const members = !uid || !spaceId ? null : space?.id === spaceId ? space.members : undefined;

  const partnerId = (uid && members?.find((m) => m !== uid)) || null;
  useEffect(() => {
    if (!partnerId) return;
    const answer = (p: Profile | null) => setPartnerDoc({ id: partnerId, profile: p });
    return onSnapshot(
      doc(db, 'users', partnerId),
      (snap) => answer(snap.exists() ? (snap.data() as Profile) : null),
      // Denied until the partner's profile points at the same space (e.g. mid-unlink).
      () => answer(null),
    );
  }, [partnerId]);
  const partner = !partnerId ? null : partnerDoc?.id === partnerId ? partnerDoc.profile : undefined;

  const myItems = useItems(uid, false);
  // Only listen while the partner is actually sharing; otherwise the rules deny the query.
  const partnerItems = useItems(partner?.sharing && partner.spaceId === spaceId ? partnerId : null, true);

  return (
    <SessionContext.Provider
      value={{ user, profile, members, partnerId, partner, myItems, partnerItems, today }}
    >
      {children}
    </SessionContext.Provider>
  );
}
