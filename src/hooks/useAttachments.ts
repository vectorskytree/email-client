import { useCallback, useState } from 'react';
import { getAttachment } from '@/services/gmail';

export function useAttachments() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const download = useCallback(
    async (messageId: string, attachmentId: string, filename: string) => {
      setDownloading(attachmentId);
      try {
        const blob = await getAttachment(messageId, attachmentId);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Failed to download attachment:', err);
      } finally {
        setDownloading(null);
      }
    },
    []
  );

  return {
    download,
    downloading,
  };
}
