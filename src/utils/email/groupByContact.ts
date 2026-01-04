import type { EmailMessage, Contact } from '@/types';
import { getContactEmail, getContactName } from '@/services/gmail';

export function groupMessagesByContact(
  messages: EmailMessage[],
  userEmail: string
): Contact[] {
  const contactMap = new Map<string, Contact>();

  for (const message of messages) {
    const email = getContactEmail(message, userEmail);
    const existing = contactMap.get(email);

    if (!existing) {
      contactMap.set(email, {
        email,
        name: getContactName(message, userEmail),
        lastMessage: message,
        lastMessageDate: message.date,
        unreadCount: message.isRead ? 0 : 1,
      });
    } else {
      if (message.date > (existing.lastMessageDate ?? new Date(0))) {
        existing.lastMessage = message;
        existing.lastMessageDate = message.date;
        if (!existing.name) {
          existing.name = getContactName(message, userEmail);
        }
      }
      if (!message.isRead) {
        existing.unreadCount++;
      }
    }
  }

  return Array.from(contactMap.values()).sort((a, b) => {
    const dateA = a.lastMessageDate ?? new Date(0);
    const dateB = b.lastMessageDate ?? new Date(0);
    return dateB.getTime() - dateA.getTime();
  });
}
