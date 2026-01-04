interface HeaderProps {
  userEmail?: string | null;
  onSignOut: () => void;
  isMobile?: boolean;
}

export function Header({ userEmail, onSignOut, isMobile }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-[#e8eaed] flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#1a73e8] rounded-lg flex items-center justify-center">
          <svg
            className="w-6 h-6 text-white"
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
        <span className="text-[#202124] font-semibold text-lg">Mail</span>
      </div>

      <div className="flex items-center gap-4">
        {userEmail && !isMobile && (
          <span className="text-[#5f6368] text-sm hidden sm:block">
            {userEmail}
          </span>
        )}
        <button
          onClick={onSignOut}
          className="text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] p-2 rounded-full transition-colors"
          title="Sign out"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
