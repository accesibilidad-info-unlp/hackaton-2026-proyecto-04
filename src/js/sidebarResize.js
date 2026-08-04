

const STORAGE_KEY = "sidebar-width-px";
const DEFAULT_WIDTH = 300;
const MIN_WIDTH = DEFAULT_WIDTH; // no se puede achicar por menos del tamaño default
const MAX_WIDTH_CAP = 560;

export function initSidebarResize({
  containerSelector = ".container",
  breakpoint = 700,
} = {}) {
  const container = document.querySelector(containerSelector);
  if (!container) return null;

  const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);

  const handle = document.createElement("div");
  handle.className = "sidebar-resize-handle";
  handle.setAttribute("role", "separator");
  handle.setAttribute("aria-orientation", "vertical");
  handle.setAttribute("aria-label", "Redimensionar panel lateral");
  handle.tabIndex = 0;
  container.appendChild(handle);

  let dragging = false;
  let startX = 0;
  let startWidth = 0;

  function maxWidth() {
    return Math.min(MAX_WIDTH_CAP, Math.floor(window.innerWidth * 0.5));
  }

  function clamp(width) {
    return Math.min(maxWidth(), Math.max(MIN_WIDTH, Math.round(width)));
  }

  function applyWidth(widthPx) {
    const width = clamp(widthPx);
    container.style.width = `${width}px`;
    document.documentElement.style.setProperty("--sidebar-w", `${width}px`);
    handle.setAttribute("aria-valuenow", String(width));
    return width;
  }

  function isDesktop() {
    return !mediaQuery.matches;
  }

  function syncForViewport() {
    if (!isDesktop()) {
      container.style.width = "";
      handle.hidden = true;
      return;
    }

    handle.hidden = false;
    const stored = Number.parseInt(localStorage.getItem(STORAGE_KEY) ?? "", 10);
    applyWidth(Number.isFinite(stored) ? stored : DEFAULT_WIDTH);
  }

  handle.setAttribute("aria-valuemin", String(MIN_WIDTH));
  handle.setAttribute("aria-valuemax", String(MAX_WIDTH_CAP));

  handle.addEventListener("pointerdown", (event) => {
    if (!isDesktop()) return;
    dragging = true;
    startX = event.clientX;
    startWidth = container.getBoundingClientRect().width;
    handle.setPointerCapture(event.pointerId);
    document.body.classList.add("is-sidebar-resizing");
    event.preventDefault();
  });

  handle.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const delta = event.clientX - startX;
    applyWidth(startWidth + delta);
  });

  function endDrag(event) {
    if (!dragging) return;
    dragging = false;
    try {
      handle.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
    document.body.classList.remove("is-sidebar-resizing");
    const width = container.getBoundingClientRect().width;
    localStorage.setItem(STORAGE_KEY, String(clamp(width)));
  }

  handle.addEventListener("pointerup", endDrag);
  handle.addEventListener("pointercancel", endDrag);

  handle.addEventListener("keydown", (event) => {
    if (!isDesktop()) return;
    const step = event.shiftKey ? 40 : 16;
    const current = container.getBoundingClientRect().width;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      localStorage.setItem(STORAGE_KEY, String(applyWidth(current - step)));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      localStorage.setItem(STORAGE_KEY, String(applyWidth(current + step)));
    } else if (event.key === "Home") {
      event.preventDefault();
      localStorage.setItem(STORAGE_KEY, String(applyWidth(MIN_WIDTH)));
    } else if (event.key === "End") {
      event.preventDefault();
      localStorage.setItem(STORAGE_KEY, String(applyWidth(maxWidth())));
    }
  });

  mediaQuery.addEventListener("change", syncForViewport);
  window.addEventListener("resize", () => {
    if (!isDesktop() || dragging) return;
    // Reclamp si la ventana se achica
    const current = container.getBoundingClientRect().width;
    applyWidth(current);
  });

  syncForViewport();

  return { applyWidth, syncForViewport };
}
