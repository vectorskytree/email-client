import { useEffect, useRef } from 'react';
import { Avatar } from '@/components/ui';
import { formatMessageDate } from '@/utils';
import type { Contact } from '@/types';

interface ContactItemProps {
  contact: Contact;
  isSelected: boolean;
  onClick: () => void;
  onPrefetch?: () => void;
}

export function ContactItem({ contact, isSelected, onClick, onPrefetch }: ContactItemProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const hasPrefetchedRef = useRef(false);

  // Prefetch when contact becomes visible in viewport
  useEffect(() => {
    if (!onPrefetch || hasPrefetchedRef.current) return;

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasPrefetchedRef.current) {
          hasPrefetchedRef.current = true;
          onPrefetch();
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [onPrefetch]);

  const displayName = contact.name || contact.email;
  const snippet = contact.lastMessage?.snippet || '';
  const date = contact.lastMessageDate
    ? formatMessageDate(contact.lastMessageDate)
    : '';

  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseEnter={onPrefetch}
      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f1f3f4] transition-colors text-left border-b border-[#e8eaed] ${
        isSelected ? 'bg-[#e8f0fe]' : ''
      }`}
    >
      <Avatar name={contact.name} email={contact.email} size="lg" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-[#202124] truncate">
            {displayName}
          </span>
          <span className="text-xs text-[#5f6368] flex-shrink-0">{date}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-[#5f6368] truncate">{snippet}</span>
          {contact.unreadCount > 0 && (
            <span className="bg-[#1a73e8] text-white text-xs rounded-full px-2 py-0.5 flex-shrink-0">
              {contact.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
