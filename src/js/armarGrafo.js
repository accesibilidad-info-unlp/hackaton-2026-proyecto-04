// src/js/utils/armarGrafo.js
import { Graph } from './clases/Graph.js';

// Si usás Vite, podés importar los JSON directamente para armar el grafo, 
// o podrías hacer un fetch() a tu API si tuvieras un endpoint que devuelva todo.
import paradasData from '../../server/data/paradas.json';
import arribosData from '../../server/data/arribos.json';

// Función auxiliar para calcular distancia (copiada de tu proxy.js)
export function calcularDistancia(lat1, lon1, lat2, lon2) {
    const toRad = (g) => (g * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon1 - lon2);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function construirGrafoBase() {
    const grafo = new Graph();

    // 1. Armar las conexiones de SUBIR y BAJAR del micro en cada parada física
    paradasData.forEach(parada => {
        const idPeatonal = `${parada.identificador}-walk`;

        // Agregar nodo peatonal (físico)
        grafo.addNode(idPeatonal);

        // Si la parada tiene líneas, conectamos el nodo peatonal con el nodo de la línea
        if (parada.codigoLineas) {
            parada.codigoLineas.forEach(linea => {
                const idLinea = `${parada.identificador}-${linea}`;

                // Arista para SUBIR (penalidad de 10 min de espera)
                grafo.addEdge(idPeatonal, idLinea, 10, 'subir');

                // Arista para BAJAR (0 min, instantáneo)
                grafo.addEdge(idLinea, idPeatonal, 0, 'bajar');
            });
        }

        // 2. Conectar paradas cercanas caminando (Trasbordos a pie)
        // Buscamos otras paradas a menos de 300 metros
        paradasData.forEach(otraParada => {
            if (parada.identificador !== otraParada.identificador) {
                const dist = calcularDistancia(parada.latitud, parada.longitud, otraParada.latitud, otraParada.longitud);
                if (dist <= 300) {
                    const tiempoCaminata = dist / 80; // Asumimos velocidad de 80 mts / minuto
                    grafo.addEdge(idPeatonal, `${otraParada.identificador}-walk`, tiempoCaminata, 'caminata');
                }
            }
        });
    });

    // 3. Armar los tramos de VIAJE para cada micro (Riding)
    Object.keys(arribosData).forEach(codigoLinea => {
        const microsDeLinea = arribosData[codigoLinea];

        microsDeLinea.forEach(micro => {
            // Extraer solo los minutos y ordenar las paradas por tiempo para saber la secuencia real
            const paradasOrdenadas = micro.recorrido.paradas.map(p => ({
                id: p.identificador,
                minutos: parseInt(p.tiempo.replace(' min', ''))
            })).sort((a, b) => a.minutos - b.minutos);

            // Conectar cada parada con la siguiente en el recorrido del micro
            for (let i = 0; i < paradasOrdenadas.length - 1; i++) {
                const actual = paradasOrdenadas[i];
                const siguiente = paradasOrdenadas[i + 1];

                const idActualLinea = `${actual.id}-${codigoLinea}`;
                const idSiguienteLinea = `${siguiente.id}-${codigoLinea}`;

                const tiempoViaje = siguiente.minutos - actual.minutos;

                // Prevenir tiempos negativos o nulos por errores en datos
                if (tiempoViaje > 0) {
                    grafo.addEdge(idActualLinea, idSiguienteLinea, tiempoViaje, `viaje-${codigoLinea}`);
                }
            }
        });
    });

    return { grafo, paradasData }; // Retornamos los datos también para usar sus coordenadas luego
}
