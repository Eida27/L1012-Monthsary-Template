import { createClient } from "@supabase/supabase-js";

import { ConfigError } from "./config-model.js";

function requireEnv(name, env) {
  const value = env[name];
  if (!value) {
    throw new ConfigError(`${name} is not configured.`, 500);
  }
  return value;
}

function assertNoError(result, action) {
  if (result.error) {
    throw new ConfigError(`${action}: ${result.error.message}`, 500);
  }
  return result.data;
}

function toSite(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    siteKey: row.site_key,
    pinHash: row.pin_hash,
    status: row.status,
    failedPinAttempts: row.failed_pin_attempts,
    lockedUntil: row.locked_until,
    firstSavedAt: row.first_saved_at,
    expiresAt: row.expires_at,
    config: row.config || {},
  };
}

function toAsset(row) {
  return {
    id: row.id,
    slot: row.slot,
    storagePath: row.storage_path,
    originalName: row.original_name,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    expiresAt: row.expires_at,
  };
}

export function createSupabaseAdminClient(env = process.env) {
  const supabaseUrl = requireEnv("SUPABASE_URL", env);
  const supabaseSecretKey = requireEnv("SUPABASE_SECRET_KEY", env);
  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "X-Client-Info": "l1012-central-api" },
    },
  });
}

export function createSupabaseContext(env = process.env) {
  const supabase = createSupabaseAdminClient(env);
  const bucket = requireEnv("SUPABASE_MEDIA_BUCKET", env);
  return {
    store: createSupabaseStore(supabase),
    storage: createSupabaseStorage(supabase, bucket),
  };
}

export function createSupabaseStorage(supabase, bucket) {
  const storage = supabase.storage.from(bucket);
  return {
    async createSignedReadUrls(paths, seconds) {
      if (!paths.length) {
        return [];
      }
      const data = assertNoError(
        await storage.createSignedUrls(paths, seconds),
        "Could not sign photo URLs",
      );
      return data.map((entry) => ({
        path: entry.path,
        signedUrl: entry.signedUrl,
      }));
    },
    async createSignedUploadUrl(path) {
      const data = assertNoError(
        await storage.createSignedUploadUrl(path),
        "Could not sign upload URL",
      );
      return {
        path: data.path || path,
        token: data.token,
        signedUrl: data.signedUrl,
      };
    },
    async remove(paths) {
      if (!paths.length) {
        return;
      }
      assertNoError(await storage.remove(paths), "Could not delete expired photos");
    },
  };
}

export function createSupabaseStore(supabase) {
  return {
    async getSiteByKey(siteKey) {
      const data = assertNoError(
        await supabase
          .from("l1012_sites")
          .select(
            "id, site_key, pin_hash, status, failed_pin_attempts, locked_until, first_saved_at, expires_at, config",
          )
          .eq("site_key", siteKey)
          .maybeSingle(),
        "Could not load site credentials",
      );
      return toSite(data);
    },

    async recordPinFailure(siteId, details) {
      assertNoError(
        await supabase
          .from("l1012_sites")
          .update({
            failed_pin_attempts: details.failedPinAttempts,
            locked_until: details.lockedUntil,
            last_pin_failure_at: details.lastPinFailureAt,
          })
          .eq("id", siteId),
        "Could not record failed PIN attempt",
      );
    },

    async resetPinFailures(siteId) {
      assertNoError(
        await supabase
          .from("l1012_sites")
          .update({
            failed_pin_attempts: 0,
            locked_until: null,
            last_pin_failure_at: null,
          })
          .eq("id", siteId),
        "Could not reset PIN attempts",
      );
    },

    async upsertHost(siteId, host) {
      assertNoError(
        await supabase.from("l1012_site_hosts").upsert(
          {
            site_id: siteId,
            host,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "host" },
        ),
        "Could not register hostname",
      );
    },

    async getPublicSiteByHost(host) {
      const hostRow = assertNoError(
        await supabase
          .from("l1012_site_hosts")
          .select("site_id")
          .eq("host", host)
          .maybeSingle(),
        "Could not resolve hostname",
      );
      if (!hostRow) {
        return null;
      }

      const site = toSite(
        assertNoError(
          await supabase
            .from("l1012_sites")
            .select("id, site_key, status, first_saved_at, expires_at, config")
            .eq("id", hostRow.site_id)
            .maybeSingle(),
          "Could not load public config",
        ),
      );
      if (!site) {
        return null;
      }

      const assets = assertNoError(
        await supabase
          .from("l1012_site_assets")
          .select("id, slot, storage_path")
          .eq("site_id", site.id)
          .eq("is_retained", true),
        "Could not load public photos",
      );
      return { site, assets: assets.map(toAsset) };
    },

    async getRetainedAssets(siteId) {
      const data = assertNoError(
        await supabase
          .from("l1012_site_assets")
          .select("id, slot, storage_path")
          .eq("site_id", siteId)
          .eq("is_retained", true),
        "Could not load retained photos",
      );
      return data.map(toAsset);
    },

    async getAssetsByIds(siteId, assetIds) {
      if (!assetIds.length) {
        return [];
      }
      const data = assertNoError(
        await supabase
          .from("l1012_site_assets")
          .select("id, slot, storage_path")
          .eq("site_id", siteId)
          .in("id", assetIds),
        "Could not load uploaded photos",
      );
      return data.map(toAsset);
    },

    async createPendingAsset(siteId, asset) {
      const data = assertNoError(
        await supabase
          .from("l1012_site_assets")
          .insert({
            site_id: siteId,
            slot: asset.slot,
            storage_path: asset.storagePath,
            original_name: asset.originalName,
            content_type: asset.contentType,
            size_bytes: asset.sizeBytes,
            expires_at: asset.expiresAt,
            is_retained: false,
          })
          .select("id, slot, storage_path, original_name, content_type, size_bytes, expires_at")
          .single(),
        "Could not record pending photo",
      );
      return toAsset(data);
    },

    async saveSiteConfig(siteId, payload) {
      assertNoError(
        await supabase
          .from("l1012_site_assets")
          .update({
            is_retained: false,
            expires_at: new Date().toISOString(),
          })
          .eq("site_id", siteId)
          .eq("is_retained", true),
        "Could not release replaced photos",
      );

      if (payload.retainedAssetIds.length) {
        assertNoError(
          await supabase
            .from("l1012_site_assets")
            .update({
              is_retained: true,
              expires_at: payload.expiresAt,
            })
            .eq("site_id", siteId)
            .in("id", payload.retainedAssetIds),
          "Could not retain selected photos",
        );
      }

      const data = assertNoError(
        await supabase
          .from("l1012_sites")
          .update({
            config: payload.config,
            first_saved_at: payload.firstSavedAt,
            expires_at: payload.expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", siteId)
          .select("id, site_key, status, first_saved_at, expires_at, config")
          .single(),
        "Could not save config",
      );
      return toSite(data);
    },

    async listExpiredForPurge(now) {
      const cutoff = now.toISOString();
      const expiredAssets = assertNoError(
        await supabase
          .from("l1012_site_assets")
          .select("storage_path")
          .lte("expires_at", cutoff)
          .limit(1000),
        "Could not list expired photos",
      );
      const expiredSites = assertNoError(
        await supabase
          .from("l1012_sites")
          .select("id")
          .lte("expires_at", cutoff)
          .limit(100),
        "Could not list expired configs",
      );
      const siteIds = expiredSites.map((site) => site.id);
      let siteAssetPaths = [];
      if (siteIds.length) {
        siteAssetPaths = assertNoError(
          await supabase
            .from("l1012_site_assets")
            .select("storage_path")
            .in("site_id", siteIds),
          "Could not list photos for expired configs",
        );
      }

      return {
        siteIds,
        assetPaths: Array.from(
          new Set(
            [...expiredAssets, ...siteAssetPaths]
              .map((asset) => asset.storage_path)
              .filter(Boolean),
          ),
        ),
      };
    },

    async deleteExpiredRecords(siteIds, assetPaths) {
      if (assetPaths.length) {
        assertNoError(
          await supabase
            .from("l1012_site_assets")
            .delete()
            .in("storage_path", assetPaths),
          "Could not delete expired photo rows",
        );
      }
      if (siteIds.length) {
        assertNoError(
          await supabase.from("l1012_sites").delete().in("id", siteIds),
          "Could not delete expired configs",
        );
      }
    },
  };
}
