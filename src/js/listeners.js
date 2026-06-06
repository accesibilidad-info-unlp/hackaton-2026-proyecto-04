const paradasFav = document.getElementById("paradas-fav");
const paradasCercanas = document.getElementById("paradas-cercanas");
const lineas = document.getElementById("lineas");
const recorridos = document.getElementById("recorridos");

paradasFav.addEventListener("click", () => {
  for (let i = 0; i < document.getElementsByClassName("buttons").length; i++) {
    document.getElementsByClassName("buttons")[i].style.display = "none";
  }
});
