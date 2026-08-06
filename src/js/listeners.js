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
const noStopsH2 = document.getElementById("no-stops");
const radioParadasCercanasMetros = 500; // 5 cuadras (≈100 m c/u)
const metrosPorCuadra = 100;

/** Evita que respuestas viejas pisen la UI después de cambiar de pantalla. */
let vistaToken = 0;

function nuevaVista() {
  vistaToken += 1;
  return vistaToken;
}

function vistaVigente(token) {
  return token === vistaToken;
}

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

function setNoStops() {
  if (divParadas.children.length === 0) {
    noStopsH2.style.display = "block";
  } else {
    noStopsH2.style.display = "none";
  }
}

function crearMarcadorDesdeParada(parada) {
  return new Marcador(
    parada.latitud,
    parada.longitud,
    parada.calleInterseccion,
    parada.callePrincipal,
    parada.codigo,
    parada.descripcion,
    parada.identificador,
    parada.lineas,
  );
}

/**
 * Vista inicial / “Paradas”: muestra la más cercana sin abrir el mapa.
 * Usada también al volver al menú principal (salida segura).
 */
async function cargarVistaInicio(mapa) {
  const token = nuevaVista();
  LimpiarElementos(mapa);
  mapa.ocultar();
  botonesMenu.forEach((b) => b.classList.remove("btn-selected"));
  paradasCercanasH2.textContent = "Parada más cercana";

  try {
    const { paradas, radioMetros, expandido } = await paradasCercanas(
      mapa.lat,
      mapa.long,
      radioParadasCercanasMetros,
    );
    if (!vistaVigente(token)) return;

    if (!paradas.length) {
      paradasCercanasH2.textContent = "Sin paradas cercanas";
      setNoStops();
      return;
    }

    const masCercana = paradas[0];
    const h2Radio = document.createElement("h2");
    h2Radio.textContent = textoRadioParadas(radioMetros, expandido);
    h2Radio.id = "stop-radio";
    paradasCercanasH2.insertAdjacentElement("afterend", h2Radio);

    const marcador = crearMarcadorDesdeParada(masCercana);
    divParadas.appendChild(CardArribos(masCercana, mapa, marcador));
    setNoStops();
  } catch (error) {
    if (!vistaVigente(token)) return;
    console.warn("[inicio] No se pudo cargar la parada cercana:", error);
    paradasCercanasH2.textContent = "No se pudieron cargar paradas";
    setNoStops();
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

    const token = nuevaVista();
    LimpiarElementos(mapa);
    botonesMenu.forEach((b) => b.classList.remove("btn-selected"));

    const partes = texto.split(/\s+y\s+/i).map((s) => s.trim());
    const [callePrincipal, calleInterseccion] = partes;

    if (callePrincipal && calleInterseccion) {
      try {
        const parada = await fetch(
          `http://localhost:3000/paradas/${encodeURIComponent(callePrincipal)}/${encodeURIComponent(calleInterseccion)}`,
        );
        const json = await parada.json();
        const paradaResultado = json.resultado?.[0];

        if (paradaResultado) {
          if (!vistaVigente(token)) return;
          mapa.mostrar();
          paradaResultado.lineas = (paradaResultado.codigoLineas ?? []).map(
            (codigo) => ({ codigo }),
          );
          mapa.actualizarVista(
            paradaResultado.latitud,
            paradaResultado.longitud,
          );
          paradasCercanasH2.textContent = "Información de la parada";

          const marcador = crearMarcadorDesdeParada(paradaResultado);
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

    paradasCercanasH2.textContent = "Buscando dirección...";
    try {
      const lugar = await geocodeDireccion(texto);
      if (!vistaVigente(token)) return;

      if (!lugar?.latitud || !lugar?.longitud) {
        alert("No encontramos esa dirección en La Plata.");
        paradasCercanasH2.textContent = "Dirección no encontrada";
        setNoStops();
        return;
      }

      const etiqueta = lugar.nombre || texto;
      paradasCercanasH2.textContent = "Destino en el mapa";
      mapa.mostrar();
      mapa.marcarDireccion(lugar.latitud, lugar.longitud, etiqueta);
      mapa.mostrarRutaHasta(lugar.latitud, lugar.longitud, {
        tituloDestino: etiqueta,
      });
      setNoStops();
    } catch (error) {
      if (!vistaVigente(token)) return;
      console.warn("[buscador] Geocode falló:", error);
      alert("No se pudo buscar la dirección. Probá de nuevo.");
      paradasCercanasH2.textContent = "Error de búsqueda";
      setNoStops();
    }
  });
}

export default function inicializarListeners(mapa) {
  botonesMenu.forEach((boton) => {
    boton.addEventListener("click", () => {
      botonesMenu.forEach((b) => b.classList.remove("btn-selected"));
      boton.classList.add("btn-selected");
    });
  });

  paradasCercanasBTN.addEventListener("click", async () => {
    const token = nuevaVista();
    LimpiarElementos(mapa);
    paradasCercanasH2.textContent = "Cargando paradas cercanas...";

    try {
      const { paradas, radioMetros, expandido } = await paradasCercanas(
        mapa.lat,
        mapa.long,
        radioParadasCercanasMetros,
      );
      if (!vistaVigente(token)) return;

      mapa.mostrar();
      paradasCercanasH2.textContent = `${paradas.length} Paradas cercanas`;
      const h2Radio = document.createElement("h2");
      h2Radio.textContent = textoRadioParadas(radioMetros, expandido);
      h2Radio.id = "stop-radio";
      paradasCercanasH2.insertAdjacentElement("afterend", h2Radio);

      paradas.forEach((parada) => {
        const marcador = crearMarcadorDesdeParada(parada);
        divParadas.appendChild(CardArribos(parada, mapa, marcador));
        mapa.agregarMarcador(marcador);
      });

      // Panel abierto para elegir; el mapa baja al tocar "Cómo llegar"
      window.sheet?.applyState?.("full");
      setNoStops();
    } catch (error) {
      if (!vistaVigente(token)) return;
      console.warn("[cercanas] Error:", error);
      alert("No se pudieron cargar las paradas cercanas.");
      await cargarVistaInicio(mapa);
    }
  });

  paradasFavBTN.addEventListener("click", async () => {
    const token = nuevaVista();
    LimpiarElementos(mapa);
    // Favoritas es lista: no hace falta dejar el mapa abierto encima
    mapa.ocultar();

    let listaFav = [];
    try {
      listaFav = JSON.parse(localStorage.getItem("paradas-favoritas")) || [];
      if (!Array.isArray(listaFav)) {
        listaFav = [];
      }
    } catch {
      listaFav = [];
    }

    paradasCercanasH2.textContent = `${listaFav.length} Paradas favoritas`;

    try {
      const resultados = await Promise.all(
        listaFav.map(async (identificador) => {
          const parada = await fetch(
            `http://localhost:3000/paradas/ByID/${identificador}`,
          );
          if (!parada.ok) return null;
          return parada.json();
        }),
      );
      if (!vistaVigente(token)) return;

      resultados.filter(Boolean).forEach((paradaResultado) => {
        const marcador = crearMarcadorDesdeParada(paradaResultado);
        divParadas.appendChild(CardArribos(paradaResultado, mapa, marcador));
      });

      setNoStops();
    } catch (error) {
      if (!vistaVigente(token)) return;
      console.warn("[favoritas] Error:", error);
      alert("No se pudieron cargar las favoritas.");
      setNoStops();
    }
  });

  recorridosBTN?.addEventListener("click", async () => {
    const token = nuevaVista();
    mapa.mostrar();
    await mostrarMenuRecorridos(mapa, token);
  });

  document.getElementById("volver")?.addEventListener("click", () => {
    cargarVistaInicio(mapa);
  });

  handleInput(mapa);

  // Home útil en el panel "Paradas"
  cargarVistaInicio(mapa);

  return { cargarVistaInicio };
}

async function mostrarMenuRecorridos(mapa, tokenExterno) {
  const token = tokenExterno ?? nuevaVista();
  LimpiarElementos(mapa);
  paradasCercanasH2.textContent = "Recorridos de líneas";

  let lineas;
  try {
    lineas = await listarLineas();
  } catch (error) {
    if (!vistaVigente(token)) return;
    console.warn("[recorridos] Error listando líneas:", error);
    alert("No se pudieron cargar las líneas.");
    await cargarVistaInicio(mapa);
    return;
  }

  if (!vistaVigente(token)) return;

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
      const tokenDetalle = nuevaVista();
      paradasCercanasH2.textContent = `Cargando ${linea.descripcion || linea.numero}...`;
      try {
        const data = await recorridoLinea(linea.codigo);
        if (!vistaVigente(tokenDetalle)) return;
        if (!data?.paradas?.length) {
          alert(
            data?.error ||
              "Esta línea todavía no tiene recorrido mock cargado.",
          );
          paradasCercanasH2.textContent = "Recorridos de líneas";
          return;
        }
        await mostrarDetalleRecorrido(mapa, data, tokenDetalle);
      } catch (error) {
        if (!vistaVigente(tokenDetalle)) return;
        console.warn("[recorridos] Error cargando línea:", error);
        alert("No se pudo cargar el recorrido. Probá de nuevo.");
        paradasCercanasH2.textContent = "Recorridos de líneas";
      }
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

  // Mantener el menú usable: elegir Micro 1/2/3 sin tener que reabrir el sheet
  window.sheet?.applyState?.("full");

  try {
    const previews = await Promise.all(
      lineasConDatos.map(async (linea) => {
        const data = await recorridoLinea(linea.codigo);
        if (!data?.paradas?.length) return null;
        await mapa.pintarPreviewRecorrido(data.paradas, data.color || linea.color);
        return data;
      }),
    );

    if (!vistaVigente(token)) return;
    if (previews.some(Boolean)) {
      mapa.ajustarVistaAPreviews();
    }
    // Por si un invalidateSize o layout movió el sheet
    window.sheet?.applyState?.("full");
  } catch (error) {
    console.warn("[recorridos] Previews fallaron:", error);
  }
}

async function mostrarDetalleRecorrido(mapa, data, token) {
  if (!vistaVigente(token)) return;
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
    const tokenLista = nuevaVista();
    mapa.mostrar();
    mostrarMenuRecorridos(mapa, tokenLista);
  });
  paradasCercanasH2.insertAdjacentElement("beforebegin", btnVolver);

  paradasCercanasH2.textContent = `Recorrido ${data.numero || data.codigo}`;

  const vistos = new Set();
  data.paradas.forEach((parada) => {
    if (vistos.has(parada.identificador)) return;
    vistos.add(parada.identificador);

    const marcador = crearMarcadorDesdeParada(parada);
    divParadas.appendChild(CardArribos(parada, mapa, marcador));
    mapa.agregarMarcador(marcador);
  });

  try {
    await mapa.mostrarRecorridoLinea(data.paradas, {
      color: data.color || "#e53935",
      titulo: data.descripcion || data.numero,
    });
  } catch (error) {
    console.warn("[recorridos] Falló dibujar línea:", error);
  }

  if (!vistaVigente(token)) return;
  setNoStops();
  // En mobile el sheet puede estar en peek: focus con scroll pierde el handle.
  btnVolver.focus({ preventScroll: true });
}
