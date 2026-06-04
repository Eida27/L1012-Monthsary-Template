insert into public.l1012_sites (site_key, pin_hash, status)
values (
  'L1012-9281',
  'pbkdf2_sha256$310000$bDEwMTItOTI4MS12MQ$WMpz0dXhJDjkD8XLjkYvp4Ynffqkzte0xQtOwttpj7w',
  'active'
)
on conflict (site_key) do update
set
  pin_hash = excluded.pin_hash,
  status = excluded.status,
  updated_at = now();
