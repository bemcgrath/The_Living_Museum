import { describe, expect, it } from 'vitest';
import { ART_STYLES } from '../models/Artwork';
import { GENRE_PROFILES, defaultRosterForStyle, findArtistByName, rosterForStyle } from './genreProfiles';

describe('genreProfiles', () => {
  it('gives every style at least 3 profiles, with no duplicate real names within a style', () => {
    for (const style of ART_STYLES) {
      const profiles = GENRE_PROFILES[style];
      expect(profiles.length).toBeGreaterThanOrEqual(3);
      expect(new Set(profiles.map((profile) => profile.realName)).size).toBe(profiles.length);
    }
  });

  it('matches a searched artist by a substring of their real name, case-insensitively', () => {
    expect(findArtistByName('monet')?.profile.realName).toBe('Claude Monet');
    expect(findArtistByName('CASSATT')?.style).toBe('impressionist');
    expect(findArtistByName('  picasso  ')?.style).toBe('cubist');
  });

  it('returns null for an unrecognized artist rather than guessing', () => {
    expect(findArtistByName('Nobody Famous')).toBeNull();
    expect(findArtistByName('')).toBeNull();
  });

  it('guarantees a prioritized artist is included in the roster, filling the rest from the style default', () => {
    const cassatt = GENRE_PROFILES.impressionist.find((profile) => profile.realName === 'Mary Cassatt')!;
    const roster = rosterForStyle('impressionist', cassatt);
    expect(roster).toHaveLength(3);
    expect(roster[0]).toBe(cassatt);
    expect(roster).toEqual(expect.arrayContaining([cassatt]));
  });

  it('falls back to the plain default roster when no artist is prioritized, or one from a different style', () => {
    const plain = rosterForStyle('impressionist');
    expect(plain).toEqual(defaultRosterForStyle('impressionist'));
    const wrongStyleArtist = GENRE_PROFILES.cubist[0];
    expect(rosterForStyle('impressionist', wrongStyleArtist)).toEqual(defaultRosterForStyle('impressionist'));
  });
});
