import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState as RNAppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Celebration } from '@/components/celebration';
import { AuthScreen } from '@/components/screens/auth';
import { History } from '@/components/screens/history';
import { Manage } from '@/components/screens/manage';
import { Onboarding } from '@/components/screens/onboarding';
import { Today } from '@/components/screens/today';
import { TreeScreen } from '@/components/screens/tree';
import {
  AppState,
  CHALLENGE_DAYS,
  EMPTY_STATE,
  Habit,
  PRESETS,
  addDays,
  challengeStatus,
  countFor,
  dayKey,
  isDayComplete,
  loadState,
  newId,
  saveState,
} from '@/lib/habits';
import { fetchCloud, getSyncedAt, pushCloud, setSyncedAt } from '@/lib/cloud';
import { cloudEnabled, supabase } from '@/lib/supabase';
import { C, doneBuzz, tapBuzz } from '@/lib/ui';
import { useAccount } from '@/lib/use-account';

type Tab = 'today' | 'tree' | 'history' | 'manage';
type Party = { title: string; subtitle: string } | null;
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

/** How long to wait after the last change before uploading, so rapid taps become one upload. */
const PUSH_DELAY_MS = 1500;

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [tab, setTab] = useState<Tab>('today');
  const [party, setParty] = useState<Party>(null);
  const { user, ready: authReady } = useAccount();
  const [sync, setSync] = useState<SyncStatus>('idle');
  /** Sign-in/sign-up screen opened from the Manage tab. */
  const [authView, setAuthView] = useState<null | 'signUp' | 'signIn'>(null);

  // Refs let the async sync code always see the latest values.
  const stateRef = useRef<AppState | null>(null);
  stateRef.current = state;
  const syncedUserId = useRef<string | null>(null);
  const skipNextPush = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved data once when the app opens.
  useEffect(() => {
    loadState().then(setState);
  }, []);

  // Save on this device every time something changes.
  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  /** Replace this device's habits with the online copy (without uploading it straight back). */
  const applyCloud = (cloudState: AppState) => {
    skipNextPush.current = true;
    setState({ ...cloudState, guest: false });
  };

  // When someone signs in (or the app opens already signed in), sync with their account.
  useEffect(() => {
    if (!user || !state) {
      if (!user) syncedUserId.current = null;
      return;
    }
    if (syncedUserId.current === user.id) return;
    syncedUserId.current = user.id;
    setAuthView(null);
    (async () => {
      setSync('syncing');
      try {
        const cloud = await fetchCloud(user.id);
        if (cloud) {
          // This account already has habits saved online: use those.
          applyCloud(cloud.state);
          await setSyncedAt(cloud.updatedAt);
        } else {
          // Brand-new account: save whatever is on this device (e.g. guest habits) to it.
          const local = { ...(stateRef.current ?? EMPTY_STATE), guest: false };
          const savedAt = await pushCloud(user.id, local);
          await setSyncedAt(savedAt);
          skipNextPush.current = true;
          setState(local);
        }
        setSync('synced');
      } catch {
        setSync('error');
      }
    })();
    // Runs when the signed-in user changes (state is read through stateRef).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, state === null]);

  // Upload changes a moment after they happen, while signed in.
  useEffect(() => {
    if (!user || !state || syncedUserId.current !== user.id) return;
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      pushTimer.current = null;
      setSync('syncing');
      try {
        const savedAt = await pushCloud(user.id, stateRef.current ?? state);
        await setSyncedAt(savedAt);
        setSync('synced');
      } catch {
        setSync('error'); // Kept on this device; it'll upload with the next change.
      }
    }, PUSH_DELAY_MS);
  }, [state, user]);

  // When the app comes back to the screen, grab any newer changes made on another device.
  useEffect(() => {
    if (!user) return;
    const sub = RNAppState.addEventListener('change', async (s) => {
      if (s !== 'active' || pushTimer.current) return; // don't overwrite changes still uploading
      try {
        const [cloud, syncedAt] = await Promise.all([fetchCloud(user.id), getSyncedAt()]);
        if (cloud && (!syncedAt || cloud.updatedAt > syncedAt)) {
          applyCloud(cloud.state);
          await setSyncedAt(cloud.updatedAt);
          setSync('synced');
        }
      } catch {
        // Offline: keep using this device's copy.
      }
    });
    return () => sub.remove();
  }, [user]);

  const endParty = useCallback(() => setParty(null), []);

  if (!state || !authReady) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  const today = dayKey();

  /** Apply a change, then celebrate if it finished the day or the challenge. */
  const update = (next: AppState) => {
    const wasDayDone = isDayComplete(state, today);
    const wasWon = challengeStatus(state).kind === 'won';
    setState(next);
    if (!wasWon && challengeStatus(next).kind === 'won') {
      doneBuzz();
      setParty({ title: '🏆 Kickstart complete!', subtitle: '3 days in a row. You did it.' });
    } else if (!wasDayDone && isDayComplete(next, today)) {
      doneBuzz();
      setParty({ title: 'All done for today! 🎉', subtitle: 'See you tomorrow to keep the streak going.' });
    }
  };

  const setCount = (habit: Habit, count: number) => {
    const day = { ...(state.log[today] ?? {}), [habit.id]: count };
    return { ...state, log: { ...state.log, [today]: day } };
  };

  const onTap = (habit: Habit) => {
    const count = countFor(state.log, today, habit.id);
    if (habit.target === 1) {
      // Daily habits toggle on and off.
      tapBuzz();
      update(setCount(habit, count >= 1 ? 0 : 1));
      return;
    }
    if (count >= habit.target) return;
    if (count + 1 >= habit.target) doneBuzz();
    else tapBuzz();
    update(setCount(habit, count + 1));
  };

  const onUndo = (habit: Habit) => {
    const count = countFor(state.log, today, habit.id);
    if (count === 0) return;
    tapBuzz();
    setState(setCount(habit, count - 1));
  };

  const finishOnboarding = (indexes: number[]) => {
    const habits = indexes.map((i) => ({ ...PRESETS[i], id: newId(), createdOn: today }));
    setState({ ...state, onboarded: true, habits, challengeStart: today });
  };

  const addHabit = (name: string, emoji: string, target: number) => {
    tapBuzz();
    setState({ ...state, habits: [...state.habits, { id: newId(), name, emoji, target, createdOn: today }] });
  };

  const deleteHabit = (id: string) => {
    setState({ ...state, habits: state.habits.filter((h) => h.id !== id) });
  };

  const restartChallenge = () => {
    tapBuzz();
    setState({ ...state, challengeStart: today });
  };

  // Dev tool: pretend every habit was finished on each of the last 3 days.
  const simulateChallenge = () => {
    const start = addDays(today, -(CHALLENGE_DAYS - 1));
    const habits = state.habits.map((h) => ({ ...h, createdOn: h.createdOn < start ? h.createdOn : start }));
    const log = { ...state.log };
    for (let i = 0; i < CHALLENGE_DAYS; i++) {
      const d = addDays(start, i);
      log[d] = { ...(log[d] ?? {}) };
      habits.forEach((h) => (log[d][h.id] = h.target));
    }
    setTab('today');
    update({ ...state, habits, log, challengeStart: start });
  };

  const reset = () => {
    setTab('today');
    // Keep someone who chose guest mode as a guest; signed-in users stay signed in.
    setState({ ...EMPTY_STATE, guest: state.guest });
  };

  const signOut = async () => {
    if (!supabase || !user) return;
    // Upload anything not saved yet, then clear this device so the next person starts fresh.
    if (pushTimer.current) {
      clearTimeout(pushTimer.current);
      pushTimer.current = null;
      try {
        await pushCloud(user.id, state);
      } catch {
        // Couldn't reach the server; the last successful upload is still saved online.
      }
    }
    await supabase.auth.signOut();
    await setSyncedAt(null);
    skipNextPush.current = true;
    setSync('idle');
    setTab('today');
    setState(EMPTY_STATE);
  };

  // Sign-in / sign-up opened from the Manage tab.
  if (authView && cloudEnabled) {
    return (
      <SafeAreaView style={styles.screen}>
        <AuthScreen
          startMode={authView}
          hasLocalData={state.onboarded}
          onSkip={() => setAuthView(null)}
          skipLabel="Back"
        />
      </SafeAreaView>
    );
  }

  // First visit: offer an account, or let them try it as a guest.
  if (cloudEnabled && !user && !state.guest && !state.onboarded) {
    return (
      <SafeAreaView style={styles.screen}>
        <AuthScreen onSkip={() => setState({ ...state, guest: true })} />
      </SafeAreaView>
    );
  }

  // Signed in, but the account is still loading from the server.
  if (user && syncedUserId.current === user.id && sync === 'syncing' && !state.onboarded) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  if (!state.onboarded) {
    return (
      <SafeAreaView style={styles.screen}>
        <Onboarding onFinish={finishOnboarding} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.body}>
        {tab === 'today' && (
          <Today
            state={state}
            onTap={onTap}
            onUndo={onUndo}
            onRestartChallenge={restartChallenge}
          />
        )}
        {tab === 'tree' && (
          <TreeScreen
            state={state}
            onSeen={(streak) => setState((s) => (s ? { ...s, tree: { seenStreak: streak, seenOn: dayKey() } } : s))}
          />
        )}
        {tab === 'history' && <History state={state} />}
        {tab === 'manage' && (
          <Manage
            state={state}
            onAdd={addHabit}
            onDelete={deleteHabit}
            onSimulateChallenge={simulateChallenge}
            onReset={reset}
            account={{
              enabled: cloudEnabled,
              email: user?.email ?? null,
              sync,
              onSignUp: () => setAuthView('signUp'),
              onSignIn: () => setAuthView('signIn'),
              onSignOut: signOut,
            }}
          />
        )}
      </View>

      <View style={styles.tabBar}>
        <TabButton label="Today" icon="✅" on={tab === 'today'} onPress={() => setTab('today')} />
        <TabButton label="Your Tree" icon="🌳" on={tab === 'tree'} onPress={() => setTab('tree')} />
        <TabButton label="History" icon="📊" on={tab === 'history'} onPress={() => setTab('history')} />
        <TabButton label="Manage" icon="⚙️" on={tab === 'manage'} onPress={() => setTab('manage')} />
      </View>

      {party && <Celebration title={party.title} subtitle={party.subtitle} onDone={endParty} />}
    </SafeAreaView>
  );
}

function TabButton({ label, icon, on, onPress }: { label: string; icon: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        tapBuzz();
        onPress();
      }}
      style={styles.tab}>
      <Text style={[styles.tabIcon, !on && styles.tabIconOff]}>{icon}</Text>
      <Text style={[styles.tabLabel, on && styles.tabLabelOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // On a phone this fills the screen. On a computer it stays phone-width and centered.
  screen: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: C.card,
    paddingTop: 8,
    paddingBottom: 6,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon: { fontSize: 22, lineHeight: 28 },
  tabIconOff: { opacity: 0.45 },
  tabLabel: { fontSize: 12, fontWeight: '600', color: C.muted },
  tabLabelOn: { color: C.accent },
});
