# Dónde está mi micro

## Descripción

Una página web para obtener información clara acerca de los recorridos de las lineas de colectivo de la zona, con una navegación clara y accesible para todos los posibles usuarios, funcional con lector de pantalla y apto para visualizacion sin problemas con estilos accesibles. Surge como una alternativa a una aplicación web ya existente carente un abordaje inclusivo y con una navegación compleja de más.

## Integrantes

- Buschiazzo Marco
- Galharretborde Tomás
- Rojas Felipe
- Segura Joaquín

## Tecnologías utilizadas

### Lenguajes
- HTML, CSS, Javascript
### Librerías
- Leaflet - Mapa interactivo
- Vite - Empaquetador

## Instalación y ejecución

```bash
npm install
```

En una terminal, levantar el frontend:

```bash
npm run dev
```

En otra terminal, levantar la API local con datos hardcodeados:

```bash
node server/proxy.js
```

Los datos mock viven en `server/data/*.json`.

La API local expone:
- `GET http://localhost:3000/paradascercanas?lat=<lat>&long=<long>&radioMetros=<metros>`
- `GET http://localhost:3000/arribos?codLinea=0&idParada=<id>`

Actualmente la API usa una base de datos mock en memoria con 3 líneas (`202`, `214`, `275`), sus paradas y arribos con dirección.
`/paradascercanas` devuelve solo las paradas dentro del radio indicado; si no se envía `radioMetros`, usa 500 m por defecto.

## Estado actual

Prototipo de navegación entre los menúes.
