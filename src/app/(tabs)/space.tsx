import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createSpace, joinSpace, setProfile, unlink } from '../../data/actions';
import { useSession, useUid } from '../../data/session';
import { auth } from '../../lib/firebase';
import { syncReminders } from '../../lib/reminders';
import { Button, ErrorText, SectionLabel } from '../../ui/controls';
import { failureText, report } from '../../ui/report';
import { space, type, useTheme } from '../../ui/theme';

export default function SpaceScreen() {
  const t = useTheme();
  const uid = useUid();
  const { profile, members, partner, partnerId } = useSession();
  const [name, setName] = useState(profile?.name ?? '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the field is a draft; a name saved elsewhere replaces it
  useEffect(() => setName(profile?.name ?? ''), [profile?.name]);

  const spaceId = members ? profile?.spaceId ?? null : null;
  // While my space is still loading, Create or Join would quietly move me out of a link I may have.
  const loading = members === undefined;
  const pretty = spaceId ? `${spaceId.slice(0, 4)} ${spaceId.slice(4)}` : '';

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error && !('code' in e) ? e.message : `That did not work. ${failureText(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const saveName = () => {
    const n = name.trim();
    if (n && n !== profile?.name) report(setProfile(uid, { name: n.slice(0, 60) }));
  };

  const input = [styles.input, type.body, { color: t.ink, borderColor: t.faint, backgroundColor: t.card }];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.ground }}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Text style={[type.headline, { color: t.ink, paddingTop: space.sm }]}>Space</Text>

        <SectionLabel>Your name</SectionLabel>
        <TextInput style={input} value={name} onChangeText={setName} onBlur={saveName} onSubmitEditing={saveName} maxLength={60} accessibilityLabel="Your name" />

        <View style={[styles.card, { backgroundColor: t.card }]}>
          {partnerId ? (
            <>
              <Text style={[type.title, { color: t.ink }]}>Linked with {partner?.name ?? 'your partner'}</Text>
              <Text style={[type.meta, { color: t.muted, marginTop: space.xs }]}>
                You see each other&apos;s lists. Neither of you can change the other&apos;s.
              </Text>
              <View style={styles.toggle}>
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { color: t.ink }]}>Share my list</Text>
                  <Text style={[type.meta, { color: t.muted }]}>
                    {profile?.sharing
                      ? 'Items marked "Only me" stay hidden either way.'
                      : `Your list is hidden. ${partner?.name ?? 'Your partner'} only sees that sharing is paused.`}
                  </Text>
                </View>
                <Switch
                  value={!!profile?.sharing}
                  onValueChange={(v) => report(setProfile(uid, { sharing: v }))}
                  trackColor={{ true: t.action, false: t.faint }}
                  thumbColor={t.card}
                  accessibilityLabel="Share my list"
                />
              </View>
              <Button
                kind="text"
                label="Unlink"
                style={{ alignSelf: 'flex-start' }}
                onPress={() =>
                  Alert.alert('Unlink?', 'You stop seeing each other right away and you get a new code. Your own lists stay as they are.', [
                    { text: 'Stay linked', style: 'cancel' },
                    { text: 'Unlink', style: 'destructive', onPress: () => report(unlink(uid, spaceId!, partnerId)) },
                  ])
                }
              />
            </>
          ) : spaceId ? (
            <>
              <Text style={[type.title, { color: t.ink }]}>Send this code to your partner</Text>
              <Text style={[type.display, styles.code, { color: t.ink }]} selectable accessibilityLabel={`Code ${spaceId.split('').join(' ')}`}>
                {pretty}
              </Text>
              <Text style={[type.meta, { color: t.muted, marginBottom: space.md }]}>
                They enter it under &quot;Join with a code&quot;. Your cards appear on each other&apos;s Today once they do.
              </Text>
              <Button kind="tonal" label="Share code" onPress={() => Share.share({ message: `Join me on Our Space with this code: ${pretty}` })} />
            </>
          ) : loading ? (
            <ActivityIndicator color={t.muted} />
          ) : (
            <>
              <Text style={[type.title, { color: t.ink }]}>Start your space</Text>
              <Text style={[type.meta, { color: t.muted, marginTop: space.xs, marginBottom: space.md }]}>
                One of you creates a space and shares the code. The other joins with it.
              </Text>
              <Button label="Create our space" busy={busy} onPress={() => run(() => createSpace(uid))} />
            </>
          )}
        </View>

        {!partnerId && !loading && (
          <>
            <SectionLabel>Join with a code</SectionLabel>
            <TextInput
              style={[input, { letterSpacing: 2 }]}
              value={code}
              onChangeText={setCode}
              placeholder="ABCD 2345"
              placeholderTextColor={t.faint}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
              accessibilityLabel="Partner's code"
            />
            <Button kind="tonal" label="Join" busy={busy} disabled={!code.trim()} onPress={() => run(() => joinSpace(uid, code))} />
          </>
        )}
        {error && <ErrorText>{error}</ErrorText>}

        <View style={{ height: space.xxl }} />
        <Button kind="text" label="Sign out" onPress={() => syncReminders([], '').finally(() => signOut(auth))} style={{ alignSelf: 'flex-start' }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, paddingBottom: 64 },
  card: { borderRadius: 20, padding: space.lg, marginTop: space.xl },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: space.lg, minHeight: 52, marginBottom: space.md },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 64, marginTop: space.md },
  code: { marginVertical: space.md, letterSpacing: 4, fontVariant: ['tabular-nums'] },
});
