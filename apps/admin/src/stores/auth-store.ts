import { create } from 'zustand';
import { login as apiLogin, getMe } from '../api/client';

interface AuthState {
  user: any | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: true,

  login: async (email: string, password: string) => {
    const { data } = await apiLogin(email, password);
    localStorage.setItem('token', data.accessToken);
    set({ token: data.accessToken, user: data.user });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ loading: false });
      return;
    }
    try {
      const { data } = await getMe();
      set({ user: data, loading: false });
    } catch {
      localStorage.removeItem('token');
      set({ token: null, user: null, loading: false });
    }
  },
}));
