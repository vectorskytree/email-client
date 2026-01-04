import { useCallback } from 'react';
import { useChatStore } from '@/store';
import { sendMessage } from '@/services/gmail';
import type { EmailAddress, EmailDraft } from '@/types';

export function useSendEmail() {
  const { selectedContact, isSending, addMessage, setSending, setError } =
    useChatStore();

  const send = useCallback(
    async (body: string, recipients: EmailAddress[], subject?: string) => {
      if (recipients.length === 0) {
        throw new Error('No recipients specified');
      }

      setSending(true);
      setError(null);
      try {
        const draft: EmailDraft = {
          to: recipients,
          subject: subject || `Re: ${selectedContact?.lastMessage?.subject || 'Hello'}`,
          body,
        };

        const sentMessage = await sendMessage(draft);
        addMessage(sentMessage);
        return sentMessage;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to send message';
        setError(message);
        throw err;
      } finally {
        setSending(false);
      }
    },
    [selectedContact, addMessage, setSending, setError]
  );

  return {
    send,
    isSending,
  };
}
