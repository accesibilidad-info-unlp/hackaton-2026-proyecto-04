import L from "./initLeaflet.js";
import "leaflet-polylinedecorator";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

import { savePosition, getPosition } from "./position/position";
import inicializarListeners from "./listeners";
import Map from "./clases/Map.js";
import { construirGrafoBase, calcularDistancia } from './armarGrafo.js';
import { initSidebarResize } from "./sidebarResize.js";

import "./menu.js";

// Solución al problema de carga de iconos de Leaflet en Vite
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export function buscarFavStorage(identificador) {
  try {
    const listaFav = JSON.parse(localStorage.getItem('paradas-favoritas'));
    if (!Array.isArray(listaFav)) return false;
    return listaFav.includes(identificador);
  } catch (e) {
    return false;
  }
}

async function main() {
  // Construir el mapa ya (fallback La Plata / cache), sin bloquear en el permiso de geo.
  // Antes await savePosition() dejaba #map vacío hasta aceptar/denegar ubicación.
  const { lat, lon } = getPosition();

  const mapa = new Map(lat, lon);
  mapa.construirMapa();
  mapa.capaParadas.addTo(mapa._map);
  mapa.capaMicros.addTo(mapa._map);
  mapa.capaRecorrido.addTo(mapa._map);
  mapa.capaPreviewRecorridos.addTo(mapa._map);

  inicializarListeners(mapa);
  initSidebarResize();

  try {
    const pos = await savePosition();
    if (pos?.lat != null && pos?.lon != null) {
      mapa.actualizarUbicacionUsuario(pos.lat, pos.lon);
    }
  } catch (e) {
    console.warn("[main] No se pudo obtener la ubicación:", e);
  }

  // Dijkstra experimental (grafo de micros), no es el "cómo llegar" por calles:
  // calcularRuta(mapa, lat, lon);
}

/**
 * Construye el grafo de la ciudad, ejecuta Dijkstra desde el origen del usuario
 * hasta el destino hardcodeado y dibuja el recorrido óptimo en el mapa.
 *
 * @param {Map} mapa - instancia del mapa Leaflet
 * @param {number} origenLat - latitud del usuario
 * @param {number} origenLng - longitud del usuario
 */
function calcularRuta(mapa, origenLat, origenLng) {
  const destinoLat = -34.919827;
  const destinoLng = -57.954447;

  // 1. Construir el grafo base con todas las paradas y conexiones
  const { grafo, paradasData } = construirGrafoBase();
  console.log("¡Grafo de la ciudad construido!", grafo);

  // 2. Agregar nodos virtuales de origen y destino
  grafo.addNode("ORIGEN");
  grafo.addNode("DESTINO");

  const paradasConectadasOrigen = [];
  const paradasConectadasDestino = [];

  paradasData.forEach(parada => {
    // Conectar Origen a paradas cercanas (caminando, ej: max 600mts)
    const distOrigen = calcularDistancia(origenLat, origenLng, parada.latitud, parada.longitud);
    if (distOrigen <= 600) {
      grafo.addEdge("ORIGEN", `${parada.identificador}-walk`, distOrigen / 80, "caminata_inicial");
      paradasConectadasOrigen.push(`${parada.identificador} (${Math.round(distOrigen)}m)`);
    }
    // Conectar paradas cercanas al Destino (caminando)
    const distDestino = calcularDistancia(destinoLat, destinoLng, parada.latitud, parada.longitud);
    if (distDestino <= 600) {
      grafo.addEdge(`${parada.identificador}-walk`, "DESTINO", distDestino / 80, "caminata_final");
      paradasConectadasDestino.push(`${parada.identificador} (${Math.round(distDestino)}m)`);
    }
  });

  console.log("🚶 Paradas cerca del ORIGEN (<600m):", paradasConectadasOrigen);
  console.log("🏁 Paradas cerca del DESTINO (<600m):", paradasConectadasDestino);

  // 3. Ejecutar Dijkstra
  const caminoOptimo = grafo.dijkstra("ORIGEN", "DESTINO");
  console.log("Camino óptimo:", caminoOptimo);

  // 4. Construir lookup de paradas por identificador para acceso rápido
  // (usamos un objeto plano para evitar conflicto con la clase Map importada de Leaflet)
  const paradasMap = paradasData.reduce((acc, p) => {
    acc[p.identificador] = p;
    return acc;
  }, {});

  // 5. Convertir el camino óptimo en paradas con coordenadas para el mapa
  // Extraemos el identificador de parada física desde el ID del nodo (ej: "P202-001-walk" -> "P202-001")
  const paradasCamino = caminoOptimo
    .map(paso => {
      // El nodo puede ser "P202-001-walk" (peatonal) o "P202-001-202" (en colectivo)
      // En ambos casos, el identificador de parada física es la parte antes del último guión
      const partes = paso.nodo.split("-");
      const idParada = partes.slice(0, 2).join("-"); // ej: "P202-001"
      const parada = paradasMap[idParada];

      if (!parada) return null;

      return {
        latitud: parada.latitud,
        longitud: parada.longitud,
        descripcion: parada.descripcion,
        tiempo: `Tipo: ${paso.tipo}`,
      };
    })
    .filter(Boolean); // Filtrar nulos (ORIGEN/DESTINO que no tienen coordenadas en paradasData)

  // 6. Agregar el destino al final del recorrido como marcador
  paradasCamino.push({
    latitud: destinoLat,
    longitud: destinoLng,
    descripcion: "Destino",
    tiempo: "",
  });

  if (paradasCamino.length > 0) {
    mapa.mostrarRecorrido(paradasCamino);
    mapa.actualizarVista(origenLat, origenLng, 14);
    console.log("Ruta dibujada en el mapa con", paradasCamino.length, "paradas.");
  } else {
    console.warn("No se encontró ruta entre el origen y el destino.");
  }
}

main();
