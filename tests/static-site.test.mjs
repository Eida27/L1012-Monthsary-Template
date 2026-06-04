import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import assert from "node:assert/strict";

const root = join(import.meta.dirname, "..");
const indexPath = join(root, "index.html");
const stylesPath = join(root, "styles.css");
const scriptPath = join(root, "script.js");

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
    assert.match(scriptJs, /tailwind\.config/);
    assert.match(stylesCss, /prefers-reduced-motion/);
    assert.match(stylesCss, /\.icon-fill/);
  });
});
