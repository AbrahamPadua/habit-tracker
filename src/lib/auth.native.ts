import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FirebaseApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';

// Without AsyncStorage persistence the user is signed out on every app restart.
export const makeAuth = (app: FirebaseApp) =>
  initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
