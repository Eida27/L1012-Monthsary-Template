import { pbkdf2 as pbkdf2Callback, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const pbkdf2 = promisify(pbkdf2Callback);

export const MAX_IMAGE_BYTES = 5_000_000;
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
export const ASSET_SLOTS = new Set([
  "hero",
  "gallery-1",
  "gallery-2",
  "gallery-3",
  "gallery-4",
]);

export const DEFAULT_SITE_CONFIG = Object.freeze({
  title: "our little corner",
  heroSubtitle: "a private space for two hearts",
  privacyLine: "only you and me.",
  partnerOneName: "mavi",
  partnerTwoName: "caeiona",
  displayNames: "mavi + caeiona",
  monthsaryDate: "2023-07-02",
  monthsaryDisplayDate: "07 • 02 • 2023",
  monthsaryLabel: "1st monthsary",
  loveNote:
    "our first monthsary and it already feels like home. thank you for choosing me every day. i love how we make the little things feel so special. no matter what happens, i'll always be here for you. i love you so much!",
  playlistNote:
    "soft playlist queued: late-night talks, coffee dates, and that little forever feeling.",
  favoriteThings: [
    "late night talks",
    "silly moments",
    "coffee dates",
    "road trips",
    "inside jokes",
    "comfort & hugs",
    "you",
  ],
  bucketList: [
    "stargazing at the park",
    "pottery workshop",
    "weekend beach trip",
    "trying that new ramen place",
    "midnight drive to nowhere",
  ],
  memories: ["stargazing at the park", "pottery workshop", "first coffee date"],
  heroAssetId: null,
  galleryAssetIds: [],
});

export class ConfigError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "ConfigError";
    this.statusCode = statusCode;
  }
}

function text(value, fallback, maxLength) {
  const candidate = typeof value === "string" ? value.trim() : "";
  const normalized = candidate || fallback || "";
  if (normalized.length > maxLength) {
    throw new ConfigError(`Text field exceeds ${maxLength} characters.`);
  }
  return normalized;
}

function stringList(value, fallback, maxItems, maxItemLength) {
  const source = Array.isArray(value) ? value : fallback;
  return source
    .map((item) => text(item, "", maxItemLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function formatDisplayDate(isoDate) {
  if (!isValidIsoDate(isoDate)) {
    throw new ConfigError("Monthsary date must be a valid YYYY-MM-DD date.");
  }
  const [year, month, day] = isoDate.split("-");
  return `${month} • ${day} • ${year}`;
}

export function normalizeHost(input) {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) {
    throw new ConfigError("Host is required.");
  }

  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let parsed;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new ConfigError("Host is invalid.");
  }

  const host = parsed.hostname.toLowerCase();
  if (!host || /\s/.test(host)) {
    throw new ConfigError("Host is invalid.");
  }
  return host;
}

export function sanitizeSiteConfig(input = {}) {
  const monthsaryDate = text(
    input.monthsaryDate,
    DEFAULT_SITE_CONFIG.monthsaryDate,
    10,
  );
  if (!isValidIsoDate(monthsaryDate)) {
    throw new ConfigError("Monthsary date must be a valid YYYY-MM-DD date.");
  }

  const partnerOneName = text(
    input.partnerOneName,
    DEFAULT_SITE_CONFIG.partnerOneName,
    80,
  );
  const partnerTwoName = text(
    input.partnerTwoName,
    DEFAULT_SITE_CONFIG.partnerTwoName,
    80,
  );
  const displayNames = text(
    input.displayNames,
    `${partnerOneName} + ${partnerTwoName}`,
    180,
  );

  return {
    title: text(input.title, DEFAULT_SITE_CONFIG.title, 100),
    heroSubtitle: text(
      input.heroSubtitle,
      DEFAULT_SITE_CONFIG.heroSubtitle,
      180,
    ),
    privacyLine: text(input.privacyLine, DEFAULT_SITE_CONFIG.privacyLine, 160),
    partnerOneName,
    partnerTwoName,
    displayNames,
    monthsaryDate,
    monthsaryDisplayDate: formatDisplayDate(monthsaryDate),
    monthsaryLabel: text(
      input.monthsaryLabel,
      DEFAULT_SITE_CONFIG.monthsaryLabel,
      80,
    ),
    loveNote: text(input.loveNote, DEFAULT_SITE_CONFIG.loveNote, 1200),
    playlistNote: text(
      input.playlistNote,
      DEFAULT_SITE_CONFIG.playlistNote,
      240,
    ),
    favoriteThings: stringList(
      input.favoriteThings,
      DEFAULT_SITE_CONFIG.favoriteThings,
      12,
      80,
    ),
    bucketList: stringList(
      input.bucketList,
      DEFAULT_SITE_CONFIG.bucketList,
      12,
      100,
    ),
    memories: stringList(input.memories, DEFAULT_SITE_CONFIG.memories, 12, 100),
    heroAssetId: typeof input.heroAssetId === "string" ? input.heroAssetId : null,
    galleryAssetIds: stringList(input.galleryAssetIds, [], 4, 80),
  };
}

export function isAllowedImageUpload({ contentType, sizeBytes }) {
  const size = Number(sizeBytes);
  return (
    ALLOWED_IMAGE_TYPES.has(String(contentType || "").toLowerCase()) &&
    Number.isFinite(size) &&
    size > 0 &&
    size <= MAX_IMAGE_BYTES
  );
}

function base64Url(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export async function hashPin(pin, options = {}) {
  const salt = options.salt
    ? Buffer.from(String(options.salt))
    : randomBytes(16);
  const iterations = Number(options.iterations || 310_000);
  const digest = await pbkdf2(String(pin), salt, iterations, 32, "sha256");
  return `pbkdf2_sha256$${iterations}$${base64Url(salt)}$${base64Url(digest)}`;
}

export async function verifyPin(pin, storedHash) {
  if (typeof storedHash !== "string") {
    return false;
  }
  const [algorithm, iterationsText, saltText, digestText] = storedHash.split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterationsText || !saltText || !digestText) {
    return false;
  }

  const iterations = Number(iterationsText);
  if (!Number.isInteger(iterations) || iterations < 1) {
    return false;
  }

  const salt = fromBase64Url(saltText);
  const expected = fromBase64Url(digestText);
  const actual = await pbkdf2(String(pin), salt, iterations, expected.length, "sha256");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
