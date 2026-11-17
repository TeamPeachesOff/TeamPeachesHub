# Estructura de PeachesHub

- `index.html` y `sw.js` permanecen en la raíz para conservar el punto de entrada y el alcance del service worker.
- `scripts/` y `styles/` contienen los recursos de JavaScript y CSS del Anuario.
- `Anuario/`, `Logos/`, `imagenes/`, `documentos/`, `ImagenesMinecraft/`, `musicDisc/`, `icons/` y `modulos/` contienen recursos de la app y conservan sus rutas públicas.
- `herramientas/diagnostico/` contiene la página y la fuente que usa el diagnóstico. La URL antigua `diagnostico.html` redirige a la nueva ubicación.
- `docs/` contiene licencias e historial de entregas, no recursos de la app.