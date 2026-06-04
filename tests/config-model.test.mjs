import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_SITE_CONFIG,
  formatDisplayDate,
  hashPin,
  isAllowedImageUpload,
  normalizeHost,
  sanitizeSiteConfig,
  verifyPin,
} from "../api/_lib/config-model.js";

describe("config model", () => {
  test("normalizes buyer deployment hostnames consistently", () => {
    assert.equal(
      normalizeHost("HTTPS://Example.Vercel.App/config?edit=1"),
      "example.vercel.app",
    );
    assert.equal(normalizeHost("localhost:3000"), "localhost");
    assert.equal(normalizeHost("  Buyer-Site.vercel.app  "), "buyer-site.vercel.app");
  });

  test("sanitizes text config and keeps bounded list content", () => {
    const config = sanitizeSiteConfig({
      title: "  our little corner  ",
      partnerOneName: "  Mavi ",
      partnerTwoName: " Caeiona  ",
      monthsaryDate: "2023-07-02",
      loveNote: "  hello forever  ",
      favoriteThings: [" coffee dates ", "", "inside jokes"],
      bucketList: Array.from({ length: 20 }, (_, index) => `plan ${index + 1}`),
      memories: [" first coffee date "],
    });

    assert.equal(config.title, "our little corner");
    assert.equal(config.displayNames, "Mavi + Caeiona");
    assert.equal(config.monthsaryDisplayDate, "07 • 02 • 2023");
    assert.equal(config.loveNote, "hello forever");
    assert.deepEqual(config.favoriteThings, ["coffee dates", "inside jokes"]);
    assert.equal(config.bucketList.length, 12);
    assert.equal(config.memories[0], "first coffee date");
  });

  test("rejects invalid dates and unsafe upload metadata", () => {
    assert.throws(
      () => sanitizeSiteConfig({ ...DEFAULT_SITE_CONFIG, monthsaryDate: "2023-99-99" }),
      /monthsary date/i,
    );

    assert.equal(
      isAllowedImageUpload({
        contentType: "image/png",
        sizeBytes: 2_000_000,
      }),
      true,
    );
    assert.equal(
      isAllowedImageUpload({
        contentType: "application/pdf",
        sizeBytes: 2_000_000,
      }),
      false,
    );
    assert.equal(
      isAllowedImageUpload({
        contentType: "image/jpeg",
        sizeBytes: 8_000_000,
      }),
      false,
    );
  });

  test("hashes and verifies edit PINs without storing plaintext", async () => {
    const storedHash = await hashPin("493821", {
      salt: "test-salt",
      iterations: 10_000,
    });

    assert.match(storedHash, /^pbkdf2_sha256\$/);
    assert.doesNotMatch(storedHash, /493821/);
    assert.equal(await verifyPin("493821", storedHash), true);
    assert.equal(await verifyPin("000000", storedHash), false);
  });

  test("formats ISO dates for the romantic display date", () => {
    assert.equal(formatDisplayDate("2026-06-04"), "06 • 04 • 2026");
  });
});
