// src/js/clases/Graph.js
import DirectedGraph from 'graphology';
import { dijkstra } from 'graphology-shortest-path';

export class Graph {
    constructor() {
        this.graph = new DirectedGraph();
    }

    // Agrega un nodo al grafo si no existe
    addNode(id) {
        this.graph.mergeNode(id);
    }

    // Agrega una arista dirigida desde un nodo origen a un destino con su peso y metadatos
    addEdge(desde, hacia, peso, tipo = "default") {
        this.graph.mergeEdge(desde, hacia, { weight: peso, tipo });
    }

    // Ejecuta el algoritmo de Dijkstra usando Graphology
    dijkstra(origenId, destinoId) {
        if (!this.graph.hasNode(origenId) || !this.graph.hasNode(destinoId)) {
            return [];
        }

        const nodosCamino = dijkstra.bidirectional(this.graph, origenId, destinoId);
        return this._reconstruirCamino(nodosCamino);
    }

    // Método privado auxiliar para armar el array final con el paso a paso
    _reconstruirCamino(nodosCamino) {
        if (!nodosCamino) return [];

        const camino = [];
        for (let i = 0; i < nodosCamino.length - 1; i++) {
            const desde = nodosCamino[i];
            const nodo = nodosCamino[i + 1];
            const attrs = this.graph.getEdgeAttributes(desde, nodo) || {};

            camino.push({
                nodo: nodo,
                desde: desde,
                tipo: attrs.tipo || "default",
                peso: attrs.weight || 0
            });
        }
        return camino;
    }

    // Getter para retrocompatibilidad por si se accede a .nodes
    get nodes() {
        return {
            set: (id) => this.addNode(id),
            has: (id) => this.graph.hasNode(id)
        };
    }
}