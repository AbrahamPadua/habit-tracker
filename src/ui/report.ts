import { Alert } from 'react-native';

/** What to tell the user when a Firestore call fails. */
export function failureText(e: unknown): string {
  // Firestore's default rules deny everything, so this is what a missing `firebase deploy` looks like.
  if ((e as { code?: string } | null)?.code === 'permission-denied') {
    return 'Firebase refused this. Deploy firestore.rules (see README), then try again.';
  }
  return 'Check your connection and try again.';
}

/** Writes queue while offline and resolve later; this only fires on real failures (rules, bad data). */
export function report(promise: Promise<unknown>) {
  promise.catch((e) => {
    console.warn(e);
    Alert.alert('That did not save', failureText(e));
  });
}
