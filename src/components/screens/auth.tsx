import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { friendlyAuthError } from '@/lib/cloud';
import { supabase } from '@/lib/supabase';
import { C, HEADLINE, R, tapBuzz } from '@/lib/ui';

type Props = {
  /** Which form to show first. */
  startMode?: 'signUp' | 'signIn';
  /** Shown when this device already has habits saved as a guest. */
  hasLocalData?: boolean;
  /** "Try without an account" (or "Back" when opened from Manage). */
  onSkip: () => void;
  skipLabel?: string;
};

export function AuthScreen({ startMode = 'signUp', hasLocalData = false, onSkip, skipLabel = 'Try without an account' }: Props) {
  const [mode, setMode] = useState<'signUp' | 'signIn'>(startMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const signingUp = mode === 'signUp';
  const canSubmit = email.trim().length > 3 && password.length >= 6 && !busy;

  const submit = async () => {
    if (!supabase || !canSubmit) return;
    tapBuzz();
    setBusy(true);
    setError(null);
    setNotice(null);
    const creds = { email: email.trim().toLowerCase(), password };
    const { data, error: err } = signingUp
      ? await supabase.auth.signUp(creds)
      : await supabase.auth.signInWithPassword(creds);
    setBusy(false);
    if (err) {
      setError(friendlyAuthError(err.message));
      return;
    }
    // If email confirmation is turned on in Supabase, there's no session until they click the link.
    if (signingUp && !data.session) {
      setNotice('Almost there! Check your email for a confirmation link, then come back and sign in.');
      setMode('signIn');
    }
    // Otherwise the app notices the new sign-in and moves on automatically.
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={styles.big}>🌳</Text>
        <Text style={styles.h1}>{signingUp ? 'Save your progress' : 'Welcome back'}</Text>
        <Text style={styles.lead}>
          {signingUp
            ? 'Create a free account so your habits, streaks and tree are backed up and sync across your devices.'
            : 'Sign in to get your habits back on this device.'}
        </Text>

        {hasLocalData && signingUp && (
          <Text style={styles.info}>✅ The habits already on this device will be saved to your new account.</Text>
        )}
        {hasLocalData && !signingUp && (
          <Text style={styles.info}>
            ⚠️ Signing in will replace the habits on this device with the ones saved in your account.
          </Text>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={C.muted}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={signingUp ? 'At least 6 characters' : 'Your password'}
            placeholderTextColor={C.muted}
            style={styles.input}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={signingUp ? 'new-password' : 'current-password'}
            textContentType={signingUp ? 'newPassword' : 'password'}
            returnKeyType="go"
            onSubmitEditing={submit}
          />

          {error && <Text style={styles.error}>{error}</Text>}
          {notice && <Text style={styles.notice}>{notice}</Text>}

          <Pressable style={[styles.button, !canSubmit && styles.off]} disabled={!canSubmit} onPress={submit}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{signingUp ? 'Create account' : 'Sign in'}</Text>}
          </Pressable>
        </View>

        <Pressable
          onPress={() => {
            setMode(signingUp ? 'signIn' : 'signUp');
            setError(null);
            setNotice(null);
          }}>
          <Text style={styles.link}>{signingUp ? 'Already have an account? Sign in' : 'New here? Create an account'}</Text>
        </Pressable>

        <Pressable onPress={onSkip} style={styles.skip}>
          <Text style={styles.skipText}>{skipLabel}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 24, paddingTop: 32, gap: 14 },
  big: { fontSize: 52, textAlign: 'center' },
  h1: { fontSize: 38, lineHeight: 46, fontFamily: HEADLINE, textTransform: 'uppercase', color: C.text, textAlign: 'center' },
  lead: { fontSize: 15, color: C.muted, textAlign: 'center', lineHeight: 21 },
  info: { fontSize: 14, color: C.text, backgroundColor: C.accentSoft, borderRadius: R.sm, padding: 12, lineHeight: 20 },
  card: { backgroundColor: C.card, borderRadius: R.md, padding: 16, gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: R.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: C.text,
    backgroundColor: C.bg,
  },
  error: { color: '#FF8A8A', fontSize: 14, marginTop: 4 },
  notice: { color: C.text, fontSize: 14, marginTop: 4 },
  button: { backgroundColor: C.accent, borderRadius: R.sm, paddingVertical: 14, alignItems: 'center', marginTop: 8, minHeight: 48, justifyContent: 'center' },
  off: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { color: C.accent, textAlign: 'center', fontWeight: '600', fontSize: 15 },
  skip: { alignItems: 'center', paddingVertical: 10 },
  skipText: { color: C.muted, fontSize: 14, textDecorationLine: 'underline' },
});
