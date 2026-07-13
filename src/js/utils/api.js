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
  return await fetchApi(
    `http://localhost:3000/paradascercanas?lat=${lat}&long=${long}&radioMetros=${radioMetros}`,
  );
}
