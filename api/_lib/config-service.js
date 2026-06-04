import { randomUUID } from "node:crypto";

import {
  ASSET_SLOTS,
  ConfigError,
  addDays,
  isAllowedImageUpload,
  normalizeHost,
  sanitizeSiteConfig,
  verifyPin,
} from "./config-model.js";

const PIN_LOCK_THRESHOLD = 3;
const PIN_LOCK_MINUTES = 15;
const PENDING_UPLOAD_TTL_DAYS = 1;
const CONFIG_TTL_DAYS = 15;
const READ_URL_SECONDS = 60 * 60;

function iso(value) {
  return new Date(value).toISOString();
}

function isExpired(site, now) {
  return site?.expiresAt && new Date(site.expiresAt) <= now;
}

function privateAuthError() {
  return new ConfigError("Invalid site key or PIN.", 401);
}

function cleanAssetIds(assetIds) {
  return Array.from(
    new Set(
      (Array.isArray(assetIds) ? assetIds : [])
        .map((assetId) => String(assetId || "").trim())
        .filter(Boolean),
    ),
  );
}

function assetIdBySlot(assets) {
  return Object.fromEntries((assets || []).map((asset) => [asset.slot, asset.id]));
}

function buildConfigWithAssets(config, assets) {
  const bySlot = assetIdBySlot(assets);
  return {
    ...config,
    heroAssetId: bySlot.hero || config.heroAssetId || null,
    galleryAssetIds: ["gallery-1", "gallery-2", "gallery-3", "gallery-4"]
      .map((slot) => bySlot[slot])
      .filter(Boolean),
  };
}

function safeFilePart(fileName, contentType) {
  const fallbackExtension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }[String(contentType).toLowerCase()];
  const normalized = String(fileName || "photo")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
  const hasExtension = /\.[a-z0-9]{2,5}$/.test(normalized);
  const base = normalized || "photo";
  return hasExtension ? base : `${base}.${fallbackExtension || "jpg"}`;
}

export async function authenticateBuyer({ store, siteKey, pin, now }) {
  const cleanSiteKey = String(siteKey || "").trim();
  const cleanPin = String(pin || "").trim();
  if (!cleanSiteKey || !cleanPin) {
    throw privateAuthError();
  }

  const site = await store.getSiteByKey(cleanSiteKey);
  if (!site || site.status !== "active") {
    throw privateAuthError();
  }

  if (site.lockedUntil && new Date(site.lockedUntil) > now) {
    throw new ConfigError("Too many invalid attempts. Try again later.", 423);
  }

  const isValidPin = await verifyPin(cleanPin, site.pinHash);
  if (!isValidPin) {
    const failedPinAttempts = Number(site.failedPinAttempts || 0) + 1;
    const lockedUntil =
      failedPinAttempts >= PIN_LOCK_THRESHOLD
        ? iso(new Date(now.getTime() + PIN_LOCK_MINUTES * 60 * 1000))
        : null;

    await store.recordPinFailure?.(site.id, {
      failedPinAttempts,
      lockedUntil,
      lastPinFailureAt: iso(now),
    });
    throw privateAuthError();
  }

  await store.resetPinFailures?.(site.id);
  return site;
}

export async function readPublicConfig({ store, storage, host, now = new Date() }) {
  const normalizedHost = normalizeHost(host);
  const record = await store.getPublicSiteByHost(normalizedHost);
  if (!record?.site) {
    return { status: "unconfigured", config: null, assets: {}, expiresAt: null };
  }

  if (isExpired(record.site, now)) {
    return {
      status: "expired",
      config: null,
      assets: {},
      expiresAt: record.site.expiresAt,
    };
  }

  const config = sanitizeSiteConfig(record.site.config || {});
  const assets = record.assets || [];
  const signedUrls = await storage.createSignedReadUrls(
    assets.map((asset) => asset.storagePath),
    READ_URL_SECONDS,
  );
  const urlByPath = Object.fromEntries(
    signedUrls.map((entry) => [entry.path, entry.signedUrl]),
  );

  return {
    status: "configured",
    config,
    expiresAt: record.site.expiresAt,
    assets: Object.fromEntries(
      assets.map((asset) => [
        asset.slot,
        {
          id: asset.id,
          url: urlByPath[asset.storagePath],
        },
      ]),
    ),
  };
}

export async function readForEdit({
  store,
  siteKey,
  pin,
  host,
  now = new Date(),
}) {
  const site = await authenticateBuyer({ store, siteKey, pin, now });
  const normalizedHost = normalizeHost(host);
  await store.upsertHost?.(site.id, normalizedHost);
  const assets = await store.getRetainedAssets?.(site.id);

  return {
    status: "ready",
    config: sanitizeSiteConfig(site.config || {}),
    expiresAt: site.expiresAt,
    assetIds: (assets || []).map((asset) => asset.id),
  };
}

export async function saveConfig({
  store,
  siteKey,
  pin,
  host,
  config,
  assetIds,
  now = new Date(),
}) {
  const site = await authenticateBuyer({ store, siteKey, pin, now });
  if (isExpired(site, now)) {
    throw new ConfigError("This configuration has expired.", 410);
  }

  const normalizedHost = normalizeHost(host);
  const cleanIds = cleanAssetIds(assetIds);
  const assets = cleanIds.length ? await store.getAssetsByIds(site.id, cleanIds) : [];
  if (assets.length !== cleanIds.length) {
    throw new ConfigError("One or more uploaded photos were not found.");
  }

  const sanitized = buildConfigWithAssets(sanitizeSiteConfig(config || {}), assets);
  const firstSavedAt = site.firstSavedAt || iso(now);
  const expiresAt = iso(addDays(firstSavedAt, CONFIG_TTL_DAYS));

  await store.upsertHost(site.id, normalizedHost);
  const savedSite = await store.saveSiteConfig(site.id, {
    config: sanitized,
    firstSavedAt,
    expiresAt,
    retainedAssetIds: cleanIds,
  });

  return {
    status: "saved",
    config: sanitizeSiteConfig(savedSite.config || sanitized),
    expiresAt: savedSite.expiresAt || expiresAt,
    assetIds: cleanIds,
  };
}

export async function signUpload({
  store,
  storage,
  siteKey,
  pin,
  host,
  slot,
  fileName,
  contentType,
  sizeBytes,
  now = new Date(),
}) {
  const site = await authenticateBuyer({ store, siteKey, pin, now });
  if (isExpired(site, now)) {
    throw new ConfigError("This configuration has expired.", 410);
  }

  const normalizedHost = normalizeHost(host);
  if (!ASSET_SLOTS.has(slot)) {
    throw new ConfigError("Unknown photo slot.");
  }
  if (!isAllowedImageUpload({ contentType, sizeBytes })) {
    throw new ConfigError("Photo must be a JPG, PNG, or WebP image up to 5 MB.");
  }

  await store.upsertHost?.(site.id, normalizedHost);
  const safeName = safeFilePart(fileName, contentType);
  const storagePath = `sites/${site.id}/${slot}/${randomUUID()}-${safeName}`;
  const signed = await storage.createSignedUploadUrl(storagePath);
  const asset = await store.createPendingAsset(site.id, {
    slot,
    storagePath,
    originalName: String(fileName || safeName).slice(0, 180),
    contentType: String(contentType).toLowerCase(),
    sizeBytes: Number(sizeBytes),
    expiresAt: iso(addDays(now, PENDING_UPLOAD_TTL_DAYS)),
  });

  return {
    assetId: asset.id,
    path: signed.path || storagePath,
    signedUrl: signed.signedUrl,
    token: signed.token,
    uploadMethod: "PUT",
    expiresInSeconds: 2 * 60 * 60,
  };
}

export async function purgeExpired({ store, storage, now = new Date() }) {
  const expired = await store.listExpiredForPurge(now);
  const assetPaths = expired.assetPaths || [];
  const siteIds = expired.siteIds || [];

  if (assetPaths.length) {
    await storage.remove(assetPaths);
  }
  await store.deleteExpiredRecords(siteIds, assetPaths);

  return {
    deletedSites: siteIds.length,
    deletedAssets: assetPaths.length,
  };
}
