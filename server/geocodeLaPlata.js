/**
 * Geocoding de esquinas "N y M" en La Plata usando OpenStreetMap (Overpass).
 *
 * No usa un grid matemático: busca las ways reales (Calle/Avenida N y M)
 * y el nodo de intersección en el mapa. Si hay varias intersecciones
 * (calles largas), se elige la más cercana al centro de La Plata.
 */

const CENTRO_LA_PLATA = { lat: -34.9214, lon: -57.9544 };
const RADIO_METROS = 30000;

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const cache = new Map();

function parseEsquina(texto) {
  const partes = String(texto)
    .split(/\s+y\s+/i)
    .map((parte) =>
      parte
        .trim()
        .replace(/^(calle|avenida|av\.?|diag(?:onal)?)\s+/i, ""),
    )
    .filter(Boolean);

  if (partes.length !== 2) return null;

  const a = Number.parseInt(partes[0], 10);
  const b = Number.parseInt(partes[1], 10);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  if (a < 1 || b < 1 || a > 200 || b > 200) return null;

  return { a, b };
}

function distanciaAlCentro(lat, lon) {
  const dLat = (lat - CENTRO_LA_PLATA.lat) * 111320;
  const dLon =
    (lon - CENTRO_LA_PLATA.lon) *
    111320 *
    Math.cos((CENTRO_LA_PLATA.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

function buildOverpassQuery(a, b) {
  const { lat, lon } = CENTRO_LA_PLATA;
  // En OSM las arterias de LP figuran como "Calle N" o "Avenida N".
  return `
[out:json][timeout:40];
(
  way["name"="Calle ${a}"](around:${RADIO_METROS},${lat},${lon});
  way["name"="Avenida ${a}"](around:${RADIO_METROS},${lat},${lon});
)->.w1;
(
  way["name"="Calle ${b}"](around:${RADIO_METROS},${lat},${lon});
  way["name"="Avenida ${b}"](around:${RADIO_METROS},${lat},${lon});
)->.w2;
node(w.w1)(w.w2);
out body;`.trim();
}

async function fetchOverpass(query) {
  let lastError = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent":
            "DondeEstaMiMicro-SeminarioUNLP/1.0 (proyecto academico)",
          Accept: "application/json",
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(25000),
      });

      const text = await response.text();
      if (!response.ok) {
        lastError = new Error(
          `Overpass ${response.status}: ${text.slice(0, 120)}`,
        );
        continue;
      }

      // A veces el mirror responde XML de error/rate-limit
      if (text.trimStart().startsWith("<")) {
        lastError = new Error(`Overpass no-JSON: ${text.slice(0, 120)}`);
        continue;
      }

      const data = JSON.parse(text);
      if (!Array.isArray(data.elements)) {
        lastError = new Error("Respuesta Overpass sin elements");
        continue;
      }
      return data.elements;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Overpass no disponible");
}

/**
 * @param {string} texto ej. "1 y 40", "Calle 7 y 50"
 * @returns {Promise<object|null>}
 */
export async function geocodeEsquinaLaPlata(texto) {
  const parseado = parseEsquina(texto);
  if (!parseado) return null;

  const clave = `${Math.min(parseado.a, parseado.b)}-${Math.max(parseado.a, parseado.b)}`;
  if (cache.has(clave)) {
    return cache.get(clave);
  }

  const elements = await fetchOverpass(
    buildOverpassQuery(parseado.a, parseado.b),
  );

  const nodos = elements.filter(
    (el) => el.type === "node" && Number.isFinite(el.lat) && Number.isFinite(el.lon),
  );

  if (nodos.length === 0) {
    return null;
  }

  nodos.sort(
    (a, b) =>
      distanciaAlCentro(a.lat, a.lon) - distanciaAlCentro(b.lat, b.lon),
  );

  const mejor = nodos[0];
  const resultado = {
    latitud: mejor.lat,
    longitud: mejor.lon,
    nombre: `Calle/Av. ${parseado.a} y Calle/Av. ${parseado.b}, La Plata`,
    consulta: `${parseado.a} y ${parseado.b}`,
    fuente: "openstreetmap-overpass",
  };

  cache.set(clave, resultado);
  return resultado;
}
