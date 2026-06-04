import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { hashPin } from "../api/_lib/config-model.js";
import {
  purgeExpired,
  readPublicConfig,
  saveConfig,
  signUpload,
} from "../api/_lib/config-service.js";

function makeSite(overrides = {}) {
  return {
    id: "site-1",
    siteKey: "L1012-9281",
    status: "active",
    failedPinAttempts: 0,
    lockedUntil: null,
    firstSavedAt: null,
    expiresAt: null,
    config: {},
    ...overrides,
  };
}

describe("config service", () => {
  test("returns public config by hostname with signed photo URLs only", async () => {
    const store = {
      async getPublicSiteByHost(host) {
        assert.equal(host, "example.vercel.app");
        return {
          site: makeSite({
            firstSavedAt: "2026-06-04T00:00:00.000Z",
            expiresAt: "2026-06-19T00:00:00.000Z",
            config: { loveNote: "custom note", heroAssetId: "asset-hero" },
          }),
          assets: [
            {
              id: "asset-hero",
              slot: "hero",
              storagePath: "sites/site-1/hero/image.webp",
            },
          ],
        };
      },
    };
    const storage = {
      async createSignedReadUrls(paths) {
        return paths.map((path) => ({
          path,
          signedUrl: `https://signed.example/${encodeURIComponent(path)}`,
        }));
      },
    };

    const result = await readPublicConfig({
      store,
      storage,
      host: "https://example.vercel.app/",
      now: new Date("2026-06-05T00:00:00.000Z"),
    });

    assert.equal(result.status, "configured");
    assert.equal(result.config.loveNote, "custom note");
    assert.equal(
      result.assets.hero.url,
      "https://signed.example/sites%2Fsite-1%2Fhero%2Fimage.webp",
    );
    assert.doesNotMatch(JSON.stringify(result), /storagePath|sites\/site-1/);
  });

  test("fails closed for expired public configs", async () => {
    let signed = false;
    const result = await readPublicConfig({
      store: {
        async getPublicSiteByHost() {
          return {
            site: makeSite({ expiresAt: "2026-06-03T00:00:00.000Z" }),
            assets: [{ storagePath: "expired/path.jpg" }],
          };
        },
      },
      storage: {
        async createSignedReadUrls() {
          signed = true;
          return [];
        },
      },
      host: "example.vercel.app",
      now: new Date("2026-06-04T00:00:00.000Z"),
    });

    assert.equal(result.status, "expired");
    assert.equal(signed, false);
  });

  test("saves sanitized config after PIN validation and starts first-save expiry", async () => {
    const pinHash = await hashPin("493821", {
      salt: "save-test",
      iterations: 10_000,
    });
    const saved = {};
    const store = {
      async getSiteByKey(siteKey) {
        assert.equal(siteKey, "L1012-9281");
        return makeSite({ pinHash });
      },
      async resetPinFailures(siteId) {
        saved.resetSiteId = siteId;
      },
      async recordPinFailure() {
        throw new Error("should not fail valid PIN");
      },
      async upsertHost(siteId, host) {
        saved.host = { siteId, host };
      },
      async getAssetsByIds(siteId, assetIds) {
        assert.equal(siteId, "site-1");
        assert.deepEqual(assetIds, ["asset-hero"]);
        return [{ id: "asset-hero", slot: "hero", storagePath: "hero.jpg" }];
      },
      async saveSiteConfig(siteId, payload) {
        saved.siteId = siteId;
        saved.payload = payload;
        return { ...makeSite(), ...payload };
      },
    };

    const result = await saveConfig({
      store,
      siteKey: "L1012-9281",
      pin: "493821",
      host: "EXAMPLE.vercel.app",
      config: {
        partnerOneName: "Mavi",
        partnerTwoName: "Caeiona",
        monthsaryDate: "2023-07-02",
        loveNote: "Saved from config",
        favoriteThings: ["coffee"],
        bucketList: ["beach"],
        memories: ["first date"],
      },
      assetIds: ["asset-hero"],
      now: new Date("2026-06-04T12:00:00.000Z"),
    });

    assert.equal(result.status, "saved");
    assert.equal(saved.host.host, "example.vercel.app");
    assert.equal(saved.payload.firstSavedAt, "2026-06-04T12:00:00.000Z");
    assert.equal(saved.payload.expiresAt, "2026-06-19T12:00:00.000Z");
    assert.equal(saved.payload.config.displayNames, "Mavi + Caeiona");
    assert.deepEqual(saved.payload.retainedAssetIds, ["asset-hero"]);
  });

  test("records failed PIN attempts without returning private details", async () => {
    const pinHash = await hashPin("493821", {
      salt: "bad-pin",
      iterations: 10_000,
    });
    const failures = [];

    await assert.rejects(
      () =>
        saveConfig({
          store: {
            async getSiteByKey() {
              return makeSite({ pinHash, failedPinAttempts: 2 });
            },
            async recordPinFailure(siteId, details) {
              failures.push({ siteId, details });
            },
          },
          siteKey: "L1012-9281",
          pin: "111111",
          host: "example.vercel.app",
          config: {},
          assetIds: [],
          now: new Date("2026-06-04T12:00:00.000Z"),
        }),
      /invalid site key or pin/i,
    );

    assert.equal(failures[0].siteId, "site-1");
    assert.equal(failures[0].details.failedPinAttempts, 3);
    assert.ok(failures[0].details.lockedUntil);
  });

  test("signs uploads only after auth and stores pending asset metadata", async () => {
    const pinHash = await hashPin("493821", {
      salt: "upload-test",
      iterations: 10_000,
    });
    const created = {};
    const result = await signUpload({
      store: {
        async getSiteByKey() {
          return makeSite({ pinHash });
        },
        async resetPinFailures() {},
        async recordPinFailure() {},
        async createPendingAsset(siteId, asset) {
          created.siteId = siteId;
          created.asset = asset;
          return { id: "asset-upload", ...asset };
        },
      },
      storage: {
        async createSignedUploadUrl(path) {
          return {
            path,
            token: "signed-token",
            signedUrl: `https://upload.example/${encodeURIComponent(path)}`,
          };
        },
      },
      siteKey: "L1012-9281",
      pin: "493821",
      host: "example.vercel.app",
      slot: "hero",
      fileName: "Hero Photo.JPG",
      contentType: "image/jpeg",
      sizeBytes: 2_500_000,
      now: new Date("2026-06-04T12:00:00.000Z"),
    });

    assert.equal(result.assetId, "asset-upload");
    assert.equal(result.token, "signed-token");
    assert.equal(result.uploadMethod, "PUT");
    assert.match(created.asset.storagePath, /^sites\/site-1\/hero\//);
    assert.equal(created.asset.expiresAt, "2026-06-05T12:00:00.000Z");
  });

  test("purges expired storage objects through Storage API before deleting rows", async () => {
    const calls = [];
    const result = await purgeExpired({
      store: {
        async listExpiredForPurge(now) {
          assert.equal(now.toISOString(), "2026-06-20T00:00:00.000Z");
          return {
            siteIds: ["site-1"],
            assetPaths: ["sites/site-1/hero.jpg", "sites/site-1/gallery.jpg"],
          };
        },
        async deleteExpiredRecords(siteIds, assetPaths) {
          calls.push(["deleteRows", siteIds, assetPaths]);
        },
      },
      storage: {
        async remove(paths) {
          calls.push(["removeStorage", paths]);
        },
      },
      now: new Date("2026-06-20T00:00:00.000Z"),
    });

    assert.deepEqual(calls[0], [
      "removeStorage",
      ["sites/site-1/hero.jpg", "sites/site-1/gallery.jpg"],
    ]);
    assert.equal(calls[1][0], "deleteRows");
    assert.deepEqual(result, {
      deletedSites: 1,
      deletedAssets: 2,
    });
  });
});
