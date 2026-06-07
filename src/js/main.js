import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { savePosition, getPosition } from "./position/position";
import inicializarListeners from "./listeners";

class Map {
  constructor(lat, long) {
    this._lat = lat;
    this._long = long;
    this._map = null;
  }
  get lat() { return this._lat }
  get long() { return this._long }

  construirMapa() {
    this.map = L.map("map").setView([this.lat, this.long], 16);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(this.map);
  }

  agregarMarcador(customLat, customLong) {
    const mLat = customLat || this._lat;
    const mLong = customLong || this._long;

    L.marker([mLat, mLong]).addTo(this.map)
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
  mapa.agregarMarcador()

  inicializarListeners(mapa);
}

main();
