// microSimulado.js
// Simula el movimiento de un micro sobre una ruta de coordenadas (idealmente
// generada una vez con un servicio de ruteo, para que siga las calles reales).
// Calcula la duración de cada tramo según la distancia real entre puntos,
// para que la velocidad se vea constante sin importar qué tan separados
// estén los puntos de la ruta.

function interpolarCoordenada(inicio, fin, progreso) {
  return {
    lat: inicio.lat + (fin.lat - inicio.lat) * progreso,
    lng: inicio.lng + (fin.lng - inicio.lng) * progreso,
  };
}

function distanciaEnMetros(a, b) {
  const toRad = (grados) => (grados * Math.PI) / 180;
  const radioTierra = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2) ** 2;
  const sinDLng = Math.sin(dLng / 2) ** 2;
  const h =
    sinDLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng;
  return radioTierra * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export class MicroSimulado {
  /**
   * @param {L.Map} map - instancia de Leaflet
   * @param {Array<{lat:number, lng:number}>} ruta - puntos de la ruta (idealmente densos, siguiendo calles)
   * @param {number} velocidadKmH - velocidad simulada del micro, por defecto 25 km/h (velocidad urbana típica)
   * @param {object} opciones - opciones extra para el ícono del marker (opcional)
   */
  constructor(map, ruta, velocidadKmH = 25, opciones = {}) {
    this.map = map;
    this.ruta = ruta;
    this.velocidadMetrosPorMs = (velocidadKmH * 1000) / (60 * 60 * 1000);
    this.indiceActual = 0;
    this.animacionId = null;

    this.marker = L.marker([ruta[0].lat, ruta[0].lng], {
      icon: opciones.icon,
    }).addTo(map);
  }

  iniciar() {
    this._moverAlSiguientePunto();
  }

  detener() {
    if (this.animacionId) {
      cancelAnimationFrame(this.animacionId);
      this.animacionId = null;
    }
  }

  _moverAlSiguientePunto() {
    const puntoActual = this.ruta[this.indiceActual];
    const siguienteIndice = (this.indiceActual + 1) % this.ruta.length;
    const puntoSiguiente = this.ruta[siguienteIndice];

    const distanciaTramo = distanciaEnMetros(puntoActual, puntoSiguiente);
    // Mínimo de 150ms para evitar tramos de duración ~0 si dos puntos
    // de la ruta quedan casi superpuestos.
    const duracionTramoMs = Math.max(
      distanciaTramo / this.velocidadMetrosPorMs,
      150,
    );

    const inicioAnimacion = performance.now();

    const animar = (ahora) => {
      const transcurrido = ahora - inicioAnimacion;
      const progreso = Math.min(transcurrido / duracionTramoMs, 1);

      const posicion = interpolarCoordenada(puntoActual, puntoSiguiente, progreso);
      this.marker.setLatLng([posicion.lat, posicion.lng]);

      if (progreso < 1) {
        this.animacionId = requestAnimationFrame(animar);
      } else {
        this.indiceActual = siguienteIndice;
        this._moverAlSiguientePunto();
      }
    };

    this.animacionId = requestAnimationFrame(animar);
  }
}

// ---- Ejemplo de uso ----
//
// import { MicroSimulado } from "./microSimulado.js";
// const rutaSiguiendoCalles = [ /* ...coordenadas... */ ];
//
// const micro202 = new MicroSimulado(map, rutaSiguiendoCalles, 25); // 25 km/h
// micro202.iniciar();
//
// micro202.detener();