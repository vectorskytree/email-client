import { GoogleSignInButton } from './GoogleSignInButton';
import { Spinner } from '@/components/ui';

interface LoginScreenProps {
  onSignIn: () => void;
  isLoading: boolean;
  isInitialized: boolean;
  error?: string | null;
}

export function LoginScreen({
  onSignIn,
  isLoading,
  isInitialized,
  error,
}: LoginScreenProps) {
  return (
    <div className="h-full flex items-center justify-center bg-[#f6f8fc]">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#1a73e8] rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#202124] mb-2">Mail</h1>
          <p className="text-[#5f6368]">
            A chat-style interface for your Gmail
          </p>
        </div>

        {!isInitialized ? (
          <div className="flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-4">
            <GoogleSignInButton onClick={onSignIn} isLoading={isLoading} />

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <p className="text-xs text-gray-500 text-center">
              We'll request access to read and send emails on your behalf.
              Your credentials are never stored on any server.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
