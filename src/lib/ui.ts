import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * One fixed palette, so text is never the same color as its background.
 * Black background, lime green highlights, white and grey text.
 */
export const C = {
  bg: '#0A0A0A',
  card: '#171717',
  cardDone: '#1C2A0A',
  text: '#FFFFFF',
  muted: '#A3A3A3',
  line: '#2A2A2A',
  accent: '#B5F23D',
  accentSoft: '#1F2D0B',
  green: '#A3E635',
  greenSoft: '#26340E',
  empty: '#262626',
  /** Text and icons that sit ON a lime button or badge (white would be hard to read on lime). */
  onAccent: '#0A0A0A',
};

/** Tall, bold headline font (loaded in app/_layout.tsx). */
export const HEADLINE = 'Anton_400Regular';

export const R = { sm: 10, md: 16, lg: 22 };

// Haptics only exist on phones; on the web these quietly do nothing.
const onPhone = Platform.OS === 'ios' || Platform.OS === 'android';

export function tapBuzz() {
  if (onPhone) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function doneBuzz() {
  if (onPhone) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
