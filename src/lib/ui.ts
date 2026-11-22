import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * One fixed palette, so text is never the same color as its background.
 * Deep purple background with white and lavender text.
 */
export const C = {
  bg: '#231B47',
  card: '#30275C',
  cardDone: '#41357C',
  text: '#FFFFFF',
  muted: '#B3A9D9',
  line: '#43397A',
  accent: '#9B7BFF',
  accentSoft: '#3B3075',
  green: '#7C5CFF',
  greenSoft: '#3D3380',
  empty: '#3A3068',
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
