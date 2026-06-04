window.tailwind = window.tailwind || {};
window.tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "error-container": "#ffdad6",
        "surface-dim": "#ded9d5",
        "on-secondary-fixed-variant": "#4f4538",
        "on-tertiary-container": "#54463a",
        "primary-container": "#f4a2a2",
        "on-tertiary-fixed-variant": "#524438",
        outline: "#857372",
        "on-error": "#ffffff",
        "on-surface": "#1d1b19",
        "surface-container-highest": "#e7e1de",
        "inverse-on-surface": "#f5f0ec",
        "surface-container-low": "#f8f2ef",
        "on-primary-fixed": "#390a0e",
        "outline-variant": "#d8c1c1",
        "on-surface-variant": "#534343",
        secondary: "#675d4f",
        "on-primary-fixed-variant": "#703536",
        "on-primary-container": "#723638",
        "tertiary-container": "#c8b4a5",
        "surface-container-high": "#ede7e3",
        surface: "#fef8f4",
        "surface-variant": "#e7e1de",
        "tertiary-fixed": "#f4dfce",
        "inverse-surface": "#32302e",
        "on-error-container": "#93000a",
        "on-secondary-container": "#6b6153",
        "on-background": "#1d1b19",
        "secondary-container": "#ecddcc",
        background: "#fef8f4",
        "surface-bright": "#fef8f4",
        "surface-tint": "#8d4b4c",
        "secondary-fixed": "#efe0cf",
        "inverse-primary": "#ffb3b3",
        "primary-fixed": "#ffdad9",
        "surface-container-lowest": "#ffffff",
        primary: "#8d4b4c",
        "on-tertiary": "#ffffff",
        tertiary: "#6b5c4f",
        "surface-container": "#f3ede9",
        "tertiary-fixed-dim": "#d7c3b3",
        "on-tertiary-fixed": "#241910",
        "on-primary": "#ffffff",
        "on-secondary-fixed": "#211a10",
        "primary-fixed-dim": "#ffb3b3",
        error: "#ba1a1a",
        "secondary-fixed-dim": "#d2c4b3",
        "on-secondary": "#ffffff",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        full: "9999px",
      },
      spacing: {
        unit: "4px",
        "stack-md": "24px",
        "stack-sm": "8px",
        "container-padding-desktop": "40px",
        gutter: "16px",
        "stack-lg": "48px",
        "container-padding-mobile": "20px",
      },
      fontFamily: {
        "body-md": ["Plus Jakarta Sans", "sans-serif"],
        "headline-lg": ["Caveat", "cursive"],
        "display-romantic": ["Caveat", "cursive"],
        "headline-lg-mobile": ["Caveat", "cursive"],
        "body-lg": ["Plus Jakarta Sans", "sans-serif"],
        "label-sm": ["Plus Jakarta Sans", "sans-serif"],
      },
      fontSize: {
        "body-md": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "headline-lg": ["32px", { lineHeight: "1.2", fontWeight: "500" }],
        "display-romantic": [
          "64px",
          { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "600" },
        ],
        "headline-lg-mobile": [
          "48px",
          { lineHeight: "1.2", fontWeight: "500" },
        ],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "label-sm": [
          "13px",
          { lineHeight: "1.2", letterSpacing: "0.05em", fontWeight: "600" },
        ],
        "script-accent": ["24px", { lineHeight: "1.4", fontWeight: "500" }],
      },
    },
  },
};

document.addEventListener("DOMContentLoaded", () => {
  // Scroll Reveal
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    {
      threshold: 0.1,
    },
  );

  document.querySelectorAll(".scroll-reveal").forEach((el) => {
    observer.observe(el);
  });

  // Heart Burst Interaction
  const createHeartBurst = (e) => {
    const container = document.getElementById("particle-container");

    // Calculate click position relative to viewport
    const x = e.clientX;
    const y = e.clientY;

    for (let i = 0; i < 6; i++) {
      const heart = document.createElement("span");
      heart.className = "material-symbols-outlined burst-heart icon-fill";
      heart.textContent = "favorite";

      // Randomize trajectory
      const angle = Math.random() * Math.PI * 2;
      const distance = 50 + Math.random() * 50;
      const tx = Math.cos(angle) * distance + "px";
      const ty = Math.sin(angle) * distance + "px";

      heart.style.setProperty("--tx", tx);
      heart.style.setProperty("--ty", ty);

      heart.style.left = `${x - 12}px`; // Center icon (approx)
      heart.style.top = `${y - 12}px`;

      // Add varied colors
      const colors = ["#f4a2a2", "#ffdad9", "#8d4b4c", "#c8b4a5"];
      heart.style.color = colors[Math.floor(Math.random() * colors.length)];

      // Randomize size slightly
      heart.style.fontSize = `${1 + Math.random() * 1}rem`;

      container.appendChild(heart);

      // Remove after animation
      setTimeout(() => {
        heart.remove();
      }, 1000);
    }
  };

  // Attach click event to interactive areas and document fallback
  document
    .querySelectorAll(".interactive-area, img, .material-symbols-outlined")
    .forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent double bursts
        createHeartBurst(e);
      });
    });

  document.body.addEventListener("click", (e) => {
    // Only trigger if we didn't hit an interactive area (handled above)
    if (
      !e.target.closest(".interactive-area") &&
      e.target.tagName !== "IMG" &&
      !e.target.classList.contains("material-symbols-outlined")
    ) {
      createHeartBurst(e);
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const navActiveClass =
    "flex flex-col items-center justify-center bg-primary-container dark:bg-on-primary-fixed-variant text-on-primary-container dark:text-primary-fixed rounded-full p-3 active:scale-90 duration-200 pulse-hover";
  const navInactiveClass =
    "flex flex-col items-center justify-center text-on-surface-variant dark:text-outline p-3 hover:text-primary transition-colors active:scale-90 duration-200";

  const navButtons = document.querySelectorAll("[data-nav-target]");
  const setActiveNavButton = (activeButton) => {
    navButtons.forEach((button) => {
      const isActive = button === activeButton;
      button.className = isActive ? navActiveClass : navInactiveClass;
      button.setAttribute("aria-current", String(isActive));
    });
  };

  navButtons.forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        const targetId = button.getAttribute("data-nav-target");
        const target = targetId ? document.getElementById(targetId) : null;
        if (!target) {
          return;
        }

        target.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveNavButton(button);

        if (window.history?.replaceState) {
          window.history.replaceState(null, "", `#${target.id}`);
        }
      },
      true,
    );
  });

  const initialTarget = window.location.hash.slice(1);
  if (initialTarget) {
    const initialButton = Array.from(navButtons).find(
      (button) => button.getAttribute("data-nav-target") === initialTarget,
    );
    if (initialButton) {
      setActiveNavButton(initialButton);
    }
  }

  const themeButton = document.querySelector('[data-action="theme"]');
  themeButton?.addEventListener(
    "click",
    () => {
      document.documentElement.classList.toggle("dark");
      themeButton.setAttribute(
        "aria-pressed",
        String(document.documentElement.classList.contains("dark")),
      );
    },
    true,
  );

  const playlistButton = document.querySelector('[data-action="playlist"]');
  const playlistCard = document.getElementById("playlist-card");
  playlistButton?.addEventListener(
    "click",
    () => {
      const willOpen = playlistCard.hasAttribute("hidden");
      playlistCard.toggleAttribute("hidden", !willOpen);
      playlistButton.setAttribute("aria-expanded", String(willOpen));
    },
    true,
  );

  const initializeBucketItems = (root = document) => {
    root.querySelectorAll("[data-bucket-item]").forEach((item) => {
      if (item.dataset.bucketBound === "true") {
        return;
      }
      item.dataset.bucketBound = "true";
      item.addEventListener(
        "click",
        () => {
          const done = !item.classList.contains("is-done");
          item.classList.toggle("is-done", done);
          item.setAttribute("aria-pressed", String(done));
          const icon = item.querySelector(".material-symbols-outlined");
          if (icon) {
            icon.textContent = done ? "task_alt" : "favorite";
            icon.classList.toggle("icon-fill", done);
            icon.classList.toggle("icon-outline", !done);
          }
        },
        true,
      );
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          item.click();
        }
      });
    });
  };

  initializeBucketItems();
  document.addEventListener("l1012:bucket-list-rendered", () => {
    initializeBucketItems();
  });
});
