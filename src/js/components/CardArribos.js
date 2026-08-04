import Star from "../components/Star.js";

export default function cardArribos(parada, mapa, marcador) {
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

    header_content.appendChild(pCalles);
    header_content.appendChild(Star(marcador._identificador));

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

    const btnComoLlegar = document.createElement("button");
    btnComoLlegar.type = "button";
    btnComoLlegar.classList.add("btn-como-llegar");
    btnComoLlegar.textContent = "Cómo llegar";
    btnComoLlegar.setAttribute(
        "aria-label",
        `Cómo llegar a la parada ${parada.callePrincipal} y ${parada.calleInterseccion}`,
    );
    btnComoLlegar.addEventListener("click", (event) => {
        event.stopPropagation();
        mapa.mostrarRutaHasta(parada.latitud, parada.longitud, {
            tituloDestino: `${parada.callePrincipal} y ${parada.calleInterseccion}`,
            identificadorParada: marcador._identificador,
        });
        mapa.actualizarVista(parada.latitud, parada.longitud, 16);
    });

    paradaDiv.appendChild(header_content);
    paradaDiv.appendChild(pDistancia);
    paradaDiv.appendChild(bloqueLineas);
    paradaDiv.appendChild(seccionArribos);
    paradaDiv.appendChild(btnComoLlegar);

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
    return paradaDiv;
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

function extraerMinutos(texto) {
    return texto?.match(/\d+/)?.[0] ?? "?";
}

function claseUrgencia(mins) {
    const n = parseInt(mins, 10);
    if (Number.isNaN(n)) return "arribo--desconocido";
    if (n <= 5) return "arribo--pronto";
    if (n <= 15) return "arribo--medio";
    return "arribo--tarde";
}

function renderArribos(contenedor, arribos) {
    contenedor.innerHTML = "";

    if (!arribos || arribos.length === 0) {
        const vacio = document.createElement("span");
        vacio.classList.add("arrival-pill", "arrival-pill--empty");
        vacio.textContent = "Sin arribos";
        contenedor.appendChild(vacio);
        return;
    }

    const lista = document.createElement("ul");
    lista.classList.add("stop-arrivals__list");

    arribos.slice(0, 3).forEach((arribo) => {
        const mins = extraerMinutos(arribo.tiempoRestanteArribo);
        const urgencia = claseUrgencia(mins);

        const item = document.createElement("li");
        item.classList.add("arrival-item");

        // Tiempo con color de urgencia
        const tiempo = document.createElement("span");
        tiempo.classList.add("arrival-item__time", urgencia);
        tiempo.setAttribute("aria-label", `${mins} minutos`);
        tiempo.textContent = `${mins} min`;

        // Info: nombre de línea y bandera
        const info = document.createElement("span");
        info.classList.add("arrival-item__info");

        const linea = document.createElement("span");
        linea.classList.add("arrival-item__linea");
        linea.textContent = arribo.descripcionLinea || "Línea";

        info.appendChild(linea);

        if (arribo.descripcionBandera) {
            const bandera = document.createElement("span");
            bandera.classList.add("arrival-item__bandera");
            bandera.textContent = arribo.descripcionBandera;
            info.appendChild(bandera);
        }

        item.appendChild(tiempo);
        item.appendChild(info);
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
