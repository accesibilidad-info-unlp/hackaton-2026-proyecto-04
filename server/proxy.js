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
const arribosPorLinea = loadJson("./data/arribos.json");

function obtenerLineaPorCodigo(codigoLinea) {
  return lineas.find((linea) => linea.codigo === codigoLinea);
}

function obtenerLineasDeParada(parada) {
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

function enriquecerParada(parada) {
  return {
    ...parada,
    lineas: obtenerLineasDeParada(parada),
  };
}

function distanciaEnMetros(lat1, lon1, lat2, lon2) {
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

function extraerMinutos(tiempo) {
  const numero = Number.parseInt(tiempo, 10);
  return Number.isNaN(numero) ? Number.MAX_SAFE_INTEGER : numero;
}

function construirArribosParaParada(idParada, codLinea) {
  const lineasFiltradas =
    codLinea && codLinea !== "0"
      ? lineas.filter((linea) => linea.codigo === codLinea || linea.numero === codLinea)
      : lineas;

  return lineasFiltradas
    .flatMap((linea) =>
      (arribosPorLinea[linea.codigo] ?? [])
        .map((micro) => {
          const parada = micro.recorrido.paradas.find((p) => p.identificador === idParada);
          if (!parada) return null;

          return {
            codigoLinea: linea.codigo,
            descripcionLinea: linea.descripcion,
            descripcionBandera: micro.recorrido.direccion,
            direccion: micro.recorrido.direccion,
            tiempoRestanteArribo: parada.tiempo ?? "Sin dato",
            interno: micro.interno,
          };
        })
        .filter(Boolean),
    )
    .sort(
      (a, b) =>
        extraerMinutos(a.tiempoRestanteArribo) - extraerMinutos(b.tiempoRestanteArribo),
    );
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
    .filter(({ distancia }) => distancia <= (Number.isNaN(radioMetros) ? 500 : radioMetros))
    .sort((a, b) => a.distancia - b.distancia)
    .map(({ parada }) => parada);

  return res.json(paradasDentroDelRadio);
});

app.get("/arribos", (req, res) => {
  const { codLinea, idParada } = req.query;
  if (!idParada) {
    return res.status(400).json({ error: "El parámetro idParada es obligatorio." });
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

app.listen(PORT, () => {
  console.log(`API local de colectivos corriendo en http://localhost:${PORT}`);
});