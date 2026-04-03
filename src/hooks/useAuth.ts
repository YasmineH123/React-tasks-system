import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchUserProfile } from '../services/userService';
import { getSession, onAuthStateChange } from '../services/authService';
import type { AppUser, TeamMembership } from '../types/auth';

interface AuthState {
  user: AppUser | null;
  memberships: TeamMembership[];
  isLeaderOfAny: boolean;
  isLeaderOf: (teamId: string) => boolean;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<AppUser | null>(null);
  const [memberships, setMemberships] = useState<TeamMembership[]>([]);
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
        setMemberships([]);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    const [profileRes, membershipsRes] = await Promise.all([
      fetchUserProfile(userId),
      supabase
        .from('team_members')
        .select('team_id, team_role')
        .eq('user_id', userId),
    ]);

    if (profileRes.error || !profileRes.data) {
      setUser(null);
      setMemberships([]);
    } else {
      setUser(profileRes.data);
      setMemberships((membershipsRes.data as TeamMembership[]) ?? []);
    }

    setLoading(false);
  }

  const isLeaderOfAny = memberships.some(m => m.team_role === 'leader');
  const isLeaderOf = (teamId: string) =>
    memberships.some(m => m.team_id === teamId && m.team_role === 'leader');

  return { user, memberships, isLeaderOfAny, isLeaderOf, loading };
}