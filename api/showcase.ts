import { listFeaturedCollections, listCollectionPieces } from '../lib/server/collections';
import type { VercelRequest, VercelResponse } from '../lib/server/types';

/**
 * Public, read-only: the site's curated showcase (see scripts/generate-showcase.ts,
 * src/components/Showcase.tsx). Deliberately excludes artist_real_name (internal reference only —
 * see the GenreProfile doc comment in src/data/genreProfiles.ts) — same privacy rule as
 * api/pieces.ts, enforced here a second time since showcase pieces have no subscriber to hide but
 * still shouldn't name the real artist they're inspired by.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const collections = await listFeaturedCollections(3);
    const pieces = await listCollectionPieces(collections.map((collection) => collection.id), 60);

    const piecesByCollection = new Map<string, typeof pieces>();
    for (const piece of pieces) {
      const existing = piecesByCollection.get(piece.collection_id) ?? [];
      existing.push(piece);
      piecesByCollection.set(piece.collection_id, existing);
    }

    const payload = collections.map((collection) => ({
      id: collection.id,
      slug: collection.slug,
      name: collection.name,
      style: collection.style,
      blurb: collection.blurb,
      pieces: (piecesByCollection.get(collection.id) ?? []).map((piece) => ({
        id: piece.id,
        style: piece.style,
        subject: piece.subject,
        image_url: piece.image_url,
        created_at: piece.created_at,
      })),
    }));

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    res.status(200).json({ collections: payload });
  } catch (error) {
    console.error('Failed to load the showcase', error);
    res.status(500).json({ error: 'Failed to load the showcase.' });
  }
}
