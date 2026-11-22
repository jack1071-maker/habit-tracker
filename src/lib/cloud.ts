import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppState, EMPTY_STATE } from '@/lib/habits';
import { supabase } from '@/lib/supabase';

/** What's saved online for one user. */
export type CloudCopy = { state: AppState; updatedAt: string };

/** Download this user's saved habits. Returns null if they have nothing saved yet. */
export async function fetchCloud(userId: string): Promise<CloudCopy | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('user_state')
    .select('state, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { state: { ...EMPTY_STATE, ...(data.state as AppState) }, updatedAt: data.updated_at as string };
}

/** Upload this user's habits, replacing what was saved before. Returns the save time. */
export async function pushCloud(userId: string, state: AppState): Promise<string> {
  if (!supabase) throw new Error('Cloud is not set up');
  const updatedAt = new Date().toISOString();
  const { error } = await supabase.from('user_state').upsert({ user_id: userId, state, updated_at: updatedAt });
  if (error) throw error;
  return updatedAt;
}

// Remembers when this device last synced, so it knows if the online copy is newer.
const SYNCED_KEY = 'habit-tracker-synced-at';

export async function getSyncedAt(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SYNCED_KEY);
  } catch {
    return null;
  }
}

export async function setSyncedAt(value: string | null): Promise<void> {
  try {
    if (value) await AsyncStorage.setItem(SYNCED_KEY, value);
    else await AsyncStorage.removeItem(SYNCED_KEY);
  } catch {
    // Not critical: worst case the app re-downloads the online copy next time.
  }
}

/** Turn Supabase's error messages into something friendly. */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'That email and password don’t match an account.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'There’s already an account with that email. Try signing in.';
  if (m.includes('password') && (m.includes('at least') || m.includes('short'))) return 'Your password needs to be at least 6 characters.';
  if (m.includes('email') && m.includes('invalid')) return 'That doesn’t look like a valid email address.';
  if (m.includes('not confirmed')) return 'Please confirm your email first. Check your inbox for a link.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many tries. Wait a minute and try again.';
  if (m.includes('network') || m.includes('fetch')) return 'Can’t reach the server. Check your internet connection.';
  return message;
}
