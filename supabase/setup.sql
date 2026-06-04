create extension if not exists pgcrypto;
create extension if not exists pg_cron;
create extension if not exists pg_net;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'l1012-media',
  'l1012-media',
  false,
  5000000,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.l1012_sites (
  id uuid primary key default gen_random_uuid(),
  site_key text not null unique,
  pin_hash text not null,
  status text not null default 'active' check (status in ('active', 'disabled')),
  config jsonb not null default '{}'::jsonb,
  failed_pin_attempts integer not null default 0,
  last_pin_failure_at timestamptz,
  locked_until timestamptz,
  first_saved_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.l1012_site_hosts (
  host text primary key,
  site_id uuid not null references public.l1012_sites(id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists l1012_site_hosts_site_id_idx
on public.l1012_site_hosts(site_id);

create table if not exists public.l1012_site_assets (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.l1012_sites(id) on delete cascade,
  slot text not null check (
    slot in ('hero', 'gallery-1', 'gallery-2', 'gallery-3', 'gallery-4')
  ),
  storage_path text not null unique,
  original_name text not null,
  content_type text not null check (
    content_type in ('image/jpeg', 'image/png', 'image/webp')
  ),
  size_bytes integer not null check (
    size_bytes > 0 and size_bytes <= 5000000
  ),
  is_retained boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists l1012_site_assets_site_id_idx
on public.l1012_site_assets(site_id);

create index if not exists l1012_site_assets_expires_at_idx
on public.l1012_site_assets(expires_at);

alter table public.l1012_sites enable row level security;
alter table public.l1012_site_hosts enable row level security;
alter table public.l1012_site_assets enable row level security;

revoke all on table public.l1012_sites from anon, authenticated;
revoke all on table public.l1012_site_hosts from anon, authenticated;
revoke all on table public.l1012_site_assets from anon, authenticated;

grant select, insert, update, delete on table public.l1012_sites to service_role;
grant select, insert, update, delete on table public.l1012_site_hosts to service_role;
grant select, insert, update, delete on table public.l1012_site_assets to service_role;

-- Replace the URL and bearer token before running this scheduled job in production.
-- The job calls the owner-controlled API so Storage objects are deleted through
-- the Storage API before the database rows are removed.
select cron.schedule(
  'l1012-purge-expired-configs',
  '0 18 * * *',
  $$
  select net.http_post(
    url := 'https://your-central-api.vercel.app/api/cron/purge-expired',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    ),
    body := '{}'::jsonb
  );
  $$
);
