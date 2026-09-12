import { ART_STYLES, ArtStyle, styleLabel } from '../../src/models/Artwork';
import { GENRE_PROFILES, GenreProfile, defaultRosterForStyle } from '../../src/data/genreProfiles';
import { RandomGenerator } from '../../src/utils/RandomGenerator';
import type { Subscriber } from './supabase';

/** A stable per-subscriber, per-week seed — same subscriber won't jump around if the cron reruns, but "surprise me" still varies week to week. */
function weeklySeed(subscriberId: string): number {
  const weekNumber = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
  let hash = weekNumber;
  for (let i = 0; i < subscriberId.length; i += 1) hash = (hash * 31 + subscriberId.charCodeAt(i)) | 0;
  return hash;
}

/** Resolves a subscriber's style + lead artist for this week's piece. */
export function resolveWeeklyProfile(subscriber: Subscriber): { style: ArtStyle; profile: GenreProfile } {
  const rng = new RandomGenerator(weeklySeed(subscriber.id));
  const style = (subscriber.preferred_style as ArtStyle | null) ?? rng.choice(ART_STYLES);

  if (subscriber.favorite_artist_real_name) {
    const match = GENRE_PROFILES[style].find((candidate) => candidate.realName === subscriber.favorite_artist_real_name);
    if (match) return { style, profile: match };
  }
  // No specific artist on file for this style (or "surprise me" landed on a different style than
  // whatever artist they originally searched) — pick from that style's default roster instead.
  return { style, profile: rng.choice(defaultRosterForStyle(style)) };
}

/**
 * Builds the actual image-generation prompt. Deliberately steers toward an original composition
 * "in the style of" the named influence rather than asking for a specific painting, consistent with
 * how the procedural generator's docstrings already frame these homages (see ArtGenerator.ts).
 */
export function buildImagePrompt(style: ArtStyle, profile: GenreProfile): string {
  return (
    `An original, museum-quality piece of ${styleLabel(style)} art, painted in the spirit of ` +
    `${profile.realName} (${profile.personality.toLowerCase()}). Square composition, richly detailed, ` +
    `evocative of the movement's colors and technique. Do not depict any real, identifiable person.`
  );
}

export function weeklyEmailSubject(style: ArtStyle, profile: GenreProfile, kind: 'welcome' | 'weekly' = 'weekly'): string {
  if (kind === 'welcome') return `Welcome! Your first ${styleLabel(style)} piece, in the spirit of ${profile.realName}`;
  return `Your weekly ${styleLabel(style)} piece, in the spirit of ${profile.realName}`;
}
