import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppState, EMOJI_CHOICES } from '@/lib/habits';
import { C, HEADLINE, R, tapBuzz } from '@/lib/ui';

type Account = {
  /** False when the app was built without Supabase keys. */
  enabled: boolean;
  email: string | null;
  sync: 'idle' | 'syncing' | 'synced' | 'error';
  onSignUp: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  /** Resolves to an error message, or null if the account was deleted. */
  onDeleteAccount: () => Promise<string | null>;
};

type Props = {
  state: AppState;
  onAdd: (name: string, emoji: string, target: number) => void;
  onDelete: (id: string) => void;
  onSimulateChallenge: () => void;
  onReset: () => void;
  account: Account;
};

const SYNC_LABEL: Record<Account['sync'], string> = {
  idle: '',
  syncing: '⏳ Saving…',
  synced: '✅ Backed up',
  error: '⚠️ Not backed up yet (offline?). It will retry on your next change.',
};

function AccountCard({ account }: { account: Account }) {
  const [confirmOut, setConfirmOut] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0); // 0 = hidden, 1 = warning, 2 = deleting
  const [deleteError, setDeleteError] = useState<string | null>(null);
  if (!account.enabled) return null;

  const confirmDelete = async () => {
    setDeleteStep(2);
    setDeleteError(null);
    const err = await account.onDeleteAccount();
    if (err) {
      setDeleteError(err);
      setDeleteStep(1);
    }
    // On success the app signs out and this screen goes away.
  };

  if (!account.email) {
    return (
      <View style={[styles.card, styles.accountGuest]}>
        <Text style={styles.accountTitle}>☁️ Back up your habits</Text>
        <Text style={styles.muted}>
          Right now your habits are only saved on this device. Create a free account to keep them safe and use them on
          other devices.
        </Text>
        <Pressable style={styles.button} onPress={account.onSignUp}>
          <Text style={styles.buttonText}>Create account</Text>
        </Pressable>
        <Pressable onPress={account.onSignIn}>
          <Text style={styles.link}>I already have an account</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Account</Text>
      <Text style={styles.habitName} numberOfLines={1}>
        {account.email}
      </Text>
      {account.sync !== 'idle' && <Text style={styles.muted}>{SYNC_LABEL[account.sync]}</Text>}
      <Pressable
        style={[styles.devBtn, confirmOut && styles.deleteBtnConfirm]}
        onPress={() => {
          if (confirmOut) {
            setConfirmOut(false);
            account.onSignOut();
          } else {
            setConfirmOut(true);
          }
        }}>
        <Text style={[styles.devBtnText, confirmOut && styles.deleteTextConfirm]}>
          {confirmOut ? 'Tap again to sign out' : 'Sign out'}
        </Text>
      </Pressable>

      {deleteStep === 0 ? (
        <Pressable onPress={() => setDeleteStep(1)}>
          <Text style={styles.dangerLink}>Delete my account</Text>
        </Pressable>
      ) : (
        <View style={styles.dangerBox}>
          <Text style={styles.dangerTitle}>Delete your account?</Text>
          <Text style={styles.muted}>
            This permanently deletes your account and all your saved habits, streaks and tree from our servers. It can’t
            be undone.
          </Text>
          {deleteError && <Text style={styles.errorText}>{deleteError}</Text>}
          <Pressable
            style={[styles.devBtn, styles.deleteBtnConfirm, deleteStep === 2 && styles.buttonOff]}
            disabled={deleteStep === 2}
            onPress={confirmDelete}>
            <Text style={[styles.devBtnText, styles.deleteTextConfirm]}>
              {deleteStep === 2 ? 'Deleting…' : 'Yes, delete everything'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setDeleteStep(0);
              setDeleteError(null);
            }}>
            <Text style={styles.link}>Cancel</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export function Manage({ state, onAdd, onDelete, onSimulateChallenge, onReset, account }: Props) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0]);
  const [counted, setCounted] = useState(false);
  const [target, setTarget] = useState(3);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const canAdd = name.trim().length > 0;

  const add = () => {
    if (!canAdd) return;
    onAdd(name.trim(), emoji, counted ? target : 1);
    setName('');
    setCounted(false);
    setTarget(3);
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>Manage habits</Text>

      <AccountCard account={account} />

      <View style={styles.card}>
        <Text style={styles.label}>New habit</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Morning Run"
          placeholderTextColor={C.muted}
          style={styles.input}
          maxLength={40}
          returnKeyType="done"
          onSubmitEditing={add}
        />

        <Text style={styles.label}>Icon</Text>
        <View style={styles.emojiGrid}>
          {EMOJI_CHOICES.map((e) => (
            <Pressable
              key={e}
              onPress={() => {
                tapBuzz();
                setEmoji(e);
              }}
              style={[styles.emojiCell, emoji === e && styles.emojiCellOn]}>
              <Text style={styles.emoji}>{e}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Type</Text>
        <View style={styles.segment}>
          <Segment label="Once a day" on={!counted} onPress={() => setCounted(false)} />
          <Segment label="Several times" on={counted} onPress={() => setCounted(true)} />
        </View>

        {counted && (
          <View style={styles.stepper}>
            <Pressable style={styles.stepBtn} onPress={() => setTarget((t) => Math.max(2, t - 1))}>
              <Text style={styles.stepBtnText}>−</Text>
            </Pressable>
            <Text style={styles.stepValue}>{target}× a day</Text>
            <Pressable style={styles.stepBtn} onPress={() => setTarget((t) => Math.min(20, t + 1))}>
              <Text style={styles.stepBtnText}>+</Text>
            </Pressable>
          </View>
        )}

        <Pressable style={[styles.button, !canAdd && styles.buttonOff]} disabled={!canAdd} onPress={add}>
          <Text style={styles.buttonText}>Add habit</Text>
        </Pressable>
      </View>

      <Text style={styles.h2}>Your habits</Text>
      {state.habits.map((h) => (
        <View key={h.id} style={[styles.card, styles.habitRow]}>
          <Text style={styles.emoji}>{h.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.habitName}>{h.name}</Text>
            <Text style={styles.habitMeta}>{h.target > 1 ? `${h.target}× a day` : 'Once a day'}</Text>
          </View>
          <Pressable
            onPress={() => {
              if (confirmId === h.id) {
                onDelete(h.id);
                setConfirmId(null);
              } else {
                setConfirmId(h.id);
              }
            }}
            style={[styles.deleteBtn, confirmId === h.id && styles.deleteBtnConfirm]}>
            <Text style={[styles.deleteText, confirmId === h.id && styles.deleteTextConfirm]}>
              {confirmId === h.id ? 'Tap to confirm' : 'Delete'}
            </Text>
          </Pressable>
        </View>
      ))}
      {state.habits.length === 0 && <Text style={styles.muted}>No habits yet. Add one above.</Text>}

      <Text style={styles.h2}>Developer tools</Text>
      <View style={styles.card}>
        <Text style={styles.muted}>For testing. These skip ahead so you can see features without waiting days.</Text>
        <Pressable style={styles.devBtn} onPress={onSimulateChallenge}>
          <Text style={styles.devBtnText}>Simulate winning the 3-day challenge</Text>
        </Pressable>
        <Pressable
          style={[styles.devBtn, confirmReset && styles.deleteBtnConfirm]}
          onPress={() => {
            if (confirmReset) {
              setConfirmReset(false);
              onReset();
            } else {
              setConfirmReset(true);
            }
          }}>
          <Text style={[styles.devBtnText, confirmReset && styles.deleteTextConfirm]}>
            {confirmReset ? 'Tap again to erase everything' : 'Reset app and start over'}
          </Text>
        </Pressable>
      </View>

      <Pressable onPress={() => router.push('/privacy')}>
        <Text style={styles.footerLink}>Privacy policy</Text>
      </Pressable>
    </ScrollView>
  );
}

function Segment({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segmentItem, on && styles.segmentOn]}>
      <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 12, paddingBottom: 40 },
  h1: { fontSize: 38, lineHeight: 46, fontFamily: HEADLINE, textTransform: 'uppercase', color: C.text },
  h2: { fontSize: 20, fontFamily: HEADLINE, textTransform: 'uppercase', letterSpacing: 0.5, color: C.text, marginTop: 8 },
  card: { backgroundColor: C.card, borderRadius: R.md, padding: 16, gap: 10 },
  label: { fontSize: 13, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
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
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiCell: {
    width: 46,
    height: 46,
    borderRadius: R.sm,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.bg,
  },
  emojiCellOn: { borderColor: C.accent, backgroundColor: C.accentSoft },
  emoji: { fontSize: 24, lineHeight: 32 },
  segment: { flexDirection: 'row', backgroundColor: C.bg, borderRadius: R.sm, padding: 4 },
  segmentItem: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  segmentOn: { backgroundColor: C.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 1 },
  segmentText: { fontSize: 14, fontWeight: '600', color: C.muted },
  segmentTextOn: { color: C.text },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 22, fontWeight: '700', color: C.accent },
  stepValue: { fontSize: 17, fontWeight: '700', color: C.text, minWidth: 90, textAlign: 'center' },
  button: { backgroundColor: C.accent, borderRadius: R.sm, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  buttonOff: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  habitName: { fontSize: 16, fontWeight: '700', color: C.text },
  habitMeta: { fontSize: 13, color: C.muted },
  deleteBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: R.sm, backgroundColor: C.bg },
  deleteBtnConfirm: { backgroundColor: '#C0392B' },
  deleteText: { color: C.muted, fontWeight: '600', fontSize: 13 },
  deleteTextConfirm: { color: '#fff' },
  muted: { color: C.muted, fontSize: 14 },
  devBtn: { borderWidth: 1, borderColor: C.line, borderRadius: R.sm, paddingVertical: 12, alignItems: 'center' },
  devBtnText: { color: C.text, fontWeight: '600' },
  accountGuest: { borderWidth: 1, borderColor: C.accent },
  accountTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  link: { color: C.accent, textAlign: 'center', fontWeight: '600', paddingVertical: 4 },
  dangerLink: { color: '#FF8A8A', textAlign: 'center', fontSize: 14, paddingVertical: 4 },
  dangerBox: { borderWidth: 1, borderColor: '#C0392B', borderRadius: R.sm, padding: 12, gap: 8 },
  dangerTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  errorText: { color: '#FF8A8A', fontSize: 14 },
  footerLink: { color: C.muted, textAlign: 'center', fontSize: 13, textDecorationLine: 'underline', paddingVertical: 6 },
});
