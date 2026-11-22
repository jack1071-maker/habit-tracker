import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

/** The signed-in user (or null), and whether the app has finished checking. */
export function useAccount(): { user: User | null; ready: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    // Check for a saved sign-in when the app opens...
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    // ...and keep listening for sign-ins and sign-outs.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { user, ready };
}
