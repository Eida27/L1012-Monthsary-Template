import { hashPin } from "../api/_lib/config-model.js";

const [siteKey, pin] = process.argv.slice(2);

if (!siteKey || !pin) {
  console.error("Usage: node scripts/generate-site-secret.mjs <site-key> <pin>");
  process.exit(1);
}

const pinHash = await hashPin(pin);

console.log(`insert into public.l1012_sites (site_key, pin_hash, status)
values ('${siteKey.replaceAll("'", "''")}', '${pinHash}', 'active')
on conflict (site_key) do update
set pin_hash = excluded.pin_hash,
    status = excluded.status,
    updated_at = now();`);
