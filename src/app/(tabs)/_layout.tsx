import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { View, type ColorValue } from 'react-native';
import { useSession } from '../../data/session';
import { isPaused } from '../../domain/habits';
import type { Habit } from '../../domain/types';
import { syncReminders } from '../../lib/reminders';
import { useTheme } from '../../ui/theme';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

// Material 3 navigation bar: the active destination sits in a tonal pill.
function TabIcon({ name, color, pill }: { name: IconName; color: ColorValue; pill?: string }) {
  return (
    <View style={{ width: 64, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pill }}>
      <MaterialCommunityIcons name={name} size={24} color={color as string} />
    </View>
  );
}

// Reminders live on this device only; reschedule whenever a reminder, title or pause changes, and each new day.
// shortcut: a DAILY trigger repeats its text, so the joke only changes on days the app is opened; schedule
// dated one-off notifications instead if that gets stale.
function useReminderSync() {
  const { myItems, today } = useSession();
  const habits = (myItems ?? []).filter((i): i is Habit => i.type === 'habit' && !!i.reminder);
  const key = myItems ? today + habits.map((h) => `${h.id}|${h.title}|${h.reminder}|${isPaused(h, today)}`).join(';') : null;
  useEffect(() => {
    if (key !== null) syncReminders(habits, today).catch((e) => console.warn('reminders', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

export default function TabsLayout() {
  const t = useTheme();
  useReminderSync();
  const icon =
    (name: IconName, active: IconName) =>
    ({ color, focused }: { color: ColorValue; focused: boolean }) => (
      <TabIcon name={focused ? active : name} color={color} pill={focused ? t.tonal : undefined} />
    );
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.ink,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.rule },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: t.ground },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('calendar-today-outline', 'calendar-today') }} />
      <Tabs.Screen name="goals" options={{ title: 'Goals', tabBarIcon: icon('flag-outline', 'flag') }} />
      <Tabs.Screen name="space" options={{ title: 'Space', tabBarIcon: icon('account-multiple-outline', 'account-multiple') }} />
    </Tabs>
  );
}
