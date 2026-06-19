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
  get lat() {
    return this._lat;
  }
  get long() {
    return this._long;
  }

  construirMapa() {
    this._map = L.map("map").setView([this.lat, this.long], 16);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(this._map);

    L.circleMarker([this._lat, this._long], {
      radius: 8,
      fillColor: "#c73a7c",
      color: "#991D56",
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
      <div class="bus-stop-marker">
        <span class="material-symbols-outlined bus-stop-marker__icon" aria-hidden="true">bus_map_pin</span>
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
      marcador_mapa.openPopup();
      const data = await marcador.llegadas();
      console.log(data);
      if (!data || !data.arribos || data.arribos.length === 0) {
        marcador_mapa.setPopupContent("No hay arribos disponibles.");
        return;
      }
      const colores = (mins) => {
        const n = parseInt(mins);
        if (n <= 5) return "marker-arrival__badge marker-arrival__badge--soon";
        if (n <= 15) return "marker-arrival__badge marker-arrival__badge--soonish";
        return "marker-arrival__badge marker-arrival__badge--late";
      };
      const extraerMinutos = (texto) => texto?.match(/\d+/)?.[0] ?? "?";

      const html = `
      <div class="marker-popup">
        <div class="marker-popup__title">
          <span class="material-symbols-outlined marker-popup__title-icon" aria-hidden="true">location_on</span>
          <span>${marcador._callePrincipal} y ${marcador._calleInterseccion}</span>
        </div>
        ${data.arribos
          .map((a) => {
            const mins = extraerMinutos(a.tiempoRestanteArribo);
            return `
            <div class="marker-arrival">
              <div class="${colores(mins)}">
                <span class="marker-arrival__value">${mins}</span>
                <span class="marker-arrival__unit">min</span>
              </div>
              <div class="marker-arrival__content">
                <div class="marker-arrival__line">${a.descripcionLinea || "Línea"}</div>
                <div class="marker-arrival__bandera">${a.descripcionBandera}</div>
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    `;
      marcador_mapa.setPopupContent(html);
    });

    this.capaParadas.addLayer(marcador_mapa);
  }
  borrarMarcadores() {
    this._marcadores = [];
    this.capaParadas.clearLayers();
  }
  distanciaAPunto(paradaLat, paradaLong) {
    return L.latLng(this._lat, this._long).distanceTo([paradaLat, paradaLong]);
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

export async function paradasCercanas(lat, long) {
  // Devuelve un array con las paradas
  return await fetchApi(
    `http://localhost:3000/paradascercanas?lat=${lat}&long=${long}`,
  );
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
