import L from "./initLeaflet.js";
import "leaflet-polylinedecorator";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

import { savePosition, getPosition } from "./position/position";
import inicializarListeners from "./listeners";
import Map from "./clases/Map.js";

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
function inicializarRuteo(map) {
  let routingControl = null;
  let firstMarker = null;
  let waypoints = [];

  map.on("click", (e) => {
    const latlng = e.latlng;

    if (waypoints.length === 0) {
      // primer click: colocar origen
      waypoints.push(latlng);
      firstMarker = L.marker(latlng, {
        title: "Origen",
        alt: "Punto de origen de la ruta",
      }).addTo(map);
    } else if (waypoints.length === 1) {
      // segundo click: colocar destino e inicializar ruta
      waypoints.push(latlng);

      // borrar el marcador temporal del primer punto
      if (firstMarker) {
        map.removeLayer(firstMarker);
        firstMarker = null;
      }

      // crear control de ruteo
      routingControl = L.Routing.control({
        waypoints: waypoints,
        routeWhileDragging: true,
        showAlternatives: false,
        language: "es", // indicaciones en español
        lineOptions: {
          styles: [{ color: "#2086D7", weight: 6 }],
        },
      }).addTo(map);
    } else {
      // tercer click en adelante: limpiar la ruta existente y empezar de nuevo
      if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
      }
      waypoints = [];

      // establecer el nuevo punto origen
      waypoints.push(latlng);
      firstMarker = L.marker(latlng, {
        title: "Origen",
        alt: "Punto de origen de la ruta",
      }).addTo(map);
    }
  });
}

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
  await savePosition();
  const { lat, lon } = getPosition();

  const mapa = new Map(lat, lon);
  mapa.construirMapa();
  mapa.capaParadas.addTo(mapa._map);
  mapa.capaMicros.addTo(mapa._map);
  mapa.capaRecorrido.addTo(mapa._map);

  //inicializarRuteo(mapa._map);
  inicializarListeners(mapa);
}

main();
