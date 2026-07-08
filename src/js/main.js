import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-polylinedecorator";

import { savePosition, getPosition } from "./position/position";
import inicializarListeners from "./listeners";

import { MicroSimulado } from "./microSimulado";
import { rutaMicros } from "./rutaMicros.js";
import "./menu.js";

import { HandlePopUp } from "./popUpParada.js";

const iconoMicro = L.divIcon({
  className: "",
  html: `
    <div style="
      width:30px;height:30px;
      background:#C62828;
      border:2px solid white;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 17V7a2 2 0 012-2h14a2 2 0 012 2v10"/>
        <path d="M3 13h18"/>
        <rect x="1" y="17" width="4" height="3" rx="1"/>
        <rect x="19" y="17" width="4" height="3" rx="1"/>
      </svg>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -18],
});

const iconoRecorrido = L.divIcon({
  className: "",
  html: `
    <div style="
      width:14px;height:14px;
      background:#2E7D32;
      border:2px solid white;
      border-radius:50%;
      box-shadow:0 1px 4px rgba(0,0,0,0.4);
    "></div>
  `,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

class Map {
  constructor(lat, long) {
    this._lat = lat;
    this._long = long;
    this._map = null;
    this._marcadores = [];
    this._microsSimulados = [];
    this.capaParadas = L.layerGroup();
    this.capaMicros = L.layerGroup();
    this.capaRecorrido = L.layerGroup();
  }

  get lat() {
    return this._lat;
  }
  get long() {
    return this._long;
  }

  construirMapa() {
    this._map = L.map("map").setView([this.lat, this.long], 16);
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      },
    ).addTo(this._map);

    L.circleMarker([this._lat, this._long], {
      radius: 8,
      fillColor: "#F52727",
      color: "#FF0000",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8,
    })
      .addTo(this._map)
      .bindPopup("Tu ubicación actual");
  }

  agregarMarcador(marcador) {
    this._marcadores.push(marcador);

    const iconoParada = L.divIcon({
      className: "",
      html: `
      <div style="
        width:32px;height:32px;
        background:#1565C0;
        border:2px solid white;
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 6px rgba(0,0,0,0.3);
        cursor:pointer;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 17V7a2 2 0 012-2h14a2 2 0 012 2v10"/>
          <path d="M3 13h18"/>
          <path d="M8 5V3"/>
          <path d="M16 5V3"/>
          <rect x="1" y="17" width="4" height="3" rx="1"/>
          <rect x="19" y="17" width="4" height="3" rx="1"/>
          <path d="M7 13v-3h10v3"/>
          <circle cx="8.5" cy="17" r="1" fill="white"/>
          <circle cx="15.5" cy="17" r="1" fill="white"/>
        </svg>
      </div>
    `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -20],
    });

    const marcador_mapa = L.marker([marcador.lat, marcador.long], {
      icon: iconoParada,
    });

    marcador_mapa.bindPopup("Cargando...");

    marcador_mapa.on("click", async () => {
      await HandlePopUp(marcador_mapa, marcador, this);
    });

    this.capaParadas.addLayer(marcador_mapa, marcador);
  }

  borrarMarcadores() {
    this._marcadores = [];
    this.capaParadas.clearLayers();
  }

  /**
   * Agrega un micro simulado (datos hardcodeados) que se mueve
   * suavemente sobre una ruta de coordenadas dentro de capaMicros.
   * @param {Array<{lat:number, lng:number}>} ruta
   * @param {number} duracionTramoMs
   * @returns {MicroSimulado}
   */
  agregarMicroSimulado(ruta, km_p_h = 60) {
    const micro = new MicroSimulado(this._map, ruta, km_p_h, {
      icon: iconoMicro,
    });
    this.capaMicros.addLayer(micro.marker);
    this._microsSimulados.push(micro);
    micro.iniciar();
    return micro;
  }

  detenerMicrosSimulados() {
    this._microsSimulados.forEach((micro) => micro.detener());
  }

  distanciaAPunto(paradaLat, paradaLong) {
    return L.latLng(this._lat, this._long).distanceTo([paradaLat, paradaLong]);
  }
mostrarRecorrido(paradas) {
  this.borrarMarcadores();
  this.borrarRecorrido();

  const puntos = [];

  paradas.forEach((parada) => {
    if (parada.latitud == null || parada.longitud == null) return;

    const punto = [parada.latitud, parada.longitud];
    puntos.push(punto);

    L.marker(punto, { icon: iconoRecorrido })
      .bindPopup(`${parada.descripcion} · ${parada.tiempo}`)
      .addTo(this.capaRecorrido);
  });

  if (puntos.length > 1) {
    const linea = L.polyline(puntos, {
      color: "#2E7D32",
      weight: 4,
      opacity: 0.8,
      dashArray: "6 8",
    }).addTo(this.capaRecorrido);

    // Flechas de dirección a lo largo del recorrido
    L.polylineDecorator(linea, {
      patterns: [
        {
          offset: "5%",
          repeat: "10%", // cada 10% del largo total aparece una flecha
          symbol: L.Symbol.arrowHead({
            pixelSize: 10,
            polygon: false,
            pathOptions: {
              stroke: true,
              color: "#000000",
              weight: 3,
            },
          }),
        },
      ],
    }).addTo(this.capaRecorrido);
  }
}

  borrarRecorrido() {
    this.capaRecorrido.clearLayers();
  }
}

export class Marcador {
  constructor(
    lat,
    long,
    calleIntersec,
    callePrincipal,
    codigo,
    descripcion,
    identificador,
    lineas,
  ) {
    this._lat = lat;
    this._long = long;
    this._calleInterseccion = calleIntersec;
    this._callePrincipal = callePrincipal;
    this._codigo = codigo;
    this._descripcion = descripcion;
    this._identificador = identificador;
    this._lineas = lineas;
  }

  get lat() {
    return this._lat;
  }
  get long() {
    return this._long;
  }

  getData() {
    return {
      lat: this._lat,
      long: this._long,
      calleInter: this._calleInterseccion,
      callePrincipal: this._callePrincipal,
      codigo: this._codigo,
      descripcion: this._descripcion,
      identificador: this._identificador,
      lineas: this._lineas,
    };
  }

  async llegadas() {
    return await fetchApi(
      `http://localhost:3000/arribos?codLinea=0&idParada=${this._identificador}`,
    );
  }
}

async function fetchApi(link) {
  const res = await fetch(link);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Respuesta no es JSON:", text.substring(0, 200));
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
