import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-polylinedecorator";

import { savePosition, getPosition } from "./position/position";
import inicializarListeners from "./listeners";

import Map from "./clases/Map.js";

import "./menu.js";

export async function fetchApi(link) {
  const res = await fetch(link);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error(e.message);
    return null;
  }
}


export async function paradasCercanas(lat, long, radioMetros = 500) {
  return await fetchApi(
    `http://localhost:3000/paradascercanas?lat=${lat}&long=${long}&radioMetros=${radioMetros}`,
  );
}

async function main() {
  await savePosition();
  const { lat, lon } = getPosition();

  const mapa = new Map(lat, lon);
  mapa.construirMapa();
  mapa.capaParadas.addTo(mapa._map);
  mapa.capaMicros.addTo(mapa._map);
  mapa.capaRecorrido.addTo(mapa._map);

  inicializarListeners(mapa);
}

main();
