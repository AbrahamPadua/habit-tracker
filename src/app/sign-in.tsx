import { FirebaseError } from 'firebase/app';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setPendingName } from '../data/session';
import { auth } from '../lib/firebase';
import { Button, ErrorText } from '../ui/controls';
import { space, type, useTheme } from '../ui/theme';

const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'That email address looks incomplete.',
  'auth/invalid-credential': 'Email or password is not right. Try again, or create an account.',
  'auth/email-already-in-use': 'That email already has an account. Sign in instead.',
  'auth/weak-password': 'Use at least 6 characters for the password.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/too-many-requests': 'Too many tries. Wait a minute, then try again.',
};

export default function SignIn() {
  const t = useTheme();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (mode === 'up' && !name.trim()) return setError('Add the name your partner will see.');
    setBusy(true);
    try {
      if (mode === 'up') {
        setPendingName(name.trim());
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (e) {
      const code = e instanceof FirebaseError ? e.code : '';
      setError(MESSAGES[code] ?? 'Something went wrong. Try again.');
      setBusy(false);
    }
  };

  const input = [styles.input, type.body, { color: t.ink, borderColor: t.faint, backgroundColor: t.card }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.ground }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={[type.display, { color: t.ink }]}>Our Space</Text>
          <Text style={[type.body, { color: t.muted, marginTop: space.sm, marginBottom: space.xxl }]}>
            Your day and theirs, side by side.
          </Text>

          {mode === 'up' && (
            <TextInput
              style={input}
              placeholder="Your name"
              placeholderTextColor={t.faint}
              value={name}
              onChangeText={setName}
              maxLength={60}
              autoComplete="name"
              accessibilityLabel="Your name"
            />
          )}
          <TextInput
            style={input}
            placeholder="Email"
            placeholderTextColor={t.faint}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            accessibilityLabel="Email"
          />
          <TextInput
            style={input}
            placeholder="Password"
            placeholderTextColor={t.faint}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
            accessibilityLabel="Password"
            onSubmitEditing={submit}
          />

          {error && <ErrorText>{error}</ErrorText>}

          <Button label={mode === 'up' ? 'Create account' : 'Sign in'} onPress={submit} busy={busy} />
          <View style={{ height: space.sm }} />
          <Button
            kind="text"
            label={mode === 'up' ? 'I already have an account' : 'New here? Create an account'}
            onPress={() => {
              setMode(mode === 'up' ? 'in' : 'up');
              setError(null);
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.xl, paddingTop: 72, flexGrow: 1 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: space.lg, minHeight: 52, marginBottom: space.md },
});
