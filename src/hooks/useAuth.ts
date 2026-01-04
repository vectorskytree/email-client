import { useCallback, useEffect } from 'react';
import { useAuthStore } from '@/store';
import {
  initializeGoogleApi,
  signIn as gmailSignIn,
  signOut as gmailSignOut,
  getUserEmail,
  validateStoredToken,
  getStoredEmail,
} from '@/services/gmail';

export function useAuth() {
  const {
    isInitialized,
    isAuthenticated,
    maybeAuthenticated,
    userEmail,
    isLoading,
    error,
    setInitialized,
    setAuthenticated,
    setLoading,
    setError,
    reset,
  } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initializeGoogleApi()
        .then(async () => {
          setInitialized(true);
          // Check for stored token
          const isValid = await validateStoredToken();
          if (isValid) {
            const email = getStoredEmail();
            setAuthenticated(true, email ?? undefined);
          } else {
            // Token invalid or expired, show login screen
            setAuthenticated(false);
          }
        })
        .catch((err) => setError(err.message));
    }
  }, [isInitialized, setInitialized, setAuthenticated, setError]);

  const signIn = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await gmailSignIn();
      const email = await getUserEmail();
      setAuthenticated(true, email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setAuthenticated]);

  const signOut = useCallback(() => {
    gmailSignOut();
    reset();
  }, [reset]);

  return {
    isInitialized,
    isAuthenticated,
    maybeAuthenticated,
    userEmail,
    isLoading,
    error,
    signIn,
    signOut,
  };
}
