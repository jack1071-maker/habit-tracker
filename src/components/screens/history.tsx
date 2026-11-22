import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AppState,
  bestStreak,
  consistency,
  currentStreak,
  dayKey,
  isHabitDone,
  keyToDate,
  lastNDays,
  weekConsistency,
} from '@/lib/habits';
import { C, HEADLINE, R } from '@/lib/ui';

export function History({ state }: { state: AppState }) {
  const today = dayKey();
  const week = lastNDays(7, today);
  const { habits, log } = state;

  const topStreak = Math.max(0, ...habits.map((h) => currentStreak(log, h, today)));
  const topBest = Math.max(0, ...habits.map((h) => bestStreak(log, h, today)));
  const avgWeek = habits.length
    ? Math.round(habits.reduce((sum, h) => sum + weekConsistency(log, h, today), 0) / habits.length)
    : 0;

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h1}>Your progress</Text>

      <View style={styles.stats}>
        <Stat emoji="🔥" value={String(topStreak)} label="Current streak" />
        <Stat emoji="🏅" value={String(topBest)} label="Best streak" />
        <Stat emoji="📈" value={`${avgWeek}%`} label="Last 7 days" />
      </View>

      <Text style={styles.h2}>Last 7 days</Text>
      <View style={styles.card}>
        <View style={styles.weekHeader}>
          <View style={styles.nameCol} />
          {week.map((d) => (
            <Text key={d} style={[styles.dayLabel, d === today && styles.todayLabel]}>
              {keyToDate(d).toLocaleDateString(undefined, { weekday: 'narrow' })}
            </Text>
          ))}
        </View>
        {habits.map((h) => (
          <View key={h.id} style={styles.weekRow}>
            <Text style={styles.nameCol} numberOfLines={1}>
              {h.emoji} {h.name}
            </Text>
            {week.map((d) => {
              const before = d < h.createdOn;
              const done = isHabitDone(log, d, h);
              return <View key={d} style={[styles.cell, done && styles.cellDone, before && styles.cellBefore]} />;
            })}
          </View>
        ))}
        {habits.length === 0 && <Text style={styles.empty}>No habits yet.</Text>}
      </View>

      <Text style={styles.h2}>Consistency</Text>
      <Text style={styles.sub}>How often you did each habit over the last 30 days</Text>
      {habits.map((h) => {
        const c = consistency(log, h, 30, today);
        return (
          <View key={h.id} style={styles.card}>
            <View style={styles.habitCard}>
              <Text style={styles.habitEmoji}>{h.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.habitName} numberOfLines={1}>
                  {h.name}
                </Text>
                <Text style={styles.habitMeta}>
                  {c.doneDays} of {c.totalDays} {c.totalDays === 1 ? 'day' : 'days'} · 🔥 {currentStreak(log, h, today)}
                </Text>
              </View>
              <Text style={styles.percent}>{c.percent}%</Text>
            </View>
            <View style={styles.consTrack}>
              <View style={[styles.consFill, { width: `${c.percent}%` }]} />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function Stat({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 12, paddingBottom: 40 },
  h1: { fontSize: 38, lineHeight: 46, fontFamily: HEADLINE, textTransform: 'uppercase', color: C.text },
  h2: { fontSize: 20, fontFamily: HEADLINE, textTransform: 'uppercase', letterSpacing: 0.5, color: C.text, marginTop: 8 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: C.card, borderRadius: R.md, paddingVertical: 16, alignItems: 'center', gap: 4 },
  statEmoji: { fontSize: 22, lineHeight: 28 },
  statValue: { fontSize: 30, lineHeight: 38, fontFamily: HEADLINE, color: C.text },
  statLabel: { fontSize: 12, color: C.muted, textAlign: 'center' },
  card: { backgroundColor: C.card, borderRadius: R.md, padding: 14, gap: 10 },
  weekHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameCol: { flex: 1, fontSize: 14, color: C.text, fontWeight: '600' },
  dayLabel: { width: 22, textAlign: 'center', fontSize: 12, color: C.muted, fontWeight: '600' },
  todayLabel: { color: C.accent },
  cell: { width: 22, height: 22, borderRadius: 6, backgroundColor: C.empty },
  cellDone: { backgroundColor: C.green },
  cellBefore: { opacity: 0.35 },
  empty: { color: C.muted },
  habitCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  habitEmoji: { fontSize: 28, lineHeight: 36 },
  habitName: { fontSize: 16, fontWeight: '700', color: C.text },
  habitMeta: { fontSize: 13, color: C.muted, marginTop: 2 },
  sub: { fontSize: 13, color: C.muted, marginTop: -6 },
  percent: { fontSize: 28, lineHeight: 36, fontFamily: HEADLINE, color: C.text },
  consTrack: { height: 12, backgroundColor: C.empty, borderRadius: 6, overflow: 'hidden' },
  consFill: { height: '100%', backgroundColor: C.accent, borderRadius: 6 },
});
