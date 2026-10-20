import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '../data/session';
import { configured } from '../lib/firebase';
import { space, type, useTheme } from '../ui/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {configured ? (
        <SessionProvider>
          <Routes />
        </SessionProvider>
      ) : (
        <NotConfigured />
      )}
    </SafeAreaProvider>
  );
}

function Routes() {
  const { user } = useSession();
  const t = useTheme();
  if (user === undefined) {
    return (
      <View style={[styles.center, { backgroundColor: t.ground }]}>
        <ActivityIndicator color={t.muted} />
      </View>
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.ground } }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="item" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

function NotConfigured() {
  const t = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: t.ground, padding: space.xl }]}>
      <Text style={[type.headline, { color: t.ink, textAlign: 'center' }]}>Almost there</Text>
      <Text style={[type.body, { color: t.muted, textAlign: 'center', marginTop: space.md }]}>
        Add your Firebase project to .env.local (see README), then restart the dev server.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
