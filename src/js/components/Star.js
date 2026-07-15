import { buscarFavStorage } from "../main.js";

export default function Star(identificador) {
    const esFavorita = buscarFavStorage(identificador);

    const star_fav = document.createElement('button');
    star_fav.classList.add('star-fav');
    star_fav.setAttribute('aria-label', 'Agregar a favoritos');
    star_fav.setAttribute('title', 'Agregar a favoritos');
    star_fav.textContent = "★";
    if (esFavorita) {
        star_fav.classList.add('active');
    }

    star_fav.addEventListener('click', () => {
        star_fav.classList.toggle('active');

        let favoritas = [];
        try {
            favoritas = JSON.parse(localStorage.getItem('paradas-favoritas')) || [];
            if (!Array.isArray(favoritas)) {
                favoritas = [];
            }
        } catch (e) {
            favoritas = [];
        }

        const idParada = identificador;
        const existeEnFavoritas = favoritas.includes(idParada);

        if (existeEnFavoritas) {
            favoritas = favoritas.filter(id => id !== idParada);
        } else {
            favoritas.push(idParada);
        }

        localStorage.setItem('paradas-favoritas', JSON.stringify(favoritas));
    });

    return star_fav;
}