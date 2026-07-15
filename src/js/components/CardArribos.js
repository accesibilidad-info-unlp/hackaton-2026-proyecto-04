import Star from "../components/Star.js";

export function cardArribos(parada, mapa, marcador) {
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

    paradaDiv.appendChild(header_content);
    paradaDiv.appendChild(pDistancia);
    paradaDiv.appendChild(bloqueLineas);
    paradaDiv.appendChild(seccionArribos);

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
