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
    this._marcadores = [];
  }
  get lat() { return this._lat }
  get long() { return this._long }

  construirMapa() {
    this._map = L.map("map").setView([this.lat, this.long], 16);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(this._map);

    L.circleMarker([this._lat, this._long], {
      radius: 8,
      fillColor: "#F52727",
      color: "#FF0000",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8
    }).addTo(this._map).bindPopup("Tu ubicación actual");
  }

  agregarMarcador(marcador) {
    this._marcadores.push(marcador);
    const marcador_mapa = L.marker([marcador.lat, marcador.long]);

    marcador_mapa.bindPopup("Cargando...");

    marcador_mapa.on('click', async () => {
      marcador_mapa.openPopup();
      const data = await marcador.llegadas();
      console.log(data);

      if (!data || !data.arribos || data.arribos.length === 0) {
        marcador_mapa.setPopupContent("No hay arribos disponibles.");
        return;
      }

      const html = data.arribos.map(a => `
      <div style="margin-bottom:6px">
        <strong>${a.descripcionLinea || 'Línea'}</strong> — ${a.descripcionBandera}<br>
        <span>${a.tiempoRestanteArribo}</span>
      </div>
    `).join('');

      marcador_mapa.setPopupContent(html);
    });

    this.capaParadas.addLayer(marcador_mapa);
  }
  borrarMarcadores() {
    this._marcadores = [];
    this.capaParadas.clearLayers();
  }
}

export class Marcador {
  constructor(lat, long, calleIntersec, callePrincipal, codigo, descripcion, identificador, lineas) {
    this._lat = lat;
    this._long = long;
    this._calleInterseccion = calleIntersec
    this._callePrincipal = callePrincipal;
    this._codigo = codigo;
    this._descripcion = descripcion;
    this._identificador = identificador;
    this._lineas = lineas;
  }

  get lat() { return this._lat }
  get long() { return this._long }

  getData() {
    return {
      lat: this._lat,
      long: this._long,
      calleInter: this._calleInterseccion,
      callePrincipal: this._callePrincipal,
      codigo: this._codigo,
      descripcion: this._descripcion,
      identificador: this._identificador,
      lineas: this._lineas
    }
  }
  async llegadas() {
    return await fetchApi(`http://localhost:3000/arribos?codLinea=0&idParada=${this._identificador}`);
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
  await savePosition();
  const { lat, lon } = getPosition();

  const mapa = new Map(lat, lon);
  mapa.construirMapa();
  mapa.capaParadas.addTo(mapa._map);

  inicializarListeners(mapa);
}

main();
