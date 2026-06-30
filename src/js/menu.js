const paradasFav = document.getElementById("paradas-fav");
const paradasCercanas = document.getElementById("paradas-cercanas");
const lineas = document.getElementById("lineas");
const recorridos = document.getElementById("recorridos");
const volver = document.getElementById("volver");
const accessibilityToggle = document.getElementById("accessibility-toggle");
const accessibilityMenu = document.getElementById("accessibility-menu");
const accessibilityOptions = document.querySelectorAll(".accessibility-option");
const accessibilityReset = document.getElementById("accessibility-reset");

const accessibilityDefaults = {
  largeText: false,
  highContrast: false,
  reduceMotion: false,
  strongFocus: false,
};

const accessibilityStorageKey = "accessibility_settings";

function esconder() {
  for (let i = 0; i < document.getElementsByClassName("buttons").length; i++) {
    document.getElementsByClassName("buttons")[i].style.display = "none";
  }
  volver.style.display = "none";
}

function cambiar(valor) {
  esconder();
  const destino = document.getElementById(valor);

  if (!destino) {
    document.getElementById("main").style.display = "flex";
    return;
  }

  destino.style.display = "flex";
  if (valor !== "main") {
    volver.style.display = "flex";
  }
}

function readAccessibilitySettings() {
  const stored = localStorage.getItem(accessibilityStorageKey);

  if (!stored) {
    return false;
  }

  try {
    return {
      ...accessibilityDefaults,
      ...JSON.parse(stored),
    };
  } catch {
    return { ...accessibilityDefaults };
  }
}

function saveAccessibilitySettings(settings) {
  localStorage.setItem(accessibilityStorageKey, JSON.stringify(settings));
}

function applyAccessibilitySettings(settings) {
  document.documentElement.classList.toggle(
    "a11y-large-text",
    settings.largeText,
  );
  document.body.classList.toggle("a11y-large-text", settings.largeText);
  document.body.classList.toggle("a11y-high-contrast", settings.highContrast);
  document.body.classList.toggle("a11y-reduced-motion", settings.reduceMotion);
  document.body.classList.toggle("a11y-strong-focus", settings.strongFocus);

  accessibilityOptions.forEach((option) => {
    const settingName = option.dataset.setting;
    const isEnabled = Boolean(settings[settingName]);
    option.classList.toggle("is-active", isEnabled);
    option.setAttribute("aria-pressed", String(isEnabled));
  });
}

function openAccessibilityMenu() {
  accessibilityMenu.hidden = false;
  accessibilityToggle.setAttribute("aria-expanded", "true");
}

function closeAccessibilityMenu() {
  accessibilityMenu.hidden = true;
  accessibilityToggle.setAttribute("aria-expanded", "false");
}

function toggleAccessibilityMenu() {
  if (accessibilityMenu.hidden) {
    openAccessibilityMenu();
    return;
  }

  closeAccessibilityMenu();
}

let accessibilitySettings = readAccessibilitySettings();
if (!accessibilitySettings) {
  toggleAccessibilityMenu();
}

if (accessibilityToggle && accessibilityMenu) {
  accessibilityToggle.addEventListener("click", toggleAccessibilityMenu);

  accessibilityOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const settingName = option.dataset.setting;
      accessibilitySettings = {
        ...accessibilitySettings,
        [settingName]: !accessibilitySettings[settingName],
      };
      saveAccessibilitySettings(accessibilitySettings);
      applyAccessibilitySettings(accessibilitySettings);
    });
  });

  accessibilityReset?.addEventListener("click", () => {
    accessibilitySettings = { ...accessibilityDefaults };
    saveAccessibilitySettings(accessibilitySettings);
    applyAccessibilitySettings(accessibilitySettings);
  });

  document.addEventListener("click", (event) => {
    if (accessibilityMenu.hidden) {
      return;
    }

    const clickedInsideMenu = accessibilityMenu.contains(event.target);
    const clickedToggle = accessibilityToggle.contains(event.target);

    if (!clickedInsideMenu && !clickedToggle) {
      closeAccessibilityMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAccessibilityMenu();
    }
  });
}

lineas.addEventListener("click", (e) => {
  cambiar(e.currentTarget.value);
});
paradasFav.addEventListener("click", (e) => {
  cambiar(e.currentTarget.value);
});
paradasCercanas.addEventListener("click", (e) => {
  cambiar(e.currentTarget.value);
});
volver.addEventListener("click", (e) => {
  cambiar(e.currentTarget.value);
});
