function AccederLocalizacion() {
  navigator.geolocation.getCurrentPosition(
    function (posicion) {
      console.log("Gracias por el permiso. Tu latitud es: " + posicion.coords.latitude);
    },
    function (error) {
      if (error.code === 1) {
        console.log("El usuario rechazó el cartel nativo del navegador.");
      }
    }
  );
}

AccederLocalizacion();
const map = L.map('map').setView([-34.9214,-57.9544],13);
