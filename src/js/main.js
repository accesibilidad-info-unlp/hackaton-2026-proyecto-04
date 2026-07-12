import L from "./initLeaflet.js";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

// solucion al problema de carga de iconos de leaflet en vite
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function savePosition() {
  const exito = (position) => {
    const ubicacion = {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      timestamp: Date.now(),
    };
    localStorage.setItem("user_location", JSON.stringify(ubicacion));
    console.log("Localización guardada en el localStorage");
  };

  const error = (errorObjeto) => {
    if (errorObjeto.code === errorObjeto.PERMISSION_DENIED) {
      console.warn("El usuario tocó que NO / Bloqueó el acceso.");
      alert(
        "Necesitamos tu ubicación para mostrar el mapa. Por favor, actívala en tu navegador.",
      );
    } else {
      console.error("Ocurrió otro error:", errorObjeto.message);
    }
  };

  navigator.geolocation.getCurrentPosition(exito, error);
}
const getPosition = () => {
  const position = localStorage.getItem("user_location");
  console.log(position);
};

function inicializarMapa() {
  const map = L.map("map").setView([-34.9214, -57.9544], 15);
  L.tileLayer("https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  }).addTo(map);

  // logica de ruteo al hacer clic en el mapa
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

savePosition();
getPosition();
inicializarMapa();