import { Platform } from 'react-native';
import { isPaused } from '../domain/habits';
import type { DateKey, Habit } from '../domain/types';

const CHANNEL = 'reminders';

// expo-notifications 57 throws on import in Expo Go for Android (its push module is stripped there), and that
// took down every screen importing this file. shortcut: reminders are off in Expo Go on Android; they work in an
// installed build (`eas build`). Drop the lazy require once Expo Go no longer throws.
const Notifications: typeof import('expo-notifications') | null = (() => {
  if (Platform.OS === 'web') return null;
  try {
    return require('expo-notifications');
  } catch {
    return null;
  }
})();

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export const remindersSupported = Notifications !== null;

/** Asks once; returns whether reminders can be shown. */
export async function ensureReminderPermission(): Promise<boolean> {
  if (!Notifications) return false;
  if (Platform.OS === 'android') {
    // Android 13+ only shows the permission prompt once a channel exists.
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Habit reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

let queue: Promise<void> = Promise.resolve();

/** Reschedules every reminder from scratch, one sync at a time so an older run cannot resurrect stale ones. */
export function syncReminders(habits: Habit[], today: DateKey): Promise<void> {
  queue = queue.catch(() => {}).then(() => resync(habits, today));
  return queue;
}

async function resync(habits: Habit[], today: DateKey) {
  if (!Notifications) return;
  const wanted = habits.filter((h) => h.reminder && !isPaused(h, today));
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!wanted.length || !(await Notifications.getPermissionsAsync()).granted) return;
  for (const h of wanted) {
    const [hour, minute] = h.reminder!.split(':').map(Number);
    await Notifications.scheduleNotificationAsync({
      content: { title: h.title, body: 'Whenever you are ready.' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: CHANNEL,
      },
    });
  }
}
