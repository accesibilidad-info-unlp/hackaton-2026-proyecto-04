import { describe, it, expect } from 'vitest';
import { Graph } from './Graph.js';

describe('Graph (Graphology wrapper)', () => {
    it('debe armar nodos, aristas y encontrar el camino más corto con Dijkstra', () => {
        const grafo = new Graph();
        grafo.addNode('A');
        grafo.addNode('B');
        grafo.addNode('C');

        grafo.addEdge('A', 'B', 5, 'caminata');
        grafo.addEdge('B', 'C', 10, 'subir');
        grafo.addEdge('A', 'C', 20, 'directo');

        const camino = grafo.dijkstra('A', 'C');

        expect(camino).toEqual([
            { nodo: 'B', desde: 'A', tipo: 'caminata', peso: 5 },
            { nodo: 'C', desde: 'B', tipo: 'subir', peso: 10 }
        ]);
    });

    it('debe retornar array vacío si no hay ruta hacia el destino', () => {
        const grafo = new Graph();
        grafo.addNode('A');
        grafo.addNode('B');
        
        const camino = grafo.dijkstra('A', 'B');
        expect(camino).toEqual([]);
    });
});
