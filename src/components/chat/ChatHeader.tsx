import { Avatar } from '@/components/ui';
import type { Contact } from '@/types';

interface ChatHeaderProps {
  contact: Contact;
  unsubscribeUrl?: string;
  isMobile?: boolean;
  onBack?: () => void;
}

export function ChatHeader({ contact, unsubscribeUrl, isMobile, onBack }: ChatHeaderProps) {
  const displayName = contact.name || contact.email;

  const handleUnsubscribe = () => {
    if (unsubscribeUrl) {
      window.open(unsubscribeUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="h-16 bg-white border-b border-[#e8eaed] flex items-center gap-3 px-4">
      {isMobile && onBack && (
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-[#f1f3f4] active:bg-[#e8eaed] transition-colors touch-manipulation select-none z-10"
          aria-label="Back to conversations"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <svg className="w-6 h-6 text-[#1a73e8] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <Avatar name={contact.name} email={contact.email} />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[#202124] truncate">{displayName}</div>
        <div className="text-xs text-[#5f6368] truncate">{contact.email}</div>
      </div>
      {unsubscribeUrl && (
        <button
          onClick={handleUnsubscribe}
          className="px-3 py-1.5 text-xs font-medium text-[#5f6368] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
          title="Unsubscribe from this sender"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          Unsubscribe
        </button>
      )}
    </div>
  );
}
