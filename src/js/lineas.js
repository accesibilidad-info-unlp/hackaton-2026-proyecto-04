export function getCodigoLinea(linea) {
  return linea?.codigo ?? linea?.numero ?? "";
}

export function getCodigoLineaPredeterminado(lineas) {
  if (!Array.isArray(lineas) || lineas.length === 0) {
    return "";
  }

  const linea307 = lineas.find((linea) => getCodigoLinea(linea) === "307");
  return getCodigoLinea(linea307 ?? lineas[0]);
}
