import { HandlePopUp } from "../popUpParada.js";
import Marker from "./Marker.js";

const iconoMicro = L.divIcon({
  className: "map-marker map-marker--micro",
  html: `
      <svg class="map-marker__svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 17V7a2 2 0 012-2h14a2 2 0 012 2v10"/>
        <path d="M3 13h18"/>
        <rect x="1" y="17" width="4" height="3" rx="1"/>
        <rect x="19" y="17" width="4" height="3" rx="1"/>
      </svg>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -22],
});

const iconoRecorrido = L.divIcon({
  className: "map-marker map-marker--recorrido",
  html: `
      <div class="map-marker__dot" aria-hidden="true"></div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
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
    this.capaPreviewRecorridos = L.layerGroup();
    this._mapA11yObserver = null;
    this._routingControlGuia = null; // cómo llegar (azul)
    this._routingControlLinea = null; // recorrido de línea (rojo)
    this._marcadorDireccion = null;
    this._marcadorUbicacion = null;
    // globalThis.Map: la clase se llama Map; `new Map()` recursaría al constructor.
    this._geometriaRutaCache = new globalThis.Map();
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

  /**
   * En mobile baja el bottom sheet al mínimo para que se vea el mapa.
   */
  colapsarPanelSiMobile() {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 700px)").matches) return;
    window.sheet?.applyState?.("peek");
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

    this._marcadorUbicacion = L.circleMarker([this._lat, this._long], {
      radius: 11,
      weight: 3,
      opacity: 1,
      fillOpacity: 0.85,
      className: "map-user-location",
    })
      .addTo(this._map)
      .bindPopup("Tu ubicación actual", {
        className: "map-popup",
      });

    this._deshabilitarFocoTecladoEnMapa();
  }

  /**
   * Actualiza el punto de "tu ubicación" (p. ej. luego de aceptar geolocalización).
   * @param {number} lat
   * @param {number} lon
   * @param {{centrar?: boolean, zoom?: number}} [opts]
   */
  actualizarUbicacionUsuario(lat, lon, { centrar = true, zoom = 16 } = {}) {
    this._lat = lat;
    this._long = lon;
    if (this._marcadorUbicacion) {
      this._marcadorUbicacion.setLatLng([lat, lon]);
    }
    if (centrar && this._map) {
      this._map.setView([lat, lon], zoom);
    }
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

  /**
   * Agrega el marcador al mapa si todavía no está (p.ej. home sin mapa abierto).
   */
  asegurarMarcador(marcador) {
    const yaEsta = this._marcadores.some(
      (m) => m.data?._identificador === marcador?._identificador,
    );
    if (!yaEsta) {
      this.agregarMarcador(marcador);
    }
  }

  agregarMarcador(marcador) {
    const iconoParada = L.divIcon({
      className: "map-marker map-marker--stop",
      html: `
        <span class="material-symbols-outlined map-marker__symbol" aria-hidden="true">directions_bus</span>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -24],
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

    this._marcadores.push({ data: marcador, layer: marcador_mapa });
    this.capaParadas.addLayer(marcador_mapa);
  }

  borrarMarcadores() {
    this._marcadores = [];
    this.capaParadas.clearLayers();
    this.borrarMarcadorDireccion();
  }

  /**
   * Deja visible solo el ícono de una parada (p.ej. al elegir "Cómo llegar").
   */
  dejarSoloMarcadorParada(identificador) {
    const conservados = [];

    this._marcadores.forEach(({ data, layer }) => {
      if (data._identificador === identificador) {
        conservados.push({ data, layer });
      } else if (this.capaParadas.hasLayer(layer)) {
        this.capaParadas.removeLayer(layer);
      }
    });

    this._marcadores = conservados;
  }

  /**
   * Marca una dirección geocodificada (no es una parada mock).
   */
  marcarDireccion(lat, lng, etiqueta = "Destino") {
    this.borrarMarcadorDireccion();

    this._marcadorDireccion = L.marker([lat, lng], {
      keyboard: false,
      title: etiqueta,
      alt: etiqueta,
    })
      .bindPopup(etiqueta, { className: "map-popup" })
      .addTo(this._map);

    this._marcadorDireccion.openPopup();
    this.actualizarVista(lat, lng, 16);
    this.colapsarPanelSiMobile();
    return this._marcadorDireccion;
  }

  borrarMarcadorDireccion() {
    if (this._marcadorDireccion && this._map) {
      this._map.removeLayer(this._marcadorDireccion);
      this._marcadorDireccion = null;
    }
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
    this.colapsarPanelSiMobile();

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

  /**
   * Dibuja una ruta por calles (OSRM) desde la ubicación del usuario
   * hasta una parada destino. Pensado para "cómo llegar caminando".
   * No borra el recorrido rojo de una línea si está dibujado.
   */
  mostrarRutaHasta(destinoLat, destinoLng, opciones = {}) {
    if (!this._map || typeof L.Routing === "undefined") {
      console.warn("[Map] leaflet-routing-machine no está disponible");
      return;
    }

    if (opciones.identificadorParada) {
      this.dejarSoloMarcadorParada(opciones.identificadorParada);
    }

    this.borrarRutaGuia();
    if (opciones.colapsar !== false) {
      this.colapsarPanelSiMobile();
    }

    const tituloDestino =
      opciones.tituloDestino || "Parada de colectivo";

    const crearControl = (serviceUrl) =>
      L.Routing.control({
        waypoints: [
          L.latLng(this._lat, this._long),
          L.latLng(destinoLat, destinoLng),
        ],
        router: L.Routing.osrmv1({ serviceUrl }),
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        showAlternatives: false,
        show: false,
        collapsible: true,
        language: "es",
        lineOptions: {
          styles: [{ color: "#2086D7", weight: 6, opacity: 0.9 }],
        },
        createMarker: () => null, // la parada destino ya está en capaParadas
      });

    // Preferimos perfil peatonal; si falla, caemos al OSRM público (driving).
    const serviceFoot =
      "https://routing.openstreetmap.de/routed-foot/route/v1";
    const serviceDriving =
      "https://router.project-osrm.org/route/v1";

    this._routingControlGuia = crearControl(serviceFoot).addTo(this._map);

    let reintentoDriving = false;
    this._routingControlGuia.on("routingerror", () => {
      if (reintentoDriving || !this._routingControlGuia) return;
      reintentoDriving = true;

      this._map.removeControl(this._routingControlGuia);
      this._routingControlGuia = crearControl(serviceDriving).addTo(this._map);

      this._routingControlGuia.on("routingerror", () => {
        console.warn("[Map] No se pudo calcular la ruta por calles");
        alert(
          "No se pudo calcular el camino hasta la parada. Revisá tu conexión e intentá de nuevo.",
        );
      });
    });
  }

  borrarRutaGuia() {
    if (this._routingControlGuia && this._map) {
      this._map.removeControl(this._routingControlGuia);
      this._routingControlGuia = null;
    }
  }

  borrarRecorridoLinea() {
    if (this._routingControlLinea && this._map) {
      this._map.removeControl(this._routingControlLinea);
      this._routingControlLinea = null;
    }
  }

  borrarPreviewsRecorridos() {
    this.capaPreviewRecorridos.clearLayers();
  }

  ajustarVistaAPreviews() {
    const layers = this.capaPreviewRecorridos.getLayers();
    if (!layers.length || !this._map) return;
    const grupo = L.featureGroup(layers);
    this._map.fitBounds(grupo.getBounds().pad(0.12));
  }

  /**
   * Obtiene la geometría por calles (OSRM) de una secuencia de paradas.
   * Cachea por coordenadas para no repetir requests al volver al menú.
   */
  async obtenerGeometriaRuta(paradas) {
    const puntos = (paradas ?? []).filter(
      (p) => p.latitud != null && p.longitud != null,
    );
    if (puntos.length < 2) return null;

    const cacheKey = puntos
      .map((p) => `${p.latitud.toFixed(5)},${p.longitud.toFixed(5)}`)
      .join("|");
    if (this._geometriaRutaCache.has(cacheKey)) {
      return this._geometriaRutaCache.get(cacheKey);
    }

    const coords = puntos
      .map((p) => `${p.longitud},${p.latitud}`)
      .join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const geometry = data.routes?.[0]?.geometry?.coordinates;
      if (!Array.isArray(geometry) || geometry.length === 0) return null;

      // GeoJSON: [lon, lat] → Leaflet: [lat, lon]
      const latlngs = geometry.map(([lon, lat]) => [lat, lon]);
      this._geometriaRutaCache.set(cacheKey, latlngs);
      return latlngs;
    } catch (error) {
      console.warn("[Map] OSRM preview falló:", error);
      return null;
    }
  }

  /**
   * Dibuja un recorrido tenue (selección de rutas).
   */
  async pintarPreviewRecorrido(paradas, color = "#666666") {
    const latlngs = await this.obtenerGeometriaRuta(paradas);
    if (!latlngs) return null;

    const linea = L.polyline(latlngs, {
      color,
      weight: 4,
      opacity: 0.28,
      interactive: false,
      className: "map-route-preview",
    });
    this.capaPreviewRecorridos.addLayer(linea);
    return linea;
  }

  /** Limpia guía peatonal + recorrido de línea (ambos routing controls). */
  borrarRutaGuiada() {
    this.borrarRutaGuia();
    this.borrarRecorridoLinea();
    this.borrarPreviewsRecorridos();
  }

  /**
   * Dibuja el recorrido de una línea uniendo sus paradas por calles (OSRM).
   * @param {Array<{latitud:number,longitud:number,descripcion?:string}>} paradas
   * @param {{color?: string, titulo?: string}} [opciones]
   */
  async mostrarRecorridoLinea(paradas, opciones = {}) {
    if (!this._map) {
      console.warn("[Map] el mapa no está listo");
      return;
    }

    const puntos = (paradas ?? []).filter(
      (p) => p.latitud != null && p.longitud != null,
    );
    if (puntos.length < 2) {
      alert("Esta línea no tiene suficientes paradas para dibujar un recorrido.");
      return;
    }

    this.borrarRecorridoLinea();
    this.borrarRutaGuia();
    this.borrarRecorrido();
    this.borrarPreviewsRecorridos();
    this.colapsarPanelSiMobile();

    const color = opciones.color || "#e53935";
    const serviceDriving = "https://router.project-osrm.org/route/v1";

    // Preferimos geometría cacheada (la de los previews) para pintar al toque;
    // si no hay, caemos a leaflet-routing-machine.
    const latlngsCache = await this.obtenerGeometriaRuta(puntos);
    if (latlngsCache) {
      const linea = L.polyline(latlngsCache, {
        color,
        weight: 6,
        opacity: 0.95,
        className: "map-route-line-activa",
      }).addTo(this.capaRecorrido);

      L.polylineDecorator(linea, {
        patterns: [
          {
            offset: "5%",
            repeat: "12%",
            symbol: L.Symbol.arrowHead({
              pixelSize: 10,
              polygon: false,
              pathOptions: {
                stroke: true,
                weight: 3,
                color,
              },
            }),
          },
        ],
      }).addTo(this.capaRecorrido);

      this._map.fitBounds(linea.getBounds().pad(0.12));
      return;
    }

    if (typeof L.Routing === "undefined") {
      console.warn("[Map] leaflet-routing-machine no está disponible");
      alert(
        "No se pudo trazar el recorrido por calles. Revisá tu conexión e intentá de nuevo.",
      );
      return;
    }

    // Fallback: leaflet-routing-machine
    this._routingControlLinea = L.Routing.control({
      waypoints: puntos.map((p) => L.latLng(p.latitud, p.longitud)),
      router: L.Routing.osrmv1({ serviceUrl: serviceDriving }),
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      show: false,
      collapsible: true,
      language: "es",
      lineOptions: {
        styles: [{ color, weight: 6, opacity: 0.95 }],
      },
      createMarker: () => null,
    }).addTo(this._map);

    this._routingControlLinea.on("routingerror", () => {
      console.warn("[Map] No se pudo calcular el recorrido de la línea");
      alert(
        "No se pudo trazar el recorrido por calles. Revisá tu conexión e intentá de nuevo.",
      );
    });
  }
  mostrar() {
    const main = document.getElementById("main-section");
    main?.classList.add("map-visible");

    // Con mapa abierto siempre hay salida clara (evita softlock sin "volver")
    const volver = document.getElementById("volver");
    if (volver) {
      volver.style.display = "";
    }

    // No colapsamos el sheet acá: dejar elegir en el menú (Recorridos, etc.).
    // Se baja solo al dibujar una ruta concreta (cómo llegar / micro elegido).
    requestAnimationFrame(() => {
      this._map?.invalidateSize();
    });
  }

  ocultar() {
    const main = document.getElementById("main-section");
    main?.classList.remove("map-visible");

    const volver = document.getElementById("volver");
    if (volver) {
      volver.style.display = "none";
    }

    // Recuperar sheet usable en mobile (peek + scroll top = handle perdido)
    if (typeof window !== "undefined") {
      const container = document.querySelector(".container");
      if (container) container.scrollTop = 0;
      window.sheet?.applyState?.("full");
    }

    requestAnimationFrame(() => {
      this._map?.invalidateSize();
    });
  }
}
