import { paradasCercanas } from "./main";

const paradasCercanasBTN = document.getElementById("paradas-cercanas");
const divParadas = document.getElementById('stops-info');

function Listeners() {
  paradasCercanasBTN.addEventListener('click', async () => {
    const paradas = await paradasCercanas();
    console.log(paradas);

    paradas.forEach(parada => {
      const titleParada = document.createElement('h3');
      const pCalles = document.createElement('p');

      titleParada.textContent = "Parada: "
      pCalles.textContent = `${parada.callePrincipal} y ${parada.calleInterseccion}`;

      divParadas.appendChild(titleParada);
      divParadas.appendChild(pCalles);
    })
  })
}

Listeners();
