// bottomSheet.js
// Bottom sheet accesible con 3 estados: "peek", "mid", "full".
// Se arrastra desde el handle (#sheet-handle) o se togglea con click/Enter/Espacio.

const STATES = ["peek", "mid", "full"];
const TAP_THRESHOLD_PX = 6; // si el drag se mueve menos que esto, se toma como "tap"

export function initBottomSheet({
  containerSelector = ".container",
  handleSelector = "#sheet-handle",
  breakpoint = 700,
  initialState = "mid",
} = {}) {
  const container = document.querySelector(containerSelector);
  const handle = document.querySelector(handleSelector);

  if (!container || !handle) {
    console.warn(
      "[bottomSheet] No se encontró el container o el handle. Revisá los selectores.",
    );
    return null;
  }

  let currentState = initialState;
  let dragging = false;
  let startY = 0;
  let lastY = 0;
  let startOffsetPx = 0;
  let containerHeightPx = 0;

  const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);

  function isMobile() {
    return mediaQuery.matches;
  }

  // Convierte un valor CSS (px, vh o %) a píxeles reales
  function parseToPx(rawValue, referencePx) {
    const value = rawValue.trim();
    if (value.endsWith("vh")) {
      return (parseFloat(value) / 100) * window.innerHeight;
    }
    if (value.endsWith("%")) {
      return (parseFloat(value) / 100) * referencePx;
    }
    return parseFloat(value) || 0;
  }

  function getContainerFullHeightPx() {
    // container.style.height = var(--sheet-full); getBoundingClientRect ya nos da el valor real en px
    return container.getBoundingClientRect().height;
  }

  function getStateOffsetPx(state) {
    const styles = getComputedStyle(container);
    const fullPx = getContainerFullHeightPx();
    const peekPx = parseToPx(styles.getPropertyValue("--sheet-peek"), fullPx);
    const midPx = parseToPx(styles.getPropertyValue("--sheet-mid"), fullPx);

    const map = {
      peek: fullPx - peekPx,
      mid: fullPx - midPx,
      full: 0,
    };
    return map[state];
  }

  function getMinPeekOffsetLimit() {
    const styles = getComputedStyle(container);
    const fullPx = getContainerFullHeightPx();
    const peekPx = parseToPx(styles.getPropertyValue("--sheet-peek"), fullPx);
    return fullPx - peekPx;
  }

  function setOffsetPx(offsetPx) {
    container.style.setProperty("--sheet-offset", `${offsetPx}px`);
  }

  function applyState(state, { animate = true } = {}) {
    if (!isMobile()) return;
    currentState = state;

    if (!animate) {
      container.classList.add("is-dragging"); // reusamos la clase para matar la transición
    }

    setOffsetPx(getStateOffsetPx(state));
    handle.setAttribute("aria-expanded", state !== "peek" ? "true" : "false");
    handle.dataset.state = state;

    // En peek el área visible es chica: si el contenido quedó scrolleado,
    // el handle puede quedar fuera y el sheet parece "trabado".
    if (state === "peek") {
      container.scrollTop = 0;
    }

    if (!animate) {
      // forzamos reflow y sacamos la clase para que vuelvan las transiciones normales
      // eslint-disable-next-line no-unused-expressions
      container.offsetHeight;
      container.classList.remove("is-dragging");
    }
  }

  function nextState() {
    const idx = STATES.indexOf(currentState);
    return STATES[(idx + 1) % STATES.length];
  }

  function getPointerY(e) {
    if (typeof e.clientY === "number") return e.clientY;
    if (e.touches && e.touches[0]) return e.touches[0].clientY;
    if (e.changedTouches && e.changedTouches[0]) return e.changedTouches[0].clientY;
    return lastY;
  }

  function onPointerDown(e) {
    if (!isMobile()) return;
    dragging = true;
    container.classList.add("is-dragging");
    startY = getPointerY(e);
    lastY = startY;
    startOffsetPx = getStateOffsetPx(currentState);
    containerHeightPx = getContainerFullHeightPx();
    handle.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e) {
    if (!dragging) return;
    lastY = getPointerY(e);
    const delta = lastY - startY;
    const maxOffset = getMinPeekOffsetLimit();
    let offset = startOffsetPx + delta;
    offset = Math.max(0, Math.min(offset, maxOffset));
    setOffsetPx(offset);
  }

  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    container.classList.remove("is-dragging");

    const endY = getPointerY(e);
    const dragDistance = Math.abs(endY - startY);

    if (dragDistance < TAP_THRESHOLD_PX) {
      // fue un tap, no un drag: avanzamos al siguiente estado
      applyState(nextState());
      return;
    }

    // buscamos el estado más cercano al offset actual (snap)
    const currentOffsetPx =
      parseFloat(getComputedStyle(container).getPropertyValue("--sheet-offset")) || 0;

    let closestState = STATES[0];
    let minDistance = Infinity;

    for (const state of STATES) {
      const stateOffset = getStateOffsetPx(state);
      const distance = Math.abs(stateOffset - currentOffsetPx);
      if (distance < minDistance) {
        minDistance = distance;
        closestState = state;
      }
    }

    applyState(closestState);
  }

  function onKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      applyState(nextState());
    }
  }

  function onResize() {
    applyState(currentState, { animate: false });
  }

  handle.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  handle.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", onResize);
  mediaQuery.addEventListener("change", onResize);

  // estado inicial sin animación (evita un "salto" al cargar la página)
  applyState(initialState, { animate: false });

  return {
    applyState: (state) => applyState(state, { animate: true }),
    getState: () => currentState,
    destroy() {
      handle.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      handle.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      mediaQuery.removeEventListener("change", onResize);
    },
  };
}