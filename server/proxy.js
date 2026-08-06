import express from "express";
import { readFileSync } from "node:fs";

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
  const radioMetros = Number.parseFloat(req.query.radioMetros ?? "500");

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return res.json([]);
  }

  const paradasDentroDelRadio = paradas
    .map((parada) => ({
      parada: enriquecerParada(parada),
      distancia: distanciaEnMetros(lat, lon, parada.latitud, parada.longitud),
    }))
    .filter(
      ({ distancia }) =>
        distancia <= (Number.isNaN(radioMetros) ? 500 : radioMetros),
    )
    .sort((a, b) => a.distancia - b.distancia)
    .map(({ parada }) => parada);

  return res.json(paradasDentroDelRadio);
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
  const linea = codigoMicro.split('-')[0];

  const internosDeLinea = arribosPorLinea[linea];
  if (!internosDeLinea) {
    return res.status(404).json({ resultado: 'No se encontró la línea' });
  }

  const microEncontrado = internosDeLinea.find(
    (micro) => micro.interno === codigoMicro,
  );
  if (!microEncontrado) {
    return res.status(404).json({ resultado: 'No se encontró el micro' });
  }

  const paradasEnriquecidas = microEncontrado.recorrido.paradas.map((p) => {
    const infoCompleta = paradas.find(
      (info) => info.identificador === p.identificador,
    );
    return {
      identificador: p.identificador,
      tiempo: p.tiempo,
      descripcion: infoCompleta?.descripcion ?? "Parada desconocida",
      latitud: infoCompleta?.latitud,
      longitud: infoCompleta?.longitud,
    };
  });

  res.json({ resultado: paradasEnriquecidas });
});


if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`API local de colectivos corriendo en http://localhost:${PORT}`);
  });
}

export default app;

