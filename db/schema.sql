-- The Living Museum — community/subscription schema (Supabase / Postgres)
--
-- One row per subscriber. Preferred style + a specific favorite artist (if they searched one via
-- findArtistByName) together drive which genre's agents generate their weekly emailed piece —
-- see lib/server/prompt.ts. `preferred_style` of null means "surprise me": the weekly cron picks a
-- style for that subscriber each week rather than using a fixed one.
create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  -- pending: checkout started but not confirmed yet (webhook hasn't landed).
  -- trialing / active: eligible for the weekly email.
  -- past_due / canceled: excluded from the weekly send.
  status text not null default 'pending'
    check (status in ('pending', 'trialing', 'active', 'past_due', 'canceled')),
  preferred_style text, -- an ArtStyle value (see src/models/Artwork.ts), or null for "surprise me"
  favorite_artist_real_name text, -- realName from a GenreProfile, only set if they searched a specific artist
  -- Set after every successful send (welcome or weekly) — lets the weekly cron skip anyone who just
  -- got their welcome piece hours earlier (see lib/server/deliverArtwork.ts / api/cron/weekly-art.ts).
  last_delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscribers_status_idx on subscribers (status);

-- Keep updated_at current on every row change.
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists subscribers_set_updated_at on subscribers;
create trigger subscribers_set_updated_at
  before update on subscribers
  for each row execute function set_updated_at();

-- One row per generated piece — the archive behind the community gallery (see api/pieces.ts,
-- src/components/CommunityGallery.tsx) and what a future "resend" feature would reuse instead of
-- paying to regenerate. subscriber_id is set null on delete so a piece survives its subscriber
-- being removed (e.g. after they unsubscribe), since it's part of the museum's shared history now.
create table if not exists pieces (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references subscribers(id) on delete set null,
  kind text not null check (kind in ('welcome', 'weekly')),
  style text not null, -- an ArtStyle value (see src/models/Artwork.ts)
  artist_real_name text not null,
  subject text not null,
  prompt text not null,
  image_path text not null, -- path within the 'artwork' Supabase Storage bucket (see SETUP.md)
  image_url text not null,  -- public URL, cached so the gallery doesn't need a Storage call per row
  created_at timestamptz not null default now()
);

create index if not exists pieces_created_at_idx on pieces (created_at desc);
