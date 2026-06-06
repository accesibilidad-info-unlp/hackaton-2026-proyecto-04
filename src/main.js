import L from 'leaflet'
/*const stopOne = {
  name: "parada 1",
  ubicacion: "-34.92087071516999, -57.94155961864684",
  micros: []
}*/

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


function inicializarMapa() {
  const map = L.map('map').setView([-34.9214, -57.9544], 20);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map); // ← esto falta
}


savePosition();
getPosition();
inicializarMapa();

const stopOne ={
    name: "rocha",
    ubicacion: "-34.92087071516999, -57.94155961864684",
    micros: ["mUno","mTres"]
}
const stopTwo ={
    name: "italia",
    ubicacion: "-34.91077864824624, -57.9552758912345",
    micros: ["mUno","mDos"]
}
const stopThree ={
    name: "azcuenaga",
    ubicacion: "-34.92205274298061, -57.967536701181764",
    micros: ["mUno","mDos"]
}
const stopFour ={
    name: "yrigoyen",
    ubicacion: "-34.931939435623384, -57.95423611121962",
    micros: ["mUno","mTres"]
}