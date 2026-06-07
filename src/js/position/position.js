export function savePosition() {
  const exito = (position) => {
    const ubicacion = {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      timestamp: Date.now(),
    };
    localStorage.setItem("user_location", JSON.stringify(ubicacion));
    console.log("Localización guardada en el localStorage");
  };

  const error = (errorObjeto) => {
    if (errorObjeto.code === errorObjeto.PERMISSION_DENIED) {
      console.warn("El usuario tocó que NO / Bloqueó el acceso.");
      alert("Necesitamos tu ubicación para mostrar el mapa. Por favor, actívala en tu navegador.");
    } else {
      console.error("Ocurrió otro error:", errorObjeto.message);
    }
  };

  const opciones = {
    enableHighAccuracy: true, // Estrecha el margen de error (fuerza el uso de GPS si existe)
    timeout: 10000,           // Tiempo máximo (10s) que esperará para obtener la posición exacta
    maximumAge: 0             // Fuerza al navegador a buscar una ubicación nueva en lugar de usar una vieja en caché
  };

  // Agregamos 'opciones' como tercer parámetro
  navigator.geolocation.getCurrentPosition(exito, error, opciones);
}

export const getPosition = () => {
  const locationRaw = localStorage.getItem("user_location");
  if (!locationRaw) return null;

  const location = JSON.parse(locationRaw);

  return { lat: location.lat, lon: location.lon }
};

