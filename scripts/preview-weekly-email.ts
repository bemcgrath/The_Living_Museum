/**
 * Local, no-account-needed preview of the weekly community email — run with:
 *   npx vite-node scripts/preview-weekly-email.ts [style] [favoriteArtistName]
 *
 * Examples:
 *   npx vite-node scripts/preview-weekly-email.ts impressionist "Claude Monet"
 *   npx vite-node scripts/preview-weekly-email.ts surprise
 *
 * Builds the same prompt/roster resolution the real cron job uses (lib/server/prompt.ts) and
 * renders the same email template (lib/server/emailTemplate.ts). If XAI_API_KEY or OPENAI_API_KEY
 * is set in the environment, it generates one real AI image (real cost, ~$0.02-0.07 — see
 * lib/server/imageProvider.ts) so you can see actual output. Otherwise it falls back to the
 * existing free procedural ArtGenerator as a stand-in placeholder, clearly labeled as such, so you
 * can see the email's layout/copy at zero cost before setting up any paid API key.
 *
 * Writes the result to docs/weekly-email-preview.html — open it in a browser to see it.
 */
import { writeFileSync } from 'node:fs';
import { ArtStyle, ART_STYLES } from '../src/models/Artwork';
import { RandomGenerator } from '../src/utils/RandomGenerator';
import { ArtGenerator } from '../src/utils/ArtGenerator';
import type { Subscriber } from '../lib/server/supabase';
import { resolveWeeklyProfile, buildImagePrompt, weeklyEmailSubject } from '../lib/server/prompt';
import { weeklyEmailHtml } from '../lib/server/emailTemplate';
import { generateArtworkImage, toBase64 } from '../lib/server/imageProvider';

async function main(): Promise<void> {
  const [, , styleArg, ...nameParts] = process.argv;
  const favoriteArtistRealName = nameParts.join(' ') || null;
  const preferredStyle = !styleArg || styleArg === 'surprise' ? null : (styleArg as ArtStyle);
  if (preferredStyle && !ART_STYLES.includes(preferredStyle)) {
    console.error(`Unknown style "${preferredStyle}". Valid: surprise, ${ART_STYLES.join(', ')}`);
    process.exit(1);
  }

  const subscriber: Subscriber = {
    id: 'preview-subscriber',
    email: 'preview@example.com',
    stripe_customer_id: null,
    stripe_subscription_id: null,
    status: 'trialing',
    preferred_style: preferredStyle,
    favorite_artist_real_name: favoriteArtistRealName,
    last_delivered_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { style, profile, subject } = resolveWeeklyProfile(subscriber);
  const prompt = buildImagePrompt(style, profile, subject);
  console.log(`Resolved: ${style} — ${profile.realName} ("${profile.name}")`);
  console.log(`Scene subject: ${subject}`);
  console.log(`Email subject: ${weeklyEmailSubject(style, profile, 'welcome')}`);
  console.log(`\nImage prompt that would be sent to the AI provider:\n  ${prompt}\n`);

  const hasApiKey = Boolean(process.env.XAI_API_KEY || process.env.OPENAI_API_KEY);
  let imageDataUrl: string;
  if (hasApiKey) {
    console.log(`Generating a REAL image via ${process.env.IMAGE_PROVIDER ?? 'xai'} (this costs real money — see lib/server/imageProvider.ts)...`);
    const image = await generateArtworkImage(prompt);
    const base64 = await toBase64(image);
    imageDataUrl = `data:image/png;base64,${base64}`;
    console.log('Real AI image generated.');
  } else {
    console.log('No XAI_API_KEY/OPENAI_API_KEY set — using the free procedural generator as a placeholder (no cost, no API call).');
    const seed = Math.abs(Array.from(profile.realName).reduce((sum, char) => sum + char.charCodeAt(0), 0));
    const rng = new RandomGenerator(seed);
    const svg = new ArtGenerator(seed).generateArt(style, rng.choice(['orbit', 'star', 'wave', 'grid', 'constellation']));
    imageDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  const html = weeklyEmailHtml({ style, profile, imageUrl: imageDataUrl, siteUrl: 'http://localhost:5173', kind: 'welcome' });
  const outputPath = new URL('../docs/weekly-email-preview.html', import.meta.url);
  writeFileSync(outputPath, html);
  console.log(`\nWrote preview to ${outputPath.pathname.replace(/^\/([A-Za-z]:)/, '$1')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
