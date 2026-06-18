import { paradasCercanas } from "./main";
import { Marcador } from "./main";

const paradasCercanasBTN = document.getElementById("paradas-cercanas");
const divParadas = document.getElementById('stops-info');

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
      const marcador = new Marcador(
        parada.latitud,
        parada.longitud,
        parada.calleInterseccion,
        parada.callePrincipal,
        parada.codigo,
        parada.descripcion,
        parada.identificador,
        parada.lineas
      );

      mapa.agregarMarcador(marcador);

      const paradaDiv = document.createElement('div');
      paradaDiv.classList.add('parada-item');

      const titleParada = document.createElement('h3');
      const pCalles = document.createElement('p');
      const pDistancia = document.createElement('p');

      titleParada.textContent = "Parada";
      pCalles.textContent =
        `${parada.callePrincipal} y ${parada.calleInterseccion}`;

      pCalles.classList.add('p-calles');

      const distancia = mapa.distanciaAPunto(
        parada.latitud,
        parada.longitud
      );

      pDistancia.textContent =
        distancia < 1000
          ? `${Math.round(distancia)} m`
          : `${(distancia / 1000).toFixed(1)} km`;

      pDistancia.classList.add('distancia');

      paradaDiv.appendChild(titleParada);
      paradaDiv.appendChild(pCalles);
      paradaDiv.appendChild(pDistancia);

      divParadas.appendChild(paradaDiv);
    });
  })

}


