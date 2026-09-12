import Stripe from 'stripe';

export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY must be set (see .env.example).');
  return new Stripe(key);
}
