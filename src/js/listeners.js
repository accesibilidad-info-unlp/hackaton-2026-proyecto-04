import { paradasCercanas } from "./main";

const paradasCercanasBTN = document.getElementById("paradas-cercanas");
const divParadas = document.getElementById('stops-info');

import { Marcador } from "./main";

export default function inicializarListeners(mapa) {
  paradasCercanasBTN.addEventListener('click', async () => {
    // limpiar paradas anteriores 
    mapa.borrarMarcadores();

    while (divParadas.firstChild) {
      divParadas.removeChild(divParadas.firstChild);
    }

    const paradas = await paradasCercanas(mapa.lat, mapa.long);
    console.log(paradas);

    paradas.forEach(parada => {
      const marcador = new Marcador(parada.latitud, parada.longitud, parada.calleInterseccion, parada.callePrincipal, parada.codigo, parada.descripcion, parada.identificador, parada.lineas);
      mapa.agregarMarcador(marcador);

      const titleParada = document.createElement('h3');
      const pCalles = document.createElement('p');

      titleParada.textContent = "Parada: "
      pCalles.textContent = `${parada.callePrincipal} y ${parada.calleInterseccion}`;
      pCalles.classList.add('p-calles');

      divParadas.appendChild(titleParada);
      divParadas.appendChild(pCalles);
    })

  })

}


