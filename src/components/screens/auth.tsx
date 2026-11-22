import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { friendlyAuthError } from '@/lib/cloud';
import { APP_URL, supabase } from '@/lib/supabase';
import { C, HEADLINE, R, doneBuzz, tapBuzz } from '@/lib/ui';

type Mode = 'signUp' | 'signIn' | 'reset';

type Props = {
  /** Which form to show first. */
  startMode?: 'signUp' | 'signIn';
  /** Shown when this device already has habits saved as a guest. */
  hasLocalData?: boolean;
  /** "Try without an account" (or "Back" when opened from Manage). */
  onSkip: () => void;
  skipLabel?: string;
};

const TITLES: Record<Mode, string> = {
  signUp: 'Save your progress',
  signIn: 'Welcome back',
  reset: 'Reset password',
};

const LEADS: Record<Mode, string> = {
  signUp: 'Create a free account so your habits, streaks and tree are backed up and sync across your devices.',
  signIn: 'Sign in to get your habits back on this device.',
  reset: 'Enter your account’s email and we’ll send you a link to choose a new password.',
};

export function AuthScreen({ startMode = 'signUp', hasLocalData = false, onSkip, skipLabel = 'Try without an account' }: Props) {
  const [mode, setMode] = useState<Mode>(startMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const signingUp = mode === 'signUp';
  const resetting = mode === 'reset';
  const emailOk = email.trim().length > 3 && email.includes('@');
  const canSubmit = emailOk && (resetting || password.length >= 6) && !busy;

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const submit = async () => {
    if (!supabase || !canSubmit) return;
    tapBuzz();
    setBusy(true);
    setError(null); // also cleared on each new attempt, so old messages never linger
    setNotice(null);
    const cleanEmail = email.trim().toLowerCase();

    if (resetting) {
      const { error: err } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: APP_URL });
      setBusy(false);
      if (err) {
        setError(friendlyAuthError(err.message));
        return;
      }
      // Same message whether or not the account exists, so nobody can use this to check who has an account.
      setNotice(
        'If there’s an account with that email, a reset link is on its way. Open it, choose a new password, then sign in. Check your spam folder if you don’t see it.',
      );
      return;
    }

    const creds = { email: cleanEmail, password };
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

  const buttonLabel = resetting ? 'Send reset link' : signingUp ? 'Create account' : 'Sign in';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={styles.big}>🌳</Text>
        <Text style={styles.h1}>{TITLES[mode]}</Text>
        <Text style={styles.lead}>{LEADS[mode]}</Text>

        {hasLocalData && signingUp && (
          <Text style={styles.info}>✅ The habits already on this device will be saved to your new account.</Text>
        )}
        {hasLocalData && mode === 'signIn' && (
          <Text style={styles.info}>
            ⚠️ Signing in will replace the habits on this device with the ones saved in your account.
          </Text>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setError(null); // clear old errors as soon as they start fixing things
            }}
            placeholder="you@example.com"
            placeholderTextColor={C.muted}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType={resetting ? 'send' : 'next'}
            onSubmitEditing={resetting ? submit : undefined}
          />
          {!resetting && (
            <>
              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setError(null);
                }}
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
            </>
          )}

          {error && <Text style={styles.error}>{error}</Text>}
          {notice && <Text style={styles.notice}>{notice}</Text>}

          <Pressable style={[styles.button, !canSubmit && styles.off]} disabled={!canSubmit} onPress={submit}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{buttonLabel}</Text>}
          </Pressable>

          {mode === 'signIn' && (
            <Pressable onPress={() => switchMode('reset')}>
              <Text style={styles.smallLink}>Forgot your password?</Text>
            </Pressable>
          )}
        </View>

        <Pressable onPress={() => switchMode(signingUp ? 'signIn' : resetting ? 'signIn' : 'signUp')}>
          <Text style={styles.link}>
            {signingUp ? 'Already have an account? Sign in' : resetting ? 'Back to sign in' : 'New here? Create an account'}
          </Text>
        </Pressable>

        <Pressable onPress={onSkip} style={styles.skip}>
          <Text style={styles.skipText}>{skipLabel}</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/privacy')}>
          <Text style={styles.footer}>Privacy policy</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Shown after someone opens a password-reset link: lets them choose a new password. */
export function NewPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const mismatch = again.length > 0 && again !== password;
  const canSave = password.length >= 6 && again === password && !busy;

  const save = async () => {
    if (!supabase || !canSave) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(friendlyAuthError(err.message));
      return;
    }
    doneBuzz();
    setSaved(true);
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <Text style={styles.big}>🔑</Text>
      <Text style={styles.h1}>{saved ? 'Password updated' : 'Choose a new password'}</Text>
      {saved ? (
        <>
          <Text style={styles.lead}>You’re signed in. Use your new password next time, on any device.</Text>
          <Pressable style={styles.button} onPress={onDone}>
            <Text style={styles.buttonText}>Go to my habits</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>New password</Text>
          <TextInput
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setError(null);
            }}
            placeholder="At least 6 characters"
            placeholderTextColor={C.muted}
            style={styles.input}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <Text style={styles.label}>Type it again</Text>
          <TextInput
            value={again}
            onChangeText={(t) => {
              setAgain(t);
              setError(null);
            }}
            placeholder="Same password"
            placeholderTextColor={C.muted}
            style={styles.input}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={save}
          />
          {mismatch && <Text style={styles.error}>The two passwords don’t match yet.</Text>}
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={[styles.button, !canSave && styles.off]} disabled={!canSave} onPress={save}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save new password</Text>}
          </Pressable>
        </View>
      )}
    </ScrollView>
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
  notice: { color: C.text, fontSize: 14, marginTop: 4, lineHeight: 20 },
  button: { backgroundColor: C.accent, borderRadius: R.sm, paddingVertical: 14, alignItems: 'center', marginTop: 8, minHeight: 48, justifyContent: 'center' },
  off: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { color: C.accent, textAlign: 'center', fontWeight: '600', fontSize: 15 },
  smallLink: { color: C.muted, textAlign: 'center', fontSize: 14, marginTop: 6, textDecorationLine: 'underline' },
  skip: { alignItems: 'center', paddingVertical: 10 },
  skipText: { color: C.muted, fontSize: 14, textDecorationLine: 'underline' },
  footer: { color: C.muted, fontSize: 12, textAlign: 'center', opacity: 0.8 },
});
