import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { AppUser, TeamMembership } from '../types/auth';

interface AuthContextType {
  user: AppUser | null;
  memberships: TeamMembership[];
  isLeaderOfAny: boolean;
  isLeaderOf: (teamId: string) => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  memberships: [],
  isLeaderOfAny: false,
  isLeaderOf: () => false,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);