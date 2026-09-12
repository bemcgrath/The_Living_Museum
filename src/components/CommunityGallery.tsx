/**
 * Full-screen archive of every piece the weekly community email has actually generated and sent
 * (see api/pieces.ts / lib/server/storeArtwork.ts). Unlike the in-app procedural gallery, this is
 * real AI-generated art fetched from the backend — so it only has content once the community
 * feature is deployed and at least one welcome/weekly piece has gone out (see SETUP.md).
 */
import { useEffect, useState } from 'react';
import { styleLabel } from '../models/Artwork';

interface Piece {
  id: string;
  style: string;
  subject: string;
  image_url: string;
  created_at: string;
}

type LoadState = 'loading' | 'loaded' | 'error';

export function CommunityGallery({ onExit }: { onExit: () => void }) {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/pieces')
      .then((response) => response.json().catch(() => null))
      .then((data: { pieces?: Piece[] } | null) => {
        if (cancelled) return;
        if (!data?.pieces) {
          setState('error');
          return;
        }
        setPieces(data.pieces);
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

  return (
    <div className="gallery-mode-overlay community-gallery-overlay" role="dialog" aria-modal="true" aria-label="Community gallery">
      <button className="gallery-mode-exit" onClick={onExit} title="Close (Esc)">Close</button>
      <div className="community-gallery-header">
        <p className="eyebrow">The community's collection</p>
        <h2>Weekly pieces, sent to subscribers</h2>
      </div>
      {state === 'loading' && <p className="community-gallery-status">Loading the community gallery…</p>}
      {state === 'error' && <p className="community-gallery-status">Couldn't load the community gallery right now.</p>}
      {state === 'loaded' && pieces.length === 0 && (
        <p className="community-gallery-status">No community pieces yet — the first weekly send will appear here.</p>
      )}
      {state === 'loaded' && pieces.length > 0 && (
        <div className="community-gallery-grid">
          {pieces.map((piece) => (
            <figure key={piece.id} className="community-gallery-card">
              <img src={piece.image_url} alt={`${styleLabel(piece.style)} piece depicting ${piece.subject}`} loading="lazy" />
              <figcaption>
                <strong>{styleLabel(piece.style)}</strong>
                <span>{piece.subject}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
