const paradasFav = document.getElementById("paradas-fav");
const paradasCercanas = document.getElementById("paradas-cercanas");
const lineas = document.getElementById("lineas");
const recorridos = document.getElementById("recorridos");
//const opcionesUno = document.getElementById("opcionesUno");
//const opcionesLinea = document.getElementById("Linea");
//const opcionesParada = document.getElementById("opcionesParadas");
function esconder(){
    for (let i = 0; i < document.getElementsByClassName("buttons").length; i++) {
    document.getElementsByClassName("buttons")[i].style.display = "none";
  }
}
function cambiar(valor){
    esconder()
    document.getElementById(valor).style.display="flex"
}
lineas.addEventListener("click", (e) => {cambiar(e.target.value)});
paradasFav.addEventListener("click", (e) => {cambiar(e.target.value)});
paradasCercanas.addEventListener("click", (e) => {cambiar(e.target.value)});
