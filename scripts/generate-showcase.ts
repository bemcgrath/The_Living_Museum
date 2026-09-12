/**
 * Generates a curated showcase collection of real AI-generated pieces for display on the main page
 * (see src/components/Showcase.tsx, api/showcase.ts) — not tied to any subscriber, never emailed.
 *
 * Usage:
 *   npx vite-node scripts/generate-showcase.ts --style=impressionist --name="The Impressionist Room" --provider=openai --count=10
 *
 * Prints the full plan and a cost estimate, then exits WITHOUT spending anything or touching the
 * database unless --yes is also passed. There is deliberately no free placeholder fallback (unlike
 * scripts/preview-weekly-email.ts) — the entire point of this script is real AI-generated art.
 *
 * Flags:
 *   --style=<ArtStyle>   required
 *   --name="..."         required — public collection title
 *   --slug=...           default: slugified name — re-running the same slug tops up that collection
 *   --count=N            default 10 (1-25)
 *   --provider=openai|xai  default: process.env.IMAGE_PROVIDER, else 'xai'
 *   --blurb="..."        optional public one-line description
 *   --no-feature         by default the collection is featured (shown on the site) immediately
 *   --seed=N             default: hash of slug — controls artist/subject assignment, reproducible per slug
 *   --yes                required to actually spend money and write anything
 */
import { loadEnvLocal } from './loadEnvLocal';
loadEnvLocal();

import { ART_STYLES, ArtStyle } from '../src/models/Artwork';
import { GENRE_PROFILES, GenreProfile } from '../src/data/genreProfiles';
import { SUBJECT_PROMPTS, buildImagePrompt } from '../lib/server/prompt';
import { generateArtworkImage, toBase64 } from '../lib/server/imageProvider';
import { storeArtwork } from '../lib/server/storeArtwork';
import { upsertCollection } from '../lib/server/collections';
import { RandomGenerator } from '../src/utils/RandomGenerator';

interface Args {
  style: ArtStyle;
  name: string;
  slug: string;
  count: number;
  provider: 'openai' | 'xai';
  blurb: string | null;
  feature: boolean;
  seed: number;
  confirmed: boolean;
}

interface PlannedPiece {
  index: number;
  profile: GenreProfile;
  subject: string;
  prompt: string;
}

const COST_PER_IMAGE_USD: Record<'openai' | 'xai', number> = { openai: 0.07, xai: 0.05 };

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return hash;
}

function parseArgs(argv: string[]): Args {
  const flags = new Map<string, string | true>();
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq === -1) flags.set(arg.slice(2), true);
    else flags.set(arg.slice(2, eq), arg.slice(eq + 1));
  }

  const get = (key: string): string | undefined => {
    const value = flags.get(key);
    return typeof value === 'string' ? value : undefined;
  };

  const style = get('style');
  if (!style || !ART_STYLES.includes(style as ArtStyle)) {
    throw new Error(`--style is required and must be one of: ${ART_STYLES.join(', ')}`);
  }
  const name = get('name');
  if (!name) throw new Error('--name is required (the public collection title).');

  const count = Number(get('count') ?? '10');
  if (!Number.isInteger(count) || count < 1 || count > 25) {
    throw new Error('--count must be an integer between 1 and 25.');
  }

  const provider = (get('provider') ?? process.env.IMAGE_PROVIDER ?? 'xai') as 'openai' | 'xai';
  if (provider !== 'openai' && provider !== 'xai') {
    throw new Error(`--provider must be 'openai' or 'xai', got "${provider}".`);
  }

  const slug = get('slug') ?? slugify(name);
  const seed = get('seed') !== undefined ? Number(get('seed')) : hashSeed(slug);

  return {
    style: style as ArtStyle,
    name,
    slug,
    count,
    provider,
    blurb: get('blurb') ?? null,
    feature: !flags.has('no-feature'),
    seed,
    confirmed: flags.has('yes'),
  };
}

/**
 * Assigns each piece a real-artist profile and a scene subject, both from shuffled (seeded, so
 * reproducible per slug) copies of the full lists — cycling with modulo so a count larger than the
 * available profiles/subjects still spreads as evenly as possible instead of erroring or repeating
 * the same pairing back-to-back.
 */
function buildPlan(style: ArtStyle, count: number, seed: number): PlannedPiece[] {
  const rng = new RandomGenerator(seed);
  const profiles = rng.shuffle(GENRE_PROFILES[style]);
  const subjects = rng.shuffle(SUBJECT_PROMPTS);

  return Array.from({ length: count }, (_, index) => {
    const profile = profiles[index % profiles.length];
    const subject = subjects[index % subjects.length];
    return { index: index + 1, profile, subject, prompt: buildImagePrompt(style, profile, subject) };
  });
}

function requireEnv(names: string[]): void {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}. See .env.example / SETUP.md.`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const rate = COST_PER_IMAGE_USD[args.provider];
  const plan = buildPlan(args.style, args.count, args.seed);

  console.log(`Collection: "${args.name}" (slug: ${args.slug}), style: ${args.style}, provider: ${args.provider}`);
  console.log(`Featured on site: ${args.feature ? 'yes' : 'no'}\n`);
  console.log('Plan:');
  for (const piece of plan) {
    console.log(`  [${piece.index}/${plan.length}] ${piece.profile.name} — ${piece.subject}`);
  }
  console.log(`\nExample full prompt (piece 1):\n  ${plan[0].prompt}\n`);
  console.log(`Estimated cost: ${plan.length} x $${rate.toFixed(2)} = ~$${(plan.length * rate).toFixed(2)} (provider: ${args.provider})\n`);

  if (!args.confirmed) {
    console.log('Dry run only — nothing generated and nothing written. Re-run with --yes to actually spend the amount above.');
    return;
  }

  requireEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', args.provider === 'openai' ? 'OPENAI_API_KEY' : 'XAI_API_KEY']);
  process.env.IMAGE_PROVIDER = args.provider;

  const collection = await upsertCollection({
    slug: args.slug,
    name: args.name,
    style: args.style,
    blurb: args.blurb,
    feature: args.feature,
  });
  console.log(`Collection ready: ${collection.id} (${collection.featured_at ? 'featured' : 'not featured'})\n`);

  const results = { generated: 0, stored: 0, failed: 0 };
  for (const piece of plan) {
    try {
      const image = await generateArtworkImage(piece.prompt);
      const base64 = await toBase64(image);
      results.generated += 1; // Cost is incurred here — count it before the DB write so the running total stays honest even if storage then fails.

      try {
        const stored = await storeArtwork({
          subscriberId: null,
          kind: 'showcase',
          collectionId: collection.id,
          style: args.style,
          profile: piece.profile,
          subject: piece.subject,
          prompt: piece.prompt,
          imageBase64: base64,
        });
        results.stored += 1;
        console.log(`[${piece.index}/${plan.length}] ${piece.profile.name} — ${piece.subject} -> ${stored.id} ${stored.imageUrl}`);
      } catch (storeError) {
        // The image was already paid for and is now lost unless this piece is regenerated.
        console.error(`[${piece.index}/${plan.length}] PAID FOR but NOT SAVED (${piece.profile.name})`, storeError);
        results.failed += 1;
      }
    } catch (generateError) {
      console.error(`[${piece.index}/${plan.length}] generation failed (${piece.profile.name}) — no charge expected`, generateError);
      results.failed += 1;
    }
    console.log(`  running spend ~$${(results.generated * rate).toFixed(2)} of ~$${(plan.length * rate).toFixed(2)}`);
  }

  console.log(`\nDone: ${results.stored} stored, ${results.failed} failed, ~$${(results.generated * rate).toFixed(2)} spent.`);
  console.log(
    collection.featured_at
      ? `Featured — reload the site to see "${args.name}".`
      : `Not featured — set featured_at on collection ${collection.id} in Supabase to display it.`,
  );

  process.exit(results.stored === 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
