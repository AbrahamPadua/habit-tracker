import { Alert } from 'react-native';

/** Writes queue while offline and resolve later; this only fires on real failures (rules, bad data). */
export function report(promise: Promise<unknown>) {
  promise.catch((e) => {
    console.warn(e);
    Alert.alert('That did not save', 'Check your connection and try again.');
  });
}
