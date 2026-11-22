import { useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AppState,
  CHALLENGE_DAYS,
  Habit,
  challengeStatus,
  countFor,
  currentStreak,
  dayKey,
  isHabitDone,
} from '@/lib/habits';
import { C, HEADLINE, R } from '@/lib/ui';

type Props = {
  state: AppState;
  onTap: (habit: Habit) => void;
  onUndo: (habit: Habit) => void;
  onRestartChallenge: () => void;
};

export function Today({ state, onTap, onUndo, onRestartChallenge }: Props) {
  const today = dayKey();
  const doneCount = state.habits.filter((h) => isHabitDone(state.log, today, h)).length;
  const total = state.habits.length;
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.date}>{dateLabel}</Text>
      <Text style={styles.h1}>
        {total === 0 ? 'No habits yet' : doneCount === total ? 'All done today! 🎉' : `${doneCount} of ${total} done`}
      </Text>

      <ProgressBar value={total === 0 ? 0 : doneCount / total} />

      <ChallengeCard state={state} onRestart={onRestartChallenge} />

      {state.habits.map((h) => (
        <HabitRow
          key={h.id}
          habit={h}
          count={countFor(state.log, today, h.id)}
          streak={currentStreak(state.log, h, today)}
          onTap={() => onTap(h)}
          onUndo={() => onUndo(h)}
        />
      ))}

      {total === 0 ? (
        <Text style={styles.hint}>Add a habit on the Manage tab.</Text>
      ) : (
        <Text style={styles.hint}>Tap to add one · Press and hold to remove one</Text>
      )}
    </ScrollView>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${Math.round(value * 100)}%` }]} />
    </View>
  );
}

function ChallengeCard({ state, onRestart }: { state: AppState; onRestart: () => void }) {
  const status = challengeStatus(state);
  if (status.kind === 'none') return null;

  if (status.kind === 'won') {
    return (
      <View style={[styles.challenge, styles.challengeWon]}>
        <Text style={styles.challengeTitle}>🏆 3-day kickstart complete!</Text>
        <Text style={styles.challengeText}>You showed up three days straight. Keep the streak going.</Text>
      </View>
    );
  }

  if (status.kind === 'missed') {
    return (
      <View style={styles.challenge}>
        <Text style={styles.challengeTitle}>3-day kickstart</Text>
        <Text style={styles.challengeText}>You missed a day. No problem, everyone does. Want to try again?</Text>
        <Pressable style={styles.smallButton} onPress={onRestart}>
          <Text style={styles.smallButtonText}>Restart challenge</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.challenge}>
      <Text style={styles.challengeTitle}>3-day kickstart · Day {status.dayNumber} of {CHALLENGE_DAYS}</Text>
      <View style={styles.dots}>
        {status.done.map((d, i) => (
          <View key={i} style={[styles.dot, d && styles.dotDone]}>
            <Text style={[styles.dotText, d && styles.dotTextDone]}>{d ? '✓' : i + 1}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.challengeText}>Finish every habit each day to win.</Text>
    </View>
  );
}

function HabitRow({
  habit,
  count,
  streak,
  onTap,
  onUndo,
}: {
  habit: Habit;
  count: number;
  streak: number;
  onTap: () => void;
  onUndo: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const done = count >= habit.target;
  const counted = habit.target > 1;

  const bounce = (to: number) => {
    scale.setValue(to);
    Animated.spring(scale, { toValue: 1, friction: 3, tension: 180, useNativeDriver: true }).start();
  };

  // Tap adds one.
  const press = () => {
    bounce(0.94);
    onTap();
  };

  // Press and hold removes one (e.g. 8 → 7).
  const hold = () => {
    if (count === 0) return;
    bounce(1.05);
    onUndo();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={press} onLongPress={hold} delayLongPress={400} style={[styles.row, done && styles.rowDone]}>
        <Text style={styles.rowEmoji}>{habit.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowName} numberOfLines={1}>
            {habit.name}
          </Text>
          <Text style={styles.rowMeta}>
            {counted ? `${Math.min(count, habit.target)} / ${habit.target} today` : done ? 'Done today' : 'Tap when done'}
            {streak > 0 ? `  ·  🔥 ${streak}` : ''}
          </Text>
          {counted && (
            <View style={styles.miniTrack}>
              <View style={[styles.miniFill, { width: `${Math.min(100, (count / habit.target) * 100)}%` }]} />
            </View>
          )}
        </View>
        <View style={[styles.check, done && styles.checkDone]}>
          <Text style={[styles.checkText, done && styles.checkTextDone]}>{done ? '✓' : counted ? '+' : ''}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 12, paddingBottom: 40 },
  date: { fontSize: 14, color: C.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  h1: { fontSize: 38, lineHeight: 46, fontFamily: HEADLINE, textTransform: 'uppercase', color: C.text },
  barTrack: { height: 10, backgroundColor: C.empty, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: C.green, borderRadius: 5 },
  challenge: { backgroundColor: C.accentSoft, borderRadius: R.md, padding: 16, gap: 8 },
  challengeWon: { backgroundColor: C.greenSoft },
  challengeTitle: { fontSize: 18, fontFamily: HEADLINE, textTransform: 'uppercase', letterSpacing: 0.5, color: C.text },
  challengeText: { fontSize: 14, color: C.muted },
  dots: { flexDirection: 'row', gap: 10 },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: C.accent },
  dotText: { fontWeight: '700', color: C.muted },
  dotTextDone: { color: '#fff' },
  smallButton: { alignSelf: 'flex-start', backgroundColor: C.accent, borderRadius: R.sm, paddingVertical: 8, paddingHorizontal: 14 },
  smallButtonText: { color: '#fff', fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.card,
    borderRadius: R.md,
    padding: 16,
  },
  rowDone: { backgroundColor: C.cardDone },
  rowEmoji: { fontSize: 30, lineHeight: 38 },
  rowName: { fontSize: 17, fontWeight: '700', color: C.text },
  rowMeta: { fontSize: 13, color: C.muted, marginTop: 2 },
  miniTrack: { height: 6, backgroundColor: C.empty, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  miniFill: { height: '100%', backgroundColor: C.green },
  check: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: C.green, borderColor: C.green },
  checkText: { fontSize: 20, fontWeight: '700', color: C.muted },
  checkTextDone: { color: '#fff' },
  hint: { textAlign: 'center', color: C.muted, fontSize: 13, marginTop: 8 },
});
