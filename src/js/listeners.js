import { geocodeDireccion, listarLineas, paradasCercanas, recorridoLinea } from "./utils/api.js";
import Marcador from "./clases/Marker.js";
import CardArribos from "./components/CardArribos.js";

const paradasCercanasH2 = document.getElementById("stops-heading");
const paradasCercanasBTN = document.getElementById("paradas-cercanas");
const divParadas = document.getElementById("stops-info");
const botonesMenu = document.querySelectorAll(".menu-btn");
const inputParadas = document.getElementById("buscador");
const btnInput = document.getElementById("btn-input");
const paradasFavBTN = document.getElementById("paradas-fav");
const recorridosBTN = document.getElementById("recorridos");
const noStopsH2 = document.getElementById('no-stops');
const radioParadasCercanasMetros = 500; // 5 cuadras (≈100 m c/u)
const metrosPorCuadra = 100;

function textoRadioParadas(radioMetros, expandido) {
  const cuadras = Math.max(1, Math.round(radioMetros / metrosPorCuadra));
  if (!expandido) {
    return `Radio: ${cuadras} cuadras`;
  }
  return `Radio: ~${cuadras} cuadras (ampliado hasta la más cercana + 5)`;
}

function LimpiarElementos(mapa) {
  mapa.borrarMarcadores();
  mapa.borrarRecorrido();
  mapa.borrarRutaGuiada();
  document.getElementById("stop-radio")?.remove();
  document.getElementById("btn-volver-recorridos")?.remove();
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
    const texto = inputParadas.value.trim();
    if (texto === "") {
      alert("Probá con una esquina (ej: 7 y 50) o una dirección de La Plata.");
      return;
    }

    LimpiarElementos(mapa);

    const partes = texto.split(/\s+y\s+/i).map((s) => s.trim());
    const [callePrincipal, calleInterseccion] = partes;

    // 1) Si parece "X y Y", primero buscamos una parada mock
    if (callePrincipal && calleInterseccion) {
      try {
        const parada = await fetch(
          `http://localhost:3000/paradas/${encodeURIComponent(callePrincipal)}/${encodeURIComponent(calleInterseccion)}`,
        );
        const json = await parada.json();
        const paradaResultado = json.resultado?.[0];

        if (paradaResultado) {
          mapa.mostrar()
          paradaResultado.lineas = (paradaResultado.codigoLineas ?? []).map(
            (codigo) => ({ codigo }),
          );
          mapa.actualizarVista(
            paradaResultado.latitud,
            paradaResultado.longitud,
          );
          paradasCercanasH2.textContent = "Información de la parada";

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
          mapa.mostrarRutaHasta(
            paradaResultado.latitud,
            paradaResultado.longitud,
            {
              tituloDestino: `${paradaResultado.callePrincipal} y ${paradaResultado.calleInterseccion}`,
            },
          );
          setNoStops();
          return;
        }
      } catch (error) {
        console.warn("[buscador] Falló búsqueda de parada mock:", error);
      }
    }

    // 2) Si no hay parada mock, geocodificamos la dirección (Nominatim vía proxy)
    paradasCercanasH2.textContent = "Buscando dirección...";
    const lugar = await geocodeDireccion(texto);

    if (!lugar?.latitud || !lugar?.longitud) {
      alert("No encontramos esa dirección en La Plata.");
      paradasCercanasH2.textContent = "Dirección no encontrada";
      setNoStops();
      return;
    }

    const etiqueta = lugar.nombre || texto;
    paradasCercanasH2.textContent = "Destino en el mapa";
    mapa.mostrar()
    mapa.marcarDireccion(lugar.latitud, lugar.longitud, etiqueta);
    mapa.mostrarRutaHasta(lugar.latitud, lugar.longitud, {
      tituloDestino: etiqueta,
    });
    setNoStops();
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
    mapa.mostrar()
    LimpiarElementos(mapa);

    const { paradas, radioMetros, expandido } = await paradasCercanas(
      mapa.lat,
      mapa.long,
      radioParadasCercanasMetros,
    );
    paradasCercanasH2.textContent = `${paradas.length} Paradas cercanas`;
    const h2Radio = document.createElement("h2");
    h2Radio.textContent = textoRadioParadas(radioMetros, expandido);
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

    // Auto-guía a la parada más cercana (el proxy ya las ordena por distancia)
    if (paradas.length > 0) {
      const masCercana = paradas[0];
      mapa.mostrarRutaHasta(masCercana.latitud, masCercana.longitud, {
        tituloDestino: `${masCercana.callePrincipal} y ${masCercana.calleInterseccion}`,
      });
    }

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

  recorridosBTN?.addEventListener("click", async () => {
    mapa.mostrar()
    await mostrarMenuRecorridos(mapa);
  });

  handleInput(mapa);
}

async function mostrarMenuRecorridos(mapa) {
  LimpiarElementos(mapa);
  paradasCercanasH2.textContent = "Recorridos de líneas";

  const lineas = await listarLineas();
  if (!Array.isArray(lineas) || lineas.length === 0) {
    alert("No hay líneas cargadas.");
    setNoStops();
    return;
  }

  const lineasConDatos = [];

  for (const linea of lineas) {
    const card = document.createElement("div");
    card.className = "parada-item linea-recorrido-item";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute(
      "aria-label",
      `Ver recorrido de ${linea.descripcion || linea.numero}`,
    );

    const titulo = document.createElement("p");
    titulo.className = "p-calles";
    titulo.textContent = linea.descripcion || `Línea ${linea.numero}`;

    const badge = document.createElement("span");
    badge.className = "line-badge";
    badge.textContent = linea.numero ?? linea.codigo;
    badge.style.background = linea.color || "#e53935";
    badge.style.color = "#fff";

    const hint = document.createElement("p");
    hint.className = "stop-distance";
    hint.textContent = "Tocá para ver el recorrido por calles";

    const header = document.createElement("div");
    header.className = "header-parada";
    header.appendChild(titulo);
    header.appendChild(badge);

    card.appendChild(header);
    card.appendChild(hint);

    const activar = async () => {
      paradasCercanasH2.textContent = `Cargando ${linea.descripcion || linea.numero}...`;
      const data = await recorridoLinea(linea.codigo);
      if (!data?.paradas?.length) {
        alert(
          data?.error ||
            "Esta línea todavía no tiene recorrido mock cargado.",
        );
        paradasCercanasH2.textContent = "Recorridos de líneas";
        return;
      }
      await mostrarDetalleRecorrido(mapa, data);
    };

    card.addEventListener("click", activar);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activar();
      }
    });

    divParadas.appendChild(card);
    lineasConDatos.push(linea);
  }

  setNoStops();

  // Previews tenues de todas las rutas (por calles, alpha bajo)
  const previews = await Promise.all(
    lineasConDatos.map(async (linea) => {
      const data = await recorridoLinea(linea.codigo);
      if (!data?.paradas?.length) return null;
      await mapa.pintarPreviewRecorrido(data.paradas, data.color || linea.color);
      return data;
    }),
  );

  if (previews.some(Boolean)) {
    mapa.ajustarVistaAPreviews();
  }
}

async function mostrarDetalleRecorrido(mapa, data) {
  LimpiarElementos(mapa);

  const btnVolver = document.createElement("button");
  btnVolver.type = "button";
  btnVolver.id = "btn-volver-recorridos";
  btnVolver.className = "back-button";
  btnVolver.setAttribute("aria-label", "Volver a la lista de recorridos");
  btnVolver.innerHTML = `
    <span class="material-symbols-outlined back-icon" aria-hidden="true">arrow_back</span>
    Volver a recorridos
  `;
  btnVolver.addEventListener("click", () => {
    mostrarMenuRecorridos(mapa);
  });
  paradasCercanasH2.insertAdjacentElement("beforebegin", btnVolver);

  paradasCercanasH2.textContent = `Recorrido ${data.numero || data.codigo}`;

  const vistos = new Set();
  data.paradas.forEach((parada) => {
    if (vistos.has(parada.identificador)) return;
    vistos.add(parada.identificador);

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

  await mapa.mostrarRecorridoLinea(data.paradas, {
    color: data.color || "#e53935",
    titulo: data.descripcion || data.numero,
  });
  setNoStops();
  // En mobile el sheet puede estar en peek: un focus con scroll
  // esconde el handle y deja el panel sin poder arrastrarse.
  btnVolver.focus({ preventScroll: true });
}