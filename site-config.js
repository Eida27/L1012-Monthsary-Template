(function () {
  const fallbackConfig = {
    title: "our little corner",
    heroSubtitle: "a private space for two hearts",
    privacyLine: "only you and me.",
    displayNames: "mavi + caeiona",
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
  };

  const favoriteIcons = [
    "dark_mode",
    "mood",
    "local_cafe",
    "directions_car",
    "chat",
    "favorite",
    "favorite",
  ];

  function apiBaseUrl() {
    const value = String(window.L1012_API_BASE_URL || "").trim();
    if (!value || value.includes("your-central-api")) {
      return "";
    }
    return value.replace(/\/+$/, "");
  }

  function textField(name, value) {
    document
      .querySelectorAll(`[data-config-field="${name}"]`)
      .forEach((element) => {
        element.textContent = value || "";
      });
  }

  function icon(name, className) {
    const element = document.createElement("span");
    element.className = `material-symbols-outlined ${className || ""}`.trim();
    element.textContent = name;
    return element;
  }

  function renderFavoriteThings(items) {
    const container = document.querySelector('[data-config-list="favoriteThings"]');
    if (!container) {
      return;
    }
    container.replaceChildren();
    items.forEach((item, index) => {
      const chip = document.createElement("div");
      const isLast = index === items.length - 1;
      chip.className = isLast
        ? "bg-primary-container text-on-primary-container rounded-full px-4 py-2 flex items-center gap-2 font-label-sm text-label-sm hover:opacity-90 transition-all cursor-default hover:scale-105 duration-300 interactive-area pulse-continuous"
        : "bg-surface rounded-full px-4 py-2 border border-outline-variant flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm hover:border-primary transition-colors cursor-default hover:scale-105 duration-300 interactive-area";
      chip.append(
        icon(favoriteIcons[index] || "favorite", isLast ? "text-[16px] icon-fill" : "text-[16px] text-tertiary"),
        document.createTextNode(item),
      );
      container.appendChild(chip);
    });
  }

  function renderBucketList(items) {
    const list = document.querySelector('[data-config-list="bucketList"]');
    if (!list) {
      return;
    }
    list.replaceChildren();
    items.forEach((item) => {
      const row = document.createElement("li");
      row.dataset.bucketItem = "";
      row.setAttribute("aria-pressed", "false");
      row.tabIndex = 0;
      row.setAttribute("role", "button");
      row.className =
        "flex items-center gap-3 bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 hover:scale-[1.02] transition-transform duration-300 interactive-area cursor-pointer";
      const label = document.createElement("span");
      label.className = "font-body-md text-on-surface-variant";
      label.textContent = item;
      row.append(icon("favorite", "text-primary text-[20px] icon-outline"), label);
      list.appendChild(row);
    });
    document.dispatchEvent(new CustomEvent("l1012:bucket-list-rendered"));
  }

  function renderMemories(items) {
    const list = document.querySelector('[data-config-list="memories"]');
    if (!list) {
      return;
    }
    list.replaceChildren();
    items.forEach((item) => {
      const row = document.createElement("li");
      row.className =
        "flex items-center gap-3 bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 hover:scale-[1.02] transition-transform duration-300 interactive-area cursor-pointer";
      const label = document.createElement("span");
      label.className = "font-body-md text-on-surface-variant";
      label.textContent = item;
      row.append(icon("task_alt", "text-primary text-[20px] icon-fill"), label);
      list.appendChild(row);
    });
  }

  function renderImages(assets) {
    for (const [slot, asset] of Object.entries(assets || {})) {
      const image = document.querySelector(`[data-config-image="${slot}"]`);
      if (image && asset?.url) {
        image.src = asset.url;
      }
    }
  }

  function renderConfig(config, assets) {
    const merged = { ...fallbackConfig, ...(config || {}) };
    document.title = merged.title;
    textField("title", merged.title);
    textField("heroSubtitle", merged.heroSubtitle);
    textField("privacyLine", merged.privacyLine);
    textField("displayNames", merged.displayNames);
    textField("monthsaryDisplayDate", merged.monthsaryDisplayDate);
    textField("monthsaryLabel", merged.monthsaryLabel);
    textField("loveNote", merged.loveNote);
    textField("playlistNote", merged.playlistNote);
    renderFavoriteThings(merged.favoriteThings || []);
    renderBucketList(merged.bucketList || []);
    renderMemories(merged.memories || []);
    renderImages(assets || {});
  }

  async function fetchConfig() {
    const apiBase = apiBaseUrl();
    if (!apiBase || !window.location.hostname) {
      document.body.dataset.configStatus = "fallback";
      document.documentElement.dataset.l1012Config = "fallback";
      renderConfig(fallbackConfig, {});
      return;
    }

    try {
      const response = await fetch(
        `${apiBase}/api/config?host=${encodeURIComponent(window.location.hostname)}`,
      );
      if (!response.ok) {
        throw new Error("Config request failed");
      }
      const payload = await response.json();
      document.body.dataset.configStatus = payload.status;
      document.documentElement.dataset.l1012Config = payload.status;
      if (payload.status === "configured") {
        renderConfig(payload.config, payload.assets);
      } else {
        renderConfig(fallbackConfig, {});
      }
    } catch {
      document.body.dataset.configStatus = "fallback";
      document.documentElement.dataset.l1012Config = "fallback";
      renderConfig(fallbackConfig, {});
    }
  }

  document.addEventListener("DOMContentLoaded", fetchConfig);
  window.L1012 = window.L1012 || {};
  window.L1012.renderConfig = renderConfig;
})();
