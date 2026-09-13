import { listAllCollections, listCollectionPieces } from '../lib/server/collections.js';
import type { VercelRequest, VercelResponse } from '../lib/server/types.js';

/**
 * Public, read-only: every showcase collection ever generated, featured or not (see
 * scripts/generate-showcase.ts, src/components/AllShowcaseCollections.tsx) — the "browse everything"
 * counterpart to api/showcase.ts, which only serves the homepage's featured-3 subset. Same privacy
 * rule as api/showcase.ts: deliberately excludes artist_real_name (internal reference only — see the
 * GenreProfile doc comment in src/data/genreProfiles.ts).
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const collections = await listAllCollections(50);
    const pieces = await listCollectionPieces(collections.map((collection) => collection.id), 500);

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
        artist_name: piece.artist_name,
        created_at: piece.created_at,
      })),
    }));

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    res.status(200).json({ collections: payload });
  } catch (error) {
    console.error('Failed to load all collections', error);
    res.status(500).json({ error: 'Failed to load collections.' });
  }
}
