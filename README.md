# Our Space

A habit tracker for two. Each of you keeps goals, habits and tasks; the other sees them read-only, live. Checking in is one tap. A blank check means "not recorded", never "failed".

Built with Expo (React Native) and Firebase, so the same code runs on Android now and iPhone later.

## What is in V1

- **Today**: your card (daily habits, today's and overdue tasks, pinned tasks), a "This week" section with punch slots for weekly targets, and a collapsed "Done". Your partner's card sits underneath, read-only.
- **Goals**: goals with milestones, the habits and tasks linked to them, and everything that is not in a goal. Goal progress comes from milestones only.
- **One add/edit sheet** for habits (daily, N times a week, flexible), tasks (today, tomorrow, next week, a date, or no date with "pin to Today"), and goals (milestones).
- **Low-friction fixes**: backfill the last 14 days, move or drop overdue tasks in one tap, pause a habit, change a target (applies from this week; past weeks keep theirs).
- **Privacy**: mark any item "Only me", pause sharing entirely, or unlink.
- **Private suggestions** after repeated misses (lower a weekly target, switch daily to weekly, drop a task moved 3+ times). Dismiss hides them for 14 days.
- **Optional reminders** per habit, at a daily time, scheduled on your own phone.

Product reasoning lives in [PRODUCT.md](PRODUCT.md) and the behavior spec in [docs/SPEC.md](docs/SPEC.md).

## Set up (about 10 minutes, once)

1. **Create a Firebase project** at <https://console.firebase.google.com> (free Spark plan is enough).
   - Build > Authentication > Get started > Sign-in method > enable **Email/Password**.
   - Build > Firestore Database > Create database (production mode, a region near you).
   - Project settings > General > Your apps > add a **Web** app. Copy its config.
2. **Configure the app**: copy `.env.example` to `.env.local` and fill in the four `EXPO_PUBLIC_FIREBASE_*` values.
3. **Deploy the security rules** (these keep private items private):

   ```bash
   npx firebase login
   ```

   ```bash
   npx firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
   ```

4. **Run it on both Android phones**: install **Expo Go** from the Play Store, then on this PC:

   ```bash
   npm start
   ```

   Scan the QR code with Expo Go. Both phones must be on the same Wi-Fi as the PC (or run `npx expo start --tunnel`).
5. **Link up**: each of you creates an account. One taps Space > "Create our space" and shares the 8-character code; the other enters it under "Join with a code".

## Installable APK (no PC needed afterwards)

Needs a free Expo account. `.env.local` is not uploaded to the build servers, so put the same four Firebase values under `build.preview.env` in `eas.json` first (the Firebase web config is not a secret; the security rules are what protect your data).

```bash
npx eas-cli@latest build -p android --profile preview
```

It prints a link to an `.apk` you can install on both phones. iPhone later: `npx eas-cli@latest build -p ios` (needs an Apple Developer account); Expo Go on iPhone works for testing before that.

## Develop

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run test:rules
```

`test:rules` runs `tests/rules` against the Firestore emulator and needs Java 21+ on PATH.

To work without a Firebase project, put `EXPO_PUBLIC_USE_EMULATORS=1` in `.env.local`, start the emulators in one terminal and the app in another:

```bash
npm run emulators
```

```bash
npm run web
```

To test sharing on your own, `scripts/partner.mjs` plays a second partner ("Sam") against the emulators: create a space in the app, then run `node scripts/partner.mjs join YOURCODE`, and `node scripts/partner.mjs check "Practice drawing"` to watch a check-in arrive live.

## Known limits (V1)

- **Offline check-ins are kept in memory.** They sync when the phone reconnects, but are lost if the app is force-closed while still offline. Moving to `@react-native-firebase` fixes this; it needs a development build instead of Expo Go.
- **Partners in different time zones** see each other's day by the viewer's date, so around midnight a check-in can look unrecorded for a few hours.
- **Reminders** fire daily at the set time, including on days the habit is already stamped. They are hidden in Expo Go on Android (its notification module crashes on import there) and work in an installed build from `eas build`.
- **Not yet run on a physical phone or Android emulator** (none on the build machine). Verified: typecheck, 43 unit tests, 49 security-rule tests, an Android production bundle, and the full flow in a phone-sized web preview against the Firebase emulators.

## Layout

| Path | What |
|------|------|
| `src/domain/` | Pure rules: dates, habits, Today view, weekly progress, suggestions. Unit tested. |
| `src/data/` | Firebase auth session, live listeners, and every write. |
| `src/app/` | Screens (Expo Router): `(tabs)/index` Today, `(tabs)/goals`, `(tabs)/space`, `item` add/edit, `sign-in`. |
| `src/ui/` | Theme tokens, the stamp check control, chips, buttons, list row. |
| `firestore.rules` | Who can read and write what. Tested in `tests/rules/`. |
