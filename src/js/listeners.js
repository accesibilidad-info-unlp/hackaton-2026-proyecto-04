import { paradasCercanas } from "./utils/api.js";
import Marcador from "./clases/Marker.js";
import CardArribos from "./components/CardArribos.js";

const paradasCercanasH2 = document.getElementById("stops-heading");
const paradasCercanasBTN = document.getElementById("paradas-cercanas");
const divParadas = document.getElementById("stops-info");
const botonesMenu = document.querySelectorAll(".menu-btn");
const inputParadas = document.getElementById("buscador");
const btnInput = document.getElementById("btn-input");
const paradasFavBTN = document.getElementById("paradas-fav");
const noStopsH2 = document.getElementById('no-stops');
const radioParadasCercanasMetros = 500;

function LimpiarElementos(mapa) {
  mapa.borrarMarcadores();
  mapa.borrarRecorrido();
  document.getElementById("stop-radio")?.remove();
  while (divParadas.firstChild) {
    divParadas.removeChild(divParadas.firstChild);
  }
}

function handleInput(mapa) {
  inputParadas.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      btnInput.click();
    }
  });

  btnInput.addEventListener("click", async () => {
    const texto = inputParadas.value;
    if (texto == "") {
      alert("El formato es: Calle principal y Calle secundaria");
    } else {
      LimpiarElementos(mapa);

      const [callePrincipal, calleInterseccion] = texto
        .split("y")
        .map((s) => s.trim());

      const parada = await fetch(
        `http://localhost:3000/paradas/${callePrincipal}/${calleInterseccion}`,
      );

      const json = await parada.json();
      const paradaResultado = json.resultado[0];

      if (!paradaResultado) {
        alert("No existe esa parada");
        paradasCercanasH2.textContent = "Parada no encontrada";
      } else {
        paradaResultado.lineas = paradaResultado.codigoLineas.map((codigo) => ({
          codigo,
        }));
        mapa.actualizarVista(paradaResultado.latitud, paradaResultado.longitud);
        paradasCercanasH2.textContent = "Informacion de la parada";

        const marcador = new Marcador(
          paradaResultado.latitud,
          paradaResultado.longitud,
          paradaResultado.calleInterseccion,
          paradaResultado.callePrincipal,
          paradaResultado.codigo,
          paradaResultado.descripcion,
          paradaResultado.identificador,
          paradaResultado.lineas,
        );
        divParadas.appendChild(CardArribos(paradaResultado, mapa, marcador));
        mapa.agregarMarcador(marcador);
      }

      setNoStops();
    }
  });
}

const setNoStops = () => {
  if (divParadas.children.length === 0) {
    noStopsH2.style.display = 'block';
  } else {
    noStopsH2.style.display = 'none';
  }
}

export default function inicializarListeners(mapa) {
  botonesMenu.forEach((boton) => {
    boton.addEventListener("click", () => {
      botonesMenu.forEach((b) => b.classList.remove("btn-selected"));
      boton.classList.add("btn-selected");
    });
  });

  paradasCercanasBTN.addEventListener("click", async () => {
    LimpiarElementos(mapa);

    const paradas = await paradasCercanas(
      mapa.lat,
      mapa.long,
      radioParadasCercanasMetros,
    );
    paradasCercanasH2.textContent = `${paradas.length} Paradas cercanas`;
    const h2Radio = document.createElement("h2");
    h2Radio.textContent = "Radio: 5 cuadras";
    h2Radio.id = "stop-radio";
    paradasCercanasH2.insertAdjacentElement("afterend", h2Radio);

    paradas.forEach((parada) => {
      const marcador = new Marcador(
        parada.latitud,
        parada.longitud,
        parada.calleInterseccion,
        parada.callePrincipal,
        parada.codigo,
        parada.descripcion,
        parada.identificador,
        parada.lineas,
      );
      divParadas.appendChild(CardArribos(parada, mapa, marcador));
      mapa.agregarMarcador(marcador);
    });

    setNoStops();
  });

  paradasFavBTN.addEventListener('click', async () => {
    LimpiarElementos(mapa);

    let listaFav = [];
    try {
      listaFav = JSON.parse(localStorage.getItem('paradas-favoritas')) || [];
      if (!Array.isArray(listaFav)) {
        listaFav = [];
      }
    } catch (e) {
      listaFav = [];
    }
    paradasCercanasH2.textContent = `${listaFav.length} Paradas favoritas`;

    const promesasFavoritas = listaFav.map(async (identificador) => {
      const parada = await fetch(`http://localhost:3000/paradas/ByID/${identificador}`);
      const json = await parada.json();
      const paradaResultado = json;

      const marcador = new Marcador(
        paradaResultado.latitud,
        paradaResultado.longitud,
        paradaResultado.calleInterseccion,
        paradaResultado.callePrincipal,
        paradaResultado.codigo,
        paradaResultado.descripcion,
        paradaResultado.identificador,
        paradaResultado.lineas,
      );
      divParadas.appendChild(CardArribos(paradaResultado, mapa, marcador));
      mapa.agregarMarcador(marcador);
    });

    await Promise.all(promesasFavoritas);

    setNoStops();
  });

  handleInput(mapa);
}