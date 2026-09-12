import type { VercelRequest, VercelResponse } from '../lib/server/types';
import { ART_STYLES, ArtStyle } from '../src/models/Artwork';
import { findArtistByName } from '../src/data/genreProfiles';
import { getSupabaseClient, Subscriber } from '../lib/server/supabase';
import { getStripeClient } from '../lib/server/stripe';
import { deliverArtworkEmail } from '../lib/server/deliverArtwork';

// Defaults to requiring payment — an unset/misconfigured env var should never accidentally grant
// free access. Set SUBSCRIPTION_REQUIRES_PAYMENT=false to accept email-only signups instead (see
// .env.example for why you'd do that, and the note about keeping Subscribe.tsx's copy in sync).
function subscriptionRequiresPayment(): boolean {
  return process.env.SUBSCRIPTION_REQUIRES_PAYMENT !== 'false';
}

interface SubscribeBody {
  email?: string;
  /** An ArtStyle value, 'surprise', or omitted (treated as 'surprise'). */
  preferredStyle?: string;
  /** Optional free-text artist search — if it matches, it overrides preferredStyle with that artist's style. */
  favoriteArtistQuery?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body as SubscribeBody;
  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'A valid email is required.' });
    return;
  }

  let preferredStyle: ArtStyle | null = null;
  let favoriteArtistRealName: string | null = null;

  if (body.favoriteArtistQuery?.trim()) {
    const match = findArtistByName(body.favoriteArtistQuery);
    if (match) {
      preferredStyle = match.style;
      favoriteArtistRealName = match.profile.realName;
    }
    // An unrecognized search term is not an error here — we just fall through to preferredStyle
    // (or "surprise me"), same graceful behavior as the in-app search (see App.tsx).
  }
  if (!preferredStyle && body.preferredStyle && body.preferredStyle !== 'surprise') {
    if (!ART_STYLES.includes(body.preferredStyle as ArtStyle)) {
      res.status(400).json({ error: 'Unrecognized style.' });
      return;
    }
    preferredStyle = body.preferredStyle as ArtStyle;
  }

  try {
    const supabase = getSupabaseClient();
    const requiresPayment = subscriptionRequiresPayment();

    const { data: subscriber, error: upsertError } = await supabase
      .from('subscribers')
      .upsert(
        {
          email,
          preferred_style: preferredStyle,
          favorite_artist_real_name: favoriteArtistRealName,
          // Free mode has no Stripe checkout/webhook to flip this to 'trialing' later, so it must
          // start 'active' — that's also the status the weekly cron and subscriber-status checks key on.
          status: requiresPayment ? 'pending' : 'active',
        },
        { onConflict: 'email' },
      )
      .select()
      .single();
    if (upsertError || !subscriber) throw upsertError ?? new Error('Failed to create subscriber row.');

    if (!requiresPayment) {
      // Best-effort, same reasoning as the paid path's webhook-triggered welcome piece (see
      // api/webhooks/stripe.ts): nobody should sign up and wait up to a week to see anything, and a
      // transient image-gen/email hiccup shouldn't turn a successful signup into an error response.
      try {
        await deliverArtworkEmail(subscriber as Subscriber, 'welcome');
      } catch (welcomeError) {
        console.error(`Welcome piece failed for subscriber ${subscriber.id}`, welcomeError);
      }
      res.status(200).json({ success: true });
      return;
    }

    const stripe = getStripeClient();
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) throw new Error('STRIPE_PRICE_ID must be set (see .env.example).');
    const siteUrl = process.env.SITE_URL ?? 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { trial_period_days: 7 },
      success_url: `${siteUrl}/?subscribed=1`,
      cancel_url: `${siteUrl}/?subscribed=0`,
      metadata: { subscriberId: subscriber.id },
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('subscribe failed', error);
    res.status(500).json({ error: 'Something went wrong starting your subscription. Please try again.' });
  }
}
