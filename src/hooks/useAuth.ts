import { useEffect, useState } from 'react';
import { fetchUserProfile } from '../services/userService';
import { getSession, onAuthStateChange } from '../services/authService';
import type { AppUser } from '../types/auth';

interface AuthState {
  user: AppUser | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession().then(({ data: { session } }) => {
      if (session?.user) loadProfile(session.user.id);
      else setLoading(false);
    });

    const { data: listener } = onAuthStateChange((_event, session) => {
      if (session?.user) loadProfile(session.user.id);
      else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    const { data, error } = await fetchUserProfile(userId);
    if (error || !data) {
      console.error('Failed to fetch user profile:', error);
      setUser(null);
    } else {
      setUser(data);
    }
    setLoading(false);
  }

  return { user, loading };
}