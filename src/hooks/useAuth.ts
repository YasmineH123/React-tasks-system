import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { AppUser } from '../types/UseAuth';

interface AuthState {
  user: AppUser | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser]       = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchProfile(session.user.id);
      else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('Failed to fetch user profile:', error);
      setUser(null);
    } else {
      setUser(data as AppUser);
    }
    setLoading(false);
  }

  return { user, loading };
}