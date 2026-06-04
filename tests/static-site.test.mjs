import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import assert from "node:assert/strict";

const root = join(import.meta.dirname, "..");
const indexPath = join(root, "index.html");
const configPath = join(root, "config.html");
const stylesPath = join(root, "styles.css");
const scriptPath = join(root, "script.js");
const browserConfigPath = join(root, "browser-config.js");
const siteConfigPath = join(root, "site-config.js");
const configPagePath = join(root, "config-page.js");
const vercelPath = join(root, "vercel.json");
const supabaseSetupPath = join(root, "supabase", "setup.sql");

function readIndexHtml() {
  assert.ok(existsSync(indexPath), "index.html should exist");
  return readFileSync(indexPath, "utf8");
}

function readProjectFile(path, message) {
  assert.ok(existsSync(path), message);
  return readFileSync(path, "utf8");
}

describe("Our Little Corner static app", () => {
  test("uses the downloaded local Stitch image assets", () => {
    const indexHtml = readIndexHtml();
    const expectedAssets = [
      "assets/hero-couple-sunset.jpg",
      "assets/memory-holding-hands.jpg",
      "assets/memory-shoes-together.jpg",
      "assets/memory-coffee-date.jpg",
      "assets/memory-mirror-selfie.jpg",
    ];

    for (const asset of expectedAssets) {
      assert.match(indexHtml, new RegExp(`src="${asset}"`));
      assert.ok(statSync(join(root, asset)).size > 10_000);
    }

    assert.doesNotMatch(indexHtml, /aida-public|googleusercontent\.com/);
  });

  test("preserves the requested screen content and playful motion hooks", () => {
    const indexHtml = readIndexHtml();
    const stylesCss = readProjectFile(stylesPath, "styles.css should exist");
    const scriptJs = readProjectFile(scriptPath, "script.js should exist");

    assert.match(indexHtml, /<link href="styles\.css" rel="stylesheet"\s*\/>/);
    assert.match(indexHtml, /<script src="browser-config\.js"><\/script>/);
    assert.match(indexHtml, /<script src="site-config\.js"><\/script>/);
    assert.match(indexHtml, /<script src="script\.js"><\/script>/);
    assert.doesNotMatch(indexHtml, /<style[\s>]/i);
    assert.doesNotMatch(indexHtml, /<script(?![^>]*\bsrc=)/i);
    assert.doesNotMatch(indexHtml, /\sstyle=/i);

    for (const text of [
      "our little corner",
      "a private space for two hearts",
      "1st monthsary",
      "a note for you",
      "our favorite things",
      "bucket list",
      "memories made",
      "mavi + caeiona",
    ]) {
      assert.match(indexHtml, new RegExp(text.replace(/[+]/g, "\\+"), "i"));
    }

    assert.match(
      indexHtml,
      /07\s*(?:-|&bull;|\\u2022|\u2022|\u00e2\u20ac\u00a2)\s*02\s*(?:-|&bull;|\\u2022|\u2022|\u00e2\u20ac\u00a2)\s*2023/i,
    );
    assert.match(indexHtml, /data-action="theme"/);
    assert.match(indexHtml, /data-action="playlist"/);
    assert.match(indexHtml, /data-bucket-item/);
    assert.match(scriptJs, /createHeartBurst/);
    assert.match(indexHtml, /data-nav-target=/);
    assert.match(indexHtml, /aria-label="Show top"/);
    assert.match(indexHtml, /aria-label="Show note"/);
    assert.match(indexHtml, /aria-label="Show photos"/);
    assert.match(indexHtml, /aria-label="Show bucket list"/);
    assert.match(scriptJs, /data-nav-target/);
    assert.match(scriptJs, /scrollIntoView/);
    assert.match(scriptJs, /aria-current/);
    assert.match(scriptJs, /tailwind\.config/);
    assert.match(stylesCss, /prefers-reduced-motion/);
    assert.match(stylesCss, /\.icon-fill/);
  });

  test("ships buyer config page and clean /config Vercel routing", () => {
    const configHtml = readProjectFile(configPath, "config.html should exist");
    const browserConfig = readProjectFile(
      browserConfigPath,
      "browser-config.js should exist",
    );
    const configPage = readProjectFile(
      configPagePath,
      "config-page.js should exist",
    );
    const vercelJson = readProjectFile(vercelPath, "vercel.json should exist");

    assert.doesNotMatch(configHtml, /<style[\s>]/i);
    assert.doesNotMatch(configHtml, /<script(?![^>]*\bsrc=)/i);
    assert.doesNotMatch(configHtml, /\sstyle=/i);
    assert.match(configHtml, /data-config-form/);
    assert.match(configHtml, /name="siteKey"/);
    assert.match(configHtml, /name="pin"/);
    assert.match(configHtml, /name="monthsaryDate"/);
    assert.match(configHtml, /name="loveNote"/);
    assert.match(configHtml, /type="file"/);
    assert.match(configPage, /\/api\/config\/save/);
    assert.match(configPage, /\/api\/uploads\/sign/);
    assert.match(configPage, /signedUrl/);
    assert.match(browserConfig, /L1012_API_BASE_URL/);
    assert.doesNotMatch(browserConfig, /SUPABASE_SECRET|SERVICE_ROLE/i);

    const parsed = JSON.parse(vercelJson);
    assert.equal(parsed.cleanUrls, true);
  });

  test("homepage has config rendering hooks without exposing Supabase secrets", () => {
    const indexHtml = readIndexHtml();
    const siteConfig = readProjectFile(
      siteConfigPath,
      "site-config.js should exist",
    );
    const supabaseSetup = readProjectFile(
      supabaseSetupPath,
      "supabase/setup.sql should exist",
    );

    for (const hook of [
      'data-config-field="title"',
      'data-config-field="monthsaryDisplayDate"',
      'data-config-field="loveNote"',
      'data-config-list="favoriteThings"',
      'data-config-list="bucketList"',
      'data-config-list="memories"',
      'data-config-image="hero"',
    ]) {
      assert.match(indexHtml, new RegExp(hook));
    }

    assert.match(siteConfig, /\/api\/config/);
    assert.match(siteConfig, /window\.L1012_API_BASE_URL/);
    assert.match(siteConfig, /l1012:bucket-list-rendered/);
    assert.doesNotMatch(siteConfig, /SUPABASE_SECRET|SERVICE_ROLE/i);
    assert.match(supabaseSetup, /l1012_sites/);
    assert.match(supabaseSetup, /enable row level security/i);
    assert.match(supabaseSetup, /cron\.schedule/i);
    assert.match(supabaseSetup, /storage\.buckets/i);
  });
});
