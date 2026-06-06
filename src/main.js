const map = L.map('map').setView([-34.9214,-57.9544],13);
function savePosition() {
  const exito = (position) => {
    const ubicacion = {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      timestamp: Date.now()
    };
    localStorage.setItem('user_location', JSON.stringify(ubicacion));
    console.log('Localización guardada en el localStorage');
  };

  const error = (errorObjeto) => {
    if (errorObjeto.code === errorObjeto.PERMISSION_DENIED) {
      console.warn('El usuario tocó que NO / Bloqueó el acceso.');
      alert('Necesitamos tu ubicación para mostrar el mapa. Por favor, actívala en tu navegador.');
    } else {
      console.error('Ocurrió otro error:', errorObjeto.message);
    }
  };

  navigator.geolocation.getCurrentPosition(exito, error);
}
const getPosition = () => {
  const position = localStorage.getItem('user_location');
  console.log(position);
}

savePosition();
getPosition();
AccederLocalizacion();

const stopOne ={
    name: "parada 1",
    ubicacion: "-34.92087071516999, -57.94155961864684",
    micros: []
}
const stopTwo ={
    name: "parada 2",
    ubicacion: "-34.92087071516999, -57.94155961864684",
    micros: []
}
const stopThree ={
    name: "parada 3",
    ubicacion: "-34.92087071516999, -57.94155961864684",
    micros: []
}
const stopFour ={
    name: "parada 4",
    ubicacion: "-34.92087071516999, -57.94155961864684",
    micros: []
}