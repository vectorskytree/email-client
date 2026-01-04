import { useState, useRef, type KeyboardEvent } from 'react';
import type { EmailAddress } from '@/types';

interface MessageInputProps {
  onSend: (message: string, recipients: EmailAddress[], subject: string) => void;
  isSending: boolean;
  disabled?: boolean;
  initialRecipients?: EmailAddress[];
  initialSubject?: string;
}

export function MessageInput({ onSend, isSending, disabled, initialRecipients = [], initialSubject = '' }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState<EmailAddress[]>(initialRecipients);
  const [subject, setSubject] = useState(initialSubject);
  const [newRecipient, setNewRecipient] = useState('');
  const [showRecipients, setShowRecipients] = useState(false);
  const [showSubject, setShowSubject] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recipientInputRef = useRef<HTMLInputElement>(null);

  // Update recipients and subject when initial values change (new contact selected)
  const prevInitialRef = useRef({ recipients: initialRecipients, subject: initialSubject });
  if (prevInitialRef.current.recipients !== initialRecipients || prevInitialRef.current.subject !== initialSubject) {
    prevInitialRef.current = { recipients: initialRecipients, subject: initialSubject };
    setRecipients(initialRecipients);
    setSubject(initialSubject);
    setShowSubject(false);
    setShowRecipients(false);
  }

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && !isSending && recipients.length > 0) {
      onSend(trimmed, recipients, subject);
      setMessage('');
      setShowRecipients(false);
      setShowSubject(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const addRecipient = () => {
    const email = newRecipient.trim().toLowerCase();
    if (email && email.includes('@') && !recipients.some(r => r.email.toLowerCase() === email)) {
      setRecipients([...recipients, { email }]);
      setNewRecipient('');
    }
  };

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r.email !== email));
  };

  const handleRecipientKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addRecipient();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  return (
    <div className="bg-white border-t border-[#e8eaed] px-4 py-3 min-w-0 w-full overflow-hidden">
      {/* Subject bar */}
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={() => setShowSubject(!showSubject)}
          className="text-xs text-[#5f6368] hover:text-[#1a73e8] flex items-center gap-1 min-w-0 max-w-full overflow-hidden"
        >
          <span className="font-medium flex-shrink-0">Subject:</span>
          <span className="text-[#202124] truncate min-w-0 flex-1">
            {subject || 'No subject'}
          </span>
          <svg
            className={`w-3 h-3 flex-shrink-0 transition-transform ${showSubject ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Subject editor */}
      {showSubject && (
        <div className="mb-2 p-2 bg-[#f6f8fc] rounded-lg">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setShowSubject(false)}
            placeholder="Email subject..."
            className="w-full text-sm px-2 py-1.5 border border-[#e8eaed] rounded focus:outline-none focus:border-[#1a73e8]"
          />
        </div>
      )}

      {/* Recipients bar */}
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={() => setShowRecipients(!showRecipients)}
          className="text-xs text-[#5f6368] hover:text-[#1a73e8] flex items-center gap-1 min-w-0 max-w-full overflow-hidden"
        >
          <span className="font-medium flex-shrink-0">To:</span>
          <span className="text-[#202124] truncate min-w-0 flex-1">
            {recipients.length === 0
              ? 'No recipients'
              : recipients.length <= 3
              ? recipients.map(r => r.name ? `${r.name} <${r.email}>` : r.email).join(', ')
              : `${recipients.slice(0, 3).map(r => r.name ? `${r.name} <${r.email}>` : r.email).join(', ')} +${recipients.length - 3}`}
          </span>
          <svg
            className={`w-3 h-3 flex-shrink-0 transition-transform ${showRecipients ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded recipients editor */}
      {showRecipients && (
        <div className="mb-2 p-2 bg-[#f6f8fc] rounded-lg">
          <div className="flex flex-wrap gap-1 mb-2">
            {recipients.map((r) => (
              <span
                key={r.email}
                className="inline-flex items-center gap-1 bg-[#e8f0fe] text-[#1a73e8] rounded-full px-2 py-1 text-xs"
              >
                {r.name ? `${r.name} <${r.email}>` : r.email}
                <button
                  onClick={() => removeRecipient(r.email)}
                  className="hover:text-red-500"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              ref={recipientInputRef}
              type="email"
              value={newRecipient}
              onChange={(e) => setNewRecipient(e.target.value)}
              onKeyDown={handleRecipientKeyDown}
              onBlur={addRecipient}
              placeholder="Add recipient email..."
              className="flex-1 text-xs px-2 py-1 border border-[#e8eaed] rounded focus:outline-none focus:border-[#1a73e8]"
            />
            <button
              onClick={addRecipient}
              disabled={!newRecipient.trim()}
              className="text-xs px-2 py-1 bg-[#1a73e8] text-white rounded disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Message input */}
      <div className="flex items-end gap-2">
        <div className="flex-1 bg-[#f6f8fc] rounded-lg flex items-end border border-[#e8eaed]">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="Type a message"
            disabled={disabled || isSending}
            rows={1}
            className="flex-1 px-4 py-2 bg-transparent resize-none focus:outline-none text-sm max-h-[120px]"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!message.trim() || isSending || disabled || recipients.length === 0}
          className="w-10 h-10 rounded-full bg-[#1a73e8] text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1557b0] transition-colors flex-shrink-0"
          title={recipients.length === 0 ? 'Add at least one recipient' : 'Send message'}
        >
          {isSending ? (
            <svg
              className="animate-spin w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
