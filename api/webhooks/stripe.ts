import type Stripe from 'stripe';
import { getStripeClient } from '../../lib/server/stripe';
import { getSupabaseClient, Subscriber, SubscriberStatus } from '../../lib/server/supabase';
import type { VercelRequest, VercelResponse } from '../../lib/server/types';
import { deliverArtworkEmail } from '../../lib/server/deliverArtwork';

// Stripe signature verification needs the raw request body — Vercel's default JSON body parsing
// would otherwise re-serialize it slightly differently and break the signature check.
export const config = { api: { bodyParser: false } };

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

function stripeStatusToSubscriberStatus(status: Stripe.Subscription.Status): SubscriberStatus {
  switch (status) {
    case 'trialing': return 'trialing';
    case 'active': return 'active';
    case 'past_due':
    case 'unpaid': return 'past_due';
    default: return 'canceled'; // canceled, incomplete, incomplete_expired, paused
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET must be set (see .env.example).');

  let event: Stripe.Event;
  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'];
    if (typeof signature !== 'string') throw new Error('Missing stripe-signature header.');
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error('Stripe webhook signature verification failed', error);
    res.status(400).json({ error: 'Invalid signature.' });
    return;
  }

  const supabase = getSupabaseClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriberId = session.metadata?.subscriberId;
        if (subscriberId && session.customer && session.subscription) {
          const { data: subscriber, error: updateError } = await supabase
            .from('subscribers')
            .update({
              stripe_customer_id: String(session.customer),
              stripe_subscription_id: String(session.subscription),
              status: 'trialing',
            })
            .eq('id', subscriberId)
            .select()
            .single();
          if (updateError) throw updateError;
          // Best-effort: nobody should sign up and wait up to a week to see their first piece.
          // A failure here shouldn't fail the whole webhook — the critical part (marking the
          // subscriber trialing) already succeeded above, and Stripe would otherwise retry the
          // whole event over a transient image-gen/email hiccup.
          if (subscriber) {
            try {
              await deliverArtworkEmail(subscriber as Subscriber, 'welcome');
            } catch (welcomeError) {
              console.error(`Welcome piece failed for subscriber ${subscriberId}`, welcomeError);
            }
          }
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await supabase
          .from('subscribers')
          .update({ status: stripeStatusToSubscriberStatus(subscription.status) })
          .eq('stripe_subscription_id', subscription.id);
        break;
      }
      default:
        break; // Other event types aren't relevant to subscriber status.
    }
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook handling failed', error);
    res.status(500).json({ error: 'Webhook handling failed.' });
  }
}
