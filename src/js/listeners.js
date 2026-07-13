import { paradasCercanas } from "./utils/api.js";
import Marcador from "./clases/Marker.js";
import { buscarFavStorage } from "./main.js";

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

function cardArribos(parada, mapa, marcador) {
  const esFavorita = buscarFavStorage(parada.identificador);
  console.log(esFavorita)

  const paradaDiv = document.createElement("div");
  paradaDiv.classList.add("parada-item");
  paradaDiv.setAttribute("tabindex", "0");
  paradaDiv.setAttribute("role", "article");
  paradaDiv.setAttribute(
    "aria-label",
    `Parada en ${parada.callePrincipal} y ${parada.calleInterseccion}`,
  );

  const header_content = document.createElement('div');
  header_content.classList.add('header-parada');
  const pCalles = document.createElement("p");
  pCalles.classList.add("p-calles");
  pCalles.textContent = `${parada.callePrincipal} y ${parada.calleInterseccion}`;

  const star_fav = document.createElement('button');
  star_fav.classList.add('star-fav');
  star_fav.setAttribute('aria-label', 'Agregar a favoritos');
  star_fav.setAttribute('title', 'Agregar a favoritos');
  star_fav.textContent = "★";
  if (esFavorita) {
    star_fav.classList.add('active');
  }

  star_fav.addEventListener('click', (e) => {
    star_fav.classList.toggle('active');

    let favoritas = [];
    try {
      favoritas = JSON.parse(localStorage.getItem('paradas-favoritas')) || [];
      if (!Array.isArray(favoritas)) {
        favoritas = [];
      }
    } catch (e) {
      favoritas = [];
    }

    const idParada = parada.identificador;
    const existeEnFavoritas = favoritas.includes(idParada);

    if (existeEnFavoritas) {
      favoritas = favoritas.filter(id => id !== idParada);
    } else {
      favoritas.push(idParada);
    }

    localStorage.setItem('paradas-favoritas', JSON.stringify(favoritas));
  });

  header_content.appendChild(pCalles);
  header_content.appendChild(star_fav);

  const bloqueLineas = document.createElement("div");
  bloqueLineas.classList.add("stop-lines");
  bloqueLineas.appendChild(crearEtiquetaSeccion("Líneas"));
  const listaLineas = document.createElement("div");
  listaLineas.classList.add("stop-lines__list");
  renderLineas(listaLineas, parada.lineas);
  bloqueLineas.appendChild(listaLineas);

  const distancia = mapa.distanciaAPunto(parada.latitud, parada.longitud);
  const tiempoCaminando = Math.round(distancia / 83);

  const formatoDistancia =
    distancia < 1000
      ? `${Math.round(distancia)} m`
      : `${(distancia / 1000).toFixed(1)} km`;

  const stringMinutos = tiempoCaminando < 1 ? "menos de 1" : tiempoCaminando;

  const pDistancia = document.createElement("p");
  pDistancia.classList.add("stop-distance");
  pDistancia.textContent = `${formatoDistancia} · ${stringMinutos} min caminando`;

  const divArribos = document.createElement("div");

  divArribos.classList.add("stop-arrivals");
  const estadoInicial = crearPildora("Cargando...", "arrival-pill--loading");
  divArribos.appendChild(estadoInicial);

  const seccionArribos = document.createElement("div");
  seccionArribos.classList.add("stop-arrivals-section");
  seccionArribos.appendChild(crearEtiquetaSeccion("Próximos arribos"));
  seccionArribos.appendChild(divArribos);

  paradaDiv.appendChild(header_content);
  paradaDiv.appendChild(pDistancia);
  paradaDiv.appendChild(bloqueLineas);
  paradaDiv.appendChild(seccionArribos);

  divParadas.appendChild(paradaDiv);

  marcador
    .llegadas()
    .then((data) => {
      const arribos = data?.arribos ?? [];
      renderArribos(divArribos, arribos);
    })
    .catch(() => {
      divArribos.innerHTML = "";
      divArribos.classList.add("stop-arrivals");
      const error = document.createElement("span");
      error.classList.add("arrival-pill", "arrival-pill--empty");
      error.textContent = "No se pudieron cargar";
      divArribos.appendChild(error);
    });
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
        cardArribos(paradaResultado, mapa, marcador);
        mapa.agregarMarcador(marcador);
      }
      // Verificamos después de buscar manualmente
      setNoStops();
    }
  });
}

function crearEtiquetaSeccion(texto) {
  const etiqueta = document.createElement("p");
  etiqueta.classList.add("stop-summary__label");
  etiqueta.textContent = texto;
  return etiqueta;
}

function crearPildora(texto, claseAdicional) {
  const pildora = document.createElement("span");
  pildora.classList.add("arrival-pill");
  if (claseAdicional) {
    pildora.classList.add(claseAdicional);
  }
  pildora.textContent = texto;
  return pildora;
}

function renderLineas(contenedor, lineas) {
  contenedor.innerHTML = "";

  if (!lineas || lineas.length === 0) {
    const vacia = document.createElement("span");
    vacia.classList.add("line-badge", "line-badge--empty");
    vacia.textContent = "Sin línea";
    contenedor.appendChild(vacia);
    return;
  }
  lineas.forEach((linea) => {
    const badge = document.createElement("span");
    badge.classList.add("line-badge");
    badge.textContent =
      linea.numero ?? linea.descripcion ?? linea.codigo ?? "Línea";
    contenedor.appendChild(badge);
  });
}

function renderArribos(contenedor, arribos) {
  contenedor.innerHTML = "";

  const lista = document.createElement("ul");
  lista.classList.add("stop-arrivals__list");

  if (!arribos || arribos.length === 0) {
    const vacio = document.createElement("li");
    vacio.classList.add("arrival-pill", "arrival-pill--empty");
    vacio.textContent = "Sin arribos";
    lista.appendChild(vacio);
    contenedor.appendChild(lista);
    return;
  }

  arribos.slice(0, 3).forEach((arribo) => {
    const item = document.createElement("li");
    item.classList.add("arrival-pill");
    item.textContent = arribo.tiempoRestanteArribo;
    lista.appendChild(item);
  });

  if (arribos.length > 3) {
    const restantes = document.createElement("li");
    restantes.classList.add("arrival-pill", "arrival-pill--more");
    restantes.textContent = `+${arribos.length - 3} más`;
    lista.appendChild(restantes);
  }

  contenedor.appendChild(lista);
}

const setNoStops = () => {
  console.log("Cantidad de paradas:", divParadas.children.length);
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
      cardArribos(parada, mapa, marcador);
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

    // Usamos Promise.all para esperar a que todas las peticiones asíncronas terminen
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
      cardArribos(paradaResultado, mapa, marcador);
      mapa.agregarMarcador(marcador);
    });

    await Promise.all(promesasFavoritas);

    // LLAMADA AQUÍ: Ya terminaron todas las promesas del bucle
    setNoStops();
  });

  handleInput(mapa);
}