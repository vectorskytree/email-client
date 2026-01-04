const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
].join(' ');

const TOKEN_KEY = 'gmail_access_token';
const EMAIL_KEY = 'gmail_user_email';

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let accessToken: string | null = localStorage.getItem(TOKEN_KEY);

export function isInitialized(): boolean {
  return typeof google !== 'undefined' && google.accounts !== undefined;
}

export function isAuthenticated(): boolean {
  return accessToken !== null;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getStoredEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY);
}

function saveToken(token: string, email?: string): void {
  accessToken = token;
  localStorage.setItem(TOKEN_KEY, token);
  if (email) {
    localStorage.setItem(EMAIL_KEY, email);
  }
}

function clearToken(): void {
  accessToken = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

export async function validateStoredToken(): Promise<boolean> {
  if (!accessToken) return false;

  try {
    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/profile',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem(EMAIL_KEY, data.emailAddress);
      return true;
    }

    // Token expired - try to refresh silently
    if (response.status === 401) {
      try {
        await refreshToken();
        // Retry validation with new token
        const retryResponse = await fetch(
          'https://gmail.googleapis.com/gmail/v1/users/me/profile',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (retryResponse.ok) {
          const data = await retryResponse.json();
          localStorage.setItem(EMAIL_KEY, data.emailAddress);
          return true;
        }
      } catch {
        // Silent refresh failed, user needs to re-login
      }
    }

    clearToken();
    return false;
  } catch {
    clearToken();
    return false;
  }
}

export function initializeGoogleApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!CLIENT_ID) {
      reject(new Error('VITE_GOOGLE_CLIENT_ID is not set'));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.error) {
            console.error('OAuth error:', response.error);
            return;
          }
          accessToken = response.access_token;
        },
      });
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Google API'));
    document.body.appendChild(script);
  });
}

export function signIn(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Google API not initialized'));
      return;
    }

    tokenClient.callback = (response) => {
      if (response.error) {
        reject(new Error(response.error));
        return;
      }
      saveToken(response.access_token);
      resolve(response.access_token);
    };

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

export function signOut(): void {
  if (accessToken) {
    google.accounts.oauth2.revoke(accessToken, () => {
      clearToken();
    });
  } else {
    clearToken();
  }
}

// Silently refresh token
function refreshToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Google API not initialized'));
      return;
    }

    tokenClient.callback = (response) => {
      if (response.error) {
        clearToken();
        reject(new Error(response.error));
        return;
      }
      saveToken(response.access_token);
      resolve(response.access_token);
    };

    // Use empty prompt for silent refresh
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

export async function fetchGmailApi<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me${endpoint}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }
  );

  // Handle expired token
  if (response.status === 401 && !isRetry) {
    try {
      await refreshToken();
      // Retry the request with new token
      return fetchGmailApi<T>(endpoint, options, true);
    } catch {
      clearToken();
      throw new Error('Session expired. Please sign in again.');
    }
  }

  if (!response.ok) {
    throw new Error(`Gmail API error: ${response.status}`);
  }

  return response.json();
}
