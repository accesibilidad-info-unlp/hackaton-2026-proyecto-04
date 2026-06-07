import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { savePosition, getPosition } from "./position/position";

function inicializarMapa() {
  const map = L.map("map").setView([-34.9214, -57.9544], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
  }).addTo(map);
}

async function llamadaProxy() {
  const res = await fetch('http://localhost:3000/arribos?codLinea=281&idParada=LP0793');
  const data = await res.json();

  console.log(data);
}

savePosition();
getPosition();
inicializarMapa();
llamadaProxy();
