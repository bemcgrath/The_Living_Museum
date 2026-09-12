/**
 * The community subscribe form: $1/month, 7-day free trial, one AI-generated piece a week in the
 * subscriber's chosen genre (or "surprise me"). Posts to api/subscribe.ts, which creates the
 * Supabase subscriber row and a Stripe Checkout session, then redirects to Stripe to collect
 * payment. See lib/server/prompt.ts for how the weekly piece is actually chosen and generated.
 */
import { FormEvent, useState } from 'react';
import { ART_STYLES, ArtStyle, styleLabel } from '../models/Artwork';

type Status = 'idle' | 'submitting' | 'error';

export function Subscribe() {
  const [email, setEmail] = useState('');
  const [preferredStyle, setPreferredStyle] = useState<ArtStyle | 'surprise'>('surprise');
  const [favoriteArtistQuery, setFavoriteArtistQuery] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setStatus('submitting');
    setError(null);
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, preferredStyle, favoriteArtistQuery: favoriteArtistQuery || undefined }),
      });
      // A non-JSON body (e.g. an HTML error page from a misconfigured/undeployed backend) shouldn't
      // surface a raw parser error to the user — fall back to a friendly generic message instead.
      const data = await response.json().catch(() => null) as { url?: string; error?: string } | null;
      if (!response.ok || !data?.url) throw new Error(data?.error ?? 'Something went wrong starting your trial. Please try again.');
      window.location.href = data.url; // Off to Stripe Checkout.
    } catch (submitError) {
      setStatus('error');
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong.');
    }
  }

  return (
    <section className="subscribe-panel">
      <div className="subscribe-header">
        <p className="eyebrow">Join the community</p>
        <h2>A weekly piece, delivered</h2>
        <p className="section-help">
          $1/month after a 7-day free trial. Pick a genre for your weekly AI-generated piece (or search for a
          favorite artist), or leave it on Surprise me for a natural mix. Cancel anytime.
        </p>
      </div>
      <form className="subscribe-form" onSubmit={handleSubmit}>
        <label className="filter-control">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            aria-label="Email address"
          />
        </label>
        <label className="filter-control">
          Genre
          <select
            aria-label="Preferred genre for your weekly piece"
            value={preferredStyle}
            onChange={(event) => setPreferredStyle(event.target.value as ArtStyle | 'surprise')}
          >
            <option value="surprise">Surprise me (all styles)</option>
            {ART_STYLES.map((style) => (
              <option key={style} value={style}>{styleLabel(style)}</option>
            ))}
          </select>
        </label>
        <label className="filter-control">
          Favorite artist (optional)
          <input
            value={favoriteArtistQuery}
            onChange={(event) => setFavoriteArtistQuery(event.target.value)}
            placeholder="e.g. Monet"
            aria-label="Favorite artist (optional) — overrides the genre above if recognized"
          />
        </label>
        <button className="button-primary" type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Starting your trial…' : 'Start free trial — $1/mo after'}
        </button>
      </form>
      {error && <p className="subscribe-error" role="alert">{error}</p>}
    </section>
  );
}
