import { create } from 'zustand';
import { router } from 'expo-router';
import { auth as authApi } from '../api/services';
import { storage, TOKEN_KEY, USER_KEY } from '../api/client';
import type { User, LoginRequest, RegisterRequest } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (creds: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  clearError: () => void;
}

const navigate = (role: string) => {
  if (role === 'clerk') router.replace('/(clerk)/dashboard');
  else router.replace('/(citizen)/track');
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  hydrate: async () => {
    try {
      const token = await storage.get(TOKEN_KEY);
      const userJson = await storage.get(USER_KEY);
      if (token && userJson) {
        set({ token, user: JSON.parse(userJson) });
      }
    } catch (_) {
      // Storage unavailable (SSR), ignore
    }
  },

  login: async (creds) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApi.login(creds);
      await storage.set(TOKEN_KEY, data.access_token);
      await storage.set(USER_KEY, JSON.stringify(data.user));
      set({ user: data.user, token: data.access_token, isLoading: false });
      navigate(data.user.role);
    } catch (e: any) {
      set({ error: e?.response?.data?.detail ?? 'Login failed. Check your credentials.', isLoading: false });
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authApi.register(data);
      await storage.set(TOKEN_KEY, result.access_token);
      await storage.set(USER_KEY, JSON.stringify(result.user));
      set({ user: result.user, token: result.access_token, isLoading: false });
      navigate(result.user.role);
    } catch (e: any) {
      set({ error: e?.response?.data?.detail ?? 'Registration failed.', isLoading: false });
    }
  },

  logout: async () => {
    await storage.delete(TOKEN_KEY);
    await storage.delete(USER_KEY);
    set({ user: null, token: null });
    router.replace('/login');
  },
}));
