import express from "express";
import { readFileSync } from "node:fs";
import { geocodeEsquinaLaPlata } from "./geocodeLaPlata.js";

const app = express();
const PORT = 3000;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

const loadJson = (relativePath) =>
  JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8"));

const lineas = loadJson("./data/lineas.json");
const paradas = loadJson("./data/paradas.json");
const rutas = loadJson("./data/rutas.json");
const trips = loadJson("./data/trips.json");

export function obtenerLineaPorCodigo(codigoLinea) {
  return lineas.find((linea) => linea.codigo === codigoLinea);
}

export function obtenerLineasDeParada(parada) {
  const codigos = Array.isArray(parada.codigoLineas)
    ? parada.codigoLineas
    : parada.codigoLinea
      ? [parada.codigoLinea]
      : [];

  return codigos
    .map((codigoLinea) => obtenerLineaPorCodigo(codigoLinea))
    .filter(Boolean)
    .map((linea) => ({
      codigo: linea.codigo,
      numero: linea.numero,
      descripcion: linea.descripcion,
    }));
}

export function enriquecerParada(parada) {
  return {
    ...parada,
    lineas: obtenerLineasDeParada(parada),
  };
}

export function distanciaEnMetros(lat1, lon1, lat2, lon2) {
  const toRad = (grados) => (grados * Math.PI) / 180;
  const radioTierra = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radioTierra * c;
}

export function extraerMinutos(tiempo) {
  const numero = Number.parseInt(tiempo, 10);
  return Number.isNaN(numero) ? Number.MAX_SAFE_INTEGER : numero;
}

/** Devuelve los segundos transcurridos desde medianoche para la hora actual. */
export function segundosDesdeMedianoche() {
  const ahora = new Date();
  return ahora.getHours() * 3600 + ahora.getMinutes() * 60 + ahora.getSeconds();
}

/**
 * Dado un trip y el id de una parada, devuelve los segundos programados
 * de llegada a esa parada (o null si el trip no pasa por ella).
 */
export function segundosLlegadaEnTrip(trip, idParada) {
  const horario = trip.horarios.find((h) => h.paradaId === idParada);
  return horario ? horario.llegada : null;
}

/**
 * Construye la lista de próximos arribos a una parada calculando
 * dinámicamente el tiempo restante desde trips.json.
 */
export function construirArribosParaParada(idParada, codLinea) {
  const ahora = segundosDesdeMedianoche();

  // Filtrar líneas si se pide una en particular
  const codigosLineas = codLinea && codLinea !== "0"
    ? [codLinea]
    : lineas.map((l) => l.codigo);

  const resultados = [];

  for (const trip of trips) {
    // Obtener la ruta a la que pertenece este trip
    const ruta = rutas.find((r) => r.id === trip.rutaId);
    if (!ruta) continue;

    // Filtrar por línea si corresponde
    if (!codigosLineas.includes(ruta.codigoLinea)) continue;

    // Verificar que este trip pase por la parada buscada
    const llegadaSeg = segundosLlegadaEnTrip(trip, idParada);
    if (llegadaSeg === null) continue;

    // Solo mostrar trips que aún no pasaron (o que faltan ≥ 0 seg)
    const restanteSeg = llegadaSeg - ahora;
    if (restanteSeg < 0) continue;

    const restanteMin = Math.round(restanteSeg / 60);
    const linea = lineas.find((l) => l.codigo === ruta.codigoLinea);

    resultados.push({
      codigoLinea: ruta.codigoLinea,
      descripcionLinea: linea?.descripcion ?? ruta.codigoLinea,
      descripcionBandera: ruta.direccion,
      direccion: ruta.direccion,
      tiempoRestanteArribo: restanteMin === 0 ? "Ahora" : `${restanteMin} min`,
      tiempoRestanteSegundos: restanteSeg,
      interno: trip.interno,
    });
  }

  // Ordenar por tiempo de llegada más próximo
  return resultados.sort((a, b) => a.tiempoRestanteSegundos - b.tiempoRestanteSegundos);
}

app.get("/paradascercanas", (req, res) => {
  const lat = Number.parseFloat(req.query.lat);
  const lon = Number.parseFloat(req.query.long);
  const radioPreferido = Number.parseFloat(req.query.radioMetros ?? "500");
  const radioBase = Number.isNaN(radioPreferido) ? 500 : radioPreferido;

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return res.json({
      paradas: [],
      radioMetros: radioBase,
      expandido: false,
    });
  }

  const conDistancia = paradas
    .map((parada) => ({
      parada: enriquecerParada(parada),
      distancia: distanciaEnMetros(lat, lon, parada.latitud, parada.longitud),
    }))
    .sort((a, b) => a.distancia - b.distancia);

  let radioUsado = radioBase;
  let expandido = false;
  let seleccion = conDistancia.filter(({ distancia }) => distancia <= radioBase);

  // Si no hay nada en el radio preferido (5 cuadras), agrandamos hasta la
  // primera parada y recién ahí aplicamos otra vez ese rango de 5 cuadras.
  // Tope máximo: 100 cuadras.
  const metrosPorCuadra = radioBase / 5;
  const radioTope = 100 * metrosPorCuadra;

  if (seleccion.length === 0 && conDistancia.length > 0) {
    expandido = true;
    const distanciaPrimera = conDistancia[0].distancia;
    radioUsado = Math.min(distanciaPrimera + radioBase, radioTope);
    seleccion = conDistancia.filter(({ distancia }) => distancia <= radioUsado);
  }

  return res.json({
    paradas: seleccion.map(({ parada }) => parada),
    radioMetros: Math.round(radioUsado),
    expandido,
  });
});

app.get("/arribos", (req, res) => {
  const { codLinea, idParada } = req.query;
  if (!idParada) {
    return res
      .status(400)
      .json({ error: "El parámetro idParada es obligatorio." });
  }

  const parada = paradas.find((actual) => actual.identificador === idParada);
  if (!parada) {
    return res.status(404).json({ error: "Parada no encontrada." });
  }

  const arribos = construirArribosParaParada(idParada, codLinea);
  const paradaEnriquecida = enriquecerParada(parada);

  return res.json({
    idParada,
    linea: paradaEnriquecida.lineas,
    lineas: paradaEnriquecida.lineas,
    actualizado: new Date().toISOString(),
    arribos,
  });
});

//buscar paradas por id
app.get("/paradas/ByID/:id", (req, res) => {
  const { id } = req.params;
  const parada = paradas.find((actual) => actual.identificador === id);
  if (!parada) {
    return res.status(404).json({ error: "Parada no encontrada." });
  }
  return res.json(enriquecerParada(parada));
});

// CASO 1: Si entran con las dos calles (Ej: /paradas/7/50)
app.get("/paradas/:callePrincipal/:calleInterseccion", (req, res) => {
  filtrarParadas(req, res);
});

// CASO 2: Si entran sin parámetros (Ej: /paradas)
app.get("/paradas", (req, res) => {
  filtrarParadas(req, res);
});

app.get("/lineas", (_req, res) => {
  res.json(lineas);
});

/**
 * Devuelve las paradas de una línea en orden de recorrido (mock).
 * Ej: GET /lineas/m1/recorrido
 */
app.get("/lineas/:codigo/recorrido", (req, res) => {
  const { codigo } = req.params;
  const linea = lineas.find((l) => l.codigo === codigo);

  if (!linea) {
    return res.status(404).json({ error: "Línea no encontrada." });
  }

  // Tomar la primera ruta de ida de esta línea
  const ruta = rutas.find((r) => r.codigoLinea === codigo);
  if (!ruta) {
    return res.status(404).json({
      error: "Esta línea todavía no tiene recorrido cargado.",
      codigo,
    });
  }

  const paradasOrdenadas = (ruta.paradas ?? [])
    .map((idParada) => {
      const info = paradas.find((p) => p.identificador === idParada);
      if (!info) return null;
      return enriquecerParada(info);
    })
    .filter(Boolean);

  return res.json({
    codigo: linea.codigo,
    numero: linea.numero,
    descripcion: linea.descripcion,
    color: linea.color ?? "#e53935",
    direccion: ruta.direccion ?? "",
    paradas: paradasOrdenadas,
  });
});

function filtrarParadas(req, res) {
  const { callePrincipal, calleInterseccion } = req.params;

  if (!callePrincipal && !calleInterseccion) {
    return res.json({
      callePrincipal: "No provista",
      calleInterseccion: "No provista",
      resultado: paradas,
    });
  }

  const paradaFiltrada = paradas.filter((parada) => {
    return (
      parada.callePrincipal == callePrincipal &&
      parada.calleInterseccion == calleInterseccion
    );
  });

  res.json({
    callePrincipal: callePrincipal || "No existe",
    calleInterseccion: calleInterseccion || "No existe",
    resultado: paradaFiltrada,
  });
}
app.get('/recorrido/:codigoMicro', (req, res) => {
  const { codigoMicro } = req.params;

  // Buscar el trip por su campo `interno`
  const trip = trips.find((t) => t.interno === codigoMicro);
  if (!trip) {
    return res.status(404).json({ resultado: 'No se encontró el micro' });
  }

  const ruta = rutas.find((r) => r.id === trip.rutaId);
  if (!ruta) {
    return res.status(404).json({ resultado: 'No se encontró la línea del micro' });
  }

  const codigoLinea = ruta.codigoLinea;

  const paradasEnriquecidas = (ruta.paradas ?? []).map((idParada) => {
    const infoCompleta = paradas.find((p) => p.identificador === idParada);
    // Calcular tiempo desde los horarios del trip
    const horario = trip.horarios.find((h) => h.paradaId === idParada);
    const tiempoSeg = horario?.llegada ?? null;
    const tiempoStr = tiempoSeg != null
      ? `${String(Math.floor(tiempoSeg / 3600)).padStart(2, '0')}:${String(Math.floor((tiempoSeg % 3600) / 60)).padStart(2, '0')}`
      : "";
    return {
      identificador: idParada,
      tiempo: tiempoStr,
      descripcion: infoCompleta?.descripcion ?? "Parada desconocida",
      latitud: infoCompleta?.latitud,
      longitud: infoCompleta?.longitud,
      callePrincipal: infoCompleta?.callePrincipal,
      calleInterseccion: infoCompleta?.calleInterseccion,
      codigo: infoCompleta?.codigo,
      lineas: infoCompleta ? obtenerLineasDeParada(infoCompleta) : [],
    };
  });

  res.json({
    resultado: paradasEnriquecidas,
    color: lineas.find((l) => l.codigo === codigoLinea)?.color ?? "#e53935",
    descripcion: lineas.find((l) => l.codigo === codigoLinea)?.descripcion ?? "",
  });
});

/**
 * Geocoding para La Plata.
 * 1) Si es "N y M", busca la intersección real en OpenStreetMap (Overpass).
 * 2) Si no, intenta Nominatim como fallback (texto libre).
 */
app.get("/geocode", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) {
    return res.status(400).json({ error: "Falta el parámetro q." });
  }

  const esEsquinaNumerada =
    /^\s*\d+\s+y\s+\d+\s*$/i.test(q) ||
    /^\s*(calle|avenida|av\.?|diag(?:onal)?)\s*\d+\s+y\s+/i.test(q);

  try {
    const esquinaOsm = await geocodeEsquinaLaPlata(q);
    if (esquinaOsm) {
      return res.json(esquinaOsm);
    }
  } catch (error) {
    console.error("[geocode/overpass]", error);
    if (esEsquinaNumerada) {
      return res.status(502).json({
        error:
          "No se pudo consultar OpenStreetMap para esa esquina. Probá de nuevo en unos segundos.",
      });
    }
  }

  if (esEsquinaNumerada) {
    return res.status(404).json({
      error: "No se encontró esa esquina en OpenStreetMap para La Plata.",
    });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${q}, La Plata, Buenos Aires, Argentina`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("viewbox", "-58.05,-34.88,-57.88,-34.97");

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "DondeEstaMiMicro-SeminarioUNLP/1.0 (proyecto academico)",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return res
        .status(502)
        .json({ error: "El servicio de geocoding no respondió bien." });
    }

    const resultados = await response.json();
    if (!Array.isArray(resultados) || resultados.length === 0) {
      return res.status(404).json({ error: "No se encontró esa dirección." });
    }

    const primero = resultados[0];
    return res.json({
      latitud: Number.parseFloat(primero.lat),
      longitud: Number.parseFloat(primero.lon),
      nombre: primero.display_name,
      consulta: q,
      fuente: "nominatim",
    });
  } catch (error) {
    console.error("[geocode]", error);
    return res
      .status(502)
      .json({ error: "No se pudo consultar el geocoding." });
  }
});


if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`API local de colectivos corriendo en http://localhost:${PORT}`);
  });
}

export default app;

