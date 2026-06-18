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
      marcador_mapa.openPopup();
      const data = await marcador.llegadas();
      if (!data || !data.arribos || data.arribos.length === 0) {
        marcador_mapa.setPopupContent("No hay arribos disponibles.");
        return;
      }
      const colores = (mins) => {
        const n = parseInt(mins);
        if (n <= 5) return "background:#EAF3DE;color:#3B6D11";
        if (n <= 15) return "background:#FAEEDA;color:#854F0B";
        return "background:#FCEBEB;color:#A32D2D";
      };
      const extraerMinutos = (texto) => texto?.match(/\d+/)?.[0] ?? "?";

      const html = `
      <div style="min-width:220px">
        <div style="font-size:13px;font-weight:500;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #eee">
          📍 ${marcador._callePrincipal} y ${marcador._calleInterseccion}
        </div>
        ${data.arribos
          .map((a) => {
            const mins = extraerMinutos(a.tiempoRestanteArribo);
            return `
            <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f0f0f0">
              <div style="min-width:48px;text-align:center;padding:3px 6px;border-radius:6px;font-size:12px;font-weight:500;${colores(mins)}">
                ${mins} min
              </div>
              <div>
                <div style="font-size:12px;font-weight:500">${a.descripcionLinea || "Línea"}</div>
                <div style="font-size:11px;color:#888">${a.descripcionBandera}</div>
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
