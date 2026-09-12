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

/**
 * Generic scene subjects, rotated per piece. Without this, an "in the spirit of <artist>" prompt
 * left to pick its own subject tends to default to that artist's single most famous, most-trained-on
 * composition (e.g. Monet -> a woman with a parasol in a garden, which is uncomfortably close to his
 * actual "Woman with a Parasol" series) instead of a genuinely new scene. Forcing a concrete, varied
 * subject is the main defense against that, alongside the explicit "not a reproduction" instruction
 * below.
 *
 * Also used to spread subjects across a curated showcase collection (scripts/generate-showcase.ts)
 * so a batch of pieces doesn't repeat the same scene.
 */
export const SUBJECT_PROMPTS = [
  'a sunlit landscape with rolling hills',
  'a quiet harbor at rest, boats gently rocking',
  'a wildflower meadow under shifting afternoon light',
  'a bustling urban street scene',
  'a still life of fruit and flowers on a wooden table',
  'a tree-lined riverside path',
  'a coastal cliffside at sunset',
  'a rustic farmhouse and surrounding fields',
  'an open-air market scene',
  'a quiet, sunlit domestic interior',
  'a mountain vista at dawn',
  'a lone figure walking through an autumn forest',
];

/** Resolves a subscriber's style, lead artist, and scene subject for this week's piece. */
export function resolveWeeklyProfile(subscriber: Subscriber): { style: ArtStyle; profile: GenreProfile; subject: string } {
  const rng = new RandomGenerator(weeklySeed(subscriber.id));
  const style = (subscriber.preferred_style as ArtStyle | null) ?? rng.choice(ART_STYLES);
  const subject = rng.choice(SUBJECT_PROMPTS);

  if (subscriber.favorite_artist_real_name) {
    const match = GENRE_PROFILES[style].find((candidate) => candidate.realName === subscriber.favorite_artist_real_name);
    if (match) return { style, profile: match, subject };
  }
  // No specific artist on file for this style (or "surprise me" landed on a different style than
  // whatever artist they originally searched) — pick from that style's default roster instead.
  return { style, profile: rng.choice(defaultRosterForStyle(style)), subject };
}

/**
 * Builds the actual image-generation prompt. Deliberately steers toward an original composition
 * "in the style of" the named influence rather than asking for a specific painting, consistent with
 * how the procedural generator's docstrings already frame these homages (see ArtGenerator.ts).
 *
 * Two defenses against the model reproducing an actual real painting: a concrete, rotated `subject`
 * (see SUBJECT_PROMPTS above) so it isn't left to default to the artist's most famous composition,
 * plus an explicit instruction forbidding reproduction of any specific known work.
 */
export function buildImagePrompt(style: ArtStyle, profile: GenreProfile, subject: string): string {
  // profile.realName is internal-only (see genreProfiles.ts) — used here to drive the AI prompt,
  // but this string is sent to the image-generation API, never shown to a subscriber.
  const descriptor = profile.personality.toLowerCase();
  return (
    `An entirely original, newly invented ${styleLabel(style)} scene depicting ${subject}, painted in the spirit of ` +
    `${profile.realName} — ${descriptor}. Square composition, richly detailed, evocative of the movement's colors ` +
    `and technique. This must be a wholly new composition — NOT a reproduction, recreation, or close imitation of ` +
    `any specific existing painting by this or any other artist. Do not replicate well-known compositions, subjects, ` +
    `or motifs strongly associated with this artist's famous individual works. Do not depict any real, identifiable person.`
  );
}

// profile.name (the fictional agent, e.g. "Oscar") is what's public — profile.realName never appears
// in subscriber-facing text; see the "internal only" note on GenreProfile in genreProfiles.ts.
export function weeklyEmailSubject(style: ArtStyle, profile: GenreProfile, kind: 'welcome' | 'weekly' = 'weekly'): string {
  if (kind === 'welcome') return `Welcome! Your first ${styleLabel(style)} piece, from ${profile.name}`;
  return `Your weekly ${styleLabel(style)} piece, from ${profile.name}`;
}
