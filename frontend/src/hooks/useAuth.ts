/**
 * Hook d'authentification - état global simplifié
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types';
import { getStoredUser, getStoredToken, setAuth, clearAuth } from '@/lib/auth';
import { authApi } from '@/lib/api';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    setAuth(data.token, data.user);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (formData: Parameters<typeof authApi.register>[0]) => {
    const { data } = await authApi.register(formData);
    setAuth(data.token, data.user);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setUser(null);
  }, []);

  return { user, token, isLoading, login, register, logout, isAuthenticated: !!token };
};
