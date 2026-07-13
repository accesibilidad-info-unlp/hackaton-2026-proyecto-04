export async function HandlePopUp(marcador_mapa, marcador, mapa) {
  marcador_mapa.openPopup();
  marcador_mapa.setPopupContent("Cargando...");

  let data;
  try {
    data = await marcador.llegadas();
  } catch (err) {
    console.error("Error al obtener arribos:", err);
    marcador_mapa.setPopupContent("No se pudieron cargar los arribos.");
    return;
  }

  if (!data || !data.arribos || data.arribos.length === 0) {
    marcador_mapa.setPopupContent("No hay arribos disponibles.");
    return;
  }

  const claseUrgencia = (mins) => {
    const n = parseInt(mins, 10);
    if (Number.isNaN(n)) return "arribo--desconocido";
    if (n <= 5) return "arribo--pronto";
    if (n <= 15) return "arribo--medio";
    return "arribo--tarde";
  };

  const extraerMinutos = (texto) => texto?.match(/\d+/)?.[0] ?? "?";

  const lineasDeParada = Array.isArray(marcador._lineas)
    ? marcador._lineas
    : [];
  const lineasTexto =
    lineasDeParada.length > 0
      ? lineasDeParada
        .map((linea) => linea.numero ?? linea.descripcion ?? linea.codigo)
        .join(" · ")
      : "Sin línea";

  // --- Contenedor principal ---
  const divParadasMarcador = document.createElement("div");
  divParadasMarcador.className = "popup-parada";
  divParadasMarcador.setAttribute("aria-live", "polite");

  // --- Header: calle y calle ---
  const divCalles = document.createElement("div");
  divCalles.className = "popup-parada__header";
  const pCalles = document.createElement("p");
  pCalles.textContent = `📍 ${marcador._callePrincipal} y ${marcador._calleInterseccion}`;
  divCalles.appendChild(pCalles);

  // --- Líneas de la parada ---
  const divLineas = document.createElement("div");
  divLineas.className = "popup-parada__lineas";
  const pLineas = document.createElement("p");
  pLineas.textContent = `Líneas: ${lineasTexto}`;
  divLineas.appendChild(pLineas);

  divParadasMarcador.appendChild(divCalles);
  divParadasMarcador.appendChild(divLineas);

  // --- Lista de arribos ---
  const divArribos = document.createElement("div");
  divArribos.className = "popup-parada__arribos";

  data.arribos.forEach((a) => {
    const mins = extraerMinutos(a.tiempoRestanteArribo);
    const clase = claseUrgencia(mins);

    const divItem = document.createElement("div");
    divItem.className = "arribo-item";

    const divTiempo = document.createElement("div");
    divTiempo.className = `arribo-item__tiempo ${clase}`;
    divTiempo.setAttribute("role", "text");
    divTiempo.setAttribute("aria-label", `${mins} minutos`);
    divTiempo.textContent = `${mins} min`;

    const divInfo = document.createElement("div");
    divInfo.className = "arribo-item__info";

    const divLineaNombre = document.createElement("div");
    divLineaNombre.className = "arribo-item__linea";
    divLineaNombre.textContent = a.descripcionLinea || "Línea";

    const divBandera = document.createElement("div");
    divBandera.className = "arribo-item__bandera";
    divBandera.textContent = a.descripcionBandera || "";

    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "arribo-item__accion";
    boton.textContent = "Ver recorrido";
    boton.dataset.accion = "tiempo-real";
    boton.dataset.linea = a.interno || ""; // se le asigna un "id" al boton para saber de que micro estamos hablando

    boton.addEventListener("click", async (e) => {
      const boton_presionado = e.target;
      const data = await fetch(
        `http://localhost:3000/recorrido/${boton_presionado.dataset.linea}`,
      );
      const json = await data.json();

      mapa.mostrarRecorrido(json.resultado);
    });

    divInfo.appendChild(divLineaNombre);
    divInfo.appendChild(divBandera);
    divInfo.appendChild(boton);

    divItem.appendChild(divTiempo);
    divItem.appendChild(divInfo);

    divArribos.appendChild(divItem);
  });

  divParadasMarcador.appendChild(divArribos);

  marcador_mapa.setPopupContent(divParadasMarcador);
}
