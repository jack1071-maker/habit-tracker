import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Axe, Lumberjack, Stump, TREE_BOX, TreeArt } from '@/components/tree-art';
import { AppState, TREE_STAGES, dayKey, overallStreak, stageFor } from '@/lib/habits';
import { C, HEADLINE, R, doneBuzz, tapBuzz } from '@/lib/ui';

type Props = {
  state: AppState;
  /** Tell the app which streak this page has now shown. */
  onSeen: (streak: number) => void;
};

type Plan = { kind: 'grow'; from: number; to: number; days: number } | { kind: 'chop'; from: number } | { kind: 'none' };

const SCENE_HEIGHT = 330;
const GROUND = 34; // height of the grass strip at the bottom of the scene
const LUMBERJACK_OFFSCREEN = 320;

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const run = (anim: Animated.CompositeAnimation) => new Promise<void>((r) => anim.start(() => r()));

export function TreeScreen({ state, onSeen }: Props) {
  const today = dayKey();
  const streak = overallStreak(state, today);
  const stage = stageFor(streak);

  // Work out once, when the page opens, whether the tree should grow or get chopped.
  const [plan] = useState<Plan>(() => {
    const seen = state.tree.seenStreak;
    if (streak > seen) return { kind: 'grow', from: stageFor(seen), to: stage, days: streak - seen };
    if (streak === 0 && seen > 0 && state.tree.seenOn < today) return { kind: 'chop', from: stageFor(seen) };
    return { kind: 'none' };
  });

  const [shown, setShown] = useState({ stage: plan.kind === 'none' ? stage : plan.from, stump: false });
  const [message, setMessage] = useState<string | null>(null);
  const [lumberjackOn, setLumberjackOn] = useState(false);
  const [stumpUnder, setStumpUnder] = useState(false);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);

  const scale = useRef(new Animated.Value(1)).current;
  const sparkle = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const fall = useRef(new Animated.Value(0)).current;
  const ljX = useRef(new Animated.Value(LUMBERJACK_OFFSCREEN)).current;
  const axe = useRef(new Animated.Value(0)).current;
  const chopPop = useRef(new Animated.Value(0)).current;

  const pop = (from: number) => {
    scale.setValue(from);
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }).start();
  };

  const grow = async (from: number, to: number, days: number) => {
    setBusy(true);
    setShown({ stage: from, stump: false });
    setMessage(null);
    await wait(600);
    if (!alive.current) return;
    setShown({ stage: to, stump: false });
    pop(from === to ? 0.88 : 0.55);
    sparkle.setValue(0);
    Animated.timing(sparkle, { toValue: 1, duration: 1400, useNativeDriver: true }).start();
    doneBuzz();
    setMessage(
      from === to
        ? `🔥 +${days} ${days === 1 ? 'day' : 'days'}! Keep going to grow your tree.`
        : `🌳 Your tree grew into a ${TREE_STAGES[to].name}!`,
    );
    await wait(1400);
    setBusy(false);
  };

  const chop = async (from: number) => {
    setBusy(true);
    setShown({ stage: from, stump: false });
    setStumpUnder(false);
    fall.setValue(0);
    axe.setValue(0);
    ljX.setValue(LUMBERJACK_OFFSCREEN);
    setLumberjackOn(true);
    setMessage('😬 Uh oh… you missed a day.');

    // Lumberjack walks in.
    await run(Animated.timing(ljX, { toValue: 0, duration: 1000, easing: Easing.out(Easing.quad), useNativeDriver: true }));

    // Three chops.
    for (let i = 0; i < 3; i++) {
      if (!alive.current) return;
      await run(Animated.timing(axe, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }));
      await run(Animated.timing(axe, { toValue: 2, duration: 110, easing: Easing.in(Easing.quad), useNativeDriver: true }));
      tapBuzz();
      chopPop.setValue(0);
      Animated.timing(chopPop, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      await run(
        Animated.sequence([
          Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
          Animated.timing(shake, { toValue: -1, duration: 50, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]),
      );
    }

    // Timber! The tree tips over and the stump is left behind.
    setStumpUnder(true);
    Animated.timing(axe, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    doneBuzz();
    setMessage('🪓 TIMBER!');
    await run(Animated.timing(fall, { toValue: 1, duration: 1100, easing: Easing.in(Easing.quad), useNativeDriver: true }));
    if (!alive.current) return;
    setShown({ stage: 0, stump: true });
    setStumpUnder(false);
    fall.setValue(0);

    // Lumberjack walks off.
    await run(Animated.timing(ljX, { toValue: LUMBERJACK_OFFSCREEN, duration: 1000, easing: Easing.in(Easing.quad), useNativeDriver: true }));
    if (!alive.current) return;
    setLumberjackOn(false);
    setMessage('Your streak ended and the tree was chopped down. Finish all your habits today to plant a new one 🌱');
    await wait(1600);
    if (!alive.current) return;
    setShown({ stage: 0, stump: false });
    pop(0.4);
    setBusy(false);
  };

  // Play whatever the plan says when the page opens, then remember this streak.
  useEffect(() => {
    alive.current = true;
    if (plan.kind === 'grow') grow(plan.from, plan.to, plan.days);
    if (plan.kind === 'chop') chop(plan.from);
    onSeen(streak);
    return () => {
      alive.current = false;
    };
    // Runs once when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Developer previews: play an animation, then go back to the real tree.
  const previewGrow = async () => {
    const from = Math.min(stage, TREE_STAGES.length - 2);
    await grow(from, from + 1, 1);
    await wait(1500);
    if (alive.current) setShown({ stage, stump: false });
  };
  const previewChop = async () => {
    await chop(Math.max(stage, 4));
    await wait(1200);
    if (alive.current) setShown({ stage, stump: false });
  };

  const next = TREE_STAGES[stage + 1];
  const daysToNext = next ? next.min - streak : 0;
  const progress = next ? (streak - TREE_STAGES[stage].min) / (next.min - TREE_STAGES[stage].min) : 1;

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h1}>Your tree</Text>

      <View style={styles.scene}>
        {/* Night sky with a moon and stars */}
        <View style={styles.moon} />
        {STARS.map(([x, y, s], i) => (
          <View key={i} style={[styles.star, { left: `${x}%`, top: y, width: s, height: s, borderRadius: s }]} />
        ))}
        <View style={styles.hill} />
        <View style={styles.ground} />

        {/* The tree box sits centered with its base on the grass */}
        <View style={styles.treeHolder} pointerEvents="none">
          <View style={styles.treeBox}>
            {stumpUnder && (
              <View style={StyleSheet.absoluteFill}>
                <Stump />
              </View>
            )}
            <Animated.View
              style={{
                transformOrigin: '100px 250px',
                opacity: fall.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
                transform: [
                  { translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-5, 5] }) },
                  { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-88deg'] }) },
                  { scale },
                ],
              }}>
              {shown.stump ? <Stump /> : <TreeArt stage={shown.stage} />}
            </Animated.View>

            {/* Sparkles when the tree grows */}
            {SPARKLES.map(([x, y, d], i) => (
              <Animated.Text
                key={i}
                style={[
                  styles.sparkle,
                  {
                    left: x,
                    top: y,
                    opacity: sparkle.interpolate({ inputRange: [0, 0.2 + d, 1], outputRange: [0, 1, 0] }),
                    transform: [{ translateY: sparkle.interpolate({ inputRange: [0, 1], outputRange: [10, -50] }) }],
                  },
                ]}>
                ✨
              </Animated.Text>
            ))}

            {/* The lumberjack, standing just right of the trunk */}
            {lumberjackOn && (
              <Animated.View style={[styles.lumberjack, { transform: [{ translateX: ljX }] }]}>
                <Lumberjack />
                <Animated.View
                  style={[
                    styles.axe,
                    {
                      transformOrigin: '30px 60px',
                      transform: [{ rotate: axe.interpolate({ inputRange: [0, 1, 2], outputRange: ['-15deg', '35deg', '-80deg'] }) }],
                    },
                  ]}>
                  <Axe />
                </Animated.View>
                <Animated.Text
                  style={[
                    styles.chopText,
                    {
                      opacity: chopPop.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
                      transform: [{ scale: chopPop.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.5, 1.2, 1] }) }],
                    },
                  ]}>
                  CHOP!
                </Animated.Text>
              </Animated.View>
            )}
          </View>
        </View>
      </View>

      {message && <Text style={styles.message}>{message}</Text>}

      <View style={styles.card}>
        <Text style={styles.stageName}>{TREE_STAGES[stage].name}</Text>
        <Text style={styles.streak}>
          🔥 {streak}-day streak
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={styles.muted}>
          {next ? `${daysToNext} more ${daysToNext === 1 ? 'day' : 'days'} to grow into a ${next.name}` : 'Fully grown. Legendary!'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>How it works</Text>
        <Text style={styles.muted}>
          Finish every habit in a day to grow your streak. Your tree grows as your streak gets longer, all the way to a
          Mighty Oak at 30 days. Miss a day and the lumberjack comes for it 🪓
        </Text>
      </View>

      <Text style={styles.h2}>Developer tools</Text>
      <View style={styles.card}>
        <Text style={styles.muted}>Preview the animations. These don't change your streak.</Text>
        <Pressable style={[styles.devBtn, busy && styles.off]} disabled={busy} onPress={previewGrow}>
          <Text style={styles.devText}>Preview tree growing</Text>
        </Pressable>
        <Pressable style={[styles.devBtn, busy && styles.off]} disabled={busy} onPress={previewChop}>
          <Text style={styles.devText}>Preview lumberjack chop</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// [x%, y, size] for stars in the sky
const STARS: [number, number, number][] = [
  [8, 22, 3], [18, 60, 2], [30, 18, 2], [42, 44, 3], [56, 14, 2], [64, 70, 2], [78, 30, 3], [90, 58, 2], [12, 110, 2], [86, 120, 2],
];
// [x, y, delay] for sparkles, positioned inside the 200x260 tree box
const SPARKLES: [number, number, number][] = [
  [30, 120, 0], [150, 100, 0.1], [90, 60, 0.05], [50, 180, 0.15], [140, 170, 0.2], [100, 140, 0.1],
];

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 12, paddingBottom: 40 },
  h1: { fontSize: 38, lineHeight: 46, fontFamily: HEADLINE, textTransform: 'uppercase', color: C.text },
  h2: { fontSize: 20, fontFamily: HEADLINE, textTransform: 'uppercase', letterSpacing: 0.5, color: C.text },
  scene: {
    height: SCENE_HEIGHT,
    borderRadius: R.lg,
    overflow: 'hidden',
    backgroundColor: '#2C2260',
  },
  moon: { position: 'absolute', right: 26, top: 22, width: 34, height: 34, borderRadius: 17, backgroundColor: '#F4EBC9' },
  star: { position: 'absolute', backgroundColor: '#E8E2FF', opacity: 0.8 },
  hill: {
    position: 'absolute',
    left: -60,
    right: -60,
    bottom: GROUND - 30,
    height: 90,
    borderTopLeftRadius: 400,
    borderTopRightRadius: 400,
    backgroundColor: '#3A2F73',
  },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0, height: GROUND, backgroundColor: '#2F6B4F' },
  treeHolder: { position: 'absolute', left: 0, right: 0, bottom: GROUND - 14, alignItems: 'center' },
  treeBox: { width: TREE_BOX.width, height: TREE_BOX.height },
  sparkle: { position: 'absolute', fontSize: 20 },
  lumberjack: { position: 'absolute', left: 120, bottom: 10, width: 80, height: 120 },
  axe: { position: 'absolute', left: -6, top: -8, width: 60, height: 70 },
  chopText: {
    position: 'absolute',
    left: -40,
    top: -30,
    fontFamily: HEADLINE,
    fontSize: 26,
    color: '#FFD84D',
  },
  message: { textAlign: 'center', color: C.text, fontSize: 15, fontWeight: '600', lineHeight: 21 },
  card: { backgroundColor: C.card, borderRadius: R.md, padding: 16, gap: 8 },
  stageName: { fontSize: 32, lineHeight: 40, fontFamily: HEADLINE, textTransform: 'uppercase', color: C.text },
  streak: { fontSize: 16, color: C.text, fontWeight: '600' },
  track: { height: 12, backgroundColor: C.empty, borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: C.accent, borderRadius: 6 },
  muted: { fontSize: 14, color: C.muted, lineHeight: 20 },
  devBtn: { borderWidth: 1, borderColor: C.line, borderRadius: R.sm, paddingVertical: 12, alignItems: 'center' },
  devText: { color: C.text, fontWeight: '600' },
  off: { opacity: 0.4 },
});
