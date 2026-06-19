import { paradasCercanas } from "./main";
import { Marcador } from "./main";

const paradasCercanasBTN = document.getElementById("paradas-cercanas");
const divParadas = document.getElementById('stops-info');
const botonesMenu = document.querySelectorAll('.menu-btn');

export default function inicializarListeners(mapa) {
  botonesMenu.forEach(boton => {
    boton.addEventListener('click', () => {
      botonesMenu.forEach(b => b.classList.remove('btn-selected'));
      boton.classList.add('btn-selected');
    });
  });

  paradasCercanasBTN.addEventListener('click', async () => {
    mapa.borrarMarcadores();

    while (divParadas.firstChild) {
      divParadas.removeChild(divParadas.firstChild);
    }

    const paradas = await paradasCercanas(mapa.lat, mapa.long);

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

      const pCalles = document.createElement('p');
      pCalles.classList.add('p-calles');
      pCalles.textContent = `${parada.callePrincipal} y ${parada.calleInterseccion}`;

      const distancia = mapa.distanciaAPunto(parada.latitud, parada.longitud);
      const tiempoCaminando = Math.round(distancia / 83);

      const formatoDistancia = distancia < 1000
        ? `${Math.round(distancia)} m`
        : `${(distancia / 1000).toFixed(1)} km`;

      const stringMinutos = tiempoCaminando < 1 ? 'menos de 1' : tiempoCaminando;

      const divDistanciaTiempo = document.createElement('div');
      divDistanciaTiempo.classList.add('div-distancia-tiempo');

      const pDistancia = document.createElement('p');
      pDistancia.classList.add('texto-dt');
      pDistancia.textContent = formatoDistancia;

      const pTiempoCaminando = document.createElement('p');
      pTiempoCaminando.classList.add('texto-dt');
      pTiempoCaminando.textContent = `${stringMinutos} min`;

      divDistanciaTiempo.appendChild(pDistancia);
      divDistanciaTiempo.appendChild(pTiempoCaminando);

      const divLineas = document.createElement('div');
      divLineas.classList.add('stop-lines');

      const badge = document.createElement('span');
      badge.classList.add('line-badge');
      badge.textContent = parada.lineas.numero ?? parada.lineas.descripcion ?? parada.lineas;

      divLineas.appendChild(badge);

      paradaDiv.appendChild(pCalles);
      paradaDiv.appendChild(divDistanciaTiempo);
      paradaDiv.appendChild(divLineas);

      divParadas.appendChild(paradaDiv);
    });
  });
}
