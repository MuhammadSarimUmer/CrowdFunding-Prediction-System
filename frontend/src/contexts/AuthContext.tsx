import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { LoginInput, RegisterInput, Role, User } from '@/types';
import { authApi } from '@/api';
import { tokenStore, userCache } from '@/lib/token';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => userCache.get<User>());
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!tokenStore.get()) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const current = await authApi.me();
        if (!cancelled) {
          setUser(current);
          userCache.set(current);
        }
      } catch {
        if (!cancelled) {
          tokenStore.clear();
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      setUser(null);
      queryClient.clear();
    }
    window.addEventListener('cp:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('cp:unauthorized', handleUnauthorized);
  }, [queryClient]);

  const login = useCallback(async (input: LoginInput) => {
    const response = await authApi.login(input);
    tokenStore.set(response.token);
    userCache.set(response.user);
    setUser(response.user);
    return response.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const response = await authApi.register(input);
    tokenStore.set(response.token);
    userCache.set(response.user);
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => undefined);
    tokenStore.clear();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const hasRole = useCallback(
    (...roles: Role[]) => Boolean(user && roles.includes(user.role)),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      hasRole,
    }),
    [user, loading, login, register, logout, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
