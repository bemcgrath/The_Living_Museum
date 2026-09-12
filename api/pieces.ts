import { getSupabaseClient } from '../lib/server/supabase';
import type { VercelRequest, VercelResponse } from '../lib/server/types';

const PAGE_SIZE = 60;

/**
 * Public, read-only: the community gallery's data source — specifically pieces that were actually
 * emailed to a subscriber. Deliberately excludes subscriber_id/email (nothing here identifies a
 * subscriber) and artist_real_name (internal reference only — see the GenreProfile doc comment in
 * src/data/genreProfiles.ts; never surfaced to a viewer). Showcase collection pieces (kind
 * 'showcase') are marketing art, never emailed to anyone — they're served separately by
 * api/showcase.ts and excluded here so they don't dominate this "sent to subscribers" gallery.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('pieces')
    .select('id, style, subject, image_url, created_at')
    .in('kind', ['welcome', 'weekly'])
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (error) {
    console.error('Failed to load pieces', error);
    res.status(500).json({ error: 'Failed to load pieces.' });
    return;
  }

  res.status(200).json({ pieces: data ?? [] });
}
