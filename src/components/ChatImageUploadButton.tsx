import { useRef, useState } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { friendlyError } from '@/lib/friendlyError';

interface ChatImageUploadButtonProps {
  conversationId: string;
  myUserId: string;
  /** Called once with a temporary local preview URL (objectURL) so the UI can render an optimistic bubble. */
  onLocalPreview?: (previewUrl: string) => string; // return a token to correlate
  /** Called when the upload finishes; pass token from onLocalPreview to swap. */
  onUploaded: (signedUrl: string, token?: string) => void;
  /** Called if the upload failed so we can clean up the optimistic bubble. */
  onFailed?: (token?: string) => void;
  disabled?: boolean;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const ChatImageUploadButton = ({
  conversationId,
  myUserId,
  onUploaded,
  onLocalPreview,
  onFailed,
  disabled,
}: ChatImageUploadButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handlePick = () => inputRef.current?.click();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('That file type isn\'t supported. Please choose a JPG or PNG.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('That photo is too large. Please choose one under 5 MB.');
      return;
    }

    // Optimistic local preview using objectURL — feels instant.
    const previewUrl = URL.createObjectURL(file);
    const token = onLocalPreview?.(previewUrl);

    setBusy(true);
    const ext = file.name.split('.').pop()?.toLowerCase().slice(0, 5) || 'jpg';
    const path = `${conversationId}/${myUserId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('chat-images').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });
    if (upErr) {
      setBusy(false);
      URL.revokeObjectURL(previewUrl);
      onFailed?.(token);
      toast.error(friendlyError(upErr, "upload"));
      return;
    }
    const { data: signed, error: signErr } = await supabase.storage
      .from('chat-images')
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    setBusy(false);
    URL.revokeObjectURL(previewUrl);
    if (signErr || !signed?.signedUrl) {
      onFailed?.(token);
      toast.error('Photo upload failed. Please try another image.');
      return;
    }
    onUploaded(signed.signedUrl, token);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={handlePick}
        disabled={disabled || busy}
        aria-label="Send a photo"
        className="h-11 w-11 flex items-center justify-center rounded-full bg-muted disabled:opacity-50 tap-feedback shrink-0"
      >
        {busy ? (
          <Loader2 size={20} className="text-muted-foreground animate-spin" />
        ) : (
          <ImageIcon size={20} className="text-muted-foreground" />
        )}
      </button>
    </>
  );
};

export default ChatImageUploadButton;
