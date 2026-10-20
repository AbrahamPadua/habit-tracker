import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Web build (used for local previews). Native builds load auth.native.ts instead.
export const makeAuth = (app: FirebaseApp) => getAuth(app);
