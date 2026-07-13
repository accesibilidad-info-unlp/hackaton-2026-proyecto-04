import { HandlePopUp } from "../popUpParada.js";
import Marker from "./Marker.js";

const iconoMicro = L.divIcon({
  className: "map-marker map-marker--micro",
  html: `
      <svg class="map-marker__svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 17V7a2 2 0 012-2h14a2 2 0 012 2v10"/>
        <path d="M3 13h18"/>
        <rect x="1" y="17" width="4" height="3" rx="1"/>
        <rect x="19" y="17" width="4" height="3" rx="1"/>
      </svg>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -18],
});

const iconoRecorrido = L.divIcon({
  className: "map-marker map-marker--recorrido",
  html: `
      <div class="map-marker__dot" aria-hidden="true"></div>
  `,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});


export default class Map {
  constructor(lat, long) {
    this._lat = lat;
    this._long = long;
    this._map = null;
    this._marcadores = [];
    this._microsSimulados = [];
    this.capaParadas = L.layerGroup();
    this.capaMicros = L.layerGroup();
    this.capaRecorrido = L.layerGroup();
    this._mapA11yObserver = null;
  }

  get lat() {
    return this._lat;
  }
  get long() {
    return this._long;
  }

  actualizarVista(lat, long, zoom = 16) {
    this._map.setView([lat, long], zoom);
  }

  construirMapa() {
    this._map = L.map("map", {
      keyboard: false,
    }).setView([this.lat, this.long], 16);
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
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8,
      className: "map-user-location",
    })
      .addTo(this._map)
      .bindPopup("Tu ubicación actual", {
        className: "map-popup",
      });

    this._deshabilitarFocoTecladoEnMapa();
  }

  _deshabilitarFocoTecladoEnMapa() {
    const mapElement = document.getElementById("map");
    if (!mapElement) {
      return;
    }

    const focusableSelector =
      "a, button, input, select, textarea, [tabindex], [contenteditable='true']";

    const bloquearFoco = (rootNode) => {
      if (!rootNode || rootNode.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      const element = rootNode;

      if (element.matches(focusableSelector)) {
        element.setAttribute("tabindex", "-1");
      }

      element.querySelectorAll(focusableSelector).forEach((focusableElement) => {
        focusableElement.setAttribute("tabindex", "-1");
      });
    };

    mapElement.setAttribute("tabindex", "-1");
    mapElement.setAttribute("aria-hidden", "true");
    mapElement.setAttribute("role", "presentation");
    bloquearFoco(mapElement);

    if (this._mapA11yObserver) {
      this._mapA11yObserver.disconnect();
    }

    this._mapA11yObserver = new MutationObserver((mutationList) => {
      mutationList.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => bloquearFoco(node));
      });
    });

    this._mapA11yObserver.observe(mapElement, {
      childList: true,
      subtree: true,
    });
  }

  agregarMarcador(marcador) {
    this._marcadores.push(marcador);

    const iconoParada = L.divIcon({
      className: "map-marker map-marker--stop",
      html: `
        <span class="material-symbols-outlined map-marker__symbol" aria-hidden="true">directions_bus</span>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -20],
    });

    const marcador_mapa = L.marker([marcador.lat, marcador.long], {
      icon: iconoParada,
      keyboard: false,
    });

    marcador_mapa.bindPopup("Cargando...", {
      className: "map-popup",
    });

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
        .bindPopup(`${parada.descripcion} · ${parada.tiempo}`, {
          className: "map-popup",
        })
        .addTo(this.capaRecorrido);
    });

    if (puntos.length > 1) {
      const linea = L.polyline(puntos, {
        weight: 4,
        opacity: 0.8,
        dashArray: "6 8",
        className: "map-route-line",
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
                weight: 3,
                className: "map-route-arrow",
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
