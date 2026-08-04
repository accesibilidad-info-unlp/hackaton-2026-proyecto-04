export async function fetchApi(link) {
  const res = await fetch(link);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error(e.message);
    return null;
  }
}

export async function paradasCercanas(lat, long, radioMetros = 500) {
  const data = await fetchApi(
    `http://localhost:3000/paradascercanas?lat=${lat}&long=${long}&radioMetros=${radioMetros}`,
  );

  // Compat: por si el proxy viejo todavía devolvía un array
  if (Array.isArray(data)) {
    return {
      paradas: data,
      radioMetros,
      expandido: false,
    };
  }

  return {
    paradas: data?.paradas ?? [],
    radioMetros: data?.radioMetros ?? radioMetros,
    expandido: Boolean(data?.expandido),
  };
}

export async function geocodeDireccion(texto) {
  const res = await fetch(
    `http://localhost:3000/geocode?q=${encodeURIComponent(texto)}`,
  );
  if (!res.ok) {
    return null;
  }
  return res.json();
}

export async function listarLineas() {
  return await fetchApi("http://localhost:3000/lineas");
}

export async function recorridoLinea(codigo) {
  const res = await fetch(
    `http://localhost:3000/lineas/${encodeURIComponent(codigo)}/recorrido`,
  );
  if (!res.ok) {
    return null;
  }
  return res.json();
}
