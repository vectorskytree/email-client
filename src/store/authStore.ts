import { create } from 'zustand';

const TOKEN_KEY = 'gmail_access_token';
const EMAIL_KEY = 'gmail_user_email';

// Check localStorage immediately to avoid login screen flash
const storedToken = localStorage.getItem(TOKEN_KEY);
const storedEmail = localStorage.getItem(EMAIL_KEY);
const hasStoredCredentials = !!storedToken;

interface AuthState {
  isInitialized: boolean;
  isAuthenticated: boolean;
  maybeAuthenticated: boolean; // True if we have stored credentials (not yet validated)
  userEmail: string | null;
  isLoading: boolean;
  error: string | null;
  setInitialized: (initialized: boolean) => void;
  setAuthenticated: (authenticated: boolean, email?: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isInitialized: false,
  isAuthenticated: false,
  maybeAuthenticated: hasStoredCredentials,
  userEmail: storedEmail,
  isLoading: false,
  error: null,
  setInitialized: (initialized) => set({ isInitialized: initialized }),
  setAuthenticated: (authenticated, email) =>
    set({
      isAuthenticated: authenticated,
      maybeAuthenticated: authenticated,
      userEmail: email ?? null
    }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    set({
      isAuthenticated: false,
      maybeAuthenticated: false,
      userEmail: null,
      isLoading: false,
      error: null,
    });
  },
}));
