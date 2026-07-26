// Auth state for the SPA. Holds the current user (or null) and exposes login/
// logout helpers. The server session is the source of truth; on mount we ask
// the backend who we are so a refreshed page keeps the user logged in.
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await authApi.getMe();
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (credentials) => {
      const { data } = await authApi.login(credentials);
      // If MFA is required the response carries no user — don't set one yet.
      if (data.mfaRequired) return data;
      // Load the canonical profile (name, _id, ...) rather than the trimmed
      // login response, so every consumer sees the same user shape.
      await refresh();
      return data;
    },
    [refresh]
  );

  const completeMfa = useCallback(
    async (payload) => {
      const { data } = await authApi.mfaVerify(payload);
      await refresh();
      return data;
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, completeMfa, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
