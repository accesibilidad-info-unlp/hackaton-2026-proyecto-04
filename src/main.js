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
