import { getSupabaseClient } from './supabase';
import type { ArtStyle } from '../../src/models/Artwork';

export interface ShowcaseCollection {
  id: string;
  slug: string;
  name: string;
  style: string;
  blurb: string | null;
  featured_at: string | null;
  created_at: string;
}

/** Public-safe piece shape: no subscriber_id, no artist_real_name (internal only — see genreProfiles.ts). */
export interface ShowcasePiece {
  id: string;
  collection_id: string;
  style: string;
  subject: string;
  image_url: string;
  created_at: string;
}

const COLLECTION_COLUMNS = 'id, slug, name, style, blurb, featured_at, created_at';
const PIECE_COLUMNS = 'id, collection_id, style, subject, image_url, created_at';

/**
 * Creates (or tops up) the collection a generator run writes into, keyed on slug so re-running the
 * script for the same slug adds to an existing collection instead of creating a duplicate.
 * `featured_at` is only included in the upsert payload when `feature` is true, so re-running with
 * `feature: false` never un-features a collection that's already live on the site.
 */
export async function upsertCollection(params: {
  slug: string;
  name: string;
  style: ArtStyle;
  blurb?: string | null;
  feature: boolean;
}): Promise<ShowcaseCollection> {
  const { slug, name, style, blurb, feature } = params;
  const row: Record<string, unknown> = { slug, name, style, blurb: blurb ?? null };
  if (feature) row.featured_at = new Date().toISOString();

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('collections')
    .upsert(row, { onConflict: 'slug' })
    .select(COLLECTION_COLUMNS)
    .single();
  if (error) throw error;
  return data as ShowcaseCollection;
}

/** Collections currently displayed on the site, most recently featured first. */
export async function listFeaturedCollections(limit = 3): Promise<ShowcaseCollection[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('collections')
    .select(COLLECTION_COLUMNS)
    .not('featured_at', 'is', null)
    .order('featured_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ShowcaseCollection[];
}

/** Showcase pieces for the given collections, oldest first (generation order = display order). */
export async function listCollectionPieces(collectionIds: string[], limit = 60): Promise<ShowcasePiece[]> {
  if (collectionIds.length === 0) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('pieces')
    .select(PIECE_COLUMNS)
    .eq('kind', 'showcase')
    .in('collection_id', collectionIds)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ShowcasePiece[];
}
