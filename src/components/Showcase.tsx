/**
 * A curated showcase of real AI-generated artwork, shown directly on the main page above the
 * subscribe form — proof-of-quality art for a visitor deciding whether to sign up (see
 * scripts/generate-showcase.ts, api/showcase.ts). Shows a pulsing skeleton while loading, then
 * renders nothing at all (not an empty-state message) if there's truly no featured collection with
 * at least one piece: this is an always-mounted block every visitor sees, not a modal someone opened
 * on purpose, so there's nothing worth showing before the first collection is generated.
 */
import { useEffect, useState } from 'react';
import { styleLabel } from '../models/Artwork';
import { PieceLightbox } from './PieceLightbox';

interface ShowcasePieceView {
  id: string;
  style: string;
  subject: string;
  image_url: string;
  artist_name: string | null;
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

function ShowcaseSkeleton() {
  return (
    <section className="showcase-panel" aria-hidden="true">
      <div className="showcase-header">
        <p className="eyebrow">Real pieces, really generated</p>
        <h2>Loading the showcase…</h2>
      </div>
      <div className="showcase-grid">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="showcase-skeleton-card" />
        ))}
      </div>
    </section>
  );
}

export function Showcase({ onBrowseAll }: { onBrowseAll?: () => void }) {
  const [collections, setCollections] = useState<ShowcaseCollectionView[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [selected, setSelected] = useState<{ piece: ShowcasePieceView; collectionName: string } | null>(null);

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

  if (state === 'loading') return <ShowcaseSkeleton />;
  if (state !== 'loaded') return null; // error, or nothing to show — stays silent, not stuck-loading
  const visible = collections.filter((collection) => collection.pieces.length > 0);
  if (visible.length === 0) return null;

  return (
    <section className="showcase-panel" id="showcase">
      <div className="showcase-header">
        <p className="eyebrow">Real pieces, really generated</p>
        <h2>{visible.length === 1 ? visible[0].name : 'From the collections'}</h2>
        <p className="section-help">
          Actual AI-generated art from the weekly email pipeline — not the in-app procedural simulation above.
          This is what a subscriber's weekly piece looks like.
        </p>
        {onBrowseAll && (
          <button className="button-quiet" onClick={onBrowseAll} title="Browse every showcase collection ever generated, not just what's featured here">
            Browse all collections
          </button>
        )}
      </div>
      {visible.map((collection) => (
        <div key={collection.id} className="showcase-collection">
          {visible.length > 1 && <h3 className="showcase-collection-title">{collection.name}</h3>}
          {collection.blurb && <p className="section-help">{collection.blurb}</p>}
          <div className="showcase-grid">
            {collection.pieces.map((piece) => (
              <figure
                key={piece.id}
                className="showcase-card"
                tabIndex={0}
                onClick={() => setSelected({ piece, collectionName: collection.name })}
                onKeyDown={(event) => event.key === 'Enter' && setSelected({ piece, collectionName: collection.name })}
              >
                <img src={piece.image_url} alt={`${styleLabel(piece.style)} piece depicting ${piece.subject}`} loading="lazy" />
                <figcaption>
                  <span>{piece.subject}</span>
                  {piece.artist_name && <span className="showcase-card-artist">by {piece.artist_name}</span>}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}
      <PieceLightbox
        piece={selected?.piece ?? null}
        collectionName={selected?.collectionName ?? ''}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}
