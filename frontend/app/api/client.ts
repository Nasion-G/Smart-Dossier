import axios, { AxiosInstance } from "axios";
import { Platform } from "react-native";

// ── API base URL ────────────────────────────────────────────────────────────
// In dev: direct to backend port. In prod: same origin (nginx proxies /api/*).
const API_BASE = __DEV__
  ? Platform.OS === "android"
    ? "http://10.63.159.70:8000"
    : "http://10.63.159.70:8000"
  : "http://10.63.159.70:8000"; // empty = same origin, nginx handles /api → backend

<<<<<<< HEAD
export const TOKEN_KEY = "dosja_access_token";
export const USER_KEY = "dosja_user";
=======
export const TOKEN_KEY = 'ekb_access_token';
export const USER_KEY = 'ekb_user';
>>>>>>> cf4369d97b263c3016b56fa97229d71ac6a72924

// Web-safe storage: SecureStore on native, sessionStorage on web
export const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      return typeof window !== "undefined" ? sessionStorage.getItem(key) : null;
    }
    const SecureStore = await import("expo-secure-store");
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") sessionStorage.setItem(key, value);
      return;
    }
    const SecureStore = await import("expo-secure-store");
    await SecureStore.setItemAsync(key, value);
  },
  async delete(key: string): Promise<void> {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") sessionStorage.removeItem(key);
      return;
    }
    const SecureStore = await import("expo-secure-store");
    await SecureStore.deleteItemAsync(key);
  },
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// Attach JWT to every request
apiClient.interceptors.request.use(async (config) => {
  const token = await storage.get(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear token (router redirect handled in useAuthStore)
apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await storage.delete(TOKEN_KEY);
      await storage.delete(USER_KEY);
    }
    return Promise.reject(err);
  },
);
