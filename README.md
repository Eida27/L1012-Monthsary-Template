# L1012 Monthsary Template

## Buyer Setup

GitHub Repository: https://github.com/Eida27/L1012-Monthsary-Template.git

Site Key: `L1012-9281`

Edit PIN: `493821`

1. Deploy the repository to Vercel.
2. Open `/config` on the deployed site.
3. Enter the Site Key and Edit PIN.
4. Fill in the names, monthsary date, love note, bucket list, favorite things, memories, and photos.
5. Save.
6. Send the homepage link.

The homepage fetches the saved config by hostname, so the girlfriend receives the plain deployed URL.

## Owner Setup

1. Deploy this repo to the owner-controlled Vercel project that will host the central API.
2. Set these owner Vercel environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
   - `SUPABASE_MEDIA_BUCKET=l1012-media`
   - `CRON_SECRET`
3. Run `supabase/setup.sql` in the owner Supabase project.
4. Replace the placeholder URL and bearer token in the `cron.schedule` block before enabling the scheduled purge.
5. Run `supabase/seed-l1012.sql` to create the first buyer credential.
6. Replace `window.L1012_API_BASE_URL` in `browser-config.js` with the owner API URL before distributing buyer copies.

Use `node scripts/generate-site-secret.mjs <site-key> <pin>` to generate future buyer seed SQL without storing plaintext PINs.
