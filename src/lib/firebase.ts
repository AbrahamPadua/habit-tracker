import { initializeApp } from 'firebase/app';
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import { makeAuth } from './auth';

const useEmulators = process.env.EXPO_PUBLIC_USE_EMULATORS === '1';

/** False until `.env.local` has a Firebase project (or the emulators are switched on). */
export const configured = useEmulators || !!process.env.EXPO_PUBLIC_FIREBASE_API_KEY;

const app = initializeApp({
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? 'demo-key',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'demo-our-space',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
});

export const auth = makeAuth(app);
// shortcut: the JS SDK on React Native keeps pending writes in memory, so offline check-ins are lost if the
// app is killed before it reconnects; switch to @react-native-firebase (needs a dev build) if that bites.
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

if (useEmulators) {
  // The Android emulator reaches the host PC at 10.0.2.2; a real phone needs the PC's LAN IP.
  const host =
    process.env.EXPO_PUBLIC_EMULATOR_HOST ?? (Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1');
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
}
