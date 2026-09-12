import { getSupabaseClient, type Subscriber } from './supabase';
import { generateArtworkImage, toBase64 } from './imageProvider';
import { resolveWeeklyProfile, buildImagePrompt, weeklyEmailSubject } from './prompt';
import { weeklyEmailHtml } from './emailTemplate';
import { getResendClient, getFromAddress } from './resend';
import { storeArtwork } from './storeArtwork';

/**
 * Generates and emails one subscriber's personalized piece. Shared by the immediate "welcome"
 * delivery (api/webhooks/stripe.ts, fired right when a trial starts — nobody should sign up and
 * then wait up to a week to see anything) and the recurring weekly send (api/cron/weekly-art.ts).
 */
export async function deliverArtworkEmail(subscriber: Subscriber, kind: 'welcome' | 'weekly' = 'weekly'): Promise<void> {
  const { style, profile, subject } = resolveWeeklyProfile(subscriber);
  const prompt = buildImagePrompt(style, profile, subject);
  const image = await generateArtworkImage(prompt);
  const base64 = await toBase64(image);
  const siteUrl = process.env.SITE_URL ?? 'http://localhost:5173';

  // Best-effort: archiving the piece for the community gallery shouldn't block the email itself —
  // a subscriber's inbox delivery matters more than the archive copy.
  try {
    await storeArtwork({ subscriberId: subscriber.id, kind, style, profile, subject, prompt, imageBase64: base64 });
  } catch (storeError) {
    console.error(`Failed to archive piece for subscriber ${subscriber.id}`, storeError);
  }

  const resend = getResendClient();
  await resend.emails.send({
    from: getFromAddress(),
    to: subscriber.email,
    subject: weeklyEmailSubject(style, profile, kind),
    html: weeklyEmailHtml({ style, profile, imageUrl: 'cid:artwork', siteUrl, kind }),
    attachments: [{ filename: 'artwork.png', content: base64, inlineContentId: 'artwork' }],
  });

  await getSupabaseClient()
    .from('subscribers')
    .update({ last_delivered_at: new Date().toISOString() })
    .eq('id', subscriber.id);
}
