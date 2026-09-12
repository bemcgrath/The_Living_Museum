/**
 * Gallery Mode
 *
 * A full-screen, auto-advancing "tour" through the museum's displayed/acquired
 * works — the ambient, admin-chrome-free way to just watch the collection rather
 * than operate the dashboard. Walks the collection oldest-first so it reads as a
 * tour through the museum's history, looping back to the start once it catches up
 * to the newest piece; if the simulation is running live, newly displayed works
 * simply extend the tour as they arrive.
 */
import { useEffect, useState } from 'react';
import { Artwork, styleLabel } from '../models/Artwork';

interface GalleryModeProps {
  /** Oldest-first, already filtered to what the museum is actually showing (displayed/acquired). */
  artworks: Artwork[];
  agentName: (id: string) => string;
  onExit: () => void;
  intervalMs?: number;
}

export function GalleryMode({ artworks, agentName, onExit, intervalMs = 6000 }: GalleryModeProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (artworks.length === 0) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % artworks.length), intervalMs);
    return () => clearInterval(timer);
  }, [artworks.length, intervalMs]);

  useEffect(() => {
    // Keep pointing at a valid piece if the collection shrinks under us (e.g. a fresh run starts).
    if (index >= artworks.length) setIndex(0);
  }, [artworks.length, index]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onExit();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);

  const artwork = artworks[index];
  const advance = (): void => setIndex((current) => (current + 1) % artworks.length);

  return (
    <div className="gallery-mode-overlay" role="dialog" aria-modal="true" aria-label="Gallery mode">
      <button className="gallery-mode-exit" onClick={onExit} title="Exit gallery mode (Esc)">Exit gallery mode</button>
      {!artwork ? (
        <div className="gallery-mode-empty">
          <div className="empty-mark">✦</div>
          <strong>The first canvas is waiting to be made</strong>
          <p>Advance the simulation to fill the galleries, then come back to watch.</p>
        </div>
      ) : (
        <div
          key={artwork.id}
          className="gallery-mode-stage"
          onClick={advance}
          role="button"
          tabIndex={0}
          aria-label="Current gallery mode artwork — click for the next piece"
          title="Click to see the next piece"
          onKeyDown={(event) => event.key === 'Enter' && advance()}
        >
          <div className="gallery-mode-art" dangerouslySetInnerHTML={{ __html: artwork.svgData }} />
          <div className="gallery-mode-caption">
            <p className="eyebrow">{styleLabel(artwork.style)} · By {agentName(artwork.artist)}</p>
            <h2>{artwork.title}</h2>
            <p>{artwork.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}
