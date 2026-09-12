import { createClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client, using the service role key so these functions can manage
 * subscribers without RLS getting in the way. Never import this from browser code — see
 * .env.example for why SUPABASE_SERVICE_ROLE_KEY must stay server-side.
 */
export function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.example).');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export type SubscriberStatus = 'pending' | 'trialing' | 'active' | 'past_due' | 'canceled';

export interface Subscriber {
  id: string;
  email: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriberStatus;
  preferred_style: string | null;
  favorite_artist_real_name: string | null;
  last_delivered_at: string | null;
  created_at: string;
  updated_at: string;
}
