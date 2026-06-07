import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { savePosition, getPosition } from "./position/position";

function inicializarMapa() {
  const map = L.map("map").setView([-34.9214, -57.9544], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
  }).addTo(map);
}

async function fetchApi(link) {
  const res = await fetch(link);
  return await res.json();
}

export async function paradasCercanas() {
  // Devuelve un array con las paradas 
  const { lat, lon } = getPosition();
  return await fetchApi(`http://localhost:3000/paradascercanas?lat=${lat}&long=${lon}`)
}

savePosition();
getPosition();
inicializarMapa();
