import { formatFileSize } from '@/utils';
import type { Attachment } from '@/types';

interface AttachmentPreviewProps {
  attachment: Attachment;
  messageId: string;
  onDownload: (messageId: string, attachmentId: string, filename: string) => void;
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'doc';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'sheet';
  return 'file';
}

export function AttachmentPreview({
  attachment,
  messageId,
  onDownload,
}: AttachmentPreviewProps) {
  const fileType = getFileIcon(attachment.mimeType);

  return (
    <button
      onClick={() => onDownload(messageId, attachment.id, attachment.filename)}
      className="flex items-center gap-2 bg-white/50 hover:bg-white/80 rounded-lg px-3 py-2 transition-colors text-left w-full max-w-xs"
    >
      <div className="w-10 h-10 bg-[#00a884]/10 rounded flex items-center justify-center flex-shrink-0">
        <svg
          className="w-5 h-5 text-[#00a884]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {fileType === 'image' ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          )}
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[#111b21] truncate">
          {attachment.filename}
        </div>
        <div className="text-xs text-[#667781]">
          {formatFileSize(attachment.size)}
        </div>
      </div>
      <svg
        className="w-5 h-5 text-[#667781] flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
    </button>
  );
}
