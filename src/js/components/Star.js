import { buscarFavStorage } from "../main.js";

export default function Star(identificador) {
    const esFavorita = buscarFavStorage(identificador);

    const star_fav = document.createElement('button');
    star_fav.classList.add('star-fav');
    star_fav.type = 'button';
    star_fav.setAttribute('aria-pressed', esFavorita ? 'true' : 'false');
    star_fav.setAttribute(
        'aria-label',
        esFavorita ? 'Quitar de favoritos' : 'Agregar a favoritos',
    );
    star_fav.setAttribute('title', esFavorita ? 'Quitar de favoritos' : 'Agregar a favoritos');
    star_fav.textContent = "★";
    if (esFavorita) {
        star_fav.classList.add('active');
    }

    star_fav.addEventListener('click', (event) => {
        event.stopPropagation();
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

        const ahoraEsFavorita = favoritas.includes(idParada);
        star_fav.setAttribute('aria-pressed', ahoraEsFavorita ? 'true' : 'false');
        star_fav.setAttribute(
            'aria-label',
            ahoraEsFavorita ? 'Quitar de favoritos' : 'Agregar a favoritos',
        );
        star_fav.setAttribute(
            'title',
            ahoraEsFavorita ? 'Quitar de favoritos' : 'Agregar a favoritos',
        );
    });

    return star_fav;
}