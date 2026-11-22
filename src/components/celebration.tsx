import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';

import { C, HEADLINE, R } from '@/lib/ui';

const PIECES = ['🎉', '✨', '🎊', '⭐', '💫', '🔥'];

/** Emoji confetti falling down the screen plus a message card. Calls onDone when finished. */
export function Celebration({ title, subtitle, onDone }: { title: string; subtitle: string; onDone: () => void }) {
  const { width, height } = Dimensions.get('window');
  const fall = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  const pieces = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        emoji: PIECES[i % PIECES.length],
        left: Math.random() * (width - 30),
        delay: Math.random() * 0.35,
        spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
        size: 20 + Math.random() * 14,
      })),
    [width],
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fall, { toValue: 1, duration: 2200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [fall, pop, onDone]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => {
        const translateY = fall.interpolate({
          inputRange: [0, p.delay, 1],
          outputRange: [-60, -60, height + 60],
        });
        const rotate = fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] });
        return (
          <Animated.Text
            key={i}
            style={[styles.piece, { left: p.left, fontSize: p.size, transform: [{ translateY }, { rotate }] }]}>
            {p.emoji}
          </Animated.Text>
        );
      })}
      <View style={styles.center}>
        <Animated.View style={[styles.card, { transform: [{ scale: pop }] }]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', top: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: '#4A3B9C',
    borderWidth: 2,
    borderColor: C.accent,
    maxWidth: 340,
    borderRadius: R.lg,
    paddingVertical: 22,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: { fontSize: 30, lineHeight: 38, fontFamily: HEADLINE, textTransform: 'uppercase', color: C.text, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#E4DDFF', marginTop: 6, textAlign: 'center' },
});
