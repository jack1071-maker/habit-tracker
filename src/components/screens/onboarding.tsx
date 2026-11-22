import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PRESETS } from '@/lib/habits';
import { C, HEADLINE, R, tapBuzz } from '@/lib/ui';

type Props = { onFinish: (presetIndexes: number[]) => void };

const STEPS = [
  { emoji: '✅', title: 'Tap to track', text: 'Tap a habit when you do it. Counted habits, like 8 glasses of water, fill up one tap at a time.' },
  { emoji: '🔥', title: 'Build streaks', text: 'Finish every habit for the day to keep your streak alive and get a little celebration.' },
  { emoji: '🏆', title: 'Win the kickstart', text: 'Complete all your habits 3 days in a row to win your first challenge.' },
];

export function Onboarding({ onFinish }: Props) {
  const [page, setPage] = useState<'welcome' | 'pick'>('welcome');
  const [picked, setPicked] = useState<number[]>([0, 1, 2]);

  if (page === 'welcome') {
    return (
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={styles.big}>🌱</Text>
        <Text style={styles.h1}>Build better habits</Text>
        <Text style={styles.lead}>Small wins, every day. Here's how it works:</Text>
        {STEPS.map((s) => (
          <View key={s.title} style={styles.step}>
            <Text style={styles.stepEmoji}>{s.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{s.title}</Text>
              <Text style={styles.stepText}>{s.text}</Text>
            </View>
          </View>
        ))}
        <Pressable style={styles.button} onPress={() => setPage('pick')}>
          <Text style={styles.buttonText}>Get started</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const toggle = (i: number) => {
    tapBuzz();
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h1}>Pick your habits</Text>
      <Text style={styles.lead}>Start with 2 or 3. You can add your own later.</Text>
      <View style={styles.grid}>
        {PRESETS.map((p, i) => {
          const on = picked.includes(i);
          return (
            <Pressable key={p.name} onPress={() => toggle(i)} style={[styles.chip, on && styles.chipOn]}>
              <Text style={styles.chipEmoji}>{p.emoji}</Text>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{p.name}</Text>
              {p.target > 1 && <Text style={styles.chipSub}>{p.target}× a day</Text>}
            </Pressable>
          );
        })}
      </View>
      <Pressable
        style={[styles.button, picked.length === 0 && styles.buttonOff]}
        disabled={picked.length === 0}
        onPress={() => onFinish(picked)}>
        <Text style={styles.buttonText}>Start my 3-day kickstart</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 24, paddingTop: 32, gap: 14 },
  big: { fontSize: 56, textAlign: 'center' },
  h1: { fontSize: 42, lineHeight: 50, fontFamily: HEADLINE, textTransform: 'uppercase', color: C.text, textAlign: 'center' },
  lead: { fontSize: 16, color: C.muted, textAlign: 'center', marginBottom: 6 },
  step: { flexDirection: 'row', gap: 14, backgroundColor: C.card, padding: 16, borderRadius: R.md, alignItems: 'center' },
  stepEmoji: { fontSize: 28 },
  stepTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  stepText: { fontSize: 14, color: C.muted, marginTop: 2, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  chip: {
    width: '47%',
    backgroundColor: C.card,
    borderRadius: R.md,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: C.card,
  },
  chipOn: { borderColor: C.accent, backgroundColor: C.accentSoft },
  chipEmoji: { fontSize: 30 },
  chipText: { fontSize: 15, fontWeight: '600', color: C.text, marginTop: 6 },
  chipTextOn: { color: C.accent },
  chipSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  button: { backgroundColor: C.accent, borderRadius: R.md, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  buttonOff: { opacity: 0.4 },
  buttonText: { color: C.onAccent, fontSize: 17, fontWeight: '700' },
});
