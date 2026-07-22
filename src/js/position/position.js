// position.js
// Maneja la geolocalización del usuario con fallback y modal de error.

const FALLBACK_LAT = -34.9215; // La Plata, Plaza Moreno
const FALLBACK_LON = -57.9545;

// Muestra un modal nativo (usando <dialog>) para pedir reintentar o continuar sin ubicación
function mostrarModalUbicacion({ onReintentar, onContinuar }) {
  // Evitar duplicados
  const existente = document.getElementById("geolocalizacion-dialog");
  if (existente) existente.remove();

  const dialog = document.createElement("dialog");
  dialog.id = "geolocalizacion-dialog";
  dialog.className = "geo-dialog";
  dialog.setAttribute("aria-labelledby", "geo-dialog-title");
  dialog.setAttribute("aria-describedby", "geo-dialog-desc");

  dialog.innerHTML = `
    <div class="geo-dialog__content">
      <span class="material-symbols-outlined geo-dialog__icon" aria-hidden="true">location_off</span>
      <h2 id="geo-dialog-title" class="geo-dialog__title">Ubicación no disponible</h2>
      <p id="geo-dialog-desc" class="geo-dialog__desc">
        Para mostrarte las paradas cercanas necesitamos tu ubicación.<br>
        Si la bloqueaste, habilitala desde la configuración de tu navegador.
      </p>
      <div class="geo-dialog__actions">
        <button id="geo-btn-continuar" class="geo-dialog__btn geo-dialog__btn--secondary" type="button">
          Continuar sin ubicación
        </button>
        <button id="geo-btn-reintentar" class="geo-dialog__btn geo-dialog__btn--primary" type="button">
          <span class="material-symbols-outlined" aria-hidden="true">refresh</span>
          Reintentar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);
  dialog.showModal();

  dialog.querySelector("#geo-btn-reintentar").addEventListener("click", () => {
    dialog.close();
    dialog.remove();
    onReintentar();
  });

  dialog.querySelector("#geo-btn-continuar").addEventListener("click", () => {
    dialog.close();
    dialog.remove();
    onContinuar();
  });

  // Evitar que ESC cierre sin ejecutar el callback de continuar
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    dialog.close();
    dialog.remove();
    onContinuar();
  });
}

function pedirUbicacion() {
  return new Promise((resolve) => {
    const opciones = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    const exito = (position) => {
      const ubicacion = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        timestamp: Date.now(),
      };
      localStorage.setItem("user_location", JSON.stringify(ubicacion));
      console.log("Localización guardada:", ubicacion);
      resolve(ubicacion);
    };

    const error = (errorObjeto) => {
      console.warn("[Geo] Error:", errorObjeto.code, errorObjeto.message);

      // Mostrar modal con opciones en vez de alert()
      mostrarModalUbicacion({
        onReintentar: () => {
          // Volver a intentar
          pedirUbicacion().then(resolve);
        },
        onContinuar: () => {
          // Usar posición de fallback (La Plata)
          const fallback = { lat: FALLBACK_LAT, lon: FALLBACK_LON };
          localStorage.setItem("user_location", JSON.stringify({ ...fallback, timestamp: Date.now() }));
          resolve(fallback);
        },
      });
    };

    navigator.geolocation.getCurrentPosition(exito, error, opciones);
  });
}

export async function savePosition() {
  // Si hay una ubicación reciente (< 5 min), reutilizarla
  const locationRaw = localStorage.getItem("user_location");
  if (locationRaw) {
    try {
      const cached = JSON.parse(locationRaw);
      const edad = Date.now() - (cached.timestamp || 0);
      if (edad < 5 * 60 * 1000) {
        console.log("[Geo] Usando ubicación cacheada.");
        return cached;
      }
    } catch (_) {}
  }

  return pedirUbicacion();
}

export const getPosition = () => {
  const locationRaw = localStorage.getItem("user_location");
  if (!locationRaw) return { lat: FALLBACK_LAT, lon: FALLBACK_LON };
  try {
    const location = JSON.parse(locationRaw);
    return { lat: location.lat, lon: location.lon };
  } catch (_) {
    return { lat: FALLBACK_LAT, lon: FALLBACK_LON };
  }
};
