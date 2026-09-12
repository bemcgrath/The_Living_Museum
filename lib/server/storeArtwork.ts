import { randomUUID } from 'node:crypto';
import { getSupabaseClient } from './supabase';
import type { ArtStyle } from '../../src/models/Artwork';
import type { GenreProfile } from '../../src/data/genreProfiles';

const BUCKET = 'artwork';

export interface StoredPiece {
  id: string;
  imageUrl: string;
}

/**
 * Uploads a generated piece's image to Supabase Storage and records it in the `pieces` table —
 * the archive behind the community gallery (api/pieces.ts) and what a future "resend" feature
 * would reuse instead of paying to regenerate. Best-effort by design (see deliverArtwork.ts): a
 * storage hiccup should never prevent a subscriber's email from sending.
 */
export async function storeArtwork(params: {
  subscriberId: string | null;
  kind: 'welcome' | 'weekly';
  style: ArtStyle;
  profile: GenreProfile;
  subject: string;
  prompt: string;
  imageBase64: string;
}): Promise<StoredPiece> {
  const { subscriberId, kind, style, profile, subject, prompt, imageBase64 } = params;
  const supabase = getSupabaseClient();
  const path = `${style}/${new Date().toISOString().slice(0, 10)}-${randomUUID()}.png`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, Buffer.from(imageBase64, 'base64'), { contentType: 'image/png' });
  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { data: piece, error: insertError } = await supabase
    .from('pieces')
    .insert({
      subscriber_id: subscriberId,
      kind,
      style,
      artist_real_name: profile.realName,
      subject,
      prompt,
      image_path: path,
      image_url: publicUrlData.publicUrl,
    })
    .select('id')
    .single();
  if (insertError) throw insertError;

  return { id: piece.id, imageUrl: publicUrlData.publicUrl };
}
