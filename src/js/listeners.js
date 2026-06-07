const paradasFav = document.getElementById("paradas-fav");
const paradasCercanas = document.getElementById("paradas-cercanas");
const lineas = document.getElementById("lineas");
const recorridos = document.getElementById("recorridos");
const volver = document.getElementById("volver");
//const opcionesUno = document.getElementById("opcionesUno");
//const opcionesLinea = document.getElementById("Linea");
//const opcionesParada = document.getElementById("opcionesParadas");
function esconder(){
    for (let i = 0; i < document.getElementsByClassName("buttons").length; i++) {
    document.getElementsByClassName("buttons")[i].style.display = "none";
  }
  volver.style.display="none"
}
function cambiar(valor){
    esconder()
    document.getElementById(valor).style.display="flex"
    if (valor != "main"){
        document.getElementById("volver").style.display="flex"
    }
}
lineas.addEventListener("click", (e) => {cambiar(e.currentTarget.value)});
paradasFav.addEventListener("click", (e) => {cambiar(e.currentTarget.value)});
paradasCercanas.addEventListener("click", (e) => {cambiar(e.currentTarget.value)});
volver.addEventListener("click", (e) => {cambiar(e.currentTarget.value)});