import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { savePosition, getPosition } from "./position/position";
import inicializarListeners from "./listeners";

class Map {
  constructor(lat, long) {
    this._lat = lat;
    this._long = long;
    this._map = null;
    this.capaParadas = L.layerGroup();
  }
  get lat() { return this._lat }
  get long() { return this._long }

  construirMapa() {
    this._map = L.map("map").setView([this.lat, this.long], 16);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(this._map);

    L.marker([this._lat, this._long]).addTo(this._map);
  }

  agregarMarcador(customLat, customLong) {
    const marcador = L.marker([customLat, customLong]);
    this.capaParadas.addLayer(marcador);
  }

  borrarMarcadores() {
    this.capaParadas.clearLayers();
  }
}


async function fetchApi(link) {
  const res = await fetch(link);
  return await res.json();
}

export async function paradasCercanas(lat, long) {
  // Devuelve un array con las paradas 
  return await fetchApi(`http://localhost:3000/paradascercanas?lat=${lat}&long=${long}`)
}

async function main() {
  savePosition();
  const { lat, lon } = getPosition();

  const mapa = new Map(lat, lon);
  mapa.construirMapa();
  mapa.capaParadas.addTo(mapa._map);

  inicializarListeners(mapa);
}

main();
