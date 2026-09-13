/**
 * A static reference of the museum's full roster of artist personas across every style — the "cast
 * list" shared by two otherwise-unconnected systems: which artists are available for your own
 * simulation runs (see App.tsx's createEngine/rosterForStyle), and whose spirit flavors the
 * AI-generated showcase pieces (see lib/server/prompt.ts, scripts/generate-showcase.ts). Nothing here
 * is fetched — GENRE_PROFILES is the same local data both systems already read from, just displayed
 * directly instead of used to drive generation. Never renders `realName` (internal only — see
 * genreProfiles.ts's doc comment).
 */
import { useEffect } from 'react';
import { ART_STYLES, ArtStyle, styleLabel } from '../models/Artwork';
import { GENRE_PROFILES, GenreProfile } from '../data/genreProfiles';

export function MeetTheArtists({
  onExit,
  onInviteArtist,
}: {
  onExit: () => void;
  /** Called with (style, artistName) when a visitor invites a listed artist into their own
   *  collection — see App.tsx's inviteArtistFromShowcase. This overlay closes itself afterward. */
  onInviteArtist?: (style: ArtStyle, artistName: string) => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onExit();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);

  function invite(style: ArtStyle, profile: GenreProfile): void {
    onInviteArtist?.(style, profile.name);
    onExit();
  }

  return (
    <div className="gallery-mode-overlay community-gallery-overlay" role="dialog" aria-modal="true" aria-label="Meet the Museum's Artists">
      <button className="gallery-mode-exit" onClick={onExit} title="Close (Esc)">Close</button>
      <div className="community-gallery-header">
        <p className="eyebrow">The full roster</p>
        <h2>Meet the Museum's Artists</h2>
        <p className="section-help">
          Every artist who can join your own collection, grouped by style. Pick a style (or search a name) in
          the toolbar to invite that genre's roster — the same names, in spirit, behind the real AI-generated
          showcase pieces above.
        </p>
      </div>
      {ART_STYLES.map((style) => (
        <div key={style} className="artist-roster-group">
          <h3 className="showcase-collection-title">{styleLabel(style)}</h3>
          <ul className="artist-roster-list">
            {GENRE_PROFILES[style].map((profile) => (
              <li key={profile.name} className="artist-roster-card">
                <div>
                  <strong>{profile.name}</strong>
                  <span>{profile.personality}</span>
                </div>
                {onInviteArtist && (
                  <button className="button-quiet small-btn" onClick={() => invite(style, profile)} title={`Prime your next collection with ${profile.name} as the lead artist`}>
                    Invite
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
