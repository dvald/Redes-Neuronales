/* Tema 10 · Piezas de diagrama compartidas SOLO por 10_produccion.html y 10_nube.html.
   Global: window.D10 (depende de assets/comun.js → RN).
     D10.prepara(svg, w, h, etiqueta)   viewBox + rol + etiqueta; vacía el SVG y crea <defs>
     D10.texto(padre, x, y, txt|[líneas], {tam, peso, color, ancla, base})
     D10.caja(padre, {x, y, w, h, titulo, sub, icono, fill, stroke, dash, etiqueta, clase})
     D10.icono(padre, tipo, cx, cy, tamaño, color)
     D10.ruta(padre, d, {color, ancho, dash, flecha}), D10.bezier(x1,y1,x2,y2,{vertical}) → {d, pts}
     D10.Flujo(padre)                    fichas (peticiones, mensajes) que viajan por polilíneas
     D10.estado(g, 'activo'|'error'|'ok'|'apagado'|null), D10.clicable(g, fn, etiqueta)
     D10.seg(contenedor, [[valor, texto]...], inicial, alCambiar, etiqueta)
     D10.erlangC(c, a), D10.mmc(λ, μ, c) → {media, percentil(q), rho}   (teoría de colas M/M/c)
     D10.expo(r, tasa), D10.poisson(r, media), D10.percentil(lista, q), D10.ms(x), D10.duracion(min) */
(function () {
  "use strict";
  const C = RN.color;
  const D = {};
  D.col = {
    acento: "#E65100", acentoL: "#FFF3E0", borde: "#9AA5B1", linea: "#C9D1D9", suave: "#F5F7FA",
    ink: C.ink, ink2: C.ink2, muted: C.muted, ok: C.ok, bad: C.bad, okL: "#E8F5E9", badL: "#FFEBEE", warnL: "#FFF8E1",
    zona: "#FFF8F1"
  };

  // ---------------------------------------------------------------- estilos de los diagramas
  const css = `
  .d-caja > rect { transition: fill .3s, stroke .3s, stroke-width .3s; }
  .d-caja { transition: opacity .35s; }
  .d-caja.d-activo > rect { fill: #FFF3E0; stroke: #E65100; stroke-width: 2.6; }
  .d-caja.d-error > rect { fill: #FFEBEE; stroke: #C62828; stroke-width: 2.6; }
  .d-caja.d-ok > rect { fill: #E8F5E9; stroke: #1B7A1B; stroke-width: 2.2; }
  .d-caja.d-apagado { opacity: .32; }
  .d-clic { cursor: pointer; }
  .d-clic:hover > rect { stroke: #E65100; }
  .d-clic:focus { outline: none; }
  .d-clic:focus-visible > rect { stroke: #1565C0; stroke-width: 3; }
  .d-gira { animation: d-gira 1s linear infinite; transform-box: fill-box; transform-origin: center; }
  @keyframes d-gira { to { transform: rotate(360deg); } }
  .d-late { animation: d-late 1.2s ease-in-out infinite; }
  @keyframes d-late { 50% { opacity: .45; } }
  @media (prefers-reduced-motion: reduce) { .d-gira, .d-late { animation: none; } }
  `;
  const st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  let nId = 0;
  D.id = function (p) { return (p || "d") + "-" + (++nId); };
  function svgDe(n) { return n.ownerSVGElement || n; }

  D.prepara = function (svg, w, h, etiqueta) {
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    svg.setAttribute("role", "img");
    if (etiqueta) svg.setAttribute("aria-label", etiqueta);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg._defs = RN.svg("defs", null, svg);
    svg._flechas = {};
    return svg;
  };
  D.flecha = function (svg, color) {
    svg = svgDe(svg);
    if (!svg._defs) { svg._defs = RN.svg("defs", null, svg); svg._flechas = {}; }
    if (!svg._flechas[color]) {
      const id = D.id("fl");
      const m = RN.svg("marker", { id: id, viewBox: "0 0 10 10", refX: 8.5, refY: 5, markerWidth: 9, markerHeight: 9, markerUnits: "userSpaceOnUse", orient: "auto-start-reverse" }, svg._defs);
      RN.svg("path", { d: "M0,0.5 L10,5 L0,9.5 z", fill: color }, m);
      svg._flechas[color] = id;
    }
    return "url(#" + svg._flechas[color] + ")";
  };

  D.g = function (padre, attrs) { return RN.svg("g", attrs || {}, padre); };

  D.texto = function (padre, x, y, txt, o) {
    o = o || {};
    const tam = o.tam || 13;
    const t = RN.svg("text", {
      x: x, y: y, "text-anchor": o.ancla || "middle", "dominant-baseline": o.base || "central",
      "font-size": tam, "font-weight": o.peso || 400, fill: o.color || C.ink
    }, padre);
    if (o.clase) t.setAttribute("class", o.clase);
    if (o.estilo) t.setAttribute("font-style", o.estilo);
    if (o.mono) t.setAttribute("font-family", "ui-monospace, Menlo, Consolas, monospace");
    D.ponTexto(t, txt, o);
    return t;
  };
  D.ponTexto = function (t, txt, o) {
    o = o || {};
    while (t.firstChild) t.removeChild(t.firstChild);
    if (Array.isArray(txt)) {
      const tam = +(t.getAttribute("font-size")) || 13;
      const lh = tam * (o.interlinea || 1.28);
      const x = t.getAttribute("x"), y = +t.getAttribute("y");
      const y0 = o.arriba ? y : y - lh * (txt.length - 1) / 2;
      txt.forEach(function (l, i) {
        RN.svg("tspan", { x: x, y: (y0 + i * lh).toFixed(1), "dominant-baseline": t.getAttribute("dominant-baseline"), text: l }, t);
      });
    } else t.textContent = txt;
  };

  /* Caja con icono, título y subtítulo centrados (o etiqueta arriba a la izquierda para cajas contenedoras). */
  D.caja = function (padre, o) {
    const g = RN.svg("g", { class: "d-caja" + (o.clase ? " " + o.clase : "") }, padre);
    g.rect = RN.svg("rect", {
      x: o.x, y: o.y, width: o.w, height: o.h, rx: o.r === undefined ? 10 : o.r,
      fill: o.fill || "#fff", stroke: o.stroke || D.col.borde, "stroke-width": o.sw || 1.5
    }, g);
    if (o.dash) g.rect.setAttribute("stroke-dasharray", o.dash);
    const cx = o.x + o.w / 2;
    g.cx = cx; g.cy = o.y + o.h / 2; g.o = o;
    if (o.etiqueta) {
      g.et = D.texto(g, o.x + 12, o.y + 15, o.etiqueta, { ancla: "start", tam: o.tamEtiqueta || 13, peso: 700, color: o.colorEtiqueta || C.ink2 });
    }
    // pila vertical centrada: icono, título, subtítulo
    const tT = o.tam || 14, tS = o.subTam || 12, gap = 5;
    const lt = o.titulo ? (Array.isArray(o.titulo) ? o.titulo.length : 1) : 0;
    const ls = o.sub ? (Array.isArray(o.sub) ? o.sub.length : 1) : 0;
    const hI = o.icono ? (o.iconoTam || 26) : 0;
    const hT = lt * tT * 1.28, hS = ls * tS * 1.28;
    const total = hI + hT + hS + gap * ((hI ? 1 : 0) + (hT ? 1 : 0) + (hS ? 1 : 0) - 1);
    let y = g.cy - total / 2 + (o.desplY || 0);
    if (o.icono) { g.ic = D.icono(g, o.icono, cx, y + hI / 2, hI, o.iconoColor); y += hI + gap; }
    if (o.titulo) { g.t1 = D.texto(g, cx, y + hT / 2, o.titulo, { tam: tT, peso: 700, color: o.colorTitulo }); y += hT + gap; }
    if (o.sub) { g.t2 = D.texto(g, cx, y + hS / 2, o.sub, { tam: tS, color: o.colorSub || C.ink2 }); }
    return g;
  };

  D.estado = function (g, e) {
    if (!g) return;
    g.classList.remove("d-activo", "d-error", "d-ok", "d-apagado");
    if (e) g.classList.add("d-" + e);
  };
  D.clicable = function (g, fn, etiqueta) {
    g.classList.add("d-clic");
    g.setAttribute("role", "button");
    g.setAttribute("tabindex", "0");
    if (etiqueta) g.setAttribute("aria-label", etiqueta);
    g.addEventListener("click", fn);
    g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(e); } });
  };

  // ---------------------------------------------------------------- iconos (rejilla 24×24, trazo)
  const radios = (function () {
    let d = "";
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + k * 2 * Math.PI / 7;
      d += "M" + (12 + 2.6 * Math.cos(a)).toFixed(2) + " " + (12 + 2.6 * Math.sin(a)).toFixed(2) + " L" + (12 + 9.5 * Math.cos(a)).toFixed(2) + " " + (12 + 9.5 * Math.sin(a)).toFixed(2) + " ";
    }
    return d;
  })();
  const I = {
    web: [["rect", { x: 2, y: 4, width: 20, height: 16, rx: 2 }], ["path", { d: "M2 8.5 H22" }], ["circle", { cx: 4.8, cy: 6.3, r: 0.85 }, "f"], ["circle", { cx: 7.3, cy: 6.3, r: 0.85 }, "f"], ["circle", { cx: 9.8, cy: 6.3, r: 0.85 }, "f"]],
    movil: [["rect", { x: 6.5, y: 2, width: 11, height: 20, rx: 2.4 }], ["path", { d: "M10.5 18.6 H13.5" }]],
    app: [["rect", { x: 2.5, y: 4.5, width: 19, height: 15, rx: 2 }], ["path", { d: "M9 9.2 L6.2 12 L9 14.8 M15 9.2 L17.8 12 L15 14.8 M13.1 8.6 L10.9 15.4" }]],
    servidor: [["rect", { x: 3, y: 3, width: 18, height: 5.4, rx: 1.4 }], ["rect", { x: 3, y: 9.3, width: 18, height: 5.4, rx: 1.4 }], ["rect", { x: 3, y: 15.6, width: 18, height: 5.4, rx: 1.4 }], ["circle", { cx: 6.3, cy: 5.7, r: 0.9 }, "f"], ["circle", { cx: 6.3, cy: 12, r: 0.9 }, "f"], ["circle", { cx: 6.3, cy: 18.3, r: 0.9 }, "f"], ["path", { d: "M10 5.7 H17.5 M10 12 H17.5 M10 18.3 H17.5" }]],
    bd: [["path", { d: "M4 5.5 V18.5 A8 2.8 0 0 0 20 18.5 V5.5" }, "w"], ["ellipse", { cx: 12, cy: 5.5, rx: 8, ry: 2.8 }], ["path", { d: "M4 12 A8 2.8 0 0 0 20 12" }]],
    usuario: [["circle", { cx: 12, cy: 8, r: 4 }], ["path", { d: "M4 21 C4 16.5 7.6 14 12 14 C16.4 14 20 16.5 20 21" }, "w"]],
    nube: [["path", { d: "M7 18.5 H17.2 A4.3 4.3 0 0 0 17.6 9.9 A6 6 0 0 0 6.3 10.6 A4 4 0 0 0 7 18.5 Z" }, "w"]],
    chip: [["path", { d: "M8 2.5V5 M12 2.5V5 M16 2.5V5 M8 19V21.5 M12 19V21.5 M16 19V21.5 M2.5 8H5 M2.5 12H5 M2.5 16H5 M19 8H21.5 M19 12H21.5 M19 16H21.5" }], ["rect", { x: 5, y: 5, width: 14, height: 14, rx: 2 }], ["rect", { x: 8.6, y: 8.6, width: 6.8, height: 6.8, rx: 1 }]],
    portatil: [["rect", { x: 4, y: 4.5, width: 16, height: 11.5, rx: 1.5 }], ["path", { d: "M2 19.5 H22 L20.5 16.5 H3.5 Z" }, "w"]],
    candado: [["path", { d: "M8 11 V8 A4 4 0 0 1 16 8 V11" }], ["rect", { x: 5, y: 11, width: 14, height: 10, rx: 2 }], ["circle", { cx: 12, cy: 16, r: 1.3 }, "f"]],
    llave: [["circle", { cx: 7.5, cy: 12, r: 4 }], ["path", { d: "M11.5 12 H21 M18 12 V15.2 M21 12 V14.4" }]],
    contenedor: [["rect", { x: 2.5, y: 7, width: 19, height: 12, rx: 1.5 }], ["path", { d: "M7.2 7 V19 M12 7 V19 M16.8 7 V19" }]],
    funcion: [["circle", { cx: 12, cy: 12, r: 9.5 }], ["text", { x: 12, y: 12.6, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 12, "font-weight": 700, text: "λ" }, "f"]],
    reloj: [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "M12 7 V12 L15.5 14" }]],
    alerta: [["path", { d: "M12 3 L22 20.5 H2 Z" }, "w"], ["path", { d: "M12 9.5 V14" }], ["circle", { cx: 12, cy: 17.2, r: 1 }, "f"]],
    doc: [["path", { d: "M6 2.5 H14.5 L19 7 V21.5 H6 Z" }, "w"], ["path", { d: "M14.5 2.5 V7 H19 M8.8 11 H16.2 M8.8 14.2 H16.2 M8.8 17.4 H13.5" }]],
    balanceador: [["circle", { cx: 12, cy: 12, r: 9.5 }], ["path", { d: "M5.5 12 H9.5 L13.5 7.5 H17.5 M9.5 12 L13.5 16.5 H17.5 M9.5 12 H17.5 M15.8 5.8 L17.5 7.5 L15.8 9.2 M15.8 14.8 L17.5 16.5 L15.8 18.2 M15.8 10.3 L17.5 12 L15.8 13.7" }]],
    disco: [["rect", { x: 2.5, y: 6, width: 19, height: 12, rx: 2 }], ["circle", { cx: 17, cy: 12, r: 1.4 }, "f"], ["path", { d: "M5.5 12 H12" }]],
    carpeta: [["path", { d: "M2.5 6.5 A1 1 0 0 1 3.5 5.5 H9 L11 7.5 H20.5 A1 1 0 0 1 21.5 8.5 V18.5 A1 1 0 0 1 20.5 19.5 H3.5 A1 1 0 0 1 2.5 18.5 Z" }, "w"]],
    cubo: [["path", { d: "M3.5 6.5 L5.6 20 H18.4 L20.5 6.5" }, "w"], ["ellipse", { cx: 12, cy: 6.5, rx: 8.5, ry: 2.4 }]],
    banco: [["path", { d: "M2.5 9.5 L12 3.5 L21.5 9.5 Z" }, "w"], ["path", { d: "M5 11 V18 M9.7 11 V18 M14.3 11 V18 M19 11 V18 M2.5 20.5 H21.5 M3.5 9.5 H20.5" }]],
    medidor: [["path", { d: "M3.5 17 A8.5 8.5 0 1 1 20.5 17" }], ["path", { d: "M12 16 L16 9.5" }], ["circle", { cx: 12, cy: 16, r: 1.6 }, "f"]],
    grafica: [["rect", { x: 2.5, y: 3.5, width: 19, height: 17, rx: 2 }], ["path", { d: "M6 16.5 L10 11.5 L13 13.5 L18 7.5" }]],
    campana: [["path", { d: "M6 16.5 V11 A6 6 0 0 1 18 11 V16.5 L19.5 18.5 H4.5 Z" }, "w"], ["path", { d: "M10 20.5 A2 2 0 0 0 14 20.5" }]],
    capas: [["path", { d: "M3 16 L12 21 L21 16" }], ["path", { d: "M3 12 L12 17 L21 12" }], ["path", { d: "M12 3 L21 8 L12 13 L3 8 Z" }, "w"]],
    timon: [["circle", { cx: 12, cy: 12, r: 9.5 }], ["path", { d: radios }], ["circle", { cx: 12, cy: 12, r: 2.6 }]],
    escudo: [["path", { d: "M12 2.5 L20 5.5 V11.5 C20 16.5 16.5 19.8 12 21.5 C7.5 19.8 4 16.5 4 11.5 V5.5 Z" }, "w"]],
    tarjeta: [["rect", { x: 2, y: 5.5, width: 20, height: 13, rx: 2 }], ["path", { d: "M2 9.5 H22 M5 15 H10" }]],
    luna: [["path", { d: "M15.5 3.2 A9 9 0 1 0 20.8 15.6 A7.2 7.2 0 0 1 15.5 3.2 Z" }, "w"]],
    red: [["path", { d: "M5 7 L12 5 M5 7 L12 12 M5 7 L12 19 M5 17 L12 5 M5 17 L12 12 M5 17 L12 19 M12 5 L19 12 M12 12 L19 12 M12 19 L19 12" }], ["circle", { cx: 5, cy: 7, r: 2.1 }], ["circle", { cx: 5, cy: 17, r: 2.1 }], ["circle", { cx: 12, cy: 5, r: 2.1 }], ["circle", { cx: 12, cy: 12, r: 2.1 }], ["circle", { cx: 12, cy: 19, r: 2.1 }], ["circle", { cx: 19, cy: 12, r: 2.1 }]],
    sensor: [["circle", { cx: 12, cy: 12, r: 2.4 }, "f"], ["path", { d: "M8 8 A5.7 5.7 0 0 0 8 16 M16 8 A5.7 5.7 0 0 1 16 16 M5 5 A9.9 9.9 0 0 0 5 19 M19 5 A9.9 9.9 0 0 1 19 19" }]],
    lista: [["rect", { x: 4, y: 2.5, width: 16, height: 19, rx: 2 }], ["path", { d: "M7.5 8 H16.5 M7.5 12 H16.5 M7.5 16 H13.5" }]],
    euro: [["circle", { cx: 12, cy: 12, r: 9.5 }], ["text", { x: 12.3, y: 12.6, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 11.5, "font-weight": 700, text: "€" }, "f"]],
    correo: [["rect", { x: 2.5, y: 5.5, width: 19, height: 13, rx: 1.5 }], ["path", { d: "M3 6.5 L12 13.5 L21 6.5" }]],
    sinred: [["path", { d: "M2.5 9 A14 14 0 0 1 21.5 9 M5.5 12.5 A9.5 9.5 0 0 1 18.5 12.5 M8.8 16 A4.8 4.8 0 0 1 15.2 16" }], ["circle", { cx: 12, cy: 19.2, r: 1.2 }, "f"], ["path", { d: "M3.5 3.5 L20.5 20.5" }, "bad"]],
    bandera: [["path", { d: "M5.5 21.5 V3.5" }], ["path", { d: "M5.5 4 H17.5 L15.3 8 L17.5 12 H5.5 Z" }, "w"]],
    rayo: [["path", { d: "M13 2.5 L5 13.5 H11.5 L10.5 21.5 L19 10 H12.5 Z" }, "w"]],
    mundo: [["circle", { cx: 12, cy: 12, r: 9.5 }], ["path", { d: "M2.5 12 H21.5 M12 2.5 C8.8 5.5 8.8 18.5 12 21.5 M12 2.5 C15.2 5.5 15.2 18.5 12 21.5" }]],
    registro: [["rect", { x: 2.5, y: 7, width: 19, height: 10, rx: 1.5 }], ["path", { d: "M6.3 7 V17 M10.1 7 V17 M13.9 7 V17 M17.7 7 V17" }]],
    engranaje: [["path", { d: "M12 2.8 L13.6 2.8 L14.1 5.3 L16.2 6.2 L18.3 4.8 L19.4 5.9 L18 8 L18.9 10.1 L21.3 10.6 V13.4 L18.9 13.9 L18 16 L19.4 18.1 L18.3 19.2 L16.2 17.8 L14.1 18.7 L13.6 21.2 H10.4 L9.9 18.7 L7.8 17.8 L5.7 19.2 L4.6 18.1 L6 16 L5.1 13.9 L2.7 13.4 V10.6 L5.1 10.1 L6 8 L4.6 5.9 L5.7 4.8 L7.8 6.2 L9.9 5.3 L10.4 2.8 Z" }, "w"], ["circle", { cx: 12, cy: 12, r: 3.2 }]],
    equipo: [["circle", { cx: 8, cy: 8.5, r: 3.2 }], ["circle", { cx: 16.5, cy: 8.5, r: 3.2 }], ["path", { d: "M2 19.5 C2 15.8 4.6 13.8 8 13.8 C11.4 13.8 14 15.8 14 19.5" }, "w"], ["path", { d: "M14.2 14.1 C15 13.9 15.7 13.8 16.5 13.8 C19.9 13.8 22 15.8 22 19.5 H15" }]],
    lupa: [["circle", { cx: 10.5, cy: 10.5, r: 6.5 }], ["path", { d: "M15.3 15.3 L21 21" }]],
    papelera: [["path", { d: "M4 6.5 H20 M9.5 6.5 V4 H14.5 V6.5" }], ["path", { d: "M6 6.5 L7 21 H17 L18 6.5" }, "w"], ["path", { d: "M10 10 V17.5 M14 10 V17.5" }]]
  };
  D.iconos = Object.keys(I);
  D.icono = function (padre, tipo, cx, cy, s, color) {
    const def = I[tipo];
    if (!def) return null;
    const k = (s || 24) / 24, col = color || C.ink2;
    const g = RN.svg("g", { transform: "translate(" + (cx - 12 * k).toFixed(2) + "," + (cy - 12 * k).toFixed(2) + ") scale(" + k.toFixed(4) + ")", "stroke-linecap": "round", "stroke-linejoin": "round", class: "d-icono" }, padre);
    def.forEach(function (it) {
      const tag = it[0], modo = it[2];
      const e = RN.svg(tag, it[1], g);
      if (tag === "text" || modo === "f") { e.setAttribute("fill", col); return; }
      e.setAttribute("stroke", modo === "bad" ? C.bad : col);
      e.setAttribute("stroke-width", 1.6);
      const relleno = modo === "w" || ((tag === "rect" || tag === "circle" || tag === "ellipse") && modo !== "n");
      e.setAttribute("fill", relleno ? "#fff" : "none");
    });
    return g;
  };

  // ---------------------------------------------------------------- rutas
  D.ruta = function (padre, d, o) {
    o = o || {};
    const p = RN.svg("path", { d: d, fill: "none", stroke: o.color || D.col.linea, "stroke-width": o.ancho || 2, "stroke-linecap": "round", "stroke-linejoin": "round" }, padre);
    if (o.dash) p.setAttribute("stroke-dasharray", o.dash);
    if (o.flecha) p.setAttribute("marker-end", D.flecha(padre, o.colorFlecha || o.color || D.col.borde));
    if (o.flechaIni) p.setAttribute("marker-start", D.flecha(padre, o.colorFlecha || o.color || D.col.borde));
    return p;
  };
  D.bezier = function (x1, y1, x2, y2, o) {
    let c1x, c1y, c2x, c2y;
    if (o && o.vertical) { const dy = (y2 - y1) / 2; c1x = x1; c1y = y1 + dy; c2x = x2; c2y = y2 - dy; }
    else { const dx = (x2 - x1) / 2; c1x = x1 + dx; c1y = y1; c2x = x2 - dx; c2y = y2; }
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, u = 1 - t;
      pts.push([u * u * u * x1 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x2, u * u * u * y1 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y2]);
    }
    return { d: "M" + x1 + "," + y1 + " C" + c1x + "," + c1y + " " + c2x + "," + c2y + " " + x2 + "," + y2, pts: pts };
  };
  D.cubica = function (p0, c1, c2, p1) {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, u = 1 - t;
      pts.push([u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0], u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1]]);
    }
    return { d: "M" + p0 + " C" + c1 + " " + c2 + " " + p1, pts: pts };
  };
  D.dPol = function (pts) { return "M" + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" L"); };
  // arco de circunferencia (ángulos en grados, sentido horario en pantalla)
  D.arco = function (cx, cy, r, a0, a1) {
    const pts = [], n = Math.max(6, Math.round(Math.abs(a1 - a0) / 4));
    for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return pts;
  };
  function longitudes(pts) {
    const L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return L;
  }
  D.enPol = function (pts, L, u) {
    if (!L) L = longitudes(pts);
    const d = RN.limita(u, 0, 1) * L[L.length - 1];
    let i = 1;
    while (i < L.length - 1 && L[i] < d) i++;
    const seg = (L[i] - L[i - 1]) || 1, t = (d - L[i - 1]) / seg;
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
  };

  /* Fichas que viajan: add({pts, dur, color, r, texto, colorTexto, retardo, suave, onFin, quedarse}) */
  D.Flujo = function (padre) {
    const capa = RN.svg("g", { class: "d-flujo", "pointer-events": "none" }, padre);
    const lista = [];
    const api = {
      capa: capa,
      add: function (o) {
        const g = RN.svg("g", { visibility: "hidden" }, capa);
        if (o.texto) {
          const w = o.ancho || (o.texto.length * 7.2 + 16);
          RN.svg("rect", { x: -w / 2, y: -11, width: w, height: 22, rx: 11, fill: o.color || C.s1, stroke: "#fff", "stroke-width": 1.5 }, g);
          RN.svg("text", { x: 0, y: 0.5, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 12, "font-weight": 700, fill: o.colorTexto || "#fff", text: o.texto }, g);
        } else {
          RN.svg("circle", { r: o.r || 6, fill: o.color || C.s1, stroke: o.borde || "#fff", "stroke-width": 1.5 }, g);
        }
        const it = Object.assign({ t: -(o.retardo || 0), dur: o.dur || 1 }, o);
        it.g = g;
        it.L = longitudes(o.pts);
        lista.push(it);
        return it;
      },
      paso: function (dt) {
        for (let i = lista.length - 1; i >= 0; i--) {
          const it = lista[i];
          if (!it || it.pausa) continue;
          it.t += dt;
          if (it.t < 0) continue;
          const u = Math.min(1, it.t / it.dur);
          const p = D.enPol(it.pts, it.L, it.suave ? RN.suave(u) : u);
          it.x = p[0]; it.y = p[1];
          it.g.setAttribute("transform", "translate(" + p[0].toFixed(1) + "," + p[1].toFixed(1) + ")");
          it.g.setAttribute("visibility", "visible");
          if (u >= 1) {
            const k = lista.indexOf(it);
            if (k >= 0) lista.splice(k, 1);
            if (!it.quedarse) it.g.remove();
            if (it.onFin) it.onFin(it);
          }
        }
      },
      vaciar: function () { lista.length = 0; while (capa.firstChild) capa.removeChild(capa.firstChild); },
      get n() { return lista.length; },
      lista: lista
    };
    return api;
  };

  // ---------------------------------------------------------------- controles
  D.seg = function (cont, opciones, inicial, alCambiar, etiqueta) {
    cont.classList.add("seg");
    cont.setAttribute("role", "group");
    if (etiqueta) cont.setAttribute("aria-label", etiqueta);
    const api = { valor: inicial };
    const bs = opciones.map(function (op) {
      const b = RN.el("button", { type: "button", "data-v": String(op[0]) }, cont, op[1]);
      b.addEventListener("click", function () { api.poner(op[0], true); });
      return b;
    });
    api.botones = bs;
    api.poner = function (v, avisar) {
      api.valor = v;
      bs.forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.v === String(v) ? "true" : "false"); });
      if (avisar && alCambiar) alCambiar(v);
    };
    api.poner(inicial, false);
    return api;
  };

  // ---------------------------------------------------------------- azar y colas
  D.expo = function (r, tasa) { return -Math.log(1 - r()) / tasa; };
  D.poisson = function (r, m) {
    if (m <= 0) return 0;
    if (m > 40) return Math.max(0, Math.round(m + Math.sqrt(m) * RN.normal(r)));
    const L = Math.exp(-m);
    let k = 0, p = 1;
    do { k++; p *= r(); } while (p > L);
    return k - 1;
  };
  D.percentil = function (lista, q) {
    if (!lista.length) return NaN;
    const s = lista.slice().sort(function (a, b) { return a - b; });
    return s[Math.min(s.length - 1, Math.floor(q * s.length))];
  };
  // Probabilidad de esperar en una cola M/M/c (fórmula C de Erlang); a = λ/μ
  D.erlangC = function (c, a) {
    if (a >= c) return 1;
    let suma = 1, term = 1;
    for (let k = 1; k < c; k++) { term *= a / k; suma += term; }
    const ac = term * a / c;            // a^c / c!
    const ult = ac * c / (c - a);
    return ult / (suma + ult);
  };
  // Tiempo de respuesta (espera + servicio) en M/M/c: media y percentiles exactos
  D.mmc = function (lam, mu, c) {
    const a = lam / mu;
    if (a >= c) return null;
    const Cw = D.erlangC(c, a), th = c * mu - lam;
    function cola(t) {
      const e1 = Math.exp(-mu * t);
      const pw = Math.abs(th - mu) < 1e-9 ? e1 * (1 + mu * t) : (th * e1 - mu * Math.exp(-th * t)) / (th - mu);
      return (1 - Cw) * e1 + Cw * pw;
    }
    return {
      rho: a / c, Cw: Cw, media: Cw / th + 1 / mu,
      percentil: function (q) {
        let lo = 0, hi = 1 / mu;
        while (cola(hi) > 1 - q && hi < 1e6) hi *= 2;
        for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (cola(m) > 1 - q) lo = m; else hi = m; }
        return (lo + hi) / 2;
      }
    };
  };

  // ---------------------------------------------------------------- formatos
  D.ms = function (x) {
    if (!Number.isFinite(x)) return "—";
    if (x < 1000) return RN.fmt(x, x < 10 ? 1 : 0) + " ms";
    if (x < 60000) return RN.fmt(x / 1000, x < 10000 ? 2 : 1) + " s";
    return RN.fmt(x / 60000, 1) + " min";
  };
  D.duracion = function (min) { // minutos → «3 d 15 h 36 min», «52 min 34 s»
    const s = Math.round(min * 60);
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    const out = [];
    if (d) out.push(d + " d");
    if (h) out.push(h + " h");
    if (m) out.push(m + " min");
    if (ss && !d) out.push(ss + " s");
    return out.join(" ") || "0 s";
  };
  D.euros = function (x, d) {
    if (d === undefined) d = x < 10 ? 2 : 0;
    return RN.fmt(x, d) + " €";
  };

  // JSON con colores para <pre class="code">: devuelve HTML con una línea por <span class="ln">
  D.jsonHTML = function (obj, marcas) {
    const txt = JSON.stringify(obj, null, 2);
    return txt.split("\n").map(function (l) {
      let h = l.replace(/&/g, "&amp;").replace(/</g, "&lt;");
      h = h.replace(/^(\s*)"([^"]+)":/, '$1<span class="kw">"$2"</span>:');
      h = h.replace(/: "([^"]*)"/, ': <span class="str">"$1"</span>');
      h = h.replace(/^(\s*)"([^"]*)"(,?)$/, '$1<span class="str">"$2"</span>$3');
      h = h.replace(/: (-?[\d.]+)(,?)$/, ': <span class="num">$1</span>$2');
      h = h.replace(/: (true|false|null)(,?)$/, ': <span class="num">$1</span>$2');
      const clave = (l.match(/"([^"]+)":/) || [])[1];
      const hl = marcas && clave && marcas.indexOf(clave) >= 0;
      return '<span class="ln' + (hl ? " hl" : "") + '">' + h + "</span>";
    }).join("");
  };
  // líneas de código ya escapadas → HTML con una línea por <span class="ln">
  D.codigoHTML = function (lineas) {
    return lineas.map(function (l, i) { return '<span class="ln" data-l="' + i + '">' + (l === "" ? " " : l) + "</span>"; }).join("");
  };

  window.D10 = D;
})();
