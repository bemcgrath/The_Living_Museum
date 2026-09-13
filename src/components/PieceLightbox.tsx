/**
 * Shared "click a piece to see it enlarged" modal for real AI-generated showcase pieces (as opposed
 * to the main gallery's rich artwork modal in App.tsx, which is built around the simulation's data
 * model — artist agent, critic score, turn number — none of which exists for showcase pieces by
 * design; see Showcase.tsx and AllShowcaseCollections.tsx, its two callers). Reuses the app's
 * existing .modal-backdrop/.modal/.close-button pattern verbatim (see App.tsx's artwork detail
 * modal) and the Escape-to-close pattern already used in CommunityGallery.tsx.
 */
import { useEffect } from 'react';
import { styleLabel } from '../models/Artwork';

export interface LightboxPiece {
  style: string;
  subject: string;
  image_url: string;
}

export function PieceLightbox({
  piece,
  collectionName,
  onClose,
}: {
  piece: LightboxPiece | null;
  collectionName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!piece) return;
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [piece, onClose]);

  if (!piece) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="showcase-piece-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="close-button" onClick={onClose} aria-label="Close">Close</button>
        <img
          className="showcase-lightbox-image"
          src={piece.image_url}
          alt={`${styleLabel(piece.style)} piece depicting ${piece.subject}`}
        />
        <h2 id="showcase-piece-title">{styleLabel(piece.style)}</h2>
        <p>{piece.subject}</p>
        <p className="section-help">Part of {collectionName}</p>
      </section>
    </div>
  );
}
