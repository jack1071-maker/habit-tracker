import type { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

/**
 * The signed-in user (or null), whether the app has finished checking, and whether
 * someone just opened a password-reset link and needs to choose a new password.
 */
export function useAccount(): { user: User | null; ready: boolean; recovering: boolean; doneRecovering: () => void } {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    // Check for a saved sign-in when the app opens...
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    // ...and keep listening for sign-ins, sign-outs and password-reset links.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const doneRecovering = useCallback(() => setRecovering(false), []);
  return { user, ready, recovering, doneRecovering };
}
