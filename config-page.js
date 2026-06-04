(function () {
  const slots = ["hero", "gallery-1", "gallery-2", "gallery-3", "gallery-4"];
  let currentConfig = {};
  let currentAssetsBySlot = {};

  function apiBaseUrl() {
    const value = String(window.L1012_API_BASE_URL || "").trim();
    if (!value || value.includes("your-central-api")) {
      throw new Error("Set L1012_API_BASE_URL in browser-config.js first.");
    }
    return value.replace(/\/+$/, "");
  }

  function status(message, tone = "neutral") {
    const element = document.querySelector("[data-config-status]");
    if (!element) {
      return;
    }
    element.textContent = message;
    element.dataset.tone = tone;
  }

  async function postJson(path, payload) {
    const response = await fetch(`${apiBaseUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }
    return data;
  }

  function lines(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function setLines(form, name, value) {
    form.elements[name].value = (value || []).join("\n");
  }

  function credentials(form) {
    return {
      siteKey: form.elements.siteKey.value.trim(),
      pin: form.elements.pin.value.trim(),
      host: window.location.hostname,
    };
  }

  function collectConfig(form) {
    return {
      title: form.elements.title.value,
      heroSubtitle: form.elements.heroSubtitle.value,
      privacyLine: form.elements.privacyLine.value,
      partnerOneName: form.elements.partnerOneName.value,
      partnerTwoName: form.elements.partnerTwoName.value,
      displayNames: form.elements.displayNames.value,
      monthsaryDate: form.elements.monthsaryDate.value,
      monthsaryLabel: form.elements.monthsaryLabel.value,
      loveNote: form.elements.loveNote.value,
      playlistNote: form.elements.playlistNote.value,
      favoriteThings: lines(form.elements.favoriteThings.value),
      bucketList: lines(form.elements.bucketList.value),
      memories: lines(form.elements.memories.value),
    };
  }

  function fillForm(form, config) {
    currentConfig = config || {};
    form.elements.title.value = currentConfig.title || "";
    form.elements.heroSubtitle.value = currentConfig.heroSubtitle || "";
    form.elements.privacyLine.value = currentConfig.privacyLine || "";
    form.elements.partnerOneName.value = currentConfig.partnerOneName || "";
    form.elements.partnerTwoName.value = currentConfig.partnerTwoName || "";
    form.elements.displayNames.value = currentConfig.displayNames || "";
    form.elements.monthsaryDate.value = currentConfig.monthsaryDate || "";
    form.elements.monthsaryLabel.value = currentConfig.monthsaryLabel || "";
    form.elements.loveNote.value = currentConfig.loveNote || "";
    form.elements.playlistNote.value = currentConfig.playlistNote || "";
    setLines(form, "favoriteThings", currentConfig.favoriteThings);
    setLines(form, "bucketList", currentConfig.bucketList);
    setLines(form, "memories", currentConfig.memories);

    currentAssetsBySlot = {};
    if (currentConfig.heroAssetId) {
      currentAssetsBySlot.hero = currentConfig.heroAssetId;
    }
    (currentConfig.galleryAssetIds || []).forEach((assetId, index) => {
      currentAssetsBySlot[`gallery-${index + 1}`] = assetId;
    });
  }

  async function uploadSelectedFiles(form, auth) {
    const nextAssetsBySlot = { ...currentAssetsBySlot };

    for (const slot of slots) {
      const input = form.querySelector(`[data-photo-slot="${slot}"]`);
      const file = input?.files?.[0];
      if (!file) {
        continue;
      }

      status(`Signing ${slot} photo...`);
      const signed = await postJson("/api/uploads/sign", {
        ...auth,
        slot,
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });

      status(`Uploading ${slot} photo...`);
      const upload = await fetch(signed.signedUrl, {
        method: signed.uploadMethod || "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!upload.ok) {
        throw new Error(`Could not upload ${slot} photo.`);
      }
      nextAssetsBySlot[slot] = signed.assetId;
    }

    currentAssetsBySlot = nextAssetsBySlot;
    return slots.map((slot) => nextAssetsBySlot[slot]).filter(Boolean);
  }

  async function loadForEdit(form) {
    status("Loading saved details...");
    const payload = await postJson("/api/config/read-for-edit", credentials(form));
    fillForm(form, payload.config);
    status("Saved details loaded.", "success");
  }

  async function save(form) {
    const auth = credentials(form);
    status("Preparing upload...");
    const assetIds = await uploadSelectedFiles(form, auth);
    status("Saving details...");
    const payload = await postJson("/api/config/save", {
      ...auth,
      config: collectConfig(form),
      assetIds,
    });
    fillForm(form, payload.config);
    status(`Saved. This page expires on ${new Date(payload.expiresAt).toLocaleDateString()}.`, "success");
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.dataset.l1012ConfigPage = "ready";
    const form = document.querySelector("[data-config-form]");
    if (!form) {
      return;
    }

    document.querySelector("[data-load-config]")?.addEventListener("click", () => {
      loadForEdit(form).catch((error) => status(error.message, "error"));
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      save(form).catch((error) => status(error.message, "error"));
    });
  });
})();
