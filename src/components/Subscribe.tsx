/**
 * The community subscribe form: free while we're building the list (no card, no Stripe involved —
 * see api/subscribe.ts's SUBSCRIPTION_REQUIRES_PAYMENT toggle), one AI-generated piece a week in the
 * subscriber's chosen genre (or "surprise me"). See lib/server/prompt.ts for how the weekly piece is
 * actually chosen and generated.
 *
 * NOTE: this copy is hardcoded for the free mode currently set in .env.example/SETUP.md. If
 * SUBSCRIPTION_REQUIRES_PAYMENT is flipped back to true, update this copy (and the response handling
 * below, which currently expects either {success:true} (free) or {url} (paid, redirects to Stripe)).
 */
import { FormEvent, useState } from 'react';
import { ART_STYLES, ArtStyle, styleLabel } from '../models/Artwork';

type Status = 'idle' | 'submitting' | 'success' | 'error';

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
      const data = await response.json().catch(() => null) as { url?: string; success?: boolean; error?: string } | null;
      if (!response.ok || !(data?.url || data?.success)) {
        throw new Error(data?.error ?? 'Something went wrong signing you up. Please try again.');
      }
      if (data.url) {
        window.location.href = data.url; // Paid mode only — off to Stripe Checkout.
        return;
      }
      setStatus('success');
    } catch (submitError) {
      setStatus('error');
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong.');
    }
  }

  if (status === 'success') {
    return (
      <section className="subscribe-panel">
        <div className="subscribe-header">
          <p className="eyebrow">Join the community</p>
          <h2>You're in!</h2>
          <p className="section-help">Check your inbox for your first piece — it's on its way.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="subscribe-panel" id="community">
      <div className="subscribe-header">
        <p className="eyebrow">Join the community</p>
        <h2>A weekly piece, delivered</h2>
        <p className="section-help">
          Free while we're testing — no card required. Pick a genre for your weekly AI-generated piece (or
          search for a favorite artist), or leave it on Surprise me for a natural mix.
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
          {status === 'submitting' ? 'Joining…' : 'Join for free'}
        </button>
      </form>
      {error && <p className="subscribe-error" role="alert">{error}</p>}
    </section>
  );
}
