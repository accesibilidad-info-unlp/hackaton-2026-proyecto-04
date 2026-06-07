export function savePosition() {
  return new Promise((resolve, reject) => {
    const exito = (position) => {
      const ubicacion = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        timestamp: Date.now(),
      };
      localStorage.setItem("user_location", JSON.stringify(ubicacion));
      console.log("Localización guardada:", ubicacion);
      resolve(ubicacion);
    };
    const error = (errorObjeto) => {
      if (errorObjeto.code === errorObjeto.PERMISSION_DENIED) {
        console.warn("El usuario bloqueó el acceso.");
        alert("Necesitamos tu ubicación para mostrar el mapa. Por favor, actívala en tu navegador.");
      } else {
        console.error("Ocurrió otro error:", errorObjeto.message);
      }
      reject(errorObjeto);
    };
    const opciones = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };
    navigator.geolocation.getCurrentPosition(exito, error, opciones);
  });
}

export const getPosition = () => {
  const locationRaw = localStorage.getItem("user_location");
  if (!locationRaw) return null;
  const location = JSON.parse(locationRaw);
  return { lat: location.lat, lon: location.lon };
};
