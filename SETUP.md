# Community feature — setup

The weekly-art community subscription (`src/components/Subscribe.tsx`, `api/`, `lib/server/`) needs
four external accounts. None of this can be created on your behalf — each requires your own
identity/billing. Once you have the keys, fill in `.env.local` (copy from `.env.example`) for local
testing, and set the same variables in the Vercel project's Environment Variables for production.

## 1. Supabase (subscriber database)

1. Create a project at supabase.com.
2. SQL Editor → run `db/schema.sql`.
3. Project Settings → API → copy the Project URL (`SUPABASE_URL`) and the **service role** key
   (`SUPABASE_SERVICE_ROLE_KEY` — not the anon key; these functions run server-side only).

## 2. Stripe (billing)

1. Create an account at stripe.com. Stay in **test mode** until everything works end to end.
2. Products → add a product → add a recurring price, $1.00/month → copy the Price ID
   (`STRIPE_PRICE_ID`). The 7-day trial is set at checkout time in code, not on the price itself.
3. Developers → API keys → copy the secret key (`STRIPE_SECRET_KEY`, starts `sk_test_...`).
4. Deploy the app first (step 5 below), then: Developers → Webhooks → add endpoint →
   `https://<your-domain>/api/webhooks/stripe` → select events `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted` → copy the signing secret
   (`STRIPE_WEBHOOK_SECRET`).

## 3. Resend (email delivery)

1. Create an account at resend.com.
2. Verify a sending domain (or use `onboarding@resend.dev` for early testing — real domain required
   before sending to non-test addresses at any volume).
3. API Keys → create one → `RESEND_API_KEY`.
4. Set `RESEND_FROM_EMAIL` to an address on your verified domain.

## 4. Image generation

Pick one (see `lib/server/imageProvider.ts`):

- **xAI Grok Imagine** (default, `IMAGE_PROVIDER=xai`, ~$0.05/image mid tier): create a key at
  console.x.ai → `XAI_API_KEY`.
- **OpenAI** (`IMAGE_PROVIDER=openai`, ~$0.07/image medium tier): create a key at
  platform.openai.com → `OPENAI_API_KEY`.

## 5. Deploy to Vercel

1. Import this repo at vercel.com/new.
2. Add all the env vars above, plus:
   - `CRON_SECRET` — any random string (a password generator works fine). Vercel automatically
     sends this as the `Authorization: Bearer <value>` header on cron invocations — no extra config
     needed once the env var is set.
   - `SITE_URL` — your deployed domain (used for links in emails and Stripe redirect URLs).
3. Deploy. The weekly cron (`vercel.json`) runs automatically once deployed — no manual setup.
4. Go back and finish step 2.4 above now that you have a real domain for the webhook endpoint.

## Previewing the email before setting anything up

`npx vite-node scripts/preview-weekly-email.ts [style] [favoriteArtistName]` renders the actual
email template locally with no accounts needed — e.g.
`npx vite-node scripts/preview-weekly-email.ts impressionist "Claude Monet"`. It prints the exact
image prompt that would be sent to the AI provider, and writes a viewable HTML file to
`docs/weekly-email-preview.html` (open it in a browser, or serve `docs/` locally since browsers
block `file://` navigation from automation tools — e.g. `python -m http.server` in that folder).

Without `XAI_API_KEY`/`OPENAI_API_KEY` set, it uses the free procedural `ArtGenerator` as a
stand-in placeholder image (no cost, no API call) so you can check the layout/copy. With a key set
in your shell environment, it generates one real AI image instead (real cost, ~$0.02–$0.07).

## Testing before going live

- Use [Stripe test cards](https://docs.stripe.com/testing) to subscribe through the actual form.
- Trigger the welcome email manually by completing a test checkout — it should arrive within
  moments (see `api/webhooks/stripe.ts`).
- Trigger the weekly cron manually via `vercel crons` (Vercel CLI) or by hitting
  `/api/cron/weekly-art` with `Authorization: Bearer <CRON_SECRET>` yourself, rather than waiting
  for Monday.
- Once confirmed working, switch Stripe from test mode to live mode (new live-mode API keys, price,
  and webhook endpoint — test-mode and live-mode are entirely separate in Stripe).
