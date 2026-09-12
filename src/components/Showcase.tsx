/**
 * A curated showcase of real AI-generated artwork, shown directly on the main page above the
 * subscribe form — proof-of-quality art for a visitor deciding whether to sign up (see
 * scripts/generate-showcase.ts, api/showcase.ts). Renders nothing at all (not an empty-state
 * message) until a featured collection with at least one piece actually exists: this is an
 * always-mounted block every visitor sees, not a modal someone opened on purpose, so there's
 * nothing worth showing before the first collection is generated.
 */
import { useEffect, useState } from 'react';
import { styleLabel } from '../models/Artwork';

interface ShowcasePieceView {
  id: string;
  style: string;
  subject: string;
  image_url: string;
}

interface ShowcaseCollectionView {
  id: string;
  slug: string;
  name: string;
  style: string;
  blurb: string | null;
  pieces: ShowcasePieceView[];
}

type LoadState = 'loading' | 'loaded' | 'error';

export function Showcase() {
  const [collections, setCollections] = useState<ShowcaseCollectionView[]>([]);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/showcase')
      .then((response) => response.json().catch(() => null))
      .then((data: { collections?: ShowcaseCollectionView[] } | null) => {
        if (cancelled) return;
        if (!data?.collections) {
          setState('error');
          return;
        }
        setCollections(data.collections);
        setState('loaded');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state !== 'loaded') return null;
  const visible = collections.filter((collection) => collection.pieces.length > 0);
  if (visible.length === 0) return null;

  return (
    <section className="showcase-panel">
      <div className="showcase-header">
        <p className="eyebrow">Real pieces, really generated</p>
        <h2>{visible.length === 1 ? visible[0].name : 'From the collections'}</h2>
        <p className="section-help">
          Actual AI-generated art from the weekly email pipeline — not the in-app procedural simulation above.
          This is what lands in a subscriber's inbox.
        </p>
      </div>
      {visible.map((collection) => (
        <div key={collection.id} className="showcase-collection">
          {visible.length > 1 && <h3 className="showcase-collection-title">{collection.name}</h3>}
          {collection.blurb && <p className="section-help">{collection.blurb}</p>}
          <div className="showcase-grid">
            {collection.pieces.map((piece) => (
              <figure key={piece.id} className="showcase-card">
                <img src={piece.image_url} alt={`${styleLabel(piece.style)} piece depicting ${piece.subject}`} loading="lazy" />
                <figcaption>{piece.subject}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
