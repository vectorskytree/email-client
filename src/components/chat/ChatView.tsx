import { useEffect, useRef, useState, useMemo } from 'react';
import { ChatHeader } from './ChatHeader';
import { ChatBubble } from './ChatBubble';
import { MessageInput } from './MessageInput';
import { MessageListSkeleton } from '@/components/ui';
import type { Contact, EmailAddress, EmailMessage } from '@/types';

const VISIBLE_MESSAGES_COUNT = 5;

interface ChatViewProps {
  contact: Contact | null;
  messages: EmailMessage[];
  userEmail: string | null;
  isLoading: boolean;
  isSending: boolean;
  error?: string | null;
  onSend: (message: string, recipients: EmailAddress[], subject: string) => void;
  isMobile?: boolean;
  onBack?: () => void;
}

export function ChatView({
  contact,
  messages,
  userEmail,
  isLoading,
  isSending,
  error,
  onSend,
  isMobile,
  onBack,
}: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const firstUnreadRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const prevContactRef = useRef<string | null>(null);

  // Reset state when contact changes
  useEffect(() => {
    if (contact?.email !== prevContactRef.current) {
      setIsExpanded(false);
      setHasScrolled(false);
      prevContactRef.current = contact?.email ?? null;
    }
  }, [contact?.email]);

  const { visibleMessages, hiddenCount } = useMemo(() => {
    if (isExpanded || messages.length <= VISIBLE_MESSAGES_COUNT) {
      return { visibleMessages: messages, hiddenCount: 0 };
    }
    const hidden = messages.length - VISIBLE_MESSAGES_COUNT;
    return {
      visibleMessages: messages.slice(-VISIBLE_MESSAGES_COUNT),
      hiddenCount: hidden,
    };
  }, [messages, isExpanded]);

  // Find first unread message index
  const firstUnreadIndex = useMemo(() => {
    return visibleMessages.findIndex((msg) => !msg.isRead);
  }, [visibleMessages]);

  // Compute reply-all recipients from the last message
  const replyAllRecipients = useMemo(() => {
    if (!messages.length || !userEmail) {
      return contact ? [{ email: contact.email, name: contact.name }] : [];
    }

    const lastMessage = messages[messages.length - 1];
    const recipients: EmailAddress[] = [];
    const seen = new Set<string>();
    const myEmail = userEmail.toLowerCase();

    // Add original sender (if not me)
    if (lastMessage.from.email.toLowerCase() !== myEmail) {
      recipients.push(lastMessage.from);
      seen.add(lastMessage.from.email.toLowerCase());
    }

    // Add all To recipients (except me)
    for (const to of lastMessage.to) {
      const email = to.email.toLowerCase();
      if (email !== myEmail && !seen.has(email)) {
        recipients.push(to);
        seen.add(email);
      }
    }

    // Add all CC recipients (except me)
    if (lastMessage.cc) {
      for (const cc of lastMessage.cc) {
        const email = cc.email.toLowerCase();
        if (email !== myEmail && !seen.has(email)) {
          recipients.push(cc);
          seen.add(email);
        }
      }
    }

    // Fallback to contact if no recipients found
    if (recipients.length === 0 && contact) {
      return [{ email: contact.email, name: contact.name }];
    }

    return recipients;
  }, [messages, userEmail, contact]);

  // Find unsubscribe URL from any message in the conversation
  const unsubscribeUrl = useMemo(() => {
    // Look for unsubscribe URL in messages (prefer most recent)
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].unsubscribeUrl) {
        return messages[i].unsubscribeUrl;
      }
    }
    return undefined;
  }, [messages]);

  // Compute initial subject for reply
  const initialSubject = useMemo(() => {
    if (!messages.length) return '';
    const lastMessage = messages[messages.length - 1];
    const subject = lastMessage.subject || '';
    // Add "Re: " prefix if not already present
    if (subject.toLowerCase().startsWith('re:')) {
      return subject;
    }
    return subject ? `Re: ${subject}` : '';
  }, [messages]);

  // Scroll to first unread or bottom after messages load
  useEffect(() => {
    if (!hasScrolled && visibleMessages.length > 0 && !isLoading) {
      // Small delay to ensure DOM and iframes are rendered
      const scrollTimeout = setTimeout(() => {
        if (firstUnreadIndex >= 0 && firstUnreadRef.current) {
          firstUnreadRef.current.scrollIntoView({ block: 'start', behavior: 'instant' });
        } else if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'instant' });
        }
        setHasScrolled(true);
      }, 100);

      return () => clearTimeout(scrollTimeout);
    }
  }, [visibleMessages, hasScrolled, isLoading, firstUnreadIndex]);

  // Smooth scroll only for new messages sent after initial load
  const prevMessageCount = useRef(visibleMessages.length);
  useEffect(() => {
    if (hasScrolled && visibleMessages.length > prevMessageCount.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCount.current = visibleMessages.length;
  }, [visibleMessages.length, hasScrolled]);

  if (!contact) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f6f8fc]">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#1a73e8]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-[#1a73e8]"
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
          <h2 className="text-xl font-medium text-[#202124] mb-2">
            Mail
          </h2>
          <p className="text-[#5f6368]">
            Select a conversation to start chatting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 w-full overflow-hidden">
      <ChatHeader contact={contact} unsubscribeUrl={unsubscribeUrl} isMobile={isMobile} onBack={onBack} />
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 bg-[#f6f8fc] min-h-0 min-w-0 relative">
        {/* Loading overlay - only show when loading with no messages */}
        {isLoading && messages.length === 0 && (
          <div className="absolute inset-0 bg-[#f6f8fc] z-10">
            <MessageListSkeleton />
          </div>
        )}
        {error ? (
          <div className="flex items-center justify-center h-full text-red-500">
            {error}
          </div>
        ) : messages.length === 0 && !isLoading ? (
          <div className="flex items-center justify-center h-full text-[#5f6368]">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <>
            {hiddenCount > 0 && (
              <button
                onClick={() => setIsExpanded(true)}
                className="w-full py-2 px-4 mb-3 bg-white/80 hover:bg-white rounded-lg text-sm text-[#1a73e8] font-medium flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
                Show {hiddenCount} older message{hiddenCount > 1 ? 's' : ''}
              </button>
            )}
            {visibleMessages.map((msg, index) => (
              <div
                key={msg.id}
                ref={index === firstUnreadIndex ? firstUnreadRef : undefined}
              >
                <ChatBubble
                  message={msg}
                  isSent={msg.from.email.toLowerCase() === userEmail?.toLowerCase()}
                />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      <MessageInput
        onSend={onSend}
        isSending={isSending}
        initialRecipients={replyAllRecipients}
        initialSubject={initialSubject}
      />
    </div>
  );
}
