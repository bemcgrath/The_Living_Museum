import { getSupabaseClient, Subscriber } from '../../lib/server/supabase';
import type { VercelRequest, VercelResponse } from '../../lib/server/types';
import { deliverArtworkEmail } from '../../lib/server/deliverArtwork';

const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;

/**
 * Triggered by Vercel Cron (see vercel.json) once a week. Generates one AI image per active/
 * trialing subscriber (personalized to their preferred style + favorite artist — see
 * lib/server/prompt.ts) and emails it via Resend.
 *
 * Skips anyone delivered to within the last 6 days — a subscriber who just started their trial
 * already got an immediate welcome piece (see api/webhooks/stripe.ts), so this avoids sending them
 * a second piece hours later if their signup happened to land right before this runs.
 *
 * Sequential, not parallel: this is a hobby-scale job (weekly cadence keeps per-subscriber image
 * cost low, see the cost-model discussion this was scoped against) and sequential keeps it simple
 * and easy to reason about if a run partially fails. Revisit with batching/concurrency limits if
 * the subscriber list grows large enough that a full run risks the function's execution time limit.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const supabase = getSupabaseClient();
  const cutoff = new Date(Date.now() - SIX_DAYS_MS).toISOString();
  const { data: subscribers, error } = await supabase
    .from('subscribers')
    .select('*')
    .in('status', ['trialing', 'active'])
    .or(`last_delivered_at.is.null,last_delivered_at.lt.${cutoff}`);
  if (error) {
    console.error('Failed to load subscribers', error);
    res.status(500).json({ error: 'Failed to load subscribers.' });
    return;
  }

  const results = { sent: 0, failed: 0 };
  for (const subscriber of (subscribers ?? []) as Subscriber[]) {
    try {
      await deliverArtworkEmail(subscriber, 'weekly');
      results.sent += 1;
    } catch (subscriberError) {
      // One subscriber's failure (e.g. a transient image-gen error) shouldn't stop the rest of the run.
      console.error(`Weekly art failed for subscriber ${subscriber.id}`, subscriberError);
      results.failed += 1;
    }
  }

  res.status(200).json(results);
}
