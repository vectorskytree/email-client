import { AttachmentPreview } from './AttachmentPreview';
import type { Attachment } from '@/types';

interface AttachmentListProps {
  attachments: Attachment[];
  messageId: string;
  onDownload: (messageId: string, attachmentId: string, filename: string) => void;
}

export function AttachmentList({
  attachments,
  messageId,
  onDownload,
}: AttachmentListProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="space-y-2 mt-2">
      {attachments.map((attachment) => (
        <AttachmentPreview
          key={attachment.id}
          attachment={attachment}
          messageId={messageId}
          onDownload={onDownload}
        />
      ))}
    </div>
  );
}
