/**
 * Full-screen browse-everything view of every showcase collection ever generated, featured or not
 * (see scripts/generate-showcase.ts, api/collections.ts) — the "see everything" counterpart to
 * Showcase.tsx, which only shows the homepage's featured subset. Structurally mirrors
 * CommunityGallery.tsx (same overlay chrome, loading/error/empty states), but lists AI-generated
 * showcase pieces instead of pieces actually emailed to subscribers.
 */
import { useEffect, useState } from 'react';
import { styleLabel } from '../models/Artwork';
import { PieceLightbox } from './PieceLightbox';

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

function CollectionsSkeleton() {
  return (
    <div className="showcase-grid" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="showcase-skeleton-card" />
      ))}
    </div>
  );
}

export function AllShowcaseCollections({ onExit }: { onExit: () => void }) {
  const [collections, setCollections] = useState<ShowcaseCollectionView[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [selected, setSelected] = useState<{ piece: ShowcasePieceView; collectionName: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/collections')
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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onExit();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);

  const visible = collections.filter((collection) => collection.pieces.length > 0);

  return (
    <div className="gallery-mode-overlay community-gallery-overlay" role="dialog" aria-modal="true" aria-label="All showcase collections">
      <button className="gallery-mode-exit" onClick={onExit} title="Close (Esc)">Close</button>
      <div className="community-gallery-header">
        <p className="eyebrow">Every generated collection</p>
        <h2>Browse all collections</h2>
      </div>
      {state === 'loading' && <CollectionsSkeleton />}
      {state === 'error' && <p className="community-gallery-status">Couldn't load the collections right now.</p>}
      {state === 'loaded' && visible.length === 0 && (
        <p className="community-gallery-status">No showcase collections yet.</p>
      )}
      {state === 'loaded' && visible.map((collection) => (
        <div key={collection.id} className="showcase-collection">
          <h3 className="showcase-collection-title">{collection.name}</h3>
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
                <figcaption>{piece.subject}</figcaption>
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
    </div>
  );
}
