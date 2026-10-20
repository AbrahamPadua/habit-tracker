import type { Persistence } from 'firebase/auth';

// @firebase/auth lists its generic `types` before the react-native condition, so TS never sees this RN-only export.
declare module '@firebase/auth' {
  export function getReactNativePersistence(storage: unknown): Persistence;
}
