import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState as RNAppState, Platform } from 'react-native';

// These come from the .env file (see .env.example). Both are designed to be public:
// the database's Row Level Security rules are what keep each user's data private.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** False if the app was built without Supabase keys. Accounts are then hidden and everyone is a guest. */
export const cloudEnabled = Boolean(url && key);

/** The live web app. Password-reset emails link here (it's also the Supabase "Site URL"). */
export const APP_URL = 'https://jack1071-habit-tracker.expo.app';

// While the web version is pre-rendered on the build machine there is no browser storage,
// so only use AsyncStorage when the app is actually running.
const isServer = Platform.OS === 'web' && typeof window === 'undefined';

export const supabase: SupabaseClient | null = cloudEnabled
  ? createClient(url!, key!, {
      auth: {
        storage: isServer ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: !isServer,
        // On the web, read the sign-in token from a password-reset link when the page opens.
        detectSessionInUrl: Platform.OS === 'web' && !isServer,
      },
    })
  : null;

// Keep the sign-in fresh while the app is open, and pause refreshing in the background.
if (supabase && Platform.OS !== 'web') {
  RNAppState.addEventListener('change', (s) => {
    if (s === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
