# Redes Neuronales

Demos visuales e interactivas para explicar en clase los temas de la asignatura Redes Neuronales (Grado en Ciencia de Datos, UNIR). Una página por tema, con una pestaña por concepto, enlazadas desde `index.html`.

[Abrir las demos en GitHub Pages](https://dvald.github.io/Redes-Neuronales/)

- Sitio estático sin dependencias: abre `index.html` en el navegador o publícalo con GitHub Pages (rama principal, carpeta raíz).
- `assets/estilo.css` y `assets/comun.js`: estilos, pestañas, navegación entre temas, gráficas y dibujo de redes comunes a todas las páginas.
- `assets/mlp.js`: perceptrón multicapa en JavaScript (propagación, retropropagación, SGD/momento/RMSprop/Adam, L1/L2, dropout) con el que se entrena de verdad en el navegador.

GitHub Pages publica automáticamente los cambios enviados a `main` desde la carpeta raíz (`/`). El archivo `.nojekyll` permite servir los archivos estáticos sin procesarlos con Jekyll.
