const paradasFav = document.getElementById("paradas-fav");
const paradasCercanas = document.getElementById("paradas-cercanas");
const lineas = document.getElementById("lineas");
const recorridos = document.getElementById("recorridos");
const volver = document.getElementById("volver");

const accessibilityToggle = document.getElementById("accessibility-toggle");
const accessibilityMenu = document.getElementById("accessibility-menu");
const accessibilityDefaultsDialog = document.getElementById("accessibility-defaults-dialog");
const accessibilityDefaultsCancel = document.getElementById("accessibility-defaults-cancel");
const accessibilityDefaultsConfirm = document.getElementById("accessibility-defaults-confirm");
const accessibilityOptions = document.querySelectorAll(".accessibility-option");
const accessibilityReset = document.getElementById("accessibility-reset");

const header = document.querySelector("header");
const overlay = document.querySelector(".overlay");

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
    document.getElementById("main").style.display = "";
    return;
  }

  destino.style.display = "";
  if (valor !== "main") {
    volver.style.display = "";
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
    const optionInput = option.querySelector(".accessibility-option__input");

    option.classList.toggle("is-active", isEnabled);
    if (optionInput) {
      optionInput.checked = isEnabled;
    }
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

function unlockAccessibilityMenu() {
  if (!canClose) {
    overlay.classList.remove("active");
    header.style.borderBottom = "1px solid var(--color-border)";
    canClose = true;
  }
}

function openAccessibilityDefaultsDialog() {
  if (accessibilityDefaultsDialog && !accessibilityDefaultsDialog.open) {
    accessibilityDefaultsDialog.showModal();
  }
}

function closeAccessibilityDefaultsDialog() {
  accessibilityDefaultsDialog?.close();
}

function applyDefaultAccessibilitySettings() {
  accessibilitySettings = { ...accessibilityDefaults };
  saveAccessibilitySettings(accessibilitySettings);
  applyAccessibilitySettings(accessibilitySettings);
  unlockAccessibilityMenu();
}

let canClose;
let accessibilitySettings = readAccessibilitySettings();
if (!accessibilitySettings) {
  //abro por primera vez
  toggleAccessibilityMenu();
  accessibilitySettings = { ...accessibilityDefaults };
  applyAccessibilitySettings(accessibilitySettings);
  openAccessibilityDefaultsDialog();
  overlay.classList.add("active");
  header.style.borderBottom = "none";
  canClose = false;
} else {
  applyAccessibilitySettings(accessibilitySettings);
  canClose = true;
}

if (accessibilityToggle && accessibilityMenu) {
  accessibilityToggle.addEventListener("click", () => {
    if (!accessibilitySettings && !canClose) {
      openAccessibilityDefaultsDialog();
      return;
    }

    toggleAccessibilityMenu();
    unlockAccessibilityMenu();
  });

  accessibilityDefaultsCancel?.addEventListener("click", () => {
    closeAccessibilityDefaultsDialog();
  });

  accessibilityDefaultsConfirm?.addEventListener("click", () => {
    applyDefaultAccessibilitySettings();
    closeAccessibilityDefaultsDialog();
  });

  accessibilityOptions.forEach((option) => {
    const optionInput = option.querySelector(".accessibility-option__input");

    optionInput?.addEventListener("change", () => {
      const settingName = option.dataset.setting;
      accessibilitySettings = {
        ...(accessibilitySettings || accessibilityDefaults),
        [settingName]: optionInput.checked,
      };
      saveAccessibilitySettings(accessibilitySettings);
      applyAccessibilitySettings(accessibilitySettings);
      unlockAccessibilityMenu();
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

    if (!clickedInsideMenu && !clickedToggle && canClose) {
      closeAccessibilityMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && canClose) {
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
  volver.style.display = "none";
});

volver.addEventListener("click", (e) => {
  cambiar(e.currentTarget.value);
});