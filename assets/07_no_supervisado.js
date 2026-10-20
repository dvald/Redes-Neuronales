/* Tema 7 · Aprendizaje no supervisado: agrupamiento y reducción de dimensionalidad.
   Código propio de 07_no_supervisado.html. Usa RN (assets/comun.js) y RNmlp (assets/mlp.js).
   Cálculo real en el navegador: K-Means, autoencoders (mlp.js), SOM, PCA, distancias en alta
   dimensión, la GAN simplificada (G = μ + σ·z, D logística sobre x y x²) y el detector de anomalías.
   Ilustrativo: CNN/RNN como compresores, redes probabilísticas, desafíos y el desenrollado del rollo. */
(function () {
  "use strict";
  const C = RN.color;
  const $ = (id) => document.getElementById(id);
  const TAU = 2 * Math.PI;
  const ACENTO = C.apl, ACENTO_L = "#E0F2F1", ACENTO_M = "#80CBC4";
  const TINTA = "#16263b";
  const SERIE = RN.serie;
  const TINTE = SERIE.map((c) => RN.mezcla("#ffffff", c, 0.16));
  const GRIS_P = "#a3adb8";
  const NOMBRE = ["línea horizontal", "línea vertical", "diagonal", "cuadrado", "círculo"];
  const GRIS = [];
  for (let i = 0; i <= 255; i++) GRIS.push(RN.mezcla("#ffffff", TINTA, i / 255));
  const gris = (v) => GRIS[Math.round(RN.limita(v, 0, 1) * 255)];
  const FUENTE = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
  const lento = RN.reducirMovimiento;
  const ease = RN.suave;

  // Redibujar lo que haya cambiado mientras la pestaña estaba oculta
  const alMostrar = {};
  function cuandoSeMuestre(id, fn) { (alMostrar[id] = alMostrar[id] || []).push(fn); }
  document.addEventListener("rn:pestana", function (e) { (alMostrar[e.detail.id] || []).forEach(function (f) { f(); }); });

  // ================================================================== utilidades
  function seg(id, fn) {
    const g = $(id), bs = Array.from(g.querySelectorAll("button"));
    const marca = (b) => bs.forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    bs.forEach((b) => b.addEventListener("click", () => { marca(b); fn(b.dataset.v); }));
    return {
      get valor() { const b = bs.find((x) => x.getAttribute("aria-pressed") === "true") || bs[0]; return b.dataset.v; },
      marcar(v) { const b = bs.find((x) => x.dataset.v === String(v)); if (b) marca(b); }
    };
  }
  function punto(ctx, x, y, r, col, aro) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = col; ctx.fill();
    if (aro !== 0) { ctx.lineWidth = aro || 1.5; ctx.strokeStyle = "#fff"; ctx.stroke(); }
  }
  function txt(ctx, s, x, y, op) {
    op = op || {};
    ctx.font = (op.estilo ? op.estilo + " " : "") + (op.peso || 600) + " " + (op.tam || 12.5) + "px " + FUENTE;
    ctx.textAlign = op.al || "left"; ctx.textBaseline = op.base || "alphabetic";
    if (op.halo) { ctx.lineWidth = 4; ctx.strokeStyle = op.halo; ctx.lineJoin = "round"; ctx.strokeText(s, x, y); }
    ctx.fillStyle = op.color || C.ink2; ctx.fillText(s, x, y);
  }
  function pintaImg(ctx, img, x, y, tam, n) {
    n = n || 8; const c = tam / n;
    for (let i = 0; i < n; i++) {
      const y0 = Math.round(y + i * c), y1 = Math.round(y + (i + 1) * c);
      for (let j = 0; j < n; j++) {
        const x0 = Math.round(x + j * c), x1 = Math.round(x + (j + 1) * c);
        ctx.fillStyle = gris(img[i * n + j]); ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
    }
    ctx.strokeStyle = "#c9d2da"; ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(tam) - 1, Math.round(tam) - 1);
  }
  function imgHTML(img, px) {
    let s = '<svg width="' + px + '" height="' + px + '" viewBox="0 0 8 8" shape-rendering="crispEdges" style="vertical-align:middle;border:1px solid #cfd6dd;border-radius:3px">';
    for (let k = 0; k < 64; k++) s += '<rect x="' + (k % 8) + '" y="' + Math.floor(k / 8) + '" width="1" height="1" fill="' + gris(img[k]) + '"/>';
    return s + "</svg>";
  }
  function sTxt(padre, x, y, s, op) {
    op = op || {};
    const a = { x: x, y: y, "text-anchor": op.al || "middle", "font-size": op.tam || 13, "font-weight": op.peso || 600, fill: op.color || C.ink2, text: s };
    if (op.estilo) a["font-style"] = op.estilo;
    if (op.base) a["dominant-baseline"] = op.base;
    if (op.halo) { a.stroke = op.halo; a["stroke-width"] = 4; a["paint-order"] = "stroke"; a["stroke-linejoin"] = "round"; }
    if (op.clase) a["class"] = op.clase;
    if (op.rot) a.transform = "rotate(" + op.rot + " " + x + " " + y + ")";
    return RN.svg("text", a, padre);
  }
  function marcador(svg, color) {
    let defs = svg.querySelector("defs");
    if (!defs) defs = RN.svg("defs", {}, svg);
    const id = (svg.id || "s") + "-m" + color.replace(/[^0-9a-z]/gi, "");
    if (!defs.querySelector("#" + id)) {
      const m = RN.svg("marker", { id: id, viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 9, markerHeight: 9, markerUnits: "userSpaceOnUse", orient: "auto-start-reverse" }, defs);
      RN.svg("path", { d: "M0,0.5 L10,5 L0,9.5 z", fill: color }, m);
    }
    return "url(#" + id + ")";
  }
  function sFlecha(svg, padre, d, color, op) {
    op = op || {};
    const a = { d: d, fill: "none", stroke: color, "stroke-width": op.ancho || 2, "stroke-linecap": "round", "marker-end": marcador(svg, color) };
    if (op.clase) a["class"] = op.clase;
    if (op.discont) a["stroke-dasharray"] = op.discont;
    return RN.svg("path", a, padre);
  }
  function sImg(padre, img, x, y, tam, n) {
    n = n || 8;
    const c = tam / n, g = RN.svg("g", {}, padre), rects = [];
    for (let k = 0; k < n * n; k++) rects.push(RN.svg("rect", { x: (x + (k % n) * c).toFixed(2), y: (y + Math.floor(k / n) * c).toFixed(2), width: (c + 0.5).toFixed(2), height: (c + 0.5).toFixed(2), fill: gris(img ? img[k] : 0) }, g));
    RN.svg("rect", { x: x, y: y, width: tam, height: tam, fill: "none", stroke: "#c9d2da", "stroke-width": 1 }, g);
    return { g: g, rects: rects, poner: (im) => rects.forEach((r, k) => r.setAttribute("fill", gris(im[k]))) };
  }
  function sCaja(padre, x, y, w, h, t1, t2, op) {
    op = op || {};
    RN.svg("rect", { x: x, y: y, width: w, height: h, rx: 9, fill: op.fill || "#fff", stroke: op.stroke || "#c3cdd6", "stroke-width": op.ancho || 1.5, "stroke-dasharray": op.discont || "none" }, padre);
    sTxt(padre, x + w / 2, y + h / 2 + (t2 ? -3 : 5), t1, { tam: op.tam || 15, peso: 700, color: op.color || C.ink });
    if (t2) sTxt(padre, x + w / 2, y + h / 2 + 14, t2, { tam: 11.5, peso: 500, color: C.ink2 });
  }
  function casco(P) { // envolvente convexa (cadena monótona)
    const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (p.length < 3) return p;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], hi = [];
    p.forEach((q) => { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); });
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
    return lo.slice(0, -1).concat(hi.slice(0, -1));
  }
  // Regiones de decisión: se calculan en una rejilla gruesa y se dibujan escaladas con suavizado
  const TINTE_RGB = TINTE.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
  const lienzoReg = document.createElement("canvas");
  function regiones(ctx, x0, y0, W, H, f, paso) {
    paso = paso || 4;
    const cw = Math.max(1, Math.ceil(W / paso)), ch = Math.max(1, Math.ceil(H / paso));
    lienzoReg.width = cw; lienzoReg.height = ch;
    const oc = lienzoReg.getContext("2d"), im = oc.createImageData(cw, ch), d = im.data;
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
      const k = f(x0 + (i + 0.5) * paso, y0 + (j + 0.5) * paso), o = 4 * (j * cw + i);
      if (k < 0) continue;
      const c = TINTE_RGB[k]; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
    oc.putImageData(im, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(lienzoReg, 0, 0, cw, ch, x0, y0, cw * paso, ch * paso); ctx.restore();
  }
  const camino = (pts) => "M" + pts.map((q) => q[0].toFixed(1) + "," + q[1].toFixed(1)).join("L") + "Z";

  // ------------------------------------------------------------------ K-Means
  function kmAsignar(P, cent) {
    return P.map(function (p) {
      let b = 0, bd = Infinity;
      for (let k = 0; k < cent.length; k++) { const d = (p[0] - cent[k][0]) ** 2 + (p[1] - cent[k][1]) ** 2; if (d < bd) { bd = d; b = k; } }
      return b;
    });
  }
  function kmMedias(P, asig, K, prev) {
    const s = []; for (let k = 0; k < K; k++) s.push([0, 0, 0]);
    P.forEach((p, i) => { const a = s[asig[i]]; a[0] += p[0]; a[1] += p[1]; a[2]++; });
    return s.map((a, k) => a[2] ? [a[0] / a[2], a[1] / a[2]] : prev[k].slice());
  }
  function kmCompleto(P, K, r) { // k-means++ y Lloyd hasta converger
    const cent = [P[Math.floor(r() * P.length)].slice()];
    while (cent.length < K) {
      const d = P.map((p) => Math.min.apply(null, cent.map((c) => (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2)));
      let u = r() * d.reduce((a, b) => a + b, 0), i = 0;
      while (u > d[i] && i < P.length - 1) { u -= d[i]; i++; }
      cent.push(P[i].slice());
    }
    let asig = null;
    for (let it = 0; it < 100; it++) {
      const na = kmAsignar(P, cent);
      const igual = asig && na.every((v, i) => v === asig[i]);
      asig = na;
      if (igual) break;
      kmMedias(P, asig, K, cent).forEach((c, k) => { cent[k] = c; });
    }
    return { cent: cent, asig: asig };
  }
  function pureza(asig, verdad) {
    const m = {};
    asig.forEach((a, i) => { m[a] = m[a] || {}; m[a][verdad[i]] = (m[a][verdad[i]] || 0) + 1; });
    let s = 0;
    Object.keys(m).forEach((k) => { s += Math.max.apply(null, Object.values(m[k])); });
    return s / asig.length;
  }
  const pct = (x) => RN.fmt(100 * x, 0) + " %";

  // ------------------------------------------------------------------ imágenes 8 × 8 generadas por código
  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
    t = RN.limita(t, 0, 1);
    const qx = ax + t * dx - px, qy = ay + t * dy - py;
    return Math.sqrt(qx * qx + qy * qy);
  }
  function forma(tipo, r) {
    const img = new Array(64).fill(0);
    const ancho = 0.45 + r() * 0.25;
    const pinta = (f) => {
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const d = f(x + 0.5, y + 0.5);
        img[y * 8 + x] = Math.max(img[y * 8 + x], RN.limita(1 - (d - ancho) / 0.75, 0, 1));
      }
    };
    if (tipo === 0) { const y = 1.5 + r() * 5, a = 0.5 + r() * 1.5, b = 6 + r() * 1.5; pinta((px, py) => segDist(px, py, a, y, b, y)); }
    else if (tipo === 1) { const x = 1.5 + r() * 5, a = 0.5 + r() * 1.5, b = 6 + r() * 1.5; pinta((px, py) => segDist(px, py, x, a, x, b)); }
    else if (tipo === 2) {
      const o = (r() - 0.5) * 3;
      if (r() < 0.5) pinta((px, py) => segDist(px, py, 0.5 + o, 0.5, 7.5 + o, 7.5));
      else pinta((px, py) => segDist(px, py, 7.5 + o, 0.5, 0.5 + o, 7.5));
    } else if (tipo === 3) {
      const s = 3 + r() * 3, x0 = 0.8 + r() * (6.4 - s), y0 = 0.8 + r() * (6.4 - s);
      pinta((px, py) => Math.min(segDist(px, py, x0, y0, x0 + s, y0), segDist(px, py, x0 + s, y0, x0 + s, y0 + s), segDist(px, py, x0 + s, y0 + s, x0, y0 + s), segDist(px, py, x0, y0 + s, x0, y0)));
    } else {
      const R = 1.6 + r() * 1.5, cx = 4 + (r() - 0.5) * (7 - 2 * R - 1.2), cy = 4 + (r() - 0.5) * (7 - 2 * R - 1.2);
      pinta((px, py) => Math.abs(Math.hypot(px - cx, py - cy) - R));
    }
    return img;
  }
  // 300 imágenes: 60 de cada tipo (el tipo solo se usa para colorear, nunca para entrenar)
  const F = (function () {
    const r = RN.rng(7), X = [], y = [];
    for (let k = 0; k < 300; k++) { X.push(forma(k % 5, r)); y.push(k % 5); }
    return { X: X, y: y };
  })();

  // ================================================================== 1 · SIN ETIQUETAS
  (function () {
    const svg = $("i-svg");
    svg.setAttribute("viewBox", "0 0 960 432"); svg.setAttribute("role", "img");
    const r = RN.rng(21);
    const centros = [[0.2, 0.25, 0.055], [0.74, 0.27, 0.06], [0.25, 0.73, 0.06], [0.76, 0.76, 0.055]];
    const P = [];
    centros.forEach((c, g) => { for (let k = 0; k < 36; k++) P.push({ x: RN.limita(c[0] + RN.normal(r) * c[2], 0.03, 0.97), y: RN.limita(c[1] + RN.normal(r) * c[2], 0.03, 0.97), g: g }); });
    P.forEach((p) => { p.e = p.g >= 2 ? 1 : 0; });   // etiqueta: ¿compra la gama premium? (gasto alto)
    // K-Means real (K = 4) sobre las dos variables, sin mirar la etiqueta
    const km = kmCompleto(P.map((p) => [p.x, p.y]), 4, RN.rng(3));
    // numerar los grupos por su posición (para nombres y colores estables)
    const POS2G = [1, 3, 2, 0];  // abajo-izq → G2, abajo-der → G4, arriba-izq → G3, arriba-der → G1
    let mapa = km.cent.map((c) => POS2G[(c[1] > 0.5 ? 2 : 0) + (c[0] > 0.5 ? 1 : 0)]);
    if (new Set(mapa).size < 4) mapa = [0, 1, 2, 3];
    P.forEach((p, i) => { p.k = mapa[km.asig[i]]; });
    const NOMBRES = ["VIP", "ocasionales", "gasto puntual alto", "habituales"];
    const sx = (x) => 80 + x * 380, sy = (y) => 380 - y * 342;

    // fondo del modo supervisado
    const gSup = RN.svg("g", { class: "tr-op" }, svg);
    const yb = sy(0.52);
    RN.svg("rect", { x: 74, y: 24, width: 394, height: yb - 24, fill: RN.mezcla("#ffffff", C.clase1, 0.08) }, gSup);
    RN.svg("rect", { x: 74, y: yb, width: 394, height: 386 - yb, fill: RN.mezcla("#ffffff", C.clase0, 0.08) }, gSup);
    RN.svg("line", { x1: 74, y1: yb, x2: 468, y2: yb, stroke: C.ink2, "stroke-width": 2, "stroke-dasharray": "7 5" }, gSup);
    sTxt(gSup, 464, yb - 9, "frontera entre «sí» y «no»", { al: "end", tam: 12.5, color: C.ink2, halo: "#fff" });
    sTxt(gSup, 464, 44, "premium: sí", { al: "end", tam: 13, peso: 700, color: "#1d5fae", halo: "#fff" });
    sTxt(gSup, 464, 374, "premium: no", { al: "end", tam: 13, peso: 700, color: "#b34a1d", halo: "#fff" });

    // halos de los grupos descubiertos
    const gHalo = RN.svg("g", { class: "tr-op", style: "opacity:0" }, svg);
    for (let k = 0; k < 4; k++) {
      const Q = P.filter((p) => p.k === k);
      if (!Q.length) continue;
      const g = RN.svg("g", { opacity: 0.18 }, gHalo);
      RN.svg("path", { d: camino(casco(Q.map((p) => [sx(p.x), sy(p.y)]))), fill: SERIE[k], stroke: SERIE[k], "stroke-width": 30, "stroke-linejoin": "round" }, g);
    }
    const gNom = RN.svg("g", { class: "tr-op", style: "opacity:0" }, svg);

    // ejes
    sFlecha(svg, svg, "M74,388 L470,388", "#9aa5b1", { ancho: 1.5 });
    sFlecha(svg, svg, "M74,388 L74,22", "#9aa5b1", { ancho: 1.5 });
    sTxt(svg, 272, 418, "Compras al año", { tam: 13.5, peso: 700, color: C.ink2 });
    sTxt(svg, 46, 205, "Gasto medio por compra", { tam: 13.5, peso: 700, color: C.ink2, rot: -90 });

    // puntos
    const circ = P.map((p, i) => RN.svg("circle", { cx: sx(p.x).toFixed(1), cy: sy(p.y).toFixed(1), r: 6.5, stroke: "#fff", "stroke-width": 1.5, class: "tr-fill", style: "fill:" + (p.e ? C.clase1 : C.clase0) + ";transition-delay:" + ((i * 37) % 420) + "ms" }, svg));
    for (let k = 0; k < 4; k++) {
      const Q = P.filter((p) => p.k === k);
      if (!Q.length) continue;
      const mx = Q.reduce((s, p) => s + p.x, 0) / Q.length, top = Math.max.apply(null, Q.map((p) => p.y));
      sTxt(gNom, sx(mx), sy(top) - 22, "G" + (k + 1) + " · " + NOMBRES[k], { tam: 13, peso: 700, color: C.ink, halo: "#fff" });
    }
    // filas de muestra (marcadas en la nube)
    const MUESTRA = [3, 45, 80, 112, 60, 130];
    MUESTRA.forEach((i, n) => {
      const p = P[i];
      RN.svg("circle", { cx: sx(p.x), cy: sy(p.y), r: 11, fill: "none", stroke: C.ink, "stroke-width": 1.6 }, svg);
      sTxt(svg, sx(p.x) + 14, sy(p.y) - 9, String(n + 1), { al: "start", tam: 13, peso: 800, color: C.ink, halo: "#fff" });
    });

    // panel derecho: la pregunta y la tabla que recibe el modelo
    const q = ["¿Qué etiqueta tiene este dato?", "¿Qué estructura tienen estos datos?"].map((s, k) => {
      const t = sTxt(svg, 520, 58, s, { al: "start", tam: 23, peso: 800, color: C.ink, clase: "tr-op" });
      t.style.opacity = k ? 0 : 1; return t;
    });
    const sub = ["Supervisado: cada fila trae su respuesta.", "No supervisado: solo las entradas, sin respuesta.", "K-Means (K = 4) encuentra cuatro grupos sin ver la etiqueta."].map((s, k) => {
      const t = sTxt(svg, 520, 88, s, { al: "start", tam: 14.5, peso: 500, color: C.ink2, clase: "tr-op" });
      t.style.opacity = k ? 0 : 1; return t;
    });
    const COLX = [532, 612, 712, 808, 898];
    const colGrupo = [];
    ["#", "Compras/año", "Gasto medio", "¿Premium?", "Grupo"].forEach((h, k) => {
      const t = sTxt(svg, COLX[k], 134, h, { al: k ? "middle" : "start", tam: 12.5, peso: 700, color: C.ink2 });
      if (k === 4) { t.setAttribute("class", "tr-op"); t.style.opacity = 0; colGrupo.push(t); }
    });
    RN.svg("line", { x1: 520, y1: 146, x2: 940, y2: 146, stroke: "#cfd6dd", "stroke-width": 1.5 }, svg);
    const tachado = RN.svg("line", { x1: 770, y1: 130, x2: 846, y2: 130, stroke: C.ink2, "stroke-width": 2, class: "tr-op", style: "opacity:0" }, svg);
    const filas = MUESTRA.map((i, n) => {
      const p = P[i], y = 176 + n * 36;
      sTxt(svg, 532, y + 5, String(n + 1), { al: "start", tam: 14, peso: 800, color: C.ink });
      sTxt(svg, 612, y + 5, String(Math.round(2 + p.x * 46)), { tam: 14, peso: 500, color: C.ink });
      sTxt(svg, 712, y + 5, Math.round(12 + p.y * 160) + " €", { tam: 14, peso: 500, color: C.ink });
      const chip = RN.svg("rect", { x: 784, y: y - 12, width: 48, height: 24, rx: 12, class: "tr-fill", style: "fill:" + (p.e ? C.clase1 : C.clase0) }, svg);
      const ct = sTxt(svg, 808, y + 5, p.e ? "sí" : "no", { tam: 13, peso: 700, color: "#fff" });
      const gc = RN.svg("g", { class: "tr-op", style: "opacity:0" }, svg);
      RN.svg("rect", { x: 876, y: y - 12, width: 44, height: 24, rx: 6, fill: SERIE[p.k] }, gc);
      sTxt(gc, 898, y + 5, "G" + (p.k + 1), { tam: 13, peso: 700, color: "#fff" });
      RN.svg("line", { x1: 520, y1: y + 18, x2: 940, y2: y + 18, stroke: "#edf0f2" }, svg);
      return { p: p, chip: chip, ct: ct, gc: gc };
    });
    const ley = ["La etiqueta la puso una persona: es la respuesta que hay que imitar.", "Sin etiqueta, todos los puntos son iguales para el modelo.", "Los nombres de los grupos los pone el analista después."].map((s, k) => {
      const t = sTxt(svg, 520, 410, s, { al: "start", tam: 13, peso: 500, color: C.ink2, estilo: "italic", clase: "tr-op" });
      t.style.opacity = k ? 0 : 1; return t;
    });

    function modo(m) {
      m = +m;
      P.forEach((p, i) => { circ[i].style.fill = m === 0 ? (p.e ? C.clase1 : C.clase0) : m === 1 ? GRIS_P : SERIE[p.k]; });
      gSup.style.opacity = m === 0 ? 1 : 0;
      gHalo.style.opacity = gNom.style.opacity = m === 2 ? 1 : 0;
      q[0].style.opacity = m === 0 ? 1 : 0; q[1].style.opacity = m === 0 ? 0 : 1;
      sub.forEach((t, k) => { t.style.opacity = k === m ? 1 : 0; });
      ley.forEach((t, k) => { t.style.opacity = k === m ? 1 : 0; });
      filas.forEach((f) => {
        f.chip.style.fill = m === 0 ? (f.p.e ? C.clase1 : C.clase0) : "#e4e7eb";
        f.ct.textContent = m === 0 ? (f.p.e ? "sí" : "no") : "?";
        f.ct.setAttribute("fill", m === 0 ? "#fff" : C.ink2);
        f.gc.style.opacity = m === 2 ? 1 : 0;
      });
      tachado.style.opacity = m === 0 ? 0 : 1;
      colGrupo.forEach((t) => { t.style.opacity = m === 2 ? 1 : 0; });
    }
    seg("i-modo", modo);
    modo(0);

    // --- dos áreas
    const a1 = $("i-area1"), rr = RN.rng(4);
    const cs = [[58, 62], [138, 72], [96, 138]];
    const pts = [];
    for (let k = 0; k < 33; k++) { const g = k % 3; pts.push([cs[g][0] + RN.normal(rr) * 15, cs[g][1] + RN.normal(rr) * 14, g]); }
    pts.forEach((p) => RN.svg("circle", { cx: p[0] + 8, cy: p[1], r: 5, fill: GRIS_P, stroke: "#fff", "stroke-width": 1.2 }, a1));
    for (let g = 0; g < 3; g++) {
      const gg = RN.svg("g", { opacity: 0.18 }, a1);
      RN.svg("path", { d: camino(casco(pts.filter((p) => p[2] === g).map((p) => [p[0] + 262, p[1]]))), fill: SERIE[g], stroke: SERIE[g], "stroke-width": 22, "stroke-linejoin": "round" }, gg);
    }
    pts.forEach((p) => RN.svg("circle", { cx: p[0] + 262, cy: p[1], r: 5, fill: SERIE[p[2]], stroke: "#fff", "stroke-width": 1.2 }, a1));
    sFlecha(a1, a1, "M200,100 L250,100", ACENTO, { ancho: 2.5 });
    sTxt(a1, 225, 88, "agrupar", { tam: 12.5, color: C.ink2 });
    sTxt(a1, 100, 184, "datos sin etiqueta", { tam: 12, peso: 500, color: C.ink2 });
    sTxt(a1, 360, 184, "grupos homogéneos", { tam: 12, peso: 500, color: C.ink2 });

    const a2 = $("i-area2");
    sImg(a2, forma(4, RN.rng(12)), 12, 34, 116);
    sTxt(a2, 70, 172, "64 valores", { tam: 12.5, peso: 700, color: C.ink });
    RN.svg("polygon", { points: "142,34 226,74 226,112 142,150", fill: ACENTO_L, stroke: ACENTO_M, "stroke-width": 1.5 }, a2);
    sTxt(a2, 182, 97, "codificar", { tam: 12, color: C.ink2 });
    [["0,42", 64], ["−0,77", 96]].forEach((v) => {
      RN.svg("rect", { x: 236, y: v[1], width: 60, height: 26, rx: 6, fill: "#fff", stroke: ACENTO, "stroke-width": 1.5 }, a2);
      sTxt(a2, 266, v[1] + 18, v[0], { tam: 13.5, peso: 700, color: C.ink });
    });
    sTxt(a2, 266, 172, "2 valores", { tam: 12.5, peso: 700, color: C.ink });
    RN.svg("rect", { x: 330, y: 30, width: 120, height: 124, rx: 8, fill: C.surface, stroke: "#dfe3e8" }, a2);
    const r2 = RN.rng(8);
    const cen = [[360, 60], [420, 62], [352, 124], [424, 126], [392, 92]];
    for (let k = 0; k < 40; k++) { const g = k % 5; RN.svg("circle", { cx: cen[g][0] + RN.normal(r2) * 7, cy: cen[g][1] + RN.normal(r2) * 7, r: 3.2, fill: SERIE[g], opacity: 0.8 }, a2); }
    RN.svg("circle", { cx: 392, cy: 92, r: 8, fill: "none", stroke: C.ink, "stroke-width": 2 }, a2);
    sFlecha(a2, a2, "M300,92 L376,92", C.ink2, { ancho: 1.5, discont: "4 4" });
    sTxt(a2, 390, 172, "espacio reducido", { tam: 12.5, peso: 700, color: C.ink });

    // --- qué se optimiza
    const o = $("i-obj");
    o.setAttribute("viewBox", "0 0 960 222"); o.setAttribute("role", "img");
    [[34, "Supervisado"], [124, "No supervisado"]].forEach((f) => sTxt(o, 22, f[0] + 28, f[1], { al: "start", tam: 15, peso: 800, color: C.ink }));
    function fila(y, tsal, tsal2, tobj, tobj2, fillObj, discont) {
      sCaja(o, 160, y, 104, 46, "x", "entrada");
      sFlecha(o, o, "M266," + (y + 23) + " L304," + (y + 23), C.ink2);
      sCaja(o, 308, y, 104, 46, "Red", null, { fill: ACENTO_L, stroke: ACENTO });
      sFlecha(o, o, "M414," + (y + 23) + " L452," + (y + 23), C.ink2);
      sCaja(o, 456, y, 116, 46, tsal, tsal2);
      RN.svg("circle", { cx: 604, cy: y + 23, r: 15, fill: "#fff", stroke: C.ink2, "stroke-width": 1.5 }, o);
      sTxt(o, 604, y + 29, "−", { tam: 18, peso: 700, color: C.ink });
      RN.svg("line", { x1: 573, y1: y + 23, x2: 589, y2: y + 23, stroke: C.ink2, "stroke-width": 1.5 }, o);
      RN.svg("line", { x1: 619, y1: y + 23, x2: 636, y2: y + 23, stroke: C.ink2, "stroke-width": 1.5 }, o);
      sCaja(o, 636, y, 126, 46, tobj, tobj2, { fill: fillObj, discont: discont });
    }
    fila(34, "ŷ", "predicción", "y", "etiqueta humana", RN.mezcla("#ffffff", C.s4, 0.18));
    fila(124, "x", "reconstrucción", "x", "la propia entrada", "#fff", "5 4");
    RN.svg("path", { d: "M509.5,133 L514,129 L518.5,133", fill: "none", stroke: C.ink, "stroke-width": 1.7, "stroke-linejoin": "round" }, o);
    sFlecha(o, o, "M212,170 C212,194 699,194 699,172", ACENTO, { ancho: 1.8, discont: "5 4" });
    sTxt(o, 455, 214, "el objetivo es la misma entrada: no hace falta etiquetar", { tam: 12, peso: 600, color: "#00695C", halo: "#fff" });
    sTxt(o, 782, 52, "pérdida: error frente", { al: "start", tam: 13.5, peso: 600, color: C.ink });
    sTxt(o, 782, 70, "a la etiqueta", { al: "start", tam: 13.5, peso: 600, color: C.ink });
    sTxt(o, 782, 134, "pérdida: error de", { al: "start", tam: 13.5, peso: 600, color: C.ink });
    sTxt(o, 782, 152, "reconstrucción o", { al: "start", tam: 13.5, peso: 600, color: C.ink });
    sTxt(o, 782, 170, "compactación de grupos", { al: "start", tam: 13.5, peso: 600, color: C.ink });
  })();

  // ================================================================== 2 · AGRUPAMIENTO
  (function () {
    const cv = $("k-cv");
    const K2 = { tipo: "manchas", K: 3, sem: 1, P: [], verdad: [], cent: [], vis: [], asig: null, it: 0, fase: 0, hecho: false, rastro: [], ultimo: 0 };
    const kk = $("k-k"), kko = $("k-ko"), lis = Array.from($("k-pasos").querySelectorAll("li"));
    function datos() {
      const r = RN.rng(31), P = [], V = [];
      if (K2.tipo === "manchas") {
        const cs = [[-0.6, -0.35], [0.55, -0.45], [0.02, 0.6]];
        for (let i = 0; i < 240; i++) { const g = i % 3; P.push([cs[g][0] + RN.normal(r) * 0.18, cs[g][1] + RN.normal(r) * 0.18]); V.push(g); }
      } else if (K2.tipo === "anillos") {
        for (let i = 0; i < 240; i++) { const g = i % 2, a = r() * TAU, rad = (g ? 0.92 : 0.38) + RN.normal(r) * 0.05; P.push([rad * Math.cos(a), rad * Math.sin(a)]); V.push(g); }
      } else {
        const d = RNmlp.datos.clasif("lunas", 240, 0.07, 5);
        d.X.forEach((x, i) => { P.push([x[0] * 1.08, x[1] * 1.08 + 0.02]); V.push(d.y[i]); });
      }
      K2.P = P; K2.verdad = V;
    }
    function marca(n) {
      lis.forEach((li, k) => { li.classList.toggle("activo", k === n); li.classList.toggle("hecho", k < n); });
    }
    function estado() {
      const e = $("k-estado");
      $("k-it").textContent = K2.it;
      $("k-pur").textContent = K2.asig ? pct(pureza(K2.asig, K2.verdad)) : "—";
      if (K2.hecho) {
        const p = pureza(K2.asig, K2.verdad);
        const nReal = new Set(K2.verdad).size;
        let s = "<b>Convergido en " + K2.it + " iteraciones</b>: ningún punto cambia ya de grupo. ";
        if (p > 0.95 && K2.K === nReal) s += '<span class="ok-t">✓</span> Los grupos coinciden con los reales.';
        else if (p < 0.9) s += '<span class="bad-t">✗</span> Pero corta los datos con rectas: los grupos reales no son redondos.';
        else s += "Prueba con K = " + nReal + ".";
        e.innerHTML = s;
      } else if (!K2.asig) e.innerHTML = "Centroides colocados al azar. Pulsa «Reproducir» o avanza con «Paso».";
      else if (K2.ultimo === 1) e.innerHTML = "<b>Asignar:</b> cada punto toma el color de su centroide más cercano.";
      else e.innerHTML = "<b>Actualizar:</b> cada centroide se mueve al centro (media) de sus puntos.";
    }
    function reiniciar() {
      const r = RN.rng(100 + K2.sem * 17 + K2.K * 3 + K2.tipo.length);
      K2.cent = [];
      while (K2.cent.length < K2.K) {
        const c = [-1.05 + 2.1 * r(), -1.05 + 2.1 * r()];
        if (K2.cent.every((q) => Math.hypot(q[0] - c[0], q[1] - c[1]) > 0.35)) K2.cent.push(c);
      }
      K2.vis = K2.cent.map((c) => c.slice());
      K2.rastro = K2.cent.map((c) => [c.slice()]);
      K2.asig = null; K2.it = 0; K2.fase = 0; K2.hecho = false; K2.ultimo = 0;
      marca(0); estado(); pinta();
    }
    function paso() {
      if (K2.hecho) return false;
      if (K2.fase === 0) {
        const na = kmAsignar(K2.P, K2.cent);
        const igual = K2.asig && na.every((v, i) => v === K2.asig[i]);
        K2.asig = na;
        if (igual) { K2.hecho = true; marca(3); }
        else { K2.fase = 1; K2.ultimo = 1; marca(1); }
      } else {
        K2.cent = kmMedias(K2.P, K2.asig, K2.K, K2.cent);
        K2.cent.forEach((c, k) => K2.rastro[k].push(c.slice()));
        K2.it++; K2.fase = 0; K2.ultimo = 2; marca(2);
      }
      estado();
      return !K2.hecho;
    }
    function geo(w, h) { const s = Math.min(w, h) / 2.7; return { X: (x) => w / 2 + x * s, Y: (y) => h / 2 - y * s, ix: (px) => (px - w / 2) / s, iy: (py) => (h / 2 - py) / s }; }
    function pinta() {
      const L = RN.lienzo(cv, (w) => Math.round(Math.min(470, Math.max(330, w * 0.72))));
      const ctx = L.ctx, G = geo(L.w, L.h);
      ctx.fillStyle = C.surface; ctx.fillRect(0, 0, L.w, L.h);
      // regiones de Voronoi de los centroides (fronteras rectas)
      regiones(ctx, 0, 0, L.w, L.h, (px, py) => {
        const x = G.ix(px), y = G.iy(py);
        let b = 0, bd = Infinity;
        for (let k = 0; k < K2.vis.length; k++) { const d = (x - K2.vis[k][0]) ** 2 + (y - K2.vis[k][1]) ** 2; if (d < bd) { bd = d; b = k; } }
        return b;
      });
      K2.P.forEach((p, i) => punto(ctx, G.X(p[0]), G.Y(p[1]), 4.3, K2.asig ? SERIE[K2.asig[i]] : GRIS_P, 1.2));
      // rastro de los centroides
      K2.rastro.forEach((R) => {
        if (R.length < 2) return;
        ctx.strokeStyle = "rgba(31,41,51,.55)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
        ctx.beginPath(); R.forEach((c, j) => { if (j) ctx.lineTo(G.X(c[0]), G.Y(c[1])); else ctx.moveTo(G.X(c[0]), G.Y(c[1])); }); ctx.stroke(); ctx.setLineDash([]);
        R.slice(0, -1).forEach((c) => { ctx.beginPath(); ctx.arc(G.X(c[0]), G.Y(c[1]), 2.5, 0, TAU); ctx.fillStyle = "rgba(31,41,51,.6)"; ctx.fill(); });
      });
      K2.vis.forEach((c, k) => {
        const X = G.X(c[0]), Y = G.Y(c[1]);
        ctx.beginPath(); ctx.arc(X, Y, 13, 0, TAU); ctx.fillStyle = "#fff"; ctx.fill();
        ctx.beginPath(); ctx.arc(X, Y, 10, 0, TAU); ctx.fillStyle = SERIE[k]; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = C.ink; ctx.stroke();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(X - 5, Y); ctx.lineTo(X + 5, Y); ctx.moveTo(X, Y - 5); ctx.lineTo(X, Y + 5); ctx.stroke();
      });
      txt(ctx, "centroide", 12, L.h - 12, { tam: 12, color: C.ink2 });
      const xx = 80, yy = L.h - 16;
      ctx.beginPath(); ctx.arc(xx, yy, 7, 0, TAU); ctx.fillStyle = GRIS_P; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = C.ink; ctx.stroke();
    }
    function desliza(dt) {
      let mov = false;
      const f = lento ? 1 : Math.min(1, dt * 7);
      K2.vis.forEach((v, k) => { const c = K2.cent[k]; v[0] += (c[0] - v[0]) * f; v[1] += (c[1] - v[1]) * f; if (Math.abs(c[0] - v[0]) + Math.abs(c[1] - v[1]) > 1e-3) mov = true; });
      return mov;
    }
    let acum = 0;
    const anim = RN.anima(function (dt) {
      acum += dt;
      if (acum > (lento ? 0.25 : 0.75)) { acum = 0; paso(); }
      const mov = desliza(dt);
      pinta();
      if (K2.hecho && !mov) return false;
    }, cv);
    const glide = RN.anima(function (dt) { const mov = desliza(dt); pinta(); if (!mov) return false; }, cv);
    RN.botonPlay($("k-play"), anim, ["▶ Reproducir", "⏸ Pausa"]);
    $("k-play").addEventListener("click", () => { if (K2.hecho) { reiniciar(); anim.iniciar(); } acum = 0.7; });
    $("k-paso").addEventListener("click", () => { anim.parar(); paso(); glide.iniciar(); });
    $("k-nuevo").addEventListener("click", () => { anim.parar(); glide.parar(); K2.sem++; reiniciar(); });
    kk.addEventListener("input", () => { anim.parar(); glide.parar(); K2.K = +kk.value; kko.textContent = kk.value; reiniciar(); });
    seg("k-datos", (v) => { anim.parar(); glide.parar(); K2.tipo = v; K2.K = v === "manchas" ? 3 : 2; kk.value = K2.K; kko.textContent = K2.K; datos(); reiniciar(); });
    datos(); reiniciar();
    RN.alCambiarTam(cv, pinta);

    // ---------------------------------------------------- otra representación (radio)
    const rc = $("r-cv");
    const R = { P: [], V: [], alfa: 0, modo: "xy", rc: null, rasig: null, corre: false };
    (function () {
      const r = RN.rng(77);
      for (let i = 0; i < 220; i++) { const g = i % 2, a = r() * TAU, rad = (g ? 0.88 : 0.36) + RN.normal(r) * 0.05; R.P.push([rad * Math.cos(a), rad * Math.sin(a)]); R.V.push(g); }
      R.rad = R.P.map((p) => Math.hypot(p[0], p[1]));
      R.ang = R.P.map((p) => Math.atan2(p[1], p[0]));
      R.xy = kmCompleto(R.P, 2, RN.rng(5));
    })();
    $("r-p1").textContent = pct(pureza(R.xy.asig, R.V));
    function rGeo(w, h) {
      const m = { l: 60, r: 24, t: 36, b: 48 };
      const W = w - m.l - m.r, H = h - m.t - m.b;
      const S = Math.min(W, H) / 2.45, cx = m.l + W / 2, cy = m.t + H / 2;
      return {
        m: m, W: W, H: H, S: S, cx: cx, cy: cy,
        cart: (x, y) => [cx + x * S, cy - y * S],
        polar: (rr, th) => [m.l + rr / 1.15 * W, m.t + (1 - (th + Math.PI) / TAU) * H],
        invCart: (px, py) => [(px - cx) / S, (cy - py) / S],
        invPolar: (px, py) => { const rr = (px - m.l) / W * 1.15, th = (1 - (py - m.t) / H) * TAU - Math.PI; return [rr * Math.cos(th), rr * Math.sin(th)]; }
      };
    }
    function grupoDe(x, y) {
      if (R.modo === "r" && R.rc) { const rr = Math.hypot(x, y); return Math.abs(rr - R.rc[0]) <= Math.abs(rr - R.rc[1]) ? 0 : 1; }
      const c = R.xy.cent; return (x - c[0][0]) ** 2 + (y - c[0][1]) ** 2 <= (x - c[1][0]) ** 2 + (y - c[1][1]) ** 2 ? 0 : 1;
    }
    function rPinta() {
      const L = RN.lienzo(rc, (w) => Math.round(Math.min(420, Math.max(320, w * 0.4))));
      const ctx = L.ctx, G = rGeo(L.w, L.h), a = R.alfa;
      ctx.fillStyle = C.surface; ctx.fillRect(0, 0, L.w, L.h);
      // regiones (solo en los extremos de la transformación)
      if (a < 0.01 || a > 0.99) {
        ctx.save(); ctx.beginPath();
        if (a < 0.5) ctx.arc(G.cx, G.cy, 1.22 * G.S, 0, TAU); else ctx.rect(G.m.l, G.m.t, G.W, G.H);
        ctx.clip();
        regiones(ctx, G.m.l, G.m.t, G.W, G.H, (px, py) => { const q = a < 0.5 ? G.invCart(px, py) : G.invPolar(px, py); return grupoDe(q[0], q[1]); }, 3);
        ctx.restore();
      }
      // ejes cartesianos
      ctx.save(); ctx.globalAlpha = 1 - a;
      ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(G.cx - 1.2 * G.S, G.cy + 0.5); ctx.lineTo(G.cx + 1.2 * G.S, G.cy + 0.5); ctx.moveTo(G.cx + 0.5, G.cy - 1.2 * G.S); ctx.lineTo(G.cx + 0.5, G.cy + 1.2 * G.S); ctx.stroke();
      txt(ctx, "x", G.cx + 1.2 * G.S + 6, G.cy + 4, { tam: 13, peso: 700 });
      txt(ctx, "y", G.cx + 6, G.cy - 1.2 * G.S + 4, { tam: 13, peso: 700 });
      ctx.restore();
      // ejes polares
      ctx.save(); ctx.globalAlpha = a;
      ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(G.m.l, G.m.t); ctx.lineTo(G.m.l, G.m.t + G.H + 0.5); ctx.lineTo(G.m.l + G.W, G.m.t + G.H + 0.5); ctx.stroke();
      [0, 0.5, 1].forEach((v) => { const p = G.polar(v, -Math.PI); txt(ctx, RN.fmt(v, v % 1 ? 1 : 0), p[0], G.m.t + G.H + 16, { tam: 12, al: "center", color: C.muted }); });
      [[-Math.PI, "−π"], [0, "0"], [Math.PI, "π"]].forEach((v) => { const p = G.polar(0, v[0]); txt(ctx, v[1], G.m.l - 8, p[1] + 4, { tam: 12, al: "right", color: C.muted }); });
      txt(ctx, "radio r = √(x² + y²)", G.m.l + G.W / 2, L.h - 8, { tam: 12.5, al: "center", peso: 700 });
      ctx.save(); ctx.translate(16, G.m.t + G.H / 2); ctx.rotate(-Math.PI / 2); txt(ctx, "ángulo θ", 0, 0, { tam: 12.5, al: "center", peso: 700, base: "middle" }); ctx.restore();
      ctx.restore();
      // fronteras
      if (R.modo === "r" && R.rc) {
        const b = (R.rc[0] + R.rc[1]) / 2;
        ctx.save(); ctx.globalAlpha = 1 - a; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
        ctx.beginPath(); ctx.arc(G.cx, G.cy, b * G.S, 0, TAU); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
        const p = G.polar(b, 0); ctx.beginPath(); ctx.moveTo(p[0], G.m.t); ctx.lineTo(p[0], G.m.t + G.H); ctx.stroke(); ctx.restore();
        R.rc.forEach((c, k) => {
          ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = SERIE[k]; ctx.lineWidth = 3;
          const q = G.polar(c, 0); ctx.beginPath(); ctx.moveTo(q[0], G.m.t); ctx.lineTo(q[0], G.m.t + G.H); ctx.stroke(); ctx.restore();
        });
      } else if (a < 0.5) {
        const c = R.xy.cent, mx = (c[0][0] + c[1][0]) / 2, my = (c[0][1] + c[1][1]) / 2, dx = c[1][0] - c[0][0], dy = c[1][1] - c[0][1];
        const n = Math.hypot(dx, dy) || 1, ux = -dy / n, uy = dx / n;
        const p1 = G.cart(mx + ux * 1.25, my + uy * 1.25), p2 = G.cart(mx - ux * 1.25, my - uy * 1.25);
        ctx.save(); ctx.globalAlpha = 1 - 2 * a; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
        ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke(); ctx.restore();
      }
      // puntos
      const t = ease(a);
      R.P.forEach((p, i) => {
        const c1 = G.cart(p[0], p[1]), c2 = G.polar(R.rad[i], R.ang[i]);
        const g = R.modo === "r" && R.rasig ? R.rasig[i] : R.xy.asig[i];
        punto(ctx, c1[0] + (c2[0] - c1[0]) * t, c1[1] + (c2[1] - c1[1]) * t, 4.3, SERIE[g], 1.2);
      });
      if (R.modo === "xy" && a < 0.5) R.xy.cent.forEach((c, k) => { const q = G.cart(c[0], c[1]); punto(ctx, q[0], q[1], 9, SERIE[k], 2.5); });
      txt(ctx, R.modo === "r" ? "K-Means sobre el radio r" : "K-Means sobre (x, y)", 14, 22, { tam: 14, peso: 800, color: C.ink });
      txt(ctx, a > 0.5 ? "vista: (r, θ)" : "vista: (x, y)", L.w - 14, 22, { tam: 12.5, al: "right", color: C.ink2 });
    }
    async function secuencia() {
      if (R.corre) return;
      R.corre = true; $("r-play").disabled = true;
      R.modo = "xy"; R.rc = null; R.rasig = null; R.alfa = 0; rPinta();
      await RN.espera(lento ? 0 : 500);
      await RN.tween(1400, (t) => { R.alfa = t; rPinta(); }, (t) => t);
      R.modo = "r";
      let c = [0.14, 0.42];
      for (let it = 0; it < 8; it++) {
        R.rc = c.slice();
        const na = R.rad.map((v) => Math.abs(v - c[0]) <= Math.abs(v - c[1]) ? 0 : 1);
        const igual = R.rasig && na.every((v, i) => v === R.rasig[i]);
        R.rasig = na; rPinta();
        if (igual) break;
        await RN.espera(lento ? 0 : 450);
        const s = [0, 0], n = [0, 0];
        R.rad.forEach((v, i) => { s[na[i]] += v; n[na[i]]++; });
        const nc = [n[0] ? s[0] / n[0] : c[0], n[1] ? s[1] / n[1] : c[1]], vc = c.slice();
        await RN.tween(550, (t) => { R.rc = [vc[0] + (nc[0] - vc[0]) * t, vc[1] + (nc[1] - vc[1]) * t]; rPinta(); });
        c = nc;
      }
      $("r-p2").textContent = pct(pureza(R.rasig, R.V));
      await RN.espera(lento ? 0 : 500);
      await RN.tween(1400, (t) => { R.alfa = 1 - t; rPinta(); }, (t) => t);
      R.corre = false; $("r-play").disabled = false;
    }
    $("r-play").addEventListener("click", secuencia);
    $("r-reset").addEventListener("click", () => { if (R.corre) return; R.modo = "xy"; R.rc = null; R.rasig = null; R.alfa = 0; $("r-p2").textContent = "—"; rPinta(); });
    RN.alCambiarTam(rc, rPinta);
  })();

  // ================================================================== 3 · AUTOENCODER (compartido con la pestaña 8)
  const AE = { net: null, ep: 0, meta: 300, hist: [], Z: [], O: [], ecm: 0 };
  function aeNuevo() {
    AE.net = new RNmlp.MLP({ capas: [64, 16, 2, 16, 64], activacion: "tanh", salida: "sigmoid", perdida: "bce", semilla: 3 });
    AE.ep = 0; AE.meta = 300; AE.hist = []; aeCodigos(); AE.hist.push([0, AE.ecm]);
  }
  function aeCodigos() {
    let s = 0;
    for (let k = 0; k < F.X.length; k++) {
      const T = AE.net.traza(F.X[k]);
      AE.Z[k] = T.a[2]; AE.O[k] = T.a[4];
      const x = F.X[k], o = T.a[4];
      for (let i = 0; i < 64; i++) s += (o[i] - x[i]) * (o[i] - x[i]);
    }
    AE.ecm = s / (F.X.length * 64);
  }
  function aeEpoca() {
    AE.net.entrenarEpoca(F.X, F.X, { lote: 16, lr: 0.01, opt: "adam" });
    AE.ep++; aeCodigos(); AE.hist.push([AE.ep, AE.ecm]);
  }
  function aeDecod(z) {
    const W = AE.net.W, b = AE.net.b;
    const h = W[2].map((f, j) => Math.tanh(b[2][j] + f[0] * z[0] + f[1] * z[1]));
    return W[3].map((f, j) => { let s = b[3][j]; for (let i = 0; i < f.length; i++) s += f[i] * h[i]; return 1 / (1 + Math.exp(-s)); });
  }
  aeNuevo();

  (function () {
    const svg = $("ae-svg");
    svg.setAttribute("viewBox", "0 0 960 262"); svg.setAttribute("role", "img");
    let sel = 4;
    // trapecios
    RN.svg("polygon", { points: "196,56 400,112 400,158 196,214", fill: ACENTO_L, stroke: ACENTO_M, "stroke-width": 1.5 }, svg);
    RN.svg("polygon", { points: "560,112 764,56 764,214 560,158", fill: ACENTO_L, stroke: ACENTO_M, "stroke-width": 1.5 }, svg);
    const gL = RN.svg("g", {}, svg);
    const yEnc = [], yDec = [];
    for (let j = 0; j < 16; j++) { yEnc.push(135 - 46.5 + j * 6.2); yDec.push(135 - 46.5 + j * 6.2); }
    const cod = [112, 158];
    yEnc.forEach((y) => cod.forEach((c) => RN.svg("line", { x1: 300, y1: y, x2: 444, y2: c, stroke: "#b2dfdb", "stroke-width": 0.8 }, gL)));
    yDec.forEach((y) => cod.forEach((c) => RN.svg("line", { x1: 444, y1: c, x2: 660, y2: y, stroke: "#b2dfdb", "stroke-width": 0.8 }, gL)));
    RN.svg("rect", { x: 410, y: 82, width: 142, height: 106, rx: 12, fill: "#fff", stroke: ACENTO, "stroke-width": 2 }, svg);
    const dE = yEnc.map((y) => RN.svg("circle", { cx: 300, cy: y, r: 2.9, fill: "#fff", stroke: "#52606D", "stroke-width": 0.8 }, svg));
    const dD = yDec.map((y) => RN.svg("circle", { cx: 660, cy: y, r: 2.9, fill: "#fff", stroke: "#52606D", "stroke-width": 0.8 }, svg));
    const nz = cod.map((c) => RN.svg("circle", { cx: 444, cy: c, r: 15, fill: "#fff", stroke: "#52606D", "stroke-width": 2 }, svg));
    const tz = cod.map((c, k) => sTxt(svg, 466, c + 5, "z" + (k ? "₂" : "₁") + " = 0", { al: "start", tam: 14, peso: 700, color: C.ink }));
    const imIn = sImg(svg, F.X[sel], 28, 58, 154);
    const imOut = sImg(svg, F.X[sel], 778, 58, 154);
    sTxt(svg, 105, 40, "Entrada x · 64 píxeles", { tam: 14, peso: 700, color: C.ink });
    sTxt(svg, 855, 40, "Reconstrucción · 64 píxeles", { tam: 14, peso: 700, color: C.ink });
    sTxt(svg, 480, 70, "Cuello de botella", { tam: 14, peso: 800, color: "#00695C" });
    sTxt(svg, 298, 238, "Codificador · 64 → 16 → 2", { tam: 13.5, peso: 700, color: C.ink2 });
    sTxt(svg, 662, 238, "Decodificador · 2 → 16 → 64", { tam: 13.5, peso: 700, color: C.ink2 });
    sTxt(svg, 480, 206, "código latente: 2 números", { tam: 12.5, peso: 600, color: C.ink2 });
    const tCl = sTxt(svg, 105, 236, "", { tam: 13, peso: 600, color: C.ink2 });
    const tEr = sTxt(svg, 855, 236, "", { tam: 13, peso: 600, color: C.ink2 });

    function diag() {
      const x = F.X[sel], T = AE.net.traza(x);
      imIn.poner(x); imOut.poner(T.a[4]);
      T.a[1].forEach((v, j) => dE[j].setAttribute("fill", RN.colorPeso(v, 1)));
      T.a[3].forEach((v, j) => dD[j].setAttribute("fill", RN.colorPeso(v, 1)));
      T.a[2].forEach((v, k) => { nz[k].setAttribute("fill", RN.colorPeso(v, 1)); tz[k].textContent = "z" + (k ? "₂" : "₁") + " = " + RN.fmt(v, 2); });
      let e = 0; for (let i = 0; i < 64; i++) e += (T.a[4][i] - x[i]) ** 2;
      tCl.textContent = "(" + NOMBRE[F.y[sel]] + ")";
      tEr.textContent = "error de este ejemplo: " + RN.fmt(e / 64, 3);
    }

    // espacio latente
    const lat = $("ae-lat"), chk = $("ae-mapa");
    const ley = $("ae-ley");
    NOMBRE.forEach((n, k) => { const s = RN.el("span", {}, ley); RN.el("i", { style: { background: SERIE[k] } }, s); s.appendChild(document.createTextNode(n)); });
    let LG = null, mapaCache = null, mapaEp = -1;
    function latGeo(w, h) {
      const pad = 26, S = Math.min(w, h) - 2 * pad, x0 = (w - S) / 2, y0 = (h - S) / 2, R = 1.08;
      return { S: S, x0: x0, y0: y0, X: (z) => x0 + (z + R) / (2 * R) * S, Y: (z) => y0 + (R - z) / (2 * R) * S };
    }
    function pintaLat() {
      const L = RN.lienzo(lat, (w) => Math.round(Math.min(w, 440)));
      const ctx = L.ctx, G = latGeo(L.w, L.h); LG = G;
      ctx.fillStyle = C.surface; ctx.fillRect(0, 0, L.w, L.h);
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      [-1, -0.5, 0, 0.5, 1].forEach((v) => {
        ctx.beginPath(); ctx.moveTo(G.X(-1.08), Math.round(G.Y(v)) + 0.5); ctx.lineTo(G.X(1.08), Math.round(G.Y(v)) + 0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(Math.round(G.X(v)) + 0.5, G.Y(1.08)); ctx.lineTo(Math.round(G.X(v)) + 0.5, G.Y(-1.08)); ctx.stroke();
      });
      [-1, 0, 1].forEach((v) => { txt(ctx, RN.fmt(v, 0), G.X(v), G.Y(-1.08) + 15, { tam: 11.5, al: "center", color: C.muted }); txt(ctx, RN.fmt(v, 0), G.X(-1.08) - 6, G.Y(v) + 4, { tam: 11.5, al: "right", color: C.muted }); });
      txt(ctx, "z₁", G.X(1.08) - 4, G.Y(-1.08) - 6, { tam: 13, peso: 700, al: "right" });
      txt(ctx, "z₂", G.X(-1.08) + 18, G.Y(1.08) + 14, { tam: 13, peso: 700 });
      const conMapa = chk.checked;
      if (conMapa) {
        const N = 11, paso = 2 / (N - 1), tam = (G.X(paso) - G.X(0)) * 0.84;
        if (!mapaCache || mapaEp !== AE.ep) {
          mapaCache = [];
          for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const z = [-1 + j * paso, 1 - i * paso]; mapaCache.push([z, aeDecod(z)]); }
          mapaEp = AE.ep;
        }
        ctx.save(); ctx.globalAlpha = 0.72;
        mapaCache.forEach((m) => pintaImg(ctx, m[1], G.X(m[0][0]) - tam / 2, G.Y(m[0][1]) - tam / 2, tam));
        ctx.restore();
      }
      const r = conMapa ? 3.2 : 4.4;
      for (let k = 0; k < F.X.length; k++) punto(ctx, G.X(AE.Z[k][0]), G.Y(AE.Z[k][1]), r, SERIE[F.y[k]], conMapa ? 0.8 : 1.2);
      const zs = AE.Z[sel];
      ctx.beginPath(); ctx.arc(G.X(zs[0]), G.Y(zs[1]), 9, 0, TAU); ctx.lineWidth = 2.2; ctx.strokeStyle = C.ink; ctx.stroke();
    }
    function cercano(ev) {
      if (!LG) return -1;
      const rct = lat.getBoundingClientRect(), px = ev.clientX - rct.left, py = ev.clientY - rct.top;
      let b = -1, bd = 14 * 14;
      for (let k = 0; k < AE.Z.length; k++) { const d = (LG.X(AE.Z[k][0]) - px) ** 2 + (LG.Y(AE.Z[k][1]) - py) ** 2; if (d < bd) { bd = d; b = k; } }
      return b;
    }
    lat.addEventListener("mousemove", (ev) => {
      const k = cercano(ev);
      if (k < 0) { RN.tip.ocultar(); return; }
      RN.tip.mostrar("<b>" + NOMBRE[F.y[k]] + "</b><br>z = (" + RN.fmt(AE.Z[k][0], 2) + "; " + RN.fmt(AE.Z[k][1], 2) + ")<br>" + imgHTML(F.X[k], 48) + " → " + imgHTML(AE.O[k], 48), ev.clientX, ev.clientY);
    });
    lat.addEventListener("mouseleave", () => RN.tip.ocultar());
    lat.addEventListener("click", (ev) => { const k = cercano(ev); if (k >= 0) { sel = k; todo(); } });
    chk.addEventListener("change", pintaLat);

    // galería
    const gal = $("ae-gal");
    const IDX = [0, 5, 1, 6, 2, 7, 3, 8, 4, 9];
    let galGeo = null;
    function pintaGal() {
      const L = RN.lienzo(gal, (w) => { const c = Math.min(64, (w - 9 * 8 - 12) / 10); return Math.round(2 * c + 8 + 26); });
      const ctx = L.ctx, gap = 8, c = Math.min(64, (L.w - 9 * gap - 12) / 10), x0 = (L.w - (10 * c + 9 * gap)) / 2;
      galGeo = { c: c, gap: gap, x0: x0 };
      ctx.fillStyle = C.surface; ctx.fillRect(0, 0, L.w, L.h);
      IDX.forEach((k, j) => {
        const x = x0 + j * (c + gap);
        pintaImg(ctx, F.X[k], x, 8, c);
        pintaImg(ctx, AE.O[k], x, 8 + c + gap, c);
        ctx.fillStyle = SERIE[F.y[k]]; ctx.fillRect(Math.round(x), Math.round(8 + 2 * c + gap + 5), Math.round(c), 4);
        if (k === sel) { ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2; ctx.strokeRect(x - 3, 5, c + 6, 2 * c + gap + 6); }
      });
    }
    gal.addEventListener("click", (ev) => {
      if (!galGeo) return;
      const rct = gal.getBoundingClientRect(), px = ev.clientX - rct.left;
      const j = Math.floor((px - galGeo.x0) / (galGeo.c + galGeo.gap));
      if (j >= 0 && j < 10) { sel = IDX[j]; todo(); }
    });
    gal.style.cursor = "pointer"; lat.style.cursor = "pointer";

    const curva = RN.grafica($("ae-curva"), { alto: 210, x: { min: 0, max: 300, titulo: "época" }, y: { min: 0.005, max: 0.3, log: true, titulo: "error (ECM, log.)", marcas: [0.01, 0.03, 0.1, 0.3], fmt: (v) => RN.fmt(v, 2) }, margen: { l: 60 } });
    function pintaCurva() { curva.op.x.max = Math.max(300, AE.meta); curva.dibujar([{ nombre: "error de reconstrucción", color: ACENTO, puntos: AE.hist }]); }
    function kpis() {
      $("ae-ep").textContent = AE.ep;
      $("ae-err").textContent = RN.fmt(AE.ecm, 4);
      $("ae-par").textContent = RN.fmtN(AE.net.numParametros());
    }
    function todo() { diag(); pintaLat(); pintaGal(); pintaCurva(); kpis(); }
    AE.repinta3 = todo;
    const anim = RN.anima(function () {
      for (let i = 0; i < (lento ? 6 : 1); i++) if (AE.ep < AE.meta) aeEpoca();
      todo();
      if (AE.ep >= AE.meta) return false;
    }, lat);
    anim.onCambio = (on) => { if (on && AE.ep >= AE.meta) AE.meta = Math.min(AE.ep + 300, 1500); };
    RN.botonPlay($("ae-play"), anim, ["▶ Entrenar", "⏸ Pausa"]);
    $("ae-reset").addEventListener("click", () => { anim.parar(); aeNuevo(); todo(); });
    RN.alCambiarTam(lat, () => { pintaLat(); diag(); kpis(); });
    RN.alCambiarTam(gal, pintaGal);
    cuandoSeMuestre("p-ae", todo);

    // ---------------------------------------------------- tamaño del cuello de botella
    const TAM = [1, 2, 4, 8], MAXEP = 250;
    let mods = [], turno = 0;
    function cbNuevo() {
      mods = TAM.map((b) => ({ b: b, net: new RNmlp.MLP({ capas: [64, 16, b, 16, 64], activacion: "tanh", salida: "sigmoid", perdida: "bce", semilla: 3 }), ep: 0, hist: [], rec: [] }));
      mods.forEach(cbEval);
      turno = 0;
    }
    function cbEval(m) {
      let s = 0;
      for (let k = 0; k < F.X.length; k++) { const o = m.net.forward(F.X[k]), x = F.X[k]; for (let i = 0; i < 64; i++) s += (o[i] - x[i]) ** 2; if (k < 5) m.rec[k] = o; }
      m.hist.push([m.ep, s / (F.X.length * 64)]);
    }
    const cbCurva = RN.grafica($("cb-curva"), { alto: 300, x: { min: 0, max: MAXEP, titulo: "época" }, y: { min: 0.003, max: 0.3, log: true, titulo: "error de reconstrucción (ECM, log.)", marcas: [0.003, 0.01, 0.03, 0.1, 0.3], fmt: (v) => RN.fmt(v, 3) }, margen: { l: 62 } });
    const cbGal = $("cb-gal");
    function cbPinta() {
      cbCurva.dibujar(mods.map((m, k) => ({ nombre: m.b + (m.b === 1 ? " neurona" : " neuronas"), color: SERIE[k], puntos: m.hist })));
      const L = RN.lienzo(cbGal, 300), ctx = L.ctx;
      ctx.fillStyle = C.surface; ctx.fillRect(0, 0, L.w, L.h);
      const lab = 104, gap = 8, c = Math.min(50, (L.w - lab - 16 - 4 * gap) / 5, (L.h - 16 - 4 * gap) / 5);
      const x0 = lab + Math.max(0, (L.w - lab - 8 - (5 * c + 4 * gap)) / 2), y0 = (L.h - (5 * c + 4 * gap)) / 2;
      const filas = [["original", null]].concat(mods.map((m, k) => [m.b + (m.b === 1 ? " neurona" : " neuronas"), k]));
      filas.forEach((f, i) => {
        const y = y0 + i * (c + gap);
        if (f[1] !== null) { ctx.fillStyle = SERIE[f[1]]; ctx.fillRect(12, y + c / 2 - 2, 14, 4); }
        txt(ctx, f[0], 32, y + c / 2 + 4, { tam: 12.5, peso: 700, color: f[1] === null ? C.ink : C.ink2 });
        for (let j = 0; j < 5; j++) pintaImg(ctx, f[1] === null ? F.X[j] : mods[f[1]].rec[j], x0 + j * (c + gap), y, c);
      });
      $("cb-ep").textContent = Math.min.apply(null, mods.map((m) => m.ep));
    }
    const cbAnim = RN.anima(function () {
      const t0 = performance.now();
      let n = 0;
      do {
        const m = mods[turno % 4]; turno++;
        if (m.ep < MAXEP) { m.net.entrenarEpoca(F.X, F.X, { lote: 16, lr: 0.01, opt: "adam" }); m.ep++; if (m.ep % 5 === 0 || m.ep === MAXEP) cbEval(m); }
        n++;
      } while (n < 4 && performance.now() - t0 < (lento ? 40 : 9));
      cbPinta();
      if (mods.every((m) => m.ep >= MAXEP)) return false;
    }, cbGal);
    RN.botonPlay($("cb-play"), cbAnim, ["▶ Entrenar", "⏸ Pausa"]);
    $("cb-reset").addEventListener("click", () => { cbAnim.parar(); cbNuevo(); cbPinta(); });
    cbNuevo();
    RN.alCambiarTam(cbGal, cbPinta);
    cuandoSeMuestre("p-ae", cbPinta);
    cbAnim.iniciar();   // empieza sola la primera vez que se muestra la pestaña
  })();

  // ================================================================== 4 · MAPAS AUTOORGANIZADOS (SOM)
  (function () {
    // ---------------- mapa de colores
    const cv = $("sc-cv");
    const N = 20, T = 4000;
    const PALETA = [[0.89, 0.16, 0.16], [0.98, 0.55, 0.10], [0.98, 0.86, 0.15], [0.15, 0.65, 0.25], [0.10, 0.75, 0.85], [0.15, 0.30, 0.85], [0.50, 0.20, 0.75], [0.95, 0.45, 0.70]];
    const S = { W: null, it: 0, x: null, bmu: -1, datos: "paleta", r: null };
    const rgb = (v) => "rgb(" + Math.round(255 * RN.limita(v[0], 0, 1)) + "," + Math.round(255 * RN.limita(v[1], 0, 1)) + "," + Math.round(255 * RN.limita(v[2], 0, 1)) + ")";
    const sigma = (it) => (N / 2) * Math.pow(0.6 / (N / 2), Math.min(1, it / T));
    const eta = (it) => 0.5 * Math.pow(0.02 / 0.5, Math.min(1, it / T));
    function reset() {
      const r = RN.rng(5);
      S.W = new Float32Array(N * N * 3);
      for (let i = 0; i < S.W.length; i++) S.W[i] = 0.2 + 0.6 * r();
      S.it = 0; S.x = null; S.bmu = -1; S.r = RN.rng(9);
      pal(); pinta(); kpis();
    }
    function muestra() {
      const r = S.r;
      if (S.datos === "todos") return [r(), r(), r()];
      const c = PALETA[Math.floor(r() * PALETA.length)];
      return c.map((v) => RN.limita(v + RN.normal(r) * 0.04, 0, 1));
    }
    function paso() {
      const x = muestra();
      let b = 0, bd = Infinity;
      for (let i = 0; i < N * N; i++) { const d = (S.W[3 * i] - x[0]) ** 2 + (S.W[3 * i + 1] - x[1]) ** 2 + (S.W[3 * i + 2] - x[2]) ** 2; if (d < bd) { bd = d; b = i; } }
      const s = sigma(S.it), e = eta(S.it), bi = Math.floor(b / N), bj = b % N, rad = Math.ceil(3 * s);
      for (let i = Math.max(0, bi - rad); i <= Math.min(N - 1, bi + rad); i++) for (let j = Math.max(0, bj - rad); j <= Math.min(N - 1, bj + rad); j++) {
        const h = Math.exp(-((i - bi) ** 2 + (j - bj) ** 2) / (2 * s * s)), k = 3 * (i * N + j);
        for (let c = 0; c < 3; c++) S.W[k + c] += e * h * (x[c] - S.W[k + c]);
      }
      S.x = x; S.bmu = b; S.it++;
    }
    function pinta() {
      const L = RN.lienzo(cv, (w) => Math.round(Math.min(w, 440)));
      const ctx = L.ctx, cel = Math.floor((Math.min(L.w, L.h) - 16) / N), x0 = Math.round((L.w - cel * N) / 2), y0 = Math.round((L.h - cel * N) / 2);
      ctx.fillStyle = C.surface; ctx.fillRect(0, 0, L.w, L.h);
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const k = 3 * (i * N + j); ctx.fillStyle = rgb([S.W[k], S.W[k + 1], S.W[k + 2]]); ctx.fillRect(x0 + j * cel, y0 + i * cel, cel - 1, cel - 1); }
      if (S.bmu >= 0 && S.it < T) {
        const bi = Math.floor(S.bmu / N), bj = S.bmu % N, cx = x0 + (bj + 0.5) * cel, cy = y0 + (bi + 0.5) * cel;
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, Math.max(cel * 0.8, sigma(S.it) * cel), 0, TAU);
        ctx.fillStyle = "rgba(255,255,255,.16)"; ctx.fill(); ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke();
        ctx.setLineDash([6, 5]); ctx.lineDashOffset = 5.5; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.restore();
        ctx.lineWidth = 3; ctx.strokeStyle = "#fff"; ctx.strokeRect(x0 + bj * cel - 2, y0 + bi * cel - 2, cel + 3, cel + 3);
        ctx.lineWidth = 1.6; ctx.strokeStyle = C.ink; ctx.strokeRect(x0 + bj * cel - 3.5, y0 + bi * cel - 3.5, cel + 6, cel + 6);
      }
    }
    function kpis() {
      $("sc-it").textContent = RN.fmtN(S.it);
      $("sc-sig").textContent = RN.fmt(sigma(S.it), 1);
      $("sc-eta").textContent = RN.fmt(eta(S.it), 2);
      $("sc-x").style.background = S.x ? rgb(S.x) : "repeating-linear-gradient(45deg,#f1f3f5 0 6px,#e4e7eb 6px 12px)";
      $("sc-bmu").style.background = S.bmu >= 0 ? rgb([S.W[3 * S.bmu], S.W[3 * S.bmu + 1], S.W[3 * S.bmu + 2]]) : "repeating-linear-gradient(45deg,#f1f3f5 0 6px,#e4e7eb 6px 12px)";
    }
    function pal() {
      const p = $("sc-pal"); p.innerHTML = "";
      if (S.datos === "paleta") PALETA.forEach((c) => RN.el("i", { style: { background: rgb(c) }, title: "color de entrada" }, p));
      else { const r = RN.rng(4); for (let k = 0; k < 16; k++) RN.el("i", { style: { background: rgb([r(), r(), r()]) } }, p); RN.el("span", { style: { fontSize: ".8rem", color: C.ink2, alignSelf: "center", marginLeft: ".3rem" } }, p, "… (al azar)"); }
    }
    const vel = $("sc-vel");
    vel.addEventListener("input", () => { $("sc-velo").textContent = vel.value; });
    const anim = RN.anima(function () {
      const n = lento ? 200 : +vel.value;
      for (let k = 0; k < n && S.it < T; k++) paso();
      pinta(); kpis();
      if (S.it >= T) return false;
    }, cv);
    anim.onCambio = (on) => { if (on && S.it >= T) reset(); };
    RN.botonPlay($("sc-play"), anim, ["▶ Entrenar", "⏸ Pausa"]);
    $("sc-paso").addEventListener("click", () => { anim.parar(); if (S.it >= T) reset(); paso(); pinta(); kpis(); });
    $("sc-reset").addEventListener("click", () => { anim.parar(); reset(); });
    seg("sc-datos", (v) => { anim.parar(); S.datos = v; reset(); });
    reset();
    RN.alCambiarTam(cv, pinta);
    cuandoSeMuestre("p-som", () => { pinta(); kpis(); });
  })();

  (function () {
    // ---------------- malla que se estira
    const mc = $("sm-cv");
    const n = 12, TM = 3000;
    const M = { P: null, it: 0, D: [], x: null, bmu: -1, datos: "nube", r: null };
    const sigM = (it) => 4.5 * Math.pow(0.45 / 4.5, Math.min(1, it / TM));
    const etaM = (it) => 0.5 * Math.pow(0.02 / 0.5, Math.min(1, it / TM));
    function datos() {
      const r = RN.rng(13), D = [];
      for (let k = 0; k < 700; k++) {
        if (M.datos === "nube") D.push([-1.05 + 2.1 * r(), -0.62 + 1.24 * r()]);
        else if (M.datos === "anillo") { const a = r() * TAU, rad = Math.sqrt(0.55 * 0.55 + r() * (0.85 * 0.85 - 0.55 * 0.55)); D.push([rad * Math.cos(a) * 1.15, rad * Math.sin(a) * 0.82]); }
        else { const cs = [[-0.75, -0.3], [0.05, 0.42], [0.8, -0.32]], g = k % 3; D.push([cs[g][0] + RN.normal(r) * 0.13, cs[g][1] + RN.normal(r) * 0.13]); }
      }
      M.D = D;
    }
    function reset() {
      const r = RN.rng(3);
      M.P = new Float64Array(n * n * 2);
      for (let i = 0; i < n * n; i++) { M.P[2 * i] = (r() - 0.5) * 0.18; M.P[2 * i + 1] = (r() - 0.5) * 0.18; }
      M.it = 0; M.x = null; M.bmu = -1; M.r = RN.rng(17);
      pinta(); kpis();
    }
    function paso() {
      const x = M.D[Math.floor(M.r() * M.D.length)];
      let b = 0, bd = Infinity;
      for (let i = 0; i < n * n; i++) { const d = (M.P[2 * i] - x[0]) ** 2 + (M.P[2 * i + 1] - x[1]) ** 2; if (d < bd) { bd = d; b = i; } }
      const s = sigM(M.it), e = etaM(M.it), bi = Math.floor(b / n), bj = b % n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const h = Math.exp(-((i - bi) ** 2 + (j - bj) ** 2) / (2 * s * s));
        if (h < 1e-3) continue;
        const k = 2 * (i * n + j);
        M.P[k] += e * h * (x[0] - M.P[k]); M.P[k + 1] += e * h * (x[1] - M.P[k + 1]);
      }
      M.x = x; M.bmu = b; M.it++;
    }
    function pinta() {
      const L = RN.lienzo(mc, (w) => Math.round(Math.min(440, Math.max(300, w * 0.46))));
      const ctx = L.ctx, sc = Math.min(L.w / 2.6, L.h / 1.7), X = (v) => L.w / 2 + v * sc, Y = (v) => L.h / 2 - v * sc;
      ctx.fillStyle = C.surface; ctx.fillRect(0, 0, L.w, L.h);
      ctx.fillStyle = "#b8c2cc";
      M.D.forEach((p) => { ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), 2.3, 0, TAU); ctx.fill(); });
      ctx.strokeStyle = RN.rgba(C.s1, 0.85); ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const k = 2 * (i * n + j);
        if (j < n - 1) { ctx.moveTo(X(M.P[k]), Y(M.P[k + 1])); ctx.lineTo(X(M.P[k + 2]), Y(M.P[k + 3])); }
        if (i < n - 1) { const k2 = k + 2 * n; ctx.moveTo(X(M.P[k]), Y(M.P[k + 1])); ctx.lineTo(X(M.P[k2]), Y(M.P[k2 + 1])); }
      }
      ctx.stroke();
      const s = sigM(M.it), bi = Math.floor(M.bmu / n), bj = M.bmu % n, act = M.bmu >= 0 && M.it < TM;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const k = 2 * (i * n + j), h = act ? Math.exp(-((i - bi) ** 2 + (j - bj) ** 2) / (2 * s * s)) : 0;
        ctx.beginPath(); ctx.arc(X(M.P[k]), Y(M.P[k + 1]), 3.3 + 2.2 * h, 0, TAU);
        ctx.fillStyle = h > 0.05 ? RN.mezcla("#ffffff", ACENTO, Math.min(1, h * 1.1)) : "#fff"; ctx.fill();
        ctx.lineWidth = 1.4; ctx.strokeStyle = h > 0.05 ? "#00695C" : C.s1; ctx.stroke();
      }
      if (act) {
        const kb = 2 * M.bmu;
        ctx.setLineDash([4, 4]); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(X(M.x[0]), Y(M.x[1])); ctx.lineTo(X(M.P[kb]), Y(M.P[kb + 1])); ctx.stroke(); ctx.setLineDash([]);
        punto(ctx, X(M.P[kb]), Y(M.P[kb + 1]), 8, ACENTO, 2.5);
        punto(ctx, X(M.x[0]), Y(M.x[1]), 5.5, C.ink, 2);
      }
    }
    function kpis() { $("sm-it").textContent = RN.fmtN(M.it); $("sm-sig").textContent = RN.fmt(sigM(M.it), 1); }
    const velM = $("sm-vel");
    velM.addEventListener("input", () => { $("sm-velo").textContent = velM.value; });
    const animM = RN.anima(function () {
      const k = lento ? 150 : +velM.value;
      for (let q = 0; q < k && M.it < TM; q++) paso();
      pinta(); kpis();
      if (M.it >= TM) return false;
    }, mc);
    animM.onCambio = (on) => { if (on && M.it >= TM) reset(); };
    RN.botonPlay($("sm-play"), animM, ["▶ Entrenar", "⏸ Pausa"]);
    $("sm-reset").addEventListener("click", () => { animM.parar(); reset(); });
    seg("sm-datos", (v) => { animM.parar(); M.datos = v; datos(); reset(); });
    datos(); reset();
    RN.alCambiarTam(mc, pinta);
    cuandoSeMuestre("p-som", () => { pinta(); kpis(); });
  })();

  // ================================================================== 5 · REDUCCIÓN DE DIMENSIONALIDAD
  (function () {
    // ---------------- rollo (swiss roll)
    const t0 = 1.5 * Math.PI, t1 = 4.5 * Math.PI, ALTO = 34;
    const RAMPA = [C.s4, C.s2, C.s5, C.s7, C.s1];
    const rampa = (c) => { const u = RN.limita(c, 0, 1) * (RAMPA.length - 1), k = Math.min(RAMPA.length - 2, Math.floor(u)); return RN.mezcla(RAMPA[k], RAMPA[k + 1], u - k); };
    const Mk = 600, ts = [], sk = [0], phi = [];
    for (let k = 0; k <= Mk; k++) ts.push(t0 + (t1 - t0) * k / Mk);
    ts.forEach((t, k) => {
      const dx = Math.cos(t) - t * Math.sin(t), dz = Math.sin(t) + t * Math.cos(t);
      let f = Math.atan2(dz, dx);
      if (k) { while (f - phi[k - 1] > Math.PI) f -= TAU; while (f - phi[k - 1] < -Math.PI) f += TAU; }
      phi.push(f);
      if (k) sk.push(sk[k - 1] + 0.5 * (Math.sqrt(1 + t * t) + Math.sqrt(1 + ts[k - 1] ** 2)) * (t - ts[k - 1]));
    });
    const r = RN.rng(9), PTS = [];
    for (let i = 0; i < 900; i++) {
      const u = r(), t = Math.sqrt(t0 * t0 + u * (t1 * t1 - t0 * t0)), h = r();
      const kf = (t - t0) / (t1 - t0) * Mk, k = Math.min(Mk - 1, Math.floor(kf));
      PTS.push({ t: t, h: h, k: k, f: kf - k, c: (t - t0) / (t1 - t0), s: sk[k] + (sk[k + 1] - sk[k]) * (kf - k), x: t * Math.cos(t), y: (h - 0.5) * ALTO, z: t * Math.sin(t) });
    }
    PTS.forEach((p) => { p.col = rampa(p.c); });
    // curva con la curvatura multiplicada por (1 − α)
    function curva(a) {
      const qx = [t0 * Math.cos(t0)], qz = [t0 * Math.sin(t0)];
      for (let k = 1; k <= Mk; k++) {
        const fm = phi[0] + (1 - a) * (0.5 * (phi[k] + phi[k - 1]) - phi[0]), ds = sk[k] - sk[k - 1];
        qx.push(qx[k - 1] + Math.cos(fm) * ds); qz.push(qz[k - 1] + Math.sin(fm) * ds);
      }
      let mx = 0, mz = 0; for (let k = 0; k <= Mk; k++) { mx += qx[k]; mz += qz[k]; }
      mx /= Mk + 1; mz /= Mk + 1;
      let R = 0; for (let k = 0; k <= Mk; k++) { qx[k] -= mx; qz[k] -= mz; R = Math.max(R, Math.hypot(qx[k], qz[k])); }
      return { qx: qx, qz: qz, R: Math.sqrt(R * R + (ALTO / 2) ** 2) };
    }
    // PCA real sobre los puntos enrollados (3 × 3)
    function eig3(A) {
      const a = A.map((f) => f.slice()), V = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      for (let sw = 0; sw < 60; sw++) {
        if (Math.abs(a[0][1]) + Math.abs(a[0][2]) + Math.abs(a[1][2]) < 1e-12) break;
        for (let p = 0; p < 2; p++) for (let q = p + 1; q < 3; q++) {
          if (Math.abs(a[p][q]) < 1e-15) continue;
          const th = (a[q][q] - a[p][p]) / (2 * a[p][q]), t = (th >= 0 ? 1 : -1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
          for (let k = 0; k < 3; k++) { const kp = a[k][p], kq = a[k][q]; a[k][p] = c * kp - s * kq; a[k][q] = s * kp + c * kq; }
          for (let k = 0; k < 3; k++) { const pk = a[p][k], qk = a[q][k]; a[p][k] = c * pk - s * qk; a[q][k] = s * pk + c * qk; }
          for (let k = 0; k < 3; k++) { const vp = V[k][p], vq = V[k][q]; V[k][p] = c * vp - s * vq; V[k][q] = s * vp + c * vq; }
        }
      }
      return { val: [a[0][0], a[1][1], a[2][2]], vec: V };
    }
    const med = [0, 0, 0];
    PTS.forEach((p) => { med[0] += p.x; med[1] += p.y; med[2] += p.z; });
    med.forEach((v, i) => { med[i] = v / PTS.length; });
    const Cv = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    PTS.forEach((p) => { const d = [p.x - med[0], p.y - med[1], p.z - med[2]]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) Cv[i][j] += d[i] * d[j] / PTS.length; });
    const E = eig3(Cv), ord = [0, 1, 2].sort((i, j) => E.val[j] - E.val[i]);
    const v1 = [E.vec[0][ord[0]], E.vec[1][ord[0]], E.vec[2][ord[0]]], v2 = [E.vec[0][ord[1]], E.vec[1][ord[1]], E.vec[2][ord[1]]];
    const varTot = E.val.reduce((a, b) => a + b, 0), varExp = (E.val[ord[0]] + E.val[ord[1]]) / varTot;
    const norm = (A) => { const mn = Math.min.apply(null, A), mx = Math.max.apply(null, A); return A.map((v) => (v - mn) / (mx - mn) * 2 - 1); };
    const pc1 = norm(PTS.map((p) => (p.x - med[0]) * v1[0] + (p.y - med[1]) * v1[1] + (p.z - med[2]) * v1[2]));
    const pc2 = norm(PTS.map((p) => (p.x - med[0]) * v2[0] + (p.y - med[1]) * v2[1] + (p.z - med[2]) * v2[2]));
    const un1 = norm(PTS.map((p) => p.s)), un2 = norm(PTS.map((p) => p.h));

    // vista 3D
    const c3 = $("d-3d"), c2 = $("d-2d");
    const V = { yaw: 0.6, pitch: 1.1, alfa: 0, arrastre: null, d2: 0 };
    let cache = { a: -1, cur: null };
    function pinta3() {
      const L = RN.lienzo(c3, (w) => Math.round(Math.min(420, Math.max(300, w * 0.82))));
      const ctx = L.ctx;
      ctx.fillStyle = C.surface; ctx.fillRect(0, 0, L.w, L.h);
      if (cache.a !== V.alfa) cache = { a: V.alfa, cur: curva(V.alfa) };
      const cu = cache.cur, sc = Math.min(L.w, L.h) * 0.46 / cu.R;
      const cy = Math.cos(V.yaw), sy = Math.sin(V.yaw), cp = Math.cos(V.pitch), sp = Math.sin(V.pitch);
      const Q = PTS.map((p) => {
        const X = cu.qx[p.k] + (cu.qx[p.k + 1] - cu.qx[p.k]) * p.f, Z = cu.qz[p.k] + (cu.qz[p.k + 1] - cu.qz[p.k]) * p.f, Y = p.y;
        const x1 = X * cy + Z * sy, z1 = -X * sy + Z * cy;
        const y2 = Y * cp - z1 * sp, z2 = Y * sp + z1 * cp;
        return [L.w / 2 + x1 * sc, L.h / 2 - y2 * sc, z2, p.col];
      });
      // bordes de la hoja (silueta de la espiral)
      [-ALTO / 2, ALTO / 2].forEach((Y) => {
        let prev = null;
        for (let k = 0; k <= Mk; k += 4) {
          const X = cu.qx[k], Z = cu.qz[k], x1 = X * cy + Z * sy, z1 = -X * sy + Z * cy;
          const P2 = [L.w / 2 + x1 * sc, L.h / 2 - (Y * cp - z1 * sp) * sc];
          if (prev) { ctx.strokeStyle = RN.rgba(rampa(k / Mk), 0.75); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(P2[0], P2[1]); ctx.stroke(); }
          prev = P2;
        }
      });
      Q.sort((a, b) => a[2] - b[2]);
      const zmin = Q[0][2], zmax = Q[Q.length - 1][2] || 1;
      Q.forEach((q) => {
        const d = (q[2] - zmin) / (zmax - zmin || 1);
        ctx.globalAlpha = 0.5 + 0.5 * d;
        punto(ctx, q[0], q[1], 2.9 + 0.9 * d, q[3], 0.6);
      });
      ctx.globalAlpha = 1;
      txt(ctx, V.alfa > 0.02 ? "desenrollado: " + Math.round(V.alfa * 100) + " %" : "3 dimensiones (x, y, z)", 12, 20, { tam: 12.5, color: C.ink2 });
    }
    function pinta2() {
      const L = RN.lienzo(c2, (w) => Math.round(Math.min(420, Math.max(300, w * 0.82))));
      const ctx = L.ctx, m = { l: 34, r: 16, t: 34, b: 34 }, W = L.w - m.l - m.r, H = L.h - m.t - m.b;
      ctx.fillStyle = C.surface; ctx.fillRect(0, 0, L.w, L.h);
      ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(m.l, m.t); ctx.lineTo(m.l, m.t + H + 0.5); ctx.lineTo(m.l + W, m.t + H + 0.5); ctx.stroke();
      const t = ease(V.d2);
      const orden = PTS.map((p, i) => i);
      orden.forEach((i) => {
        const x = pc1[i] + (un1[i] - pc1[i]) * t, y = pc2[i] + (un2[i] - pc2[i]) * t;
        punto(ctx, m.l + (x + 1) / 2 * W, m.t + (1 - (y + 1) / 2) * H, 3.6, PTS[i].col, 0.7);
      });
      ctx.save(); ctx.globalAlpha = 1 - t;
      txt(ctx, "componente principal 1", m.l + W / 2, L.h - 10, { tam: 12.5, al: "center", peso: 700 });
      ctx.save(); ctx.translate(14, m.t + H / 2); ctx.rotate(-Math.PI / 2); txt(ctx, "componente principal 2", 0, 0, { tam: 12.5, al: "center", peso: 700, base: "middle" }); ctx.restore();
      txt(ctx, "PCA conserva el " + RN.fmt(100 * varExp, 0) + " % de la varianza… y mezcla los colores", m.l + 6, 18, { tam: 12.5, color: C.ink2, halo: C.surface });
      ctx.restore();
      ctx.save(); ctx.globalAlpha = t;
      txt(ctx, "posición a lo largo de la hoja", m.l + W / 2, L.h - 10, { tam: 12.5, al: "center", peso: 700 });
      ctx.save(); ctx.translate(14, m.t + H / 2); ctx.rotate(-Math.PI / 2); txt(ctx, "altura", 0, 0, { tam: 12.5, al: "center", peso: 700, base: "middle" }); ctx.restore();
      txt(ctx, "la hoja desenrollada: el degradado queda ordenado", m.l + 6, 18, { tam: 12.5, color: C.ink2, halo: C.surface });
      ctx.restore();
    }
    const sl = $("d-unroll"), slo = $("d-unrollo"), bp = $("d-play");
    function ponAlfa(a) { V.alfa = a; sl.value = Math.round(a * 100); slo.textContent = Math.round(a * 100) + " %"; bp.textContent = a > 0.5 ? "▶ Enrollar" : "▶ Desenrollar"; pinta3(); }
    sl.addEventListener("input", () => ponAlfa(+sl.value / 100));
    let animando = false;
    bp.addEventListener("click", async () => {
      if (animando) return;
      animando = true;
      const a0 = V.alfa, a1 = a0 > 0.5 ? 0 : 1;
      await RN.tween(2600, (t) => ponAlfa(a0 + (a1 - a0) * t));
      animando = false;
    });
    const titulo2 = $("d-tit2");
    seg("d-proy", async (v) => {
      titulo2.textContent = v === "pca" ? "Proyección PCA a 2D" : "Desenrollado no lineal a 2D";
      const d0 = V.d2, d1 = v === "pca" ? 0 : 1;
      await RN.tween(900, (t) => { V.d2 = d0 + (d1 - d0) * t; pinta2(); }, (t) => t);
    });
    // girar con el ratón
    c3.addEventListener("pointerdown", (e) => { V.arrastre = [e.clientX, e.clientY, V.yaw, V.pitch]; c3.setPointerCapture(e.pointerId); c3.style.cursor = "grabbing"; });
    c3.addEventListener("pointermove", (e) => { if (!V.arrastre) return; V.yaw = V.arrastre[2] + (e.clientX - V.arrastre[0]) * 0.01; V.pitch = RN.limita(V.arrastre[3] + (e.clientY - V.arrastre[1]) * 0.01, -1.3, 1.3); pinta3(); });
    const suelta = () => { V.arrastre = null; c3.style.cursor = "grab"; };
    c3.addEventListener("pointerup", suelta); c3.addEventListener("pointercancel", suelta);
    const giro = RN.anima(function (dt) { if (!V.arrastre) { V.yaw += dt * 0.35; pinta3(); } }, c3);
    if (!lento) giro.iniciar();
    RN.alCambiarTam(c3, pinta3);
    RN.alCambiarTam(c2, pinta2);

    // ---------------- maldición de la dimensionalidad
    const DIM = [1, 2, 3, 5, 10, 20, 50, 100, 200, 500, 1000];
    let res = null;
    function calcula() {
      if (res) return res;
      res = DIM.map((d) => {
        const rr = RN.rng(1000 + d), n = 300, P = [];
        for (let i = 0; i < n; i++) { const v = new Float64Array(d); for (let j = 0; j < d; j++) v[j] = rr(); P.push(v); }
        const dist = (a, b) => { let s = 0; for (let j = 0; j < d; j++) { const t = a[j] - b[j]; s += t * t; } return Math.sqrt(s); };
        let rs = 0, hist = null;
        for (let q = 0; q < 10; q++) {
          const D = [];
          for (let i = 0; i < n; i++) if (i !== q) D.push(dist(P[q], P[i]));
          const mn = Math.min.apply(null, D), mx = Math.max.apply(null, D);
          rs += mn / mx;
          if (q === 0) hist = D.map((v) => v / mx);
        }
        return { d: d, rat: rs / 10, hist: hist };
      });
      return res;
    }
    const md = $("m-d");
    const gH = RN.grafica($("m-hist"), {
      alto: 280, x: { min: 0, max: 1.02, titulo: "distancia / distancia máxima" }, y: { min: 0, max: 60, titulo: "número de puntos" }, hover: false,
      extras: (ctx, g) => {
        const R = calcula()[+md.value], mn = Math.min.apply(null, R.hist);
        const Xn = Math.round(g.sx(mn)) + 0.5, Xf = Math.round(g.sx(1)) + 0.5;
        [Xn, Xf].forEach((X) => { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(X, g.m.t); ctx.lineTo(X, g.h - g.m.b); ctx.stroke(); ctx.setLineDash([]); });
        const izq = Xn - g.m.l > 95;
        txt(ctx, "más cercano", Xn + (izq ? -6 : 6), g.m.t + 14, { tam: 12, al: izq ? "right" : "left", color: C.ink, peso: 700, halo: C.surface });
        txt(ctx, "más lejano", Xf - 6, g.m.t + (Xf - Xn < 170 ? 32 : 14), { tam: 12, al: "right", color: C.ink, peso: 700, halo: C.surface });
      }
    });
    const gC = RN.grafica($("m-curva"), {
      alto: 280, x: { min: -0.05, max: 3.05, titulo: "dimensiones d (escala logarítmica)", marcas: [0, 1, 2, 3], fmt: (v) => RN.fmtN(Math.pow(10, v)), fmtTip: (v) => RN.fmtN(Math.pow(10, v)) },
      y: { min: 0, max: 1, titulo: "cercano / lejano" },
      extras: (ctx, g) => {
        const R = calcula()[+md.value], X = g.sx(Math.log10(R.d)), Y = g.sy(R.rat);
        ctx.beginPath(); ctx.arc(X, Y, 9, 0, TAU); ctx.lineWidth = 2.2; ctx.strokeStyle = C.ink; ctx.stroke();
        txt(ctx, "d = " + RN.fmtN(R.d), X + (R.d > 300 ? -13 : 13), Y + (R.rat > 0.8 ? 22 : -10), { tam: 12.5, peso: 700, color: C.ink, al: R.d > 300 ? "right" : "left", halo: C.surface });
      }
    });
    function pintaM() {
      const R = calcula(), cur = R[+md.value];
      $("m-do").textContent = RN.fmtN(cur.d);
      $("m-rat").textContent = RN.fmt(cur.rat, 2);
      const B = 34, cnt = new Array(B).fill(0);
      cur.hist.forEach((v) => { cnt[Math.min(B - 1, Math.floor(v * B))]++; });
      gH.op.y.max = Math.max(20, Math.ceil(Math.max.apply(null, cnt) * 1.15 / 10) * 10);
      gH.dibujar([{ nombre: "puntos", color: C.s1, tipo: "barras", puntos: cnt.map((c, i) => [(i + 0.5) / B, c]) }]);
      gC.dibujar([
        { nombre: "cercano / lejano", color: C.s1, puntos: R.map((q) => [Math.log10(q.d), q.rat]) },
        { nombre: "dimensiones", color: C.s1, tipo: "puntos", radio: 4.5, puntos: R.map((q) => [Math.log10(q.d), q.rat]), hover: false }
      ]);
    }
    md.addEventListener("input", pintaM);
    cuandoSeMuestre("p-dim", () => { pintaM(); pinta2(); });
    RN.alCambiarTam($("m-hist"), pintaM);
  })();

  // ================================================================== 6 · CNN Y RNN
  (function () {
    // ---------------- CNN
    const svg = $("c-svg");
    svg.setAttribute("viewBox", "0 0 960 372"); svg.setAttribute("role", "img");
    function digito(d) {
      const cv = document.createElement("canvas"); cv.width = cv.height = 28;
      const ctx = cv.getContext("2d");
      ctx.fillStyle = "#000"; ctx.font = "700 23px " + FUENTE; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(d, 14, 15.5);
      const im = ctx.getImageData(0, 0, 28, 28).data, out = new Float32Array(784);
      for (let i = 0; i < 784; i++) out[i] = im[4 * i + 3] / 255;
      return out;
    }
    function conv(img, n, k3) {
      const out = new Float32Array(n * n);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        let s = 0;
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const y = i + a, x = j + b; if (y < 0 || x < 0 || y >= n || x >= n) continue; s += img[y * n + x] * k3[(a + 1) * 3 + b + 1]; }
        out[i * n + j] = Math.max(0, s);
      }
      return out;
    }
    function pool(m, n) {
      const h = n / 2, out = new Float32Array(h * h);
      for (let i = 0; i < h; i++) for (let j = 0; j < h; j++) out[i * h + j] = Math.max(m[2 * i * n + 2 * j], m[2 * i * n + 2 * j + 1], m[(2 * i + 1) * n + 2 * j], m[(2 * i + 1) * n + 2 * j + 1]);
      return out;
    }
    const FIL = [];
    for (let k = 0; k < 16; k++) { const a = (k % 8) * Math.PI / 8, sg = k < 8 ? 1 : -1, f = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) f.push(sg * (Math.cos(a) * j + Math.sin(a) * i)); FIL.push(f); }
    const escala = (maps) => { const mx = Math.max.apply(null, maps.map((m) => Math.max.apply(null, m))) || 1; return maps.map((m) => m.map((v) => v / mx)); };
    const mejor = (maps) => { let b = 0, bs = -1; maps.forEach((m, k) => { const s = m.reduce((a, v) => a + v, 0); if (s > bs) { bs = s; b = k; } }); return b; };
    let E = null;
    function calcula(d) {
      const x = digito(d);
      const m1 = escala(FIL.map((f) => pool(conv(x, 28, f), 28)));
      const m2 = escala(Array.from({ length: 32 }, (_, k) => pool(conv(m1[k % 16], 14, FIL[(k * 5 + 3) % 16]), 14)));
      const vec = m2.slice(0, 16).map((m) => m.reduce((a, v) => a + v, 0) / m.length);
      const mv = Math.max.apply(null, vec) || 1;
      return { x: x, f1: m1[mejor(m1)], f2: m2[mejor(m2)], vec: vec.map((v) => v / mv) };
    }
    const VAC = "#eef2f5";
    function caja(g, x, y, wf, depth, nSl, dibujo) {
      const ox = depth * 0.7, oy = -depth * 0.5;
      RN.svg("polygon", { points: [x, y, x + wf, y, x + wf + ox, y + oy, x + ox, y + oy].join(","), fill: "#dde5ec", stroke: "#b5c2cd", "stroke-width": 1 }, g);
      RN.svg("polygon", { points: [x + wf, y, x + wf + ox, y + oy, x + wf + ox, y + wf + oy, x + wf, y + wf].join(","), fill: "#c9d5df", stroke: "#b5c2cd", "stroke-width": 1 }, g);
      for (let s = 1; s < nSl; s++) { const f = s / nSl; RN.svg("line", { x1: x + ox * f, y1: y + oy * f, x2: x + wf + ox * f, y2: y + oy * f, stroke: "#b5c2cd", "stroke-width": 0.6 }, g); RN.svg("line", { x1: x + wf + ox * f, y1: y + oy * f, x2: x + wf + ox * f, y2: y + wf + oy * f, stroke: "#b5c2cd", "stroke-width": 0.6 }, g); }
      return dibujo;
    }
    let R = null, cnnT = 1;
    // posiciones: entrada (IX, IY, 6 px/píxel), capa 1 (AX, AY, 8 px), capa 2 (BX, BY, 10 px), vector (VX, VY)
    const IX = 30, IY = 104, AX = 288, AY = 132, BX = 546, BY = 153, VX = 800, VY = 92;
    function construye(d) {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      E = calcula(d);
      const g = RN.svg("g", {}, svg);
      R = { in: [], f1: [], f2: [], v: [] };
      // entrada 28 × 28 × 1
      caja(g, IX, IY, 168, 7, 1);
      for (let k = 0; k < 784; k++) R.in.push(RN.svg("rect", { x: IX + (k % 28) * 6, y: IY + Math.floor(k / 28) * 6, width: 6.3, height: 6.3, fill: gris(E.x[k]) }, g));
      RN.svg("rect", { x: IX, y: IY, width: 168, height: 168, fill: "none", stroke: "#9fb0bf" }, g);
      // capa 1: 14 × 14 × 16
      caja(g, AX, AY, 112, 72, 16);
      for (let k = 0; k < 196; k++) R.f1.push(RN.svg("rect", { x: AX + (k % 14) * 8, y: AY + Math.floor(k / 14) * 8, width: 8.3, height: 8.3, fill: gris(E.f1[k]) }, g));
      RN.svg("rect", { x: AX, y: AY, width: 112, height: 112, fill: "none", stroke: "#9fb0bf" }, g);
      // capa 2: 7 × 7 × 32
      caja(g, BX, BY, 70, 96, 32);
      for (let k = 0; k < 49; k++) R.f2.push(RN.svg("rect", { x: BX + (k % 7) * 10, y: BY + Math.floor(k / 7) * 10, width: 10.3, height: 10.3, fill: gris(E.f2[k]) }, g));
      RN.svg("rect", { x: BX, y: BY, width: 70, height: 70, fill: "none", stroke: "#9fb0bf" }, g);
      // vector
      for (let k = 0; k < 16; k++) R.v.push(RN.svg("rect", { x: VX, y: VY + k * 12.5, width: 30, height: 11, rx: 2, fill: RN.colorSeq(E.vec[k] * 0.9) }, g));
      sTxt(g, VX + 15, 300, "⋮", { tam: 16, color: C.ink2 });
      // flechas y operaciones
      const ops = [[IX + 180, AX - 8, "conv. 3×3", "pool 2×2"], [AX + 112 + 58, BX - 8, "conv. 3×3", "pool 2×2"], [BX + 70 + 75, VX - 10, "aplanar", "+ densa"]];
      ops.forEach((o) => {
        sFlecha(svg, g, "M" + o[0] + ",188 L" + o[1] + ",188", C.ink2);
        sTxt(g, (o[0] + o[1]) / 2, 176, o[2], { tam: 12.5, peso: 600 });
        sTxt(g, (o[0] + o[1]) / 2, 208, o[3], { tam: 12.5, peso: 600 });
      });
      [[IX + 86, "Entrada", "28 × 28 × 1", "784 valores"], [AX + 56 + 25, "Capa conv. 1", "14 × 14 × 16", "3.136 valores"], [BX + 35 + 34, "Capa conv. 2", "7 × 7 × 32", "1.568 valores"], [VX + 15, "Representación", "vector denso", "p. ej. 64 valores"]].forEach((t) => {
        sTxt(g, t[0], 34, t[1], { tam: 14, peso: 800, color: C.ink });
        sTxt(g, t[0], 330, t[2], { tam: 14, peso: 700, color: C.ink });
        sTxt(g, t[0], 350, t[3], { tam: 12.5, peso: 500, color: C.ink2 });
      });
      R.ven = RN.svg("rect", { x: 0, y: 0, width: 0, height: 0, fill: "none", stroke: ACENTO, "stroke-width": 2.5, opacity: 0 }, svg);
      R.sal = RN.svg("rect", { x: 0, y: 0, width: 0, height: 0, fill: "none", stroke: ACENTO, "stroke-width": 2.5, opacity: 0 }, svg);
      R.l1 = RN.svg("line", { stroke: ACENTO, "stroke-width": 1.2, opacity: 0, "stroke-dasharray": "3 3" }, svg);
      R.l2 = RN.svg("line", { stroke: ACENTO, "stroke-width": 1.2, opacity: 0, "stroke-dasharray": "3 3" }, svg);
      revela(1);
    }
    function marco(el, x, y, w, h) { el.setAttribute("x", x); el.setAttribute("y", y); el.setAttribute("width", w); el.setAttribute("height", h); el.setAttribute("opacity", 1); }
    function linea(el, x1, y1, x2, y2) { el.setAttribute("x1", x1); el.setAttribute("y1", y1); el.setAttribute("x2", x2); el.setAttribute("y2", y2); el.setAttribute("opacity", 0.9); }
    // ventana que lee la capa anterior (convolución 3 × 3 + pooling 2 × 2 ≈ bloque de 4 × 4), recortada al borde
    function ventana(x0, y0, px, n, i, j, xs, ys, ps) {
      const a = Math.max(0, 2 * i - 1), b = Math.min(n - 1, 2 * i + 2), c = Math.max(0, 2 * j - 1), e = Math.min(n - 1, 2 * j + 2);
      marco(R.ven, x0 + c * px, y0 + a * px, (e - c + 1) * px, (b - a + 1) * px);
      marco(R.sal, xs + j * ps, ys + i * ps, ps, ps);
      linea(R.l1, x0 + (e + 1) * px, y0 + a * px, xs + j * ps, ys + i * ps);
      linea(R.l2, x0 + (e + 1) * px, y0 + (b + 1) * px, xs + j * ps, ys + (i + 1) * ps);
    }
    function revela(p) {
      cnnT = p;
      const pA = RN.limita(p / 0.45, 0, 1), pB = RN.limita((p - 0.45) / 0.35, 0, 1), pC = RN.limita((p - 0.8) / 0.15, 0, 1);
      const n1 = Math.floor(pA * 196), n2 = Math.floor(pB * 49), n3 = Math.floor(pC * 16);
      R.f1.forEach((r, k) => r.setAttribute("fill", k < n1 || p >= 1 ? gris(E.f1[k]) : VAC));
      R.f2.forEach((r, k) => r.setAttribute("fill", k < n2 || p >= 1 ? gris(E.f2[k]) : VAC));
      R.v.forEach((r, k) => r.setAttribute("fill", k < n3 || p >= 1 ? RN.colorSeq(E.vec[k] * 0.9) : VAC));
      [R.ven, R.sal, R.l1, R.l2].forEach((e) => e.setAttribute("opacity", 0));
      if (p >= 1) return;
      if (pA < 1) { const k = Math.min(195, n1); ventana(IX, IY, 6, 28, Math.floor(k / 14), k % 14, AX, AY, 8); }
      else if (pB < 1) { const k = Math.min(48, n2); ventana(AX, AY, 8, 14, Math.floor(k / 7), k % 7, BX, BY, 10); }
      else if (pC < 1) { marco(R.ven, BX, BY, 70, 70); marco(R.sal, VX, VY + Math.min(15, n3) * 12.5, 30, 11); }
    }
    let cnnCorre = false;
    const bc = $("c-play");
    bc.addEventListener("click", async () => {
      if (cnnCorre) return;
      cnnCorre = true; bc.disabled = true;
      await RN.tween(lento ? 0 : 9000, (t) => revela(t), (t) => t);
      revela(1); cnnCorre = false; bc.disabled = false;
    });
    seg("c-dig", (v) => { construye(v); });
    construye("7");

    // ---------------- RNN
    const ns = $("n-svg");
    ns.setAttribute("viewBox", "0 0 960 336"); ns.setAttribute("role", "img");
    const FRASES = [["qué", "buena", "película"], ["la", "película", "empieza", "lenta", "pero", "el", "final", "es", "muy", "bueno"]];
    const D = 8, rw = RN.rng(42);
    const Wh = [], Wx = [];
    for (let i = 0; i < D; i++) { Wh.push([]); Wx.push([]); for (let j = 0; j < D; j++) { Wh[i].push(RN.normal(rw) * 0.45); Wx[i].push(RN.normal(rw) * 0.75); } }
    function emb(w) { let hsh = 0; for (const ch of w) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0; const r = RN.rng(hsh + 1); return Array.from({ length: D }, () => RN.normal(r) * 0.9); }
    function estados(fr) { const H = [new Array(D).fill(0)]; fr.forEach((w) => { const x = emb(w), h = H[H.length - 1]; H.push(Wh.map((f, i) => Math.tanh(f.reduce((s, v, j) => s + v * h[j], 0) + Wx[i].reduce((s, v, j) => s + v * x[j], 0)))); }); return H; }
    let NR = null, frase = 0, paso = 0;
    function construyeN() {
      while (ns.firstChild) ns.removeChild(ns.firstChild);
      const fr = FRASES[frase], n = fr.length, H = estados(fr);
      const sp = Math.min(118, 700 / n), x0 = 150;
      NR = { chips: [], celdas: [], cols: [], fl: [], H: H, n: n, fin: [] };
      // h0
      sTxt(ns, 52, 140, "h₀", { tam: 14, peso: 700, color: C.ink });
      for (let i = 0; i < D; i++) RN.svg("rect", { x: 44, y: 150 + i * 10, width: 16, height: 9, rx: 1.5, fill: "#e4e7eb" }, ns);
      fr.forEach((w, t) => {
        const x = x0 + t * sp;
        const chip = RN.svg("g", {}, ns);
        const wch = Math.min(sp - 8, Math.max(46, w.length * 8.6 + 16));
        const rc = RN.svg("rect", { x: x - wch / 2, y: 22, width: wch, height: 28, rx: 14, fill: "#fff", stroke: "#c3cdd6", "stroke-width": 1.5 }, chip);
        const tt = sTxt(chip, x, 41, w, { tam: n > 6 ? 12.5 : 14, peso: 700, color: C.ink });
        NR.chips.push({ r: rc, t: tt });
        const f = sFlecha(ns, ns, "M" + x + ",52 L" + x + ",92", "#9aa5b1", { ancho: 1.6 });
        const cel = RN.svg("rect", { x: x - 27, y: 96, width: 54, height: 40, rx: 9, fill: ACENTO_L, stroke: ACENTO, "stroke-width": 1.8 }, ns);
        sTxt(ns, x, 121, "RNN", { tam: 13, peso: 800, color: "#00695C" });
        const prev = t === 0 ? 62 : x - sp + 27;
        const fh = sFlecha(ns, ns, "M" + (prev + 2) + "," + (t === 0 ? 160 : 116) + (t === 0 ? " C" + (x - 50) + ",160 " + (x - 50) + ",116 " + (x - 30) + ",116" : " L" + (x - 30) + ",116"), "#9aa5b1", { ancho: 1.6 });
        const col = [];
        for (let i = 0; i < D; i++) col.push(RN.svg("rect", { x: x - 8, y: 150 + i * 10, width: 16, height: 9, rx: 1.5, fill: "#e4e7eb" }, ns));
        sTxt(ns, x, 246, "h" + String(t + 1).split("").map((c) => "₀₁₂₃₄₅₆₇₈₉"[+c]).join(""), { tam: 12.5, peso: 600, color: C.ink2 });
        NR.celdas.push(cel); NR.cols.push(col); NR.fl.push(f, fh);
      });
      // resumen final
      const xf = 880, xl = x0 + (n - 1) * sp;
      sFlecha(ns, ns, "M" + (xl + 28) + ",116 C" + (xl + 90) + ",116 " + (xf - 70) + ",190 " + (xf - 30) + ",190", ACENTO, { ancho: 2 });
      RN.svg("rect", { x: xf - 22, y: 120, width: 44, height: 8 * 17 + 10, rx: 8, fill: "#fff", stroke: ACENTO, "stroke-width": 2 }, ns);
      for (let i = 0; i < D; i++) NR.fin.push(RN.svg("rect", { x: xf - 14, y: 126 + i * 17, width: 28, height: 15, rx: 2, fill: "#e4e7eb" }, ns));
      sTxt(ns, xf, 104, "resumen final", { tam: 13, peso: 800, color: "#00695C" });
      sTxt(ns, xf, 288, "8 números", { tam: 13, peso: 700, color: C.ink });
      sTxt(ns, xf, 306, "(siempre)", { tam: 12, peso: 500, color: C.ink2 });
      sTxt(ns, (x0 + xl) / 2, 290, n + " palabras leídas una a una → el estado oculto se actualiza en cada paso", { tam: 13, peso: 600, color: C.ink2 });
      ponPaso(n);
    }
    function ponPaso(p) {
      paso = p;
      const n = NR.n;
      NR.chips.forEach((c, t) => { const act = t === p - 1 && p < n + 1; c.r.setAttribute("fill", act ? ACENTO : t < p ? "#fff" : "#f3f5f7"); c.t.setAttribute("fill", act ? "#fff" : t < p ? C.ink : C.muted); });
      NR.celdas.forEach((c, t) => c.setAttribute("stroke-width", t === p - 1 ? 3.2 : 1.8));
      NR.cols.forEach((col, t) => col.forEach((r, i) => r.setAttribute("fill", t < p ? RN.colorPeso(NR.H[t + 1][i], 1) : "#e4e7eb")));
      NR.fin.forEach((r, i) => r.setAttribute("fill", p >= n ? RN.colorPeso(NR.H[n][i], 1) : "#e4e7eb"));
    }
    const animN = RN.anima(function (dt) {
      acN += dt;
      if (acN > (lento ? 0.05 : 0.8)) { acN = 0; ponPaso(paso + 1); }
      if (paso >= NR.n) return false;
    }, ns);
    let acN = 0;
    RN.botonPlay($("n-play"), animN, ["▶ Leer", "⏸ Pausa"]);
    animN.onCambio = ((prev) => (on) => { if (on && paso >= NR.n) { ponPaso(0); acN = 0.6; } if (prev) prev(on); })(animN.onCambio);
    $("n-paso").addEventListener("click", () => { animN.parar(); ponPaso(paso >= NR.n ? 1 : paso + 1); });
    seg("n-frase", (v) => { animN.parar(); frase = +v; construyeN(); });
    construyeN();
  })();

  // ================================================================== 7 · GENERATIVAS
  (function () {
    // ---------------- GAN 1D simplificada (cálculo real)
    const svg = $("g-svg");
    svg.setAttribute("viewBox", "0 0 960 210"); svg.setAttribute("role", "img");
    const MU = 1.5, SD = 0.6, ESC = 4, B = 64;
    const CFG = { bien: { KD: 5, lrD: 0.1, lrG: 0.02, b1: 0 }, mal: { KD: 1, lrD: 0.05, lrG: 0.01, b1: 0.5 } };
    const G = { cfg: "bien" };
    const sig = (z) => 1 / (1 + Math.exp(-z));
    const D = (x) => { const u = x / ESC; return sig(G.d.a * u * u + G.d.b * u + G.d.c); };
    function adam(P, Gr, A, lr, b1) {
      A.t++;
      for (const k in Gr) {
        A.m[k] = b1 * (A.m[k] || 0) + (1 - b1) * Gr[k];
        A.v[k] = 0.999 * (A.v[k] || 0) + 0.001 * Gr[k] * Gr[k];
        const mh = A.m[k] / (b1 ? 1 - Math.pow(b1, A.t) : 1), vh = A.v[k] / (1 - Math.pow(0.999, A.t));
        P[k] -= lr * mh / (Math.sqrt(vh) + 1e-8);
      }
    }
    function reset() {
      G.r = RN.rng(3); G.g = { mu: -2.5, ls: 0 }; G.d = { a: 0, b: 0, c: 0 };
      G.AD = { m: {}, v: {}, t: 0 }; G.AG = { m: {}, v: {}, t: 0 }; G.it = 0;
      const rr = RN.rng(8); G.zr = []; G.xr = [];
      for (let k = 0; k < 36; k++) { G.zr.push(RN.normal(rr)); G.xr.push(MU + SD * RN.normal(rr)); }
      G.ymax = 0.8;
    }
    function iter() {
      const P = CFG[G.cfg], r = G.r;
      for (let kd = 0; kd < P.KD; kd++) {
        let ga = 0, gb = 0, gc = 0;
        for (let k = 0; k < B; k++) {
          const xr = MU + SD * RN.normal(r), u = xr / ESC, p = D(xr);
          ga -= (1 - p) * u * u; gb -= (1 - p) * u; gc -= (1 - p);
          const xf = G.g.mu + Math.exp(G.g.ls) * RN.normal(r), v = xf / ESC, q = D(xf);
          ga += q * v * v; gb += q * v; gc += q;
        }
        adam(G.d, { a: ga / B, b: gb / B, c: gc / B }, G.AD, P.lrD, P.b1);
      }
      let gm = 0, gs = 0;
      for (let k = 0; k < B; k++) {
        const z = RN.normal(r), s = Math.exp(G.g.ls), x = G.g.mu + s * z, u = x / ESC, p = D(x);
        const dx = -(1 - p) * (2 * G.d.a * u + G.d.b) / ESC;
        gm += dx; gs += dx * z * s;
      }
      adam(G.g, { mu: gm / B, ls: gs / B }, G.AG, P.lrG, P.b1);
      G.g.ls = RN.limita(G.g.ls, -4, 1.5);
      G.it++;
    }
    const pdf = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(TAU));
    const XS = []; for (let x = -5; x <= 5.0001; x += 0.05) XS.push(x);
    const gDen = RN.grafica($("g-dens"), {
      alto: 250, x: { min: -5, max: 5, titulo: "valor x" }, y: { min: 0, max: 0.8, titulo: "densidad" },
      extras: (ctx, g) => {
        const s = Math.exp(G.g.ls), yb = g.h - g.m.b;
        G.xr.forEach((x) => { const X = g.sx(x); ctx.strokeStyle = C.s1; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X, yb - 2); ctx.lineTo(X, yb - 11); ctx.stroke(); });
        G.zr.forEach((z) => { const X = g.sx(G.g.mu + s * z); if (X < g.m.l || X > g.w - g.m.r) return; ctx.strokeStyle = C.s2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X, yb - 13); ctx.lineTo(X, yb - 22); ctx.stroke(); });
      }
    });
    const gDis = RN.grafica($("g-disc"), { alto: 250, x: { min: -5, max: 5, titulo: "valor x" }, y: { min: 0, max: 1, titulo: "D(x)" } });
    function pinta() {
      const s = Math.exp(G.g.ls), pico = 1 / (s * Math.sqrt(TAU));
      const obj = RN.limita(Math.max(0.8, pico * 1.12), 0.8, 5);
      G.ymax += (obj - G.ymax) * 0.15;
      gDen.op.y.max = G.ymax;
      gDen.dibujar([
        { nombre: "datos reales", color: C.s1, tipo: "area", alfa: 0.16, puntos: XS.map((x) => [x, pdf(x, MU, SD)]) },
        { nombre: "generados", color: C.s2, tipo: "area", alfa: 0.16, puntos: XS.map((x) => [x, pdf(x, G.g.mu, s)]) }
      ]);
      gDis.dibujar([
        { nombre: "0,5", color: C.muted, discontinua: true, ancho: 1.5, puntos: [[-5, 0.5], [5, 0.5]], hover: false },
        { nombre: "D(x)", color: C.s3, ancho: 2.5, puntos: XS.map((x) => [x, D(x)]) }
      ]);
      $("g-it").textContent = RN.fmtN(G.it);
      $("g-par").textContent = RN.fmt(G.g.mu, 2) + " · " + RN.fmt(s, 2);
    }
    // diagrama del bucle
    const fl = [];
    sCaja(svg, 22, 108, 112, 48, "Ruido z", "aleatorio");
    sCaja(svg, 190, 108, 136, 48, "Generador G", null, { fill: RN.mezcla("#ffffff", C.s2, 0.14), stroke: C.s2 });
    sCaja(svg, 360, 20, 136, 46, "Datos reales", null, { fill: RN.mezcla("#ffffff", C.s1, 0.12), stroke: C.s1 });
    sCaja(svg, 548, 66, 152, 52, "Discriminador D", null, { fill: RN.mezcla("#ffffff", C.s3, 0.14), stroke: C.s3 });
    sCaja(svg, 766, 69, 164, 46, "¿Real o falsa?", null);
    fl.push(sFlecha(svg, svg, "M136,132 L184,132", C.ink2));
    fl.push(sFlecha(svg, svg, "M328,132 C430,132 470,104 542,100", C.s2, { ancho: 2.4 }));
    fl.push(sFlecha(svg, svg, "M498,43 C520,43 525,76 542,80", C.s1, { ancho: 2.4 }));
    fl.push(sFlecha(svg, svg, "M702,92 L760,92", C.ink2));
    fl.push(sFlecha(svg, svg, "M848,117 C848,186 258,190 258,162", C.s2, { ancho: 1.8, discont: "6 5" }));
    fl.push(sFlecha(svg, svg, "M848,67 C848,10 624,8 624,60", C.s3, { ancho: 1.8, discont: "6 5" }));
    sTxt(svg, 404, 150, "muestras falsas", { tam: 12, peso: 600, color: "#b34a1d", halo: "#fff" });
    sTxt(svg, 736, 50, "D aprende a distinguir", { tam: 12.5, peso: 700, color: "#0f7a55", halo: "#fff" });
    sTxt(svg, 560, 202, "G aprende a engañar a D", { tam: 12.5, peso: 700, color: "#b34a1d", halo: "#fff" });
    function flujo(on) { fl.forEach((f) => { f.classList.toggle("fluye", on); if (!on) f.removeAttribute("class"); }); }
    const MAX = 1500;
    const anim = RN.anima(function () {
      for (let k = 0; k < (lento ? 20 : 2) && G.it < MAX; k++) iter();
      pinta();
      if (G.it >= MAX) return false;
    }, $("g-dens"));
    anim.onCambio = (on) => { if (on && G.it >= MAX) reset(); flujo(on); };
    RN.botonPlay($("g-play"), anim, ["▶ Entrenar", "⏸ Pausa"]);
    $("g-reset").addEventListener("click", () => { anim.parar(); reset(); pinta(); });
    seg("g-cfg", (v) => { anim.parar(); G.cfg = v; reset(); pinta(); });
    reset();
    RN.alCambiarTam($("g-dens"), pinta);
    cuandoSeMuestre("p-gen", pinta);

    // ---------------- punto frente a distribución
    const ps = $("pb-svg");
    ps.setAttribute("viewBox", "0 0 960 340"); ps.setAttribute("role", "img");
    const PAN = [{ x: 210, t: "Autoencoder: un punto por dato" }, { x: 590, t: "Red probabilística: una gaussiana por dato" }];
    const PW = 350, PH = 262, PY = 48;
    const GR = [{ c: [0.24, 0.3], col: SERIE[0], n: "líneas horizontales" }, { c: [0.66, 0.3], col: SERIE[3], n: "cuadrados" }, { c: [0.5, 0.74], col: SERIE[4], n: "círculos" }];
    const rp = RN.rng(6), PTb = [];
    GR.forEach((g, k) => { for (let i = 0; i < 8; i++) PTb.push({ x: g.c[0] + RN.normal(rp) * 0.055, y: g.c[1] + RN.normal(rp) * 0.055, k: k }); });
    const px = (p, u) => PAN[p].x + u * PW, py = (v) => PY + v * PH;
    PAN.forEach((p) => {
      RN.svg("rect", { x: p.x, y: PY, width: PW, height: PH, rx: 10, fill: "#fff", stroke: "#dfe3e8" }, ps);
      sTxt(ps, p.x + PW / 2, 32, p.t, { tam: 14, peso: 800, color: C.ink });
    });
    GR.forEach((g) => sTxt(ps, px(0, g.c[0]), py(g.c[1]) + (g.c[1] > 0.5 ? 42 : -32), g.n, { tam: 12, peso: 600, color: C.ink2, halo: "#fff" }));
    PTb.forEach((p) => RN.svg("circle", { cx: px(0, p.x), cy: py(p.y), r: 5, fill: GR[p.k].col, stroke: "#fff", "stroke-width": 1.2 }, ps));
    PTb.forEach((p) => {
      RN.svg("ellipse", { cx: px(1, p.x), cy: py(p.y), rx: 11, ry: 11, fill: RN.rgba(GR[p.k].col, 0.13), stroke: RN.rgba(GR[p.k].col, 0.6), "stroke-width": 1 }, ps);
      RN.svg("circle", { cx: px(1, p.x), cy: py(p.y), r: 2.4, fill: GR[p.k].col }, ps);
    });
    // los tres datos de ejemplo
    const rr = RN.rng(31), cuad = forma(3, RN.rng(2));
    const ruid = cuad.map((v) => RN.limita(v + RN.normal(rr) * 0.3, 0, 1));
    const inc = cuad.map((v, k) => k >= 40 ? 0.08 : v);
    const EJ = [
      { img: cuad, mu: [0.66, 0.29], sx: 0.035, sy: 0.035, rot: 0, n: "cuadrado limpio: σ pequeña" },
      { img: ruid, mu: [0.64, 0.33], sx: 0.1, sy: 0.085, rot: 0, n: "con ruido: σ grande" },
      { img: inc, mu: [0.46, 0.3], sx: 0.22, sy: 0.05, rot: 0, n: "incompleto: ¿línea o cuadrado?" }
    ];
    const gEj = RN.svg("g", {}, ps);
    const gSam = RN.svg("g", {}, ps);
    let ej = 0, muestras = [];
    const sImgEj = sImg(ps, cuad, 20, 128, 120);
    sTxt(ps, 80, 112, "Dato de entrada", { tam: 13, peso: 700, color: C.ink });
    const tEj = sTxt(ps, 80, 272, "", { tam: 12, peso: 600, color: C.ink2 });
    sFlecha(ps, ps, "M146,188 L200,188", C.ink2);
    function dibujaEj() {
      while (gEj.firstChild) gEj.removeChild(gEj.firstChild);
      const e = EJ[ej];
      sImgEj.poner(e.img);
      tEj.textContent = ["limpio", "con ruido", "incompleto"][ej];
      RN.svg("circle", { cx: px(0, e.mu[0]), cy: py(e.mu[1]), r: 8, fill: C.ink, stroke: "#fff", "stroke-width": 2.5 }, gEj);
      const cx = px(1, e.mu[0]), cy = py(e.mu[1]);
      [2, 1].forEach((k) => RN.svg("ellipse", { cx: cx, cy: cy, rx: e.sx * PW * k, ry: e.sy * PH * k, fill: RN.rgba(C.ink, 0.06), stroke: C.ink, "stroke-width": 1.6, "stroke-dasharray": k === 2 ? "5 4" : "none" }, gEj));
      RN.svg("circle", { cx: cx, cy: cy, r: 4.5, fill: C.ink }, gEj);
      sTxt(gEj, PAN[1].x + PW / 2, PY + PH - 14, e.n, { tam: 13, peso: 700, color: C.ink, halo: "#fff" });
      sTxt(gEj, cx + 8, cy - 8, "μ", { tam: 13, peso: 700, color: C.ink, al: "start", halo: "#fff" });
      muestras = [];
      while (gSam.firstChild) gSam.removeChild(gSam.firstChild);
      if (lento) for (let k = 0; k < 24; k++) nueva(1);
    }
    function nueva(vida) {
      const e = EJ[ej], r = Math.random;
      const u = Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(TAU * r()), v = Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(TAU * r());
      const c = RN.svg("circle", { cx: px(1, e.mu[0] + u * e.sx), cy: py(e.mu[1] + v * e.sy), r: 3.2, fill: C.ink, opacity: 0 }, gSam);
      muestras.push({ c: c, t: vida || 0 });
    }
    let acS = 0;
    const animS = RN.anima(function (dt) {
      acS += dt;
      if (acS > 0.09) { acS = 0; nueva(); }
      muestras.forEach((m) => { m.t += dt / 2.2; m.c.setAttribute("opacity", (m.t < 0.15 ? m.t / 0.15 : 1 - (m.t - 0.15) / 0.85) * 0.75); });
      muestras = muestras.filter((m) => { if (m.t >= 1) { m.c.remove(); return false; } return true; });
    }, ps);
    sTxt(ps, 210 + PW / 2, 330, "cada dato → un punto fijo", { tam: 12.5, peso: 500, color: C.ink2 });
    sTxt(ps, 590 + PW / 2, 330, "cada dato → μ y σ (puntos negros: muestras de la gaussiana)", { tam: 12.5, peso: 500, color: C.ink2 });
    seg("pb-dato", (v) => { ej = +v; dibujaEj(); });
    dibujaEj();
    if (!lento) animS.iniciar();
  })();

  // ================================================================== 8 · CASOS DE USO
  (function () {
    // ---------------- detección de anomalías en señales de vibración
    const N = 32;
    function senal(tipo, r) {
      const f = 1.6 + r() * 0.5, ph = r() * TAU, a = 0.55 + r() * 0.2, s = [];
      for (let i = 0; i < N; i++) s.push(a * Math.sin(TAU * f * (i / N) * 2 + ph) + 0.04 * RN.normal(r));
      if (tipo === 1) { const p = 4 + Math.floor(r() * 24), amp = (0.5 + r() * 0.6) * (r() < 0.5 ? 1 : -1); s[p] += amp; s[p + 1] += amp * 0.45; }
      else if (tipo === 2) { const b = 0.16 + r() * 0.22; for (let i = 0; i < N; i++) s[i] += b * Math.sin(TAU * f * (i / N) * 6 + ph * 1.3); }
      else if (tipo === 3) { const p = Math.floor(r() * 18), L = 6 + Math.floor(r() * 7), v = s[p]; for (let i = p; i < Math.min(N, p + L); i++) s[i] = v; }
      else if (tipo === 4) { const b = 0.08 + r() * 0.15; for (let i = 0; i < N; i++) s[i] += b * RN.normal(r); }
      return s;
    }
    const r = RN.rng(11), TR = [], TE = [], TT = [];
    for (let k = 0; k < 300; k++) TR.push(senal(0, r));
    for (let k = 0; k < 120; k++) { TE.push(senal(0, r)); TT.push(0); }
    for (let k = 0; k < 40; k++) { TE.push(senal(1 + (k % 4), r)); TT.push(1 + (k % 4)); }
    const POR = [0, 1, 2, 3, 4].map((t) => TT.map((v, i) => v === t ? i : -1).filter((i) => i >= 0));
    const A = { net: null, ep: 0, err: [], rec: [] }, MAXEP = 150;
    function nuevo() { A.net = new RNmlp.MLP({ capas: [N, 16, 4, 16, N], activacion: "tanh", salida: "lineal", perdida: "mse", semilla: 5 }); A.ep = 0; evalua(); }
    function evalua() {
      TE.forEach((x, k) => { const o = A.net.forward(x); let s = 0; for (let i = 0; i < N; i++) s += (o[i] - x[i]) ** 2; A.err[k] = s / N; A.rec[k] = o; });
    }
    const umb = $("an-umb");
    let tipo = 0, cur = [0, 0, 0, 0, 0];
    const sel = () => POR[tipo][cur[tipo] % POR[tipo].length];
    const gS = RN.grafica($("an-sen"), {
      alto: 250, x: { min: 0, max: N - 1, titulo: "tiempo (muestras)" }, y: { min: -1.6, max: 1.6, titulo: "amplitud" },
      extras: (ctx, g) => {
        const k = sel(), x = TE[k], o = A.rec[k];
        ctx.save(); ctx.beginPath(); ctx.rect(g.m.l, g.m.t, g.w - g.m.l - g.m.r, g.h - g.m.t - g.m.b); ctx.clip();
        ctx.fillStyle = RN.rgba(C.s2, 0.3);
        for (let i = 0; i < N - 1; i++) {
          ctx.beginPath(); ctx.moveTo(g.sx(i), g.sy(x[i])); ctx.lineTo(g.sx(i + 1), g.sy(x[i + 1])); ctx.lineTo(g.sx(i + 1), g.sy(o[i + 1])); ctx.lineTo(g.sx(i), g.sy(o[i])); ctx.closePath(); ctx.fill();
        }
        [[x, C.ink2], [o, C.s1]].forEach((s) => { ctx.strokeStyle = s[1]; ctx.lineWidth = 2.2; ctx.lineJoin = "round"; ctx.beginPath(); s[0].forEach((v, i) => { if (i) ctx.lineTo(g.sx(i), g.sy(v)); else ctx.moveTo(g.sx(i), g.sy(v)); }); ctx.stroke(); });
        ctx.restore();
      }
    });
    const LMIN = -3.6, LMAX = 0, BW = 0.1;
    const lg = (e) => RN.limita(Math.log10(Math.max(e, 1e-6)), LMIN + 0.001, LMAX - 0.001);
    const hcv = $("an-hist");
    const gH = RN.grafica(hcv, {
      alto: 300, hover: false,
      x: { min: LMIN, max: LMAX, titulo: "error de reconstrucción (escala logarítmica)", marcas: [-3, -2, -1, 0], fmt: (v) => RN.fmt(Math.pow(10, v), Math.max(0, -Math.round(v))) },
      y: { min: 0, max: 40, titulo: "número de señales" },
      extras: (ctx, g) => {
        const X = Math.round(g.sx(+umb.value)) + 0.5;
        ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(X, g.m.t); ctx.lineTo(X, g.h - g.m.b); ctx.stroke();
        txt(ctx, "umbral", X + 6, g.m.t + 13, { tam: 12.5, peso: 700, color: C.ink, halo: C.surface });
        txt(ctx, "normal ←", X - 6, g.m.t + 30, { tam: 12, al: "right", color: C.ink2, halo: C.surface });
        txt(ctx, "→ anomalía", X + 6, g.m.t + 30, { tam: 12, color: C.ink2, halo: C.surface });
      }
    });
    function pinta() {
      const nb = Math.round((LMAX - LMIN) / BW), cn = new Array(nb).fill(0), ca = new Array(nb).fill(0);
      A.err.forEach((e, k) => { const b = Math.min(nb - 1, Math.floor((lg(e) - LMIN) / BW)); (TT[k] ? ca : cn)[b]++; });
      const w = (hcv.clientWidth || 500) - 74, ab = Math.max(2, w * BW / (LMAX - LMIN) * 0.46);
      gH.op.y.max = Math.max(20, Math.ceil(Math.max.apply(null, cn.concat(ca)) * 1.2 / 5) * 5);
      gH.dibujar([
        { nombre: "normales", color: C.s1, tipo: "barras", anchoBarra: ab, puntos: cn.map((c, i) => [LMIN + (i + 0.5) * BW - BW * 0.24, c]).filter((p) => p[1] > 0) },
        { nombre: "anómalas", color: C.s2, tipo: "barras", anchoBarra: ab, puntos: ca.map((c, i) => [LMIN + (i + 0.5) * BW + BW * 0.24, c]).filter((p) => p[1] > 0) }
      ]);
      const k = sel(), x = TE[k];
      gS.dibujar([
        { nombre: "señal", color: C.ink2, puntos: x.map((v, i) => [i, v]) },
        { nombre: "reconstrucción", color: C.s1, puntos: A.rec[k].map((v, i) => [i, v]) }
      ]);
      const t = Math.pow(10, +umb.value);
      $("an-umbo").textContent = RN.fmt(t, t < 0.01 ? 4 : 3);
      let det = 0, fa = 0;
      A.err.forEach((e, i) => { if (e > t) { if (TT[i]) det++; else fa++; } });
      $("an-det").textContent = det + " de 40";
      $("an-fa").textContent = fa + " de 120";
      $("an-ep").textContent = A.ep;
      const e = A.err[k], marca = e > t, ok = marca === (TT[k] > 0);
      $("an-ver").innerHTML = "Error de esta señal: <b>" + RN.fmt(e, 4) + "</b> → " + (marca ? "supera el umbral: <b>anomalía</b>. " : "por debajo del umbral: <b>normal</b>. ") +
        (ok ? '<span class="ok-t">✓ acierto</span>' : '<span class="bad-t">✗ ' + (marca ? "falsa alarma" : "anomalía no detectada") + "</span>");
    }
    const anim = RN.anima(function () {
      for (let q = 0; q < (lento ? 10 : 1) && A.ep < MAXEP; q++) { A.net.entrenarEpoca(TR, TR, { lote: 16, lr: 0.005, opt: "adam" }); A.ep++; }
      evalua(); pinta();
      if (A.ep >= MAXEP) return false;
    }, hcv);
    anim.onCambio = (on) => { if (on && A.ep >= MAXEP) { nuevo(); } };
    RN.botonPlay($("an-play"), anim, ["▶ Entrenar con datos normales", "⏸ Pausa"]);
    $("an-reset").addEventListener("click", () => { anim.parar(); nuevo(); pinta(); });
    umb.addEventListener("input", pinta);
    seg("an-tipo", (v) => { tipo = +v; pinta(); });
    $("an-otro").addEventListener("click", () => { cur[tipo]++; pinta(); });
    nuevo();
    RN.alCambiarTam(hcv, pinta);
    cuandoSeMuestre("p-casos", pinta);

    // ---------------- eliminación de ruido
    const dcv = $("dn-cv"), dn = { net: null, ep: 0, r: null }, MAXD = 150;
    const rt = RN.rng(98), LIMPIAS = [];
    for (let k = 0; k < 100; k++) LIMPIAS.push(forma(k % 5, rt));
    const MOSTRAR = [0, 1, 2, 3, 4, 5, 6, 8];
    let ruidosas = [];
    const ruido = $("dn-ruido");
    function ensucia(x, nivel, r) { return x.map((v) => RN.limita(v + RN.normal(r) * nivel, 0, 1)); }
    function preparaRuido() { const r = RN.rng(55); ruidosas = LIMPIAS.map((x) => ensucia(x, +ruido.value, r)); }
    function dnNuevo() { dn.net = new RNmlp.MLP({ capas: [64, 32, 64], activacion: "tanh", salida: "sigmoid", perdida: "bce", semilla: 2 }); dn.ep = 0; dn.r = RN.rng(21); }
    const ecm = (A2, B2) => { let s = 0; A2.forEach((a, k) => { for (let i = 0; i < 64; i++) s += (a[i] - B2[k][i]) ** 2; }); return s / (A2.length * 64); };
    function dnPinta() {
      const L = RN.lienzo(dcv, (w) => { const c = Math.min(66, (w - 150 - 7 * 10) / 8); return Math.round(3 * c + 2 * 12 + 16); });
      const ctx = L.ctx, gap = 10, lab = 150, c = Math.min(66, (L.w - lab - 7 * gap - 8) / 8);
      const x0 = lab + Math.max(0, (L.w - lab - (8 * c + 7 * gap)) / 2 - 20);
      ctx.fillStyle = C.surface; ctx.fillRect(0, 0, L.w, L.h);
      const sal = MOSTRAR.map((k) => dn.net.forward(ruidosas[k]));
      [["Entrada con ruido", MOSTRAR.map((k) => ruidosas[k])], ["Salida de la red", sal], ["Original limpio", MOSTRAR.map((k) => LIMPIAS[k])]].forEach((f, i) => {
        const y = 8 + i * (c + 12);
        txt(ctx, f[0], 14, y + c / 2 + 4, { tam: 13, peso: 700, color: i === 1 ? "#00695C" : C.ink });
        f[1].forEach((im, j) => pintaImg(ctx, im, x0 + j * (c + gap), y, c));
      });
      $("dn-ep").textContent = dn.ep;
      $("dn-e1").textContent = RN.fmt(ecm(ruidosas, LIMPIAS), 4);
      $("dn-e2").textContent = RN.fmt(ecm(ruidosas.map((x) => dn.net.forward(x)), LIMPIAS), 4);
      $("dn-ruidoo").textContent = RN.fmt(+ruido.value, 2);
    }
    const animD = RN.anima(function () {
      for (let q = 0; q < (lento ? 6 : 1) && dn.ep < MAXD; q++) {
        const Xr = F.X.map((x) => ensucia(x, +ruido.value, dn.r));
        dn.net.entrenarEpoca(Xr, F.X, { lote: 16, lr: 0.01, opt: "adam" }); dn.ep++;
      }
      dnPinta();
      if (dn.ep >= MAXD) return false;
    }, dcv);
    animD.onCambio = (on) => { if (on && dn.ep >= MAXD) dnNuevo(); };
    RN.botonPlay($("dn-play"), animD, ["▶ Entrenar", "⏸ Pausa"]);
    $("dn-reset").addEventListener("click", () => { animD.parar(); dnNuevo(); dnPinta(); });
    ruido.addEventListener("input", () => { preparaRuido(); dnPinta(); });
    dnNuevo(); preparaRuido();
    RN.alCambiarTam(dcv, dnPinta);

    // ---------------- interpolación en el espacio latente (autoencoder de la pestaña 3)
    const icv = $("it-cv"), ilat = $("it-lat");
    const IT = { a: 0, b: 4 };
    const CANON = [0, 1, 2, 3, 4].map((t) => forma(t, () => 0.5));   // forma centrada y de tamaño medio
    function itPinta() {
      const XA = CANON[IT.a], XB = CANON[IT.b];
      const zA = AE.net.traza(XA).a[2], zB = AE.net.traza(XB).a[2];
      const n = 9, ts = Array.from({ length: n }, (_, k) => k / (n - 1));
      const zs = ts.map((t) => [zA[0] + (zB[0] - zA[0]) * t, zA[1] + (zB[1] - zA[1]) * t]);
      // imágenes
      const L = RN.lienzo(icv, (w) => { const c = Math.min(70, (w - 150 - 8 * 8) / 9); return Math.round(2 * c + 14 + 40); });
      const ctx = L.ctx, gap = 8, lab = 150, c = Math.min(70, (L.w - lab - 8 * gap - 6) / 9), x0 = lab;
      ctx.fillStyle = C.surface; ctx.fillRect(0, 0, L.w, L.h);
      const filas = [["Espacio latente", zs.map((z) => aeDecod(z))], ["Mezcla de píxeles", ts.map((t) => XA.map((v, i) => v * (1 - t) + XB[i] * t))]];
      filas.forEach((f, i) => {
        const y = 10 + i * (c + 14);
        txt(ctx, f[0], 12, y + c / 2 + 4, { tam: 13, peso: 700, color: i === 0 ? "#00695C" : C.ink });
        f[1].forEach((im, j) => pintaImg(ctx, im, x0 + j * (c + gap), y, c));
      });
      const yT = 10 + 2 * (c + 14) + 6;
      ts.forEach((t, j) => { if (j % 2 === 0) txt(ctx, "t = " + RN.fmt(t, t % 1 ? 2 : 0), x0 + j * (c + gap) + c / 2, yT + 6, { tam: 11.5, al: "center", color: C.muted }); });
      // espacio latente
      const M = RN.lienzo(ilat, (w) => Math.round(Math.min(w, 300)));
      const cx = M.ctx, pad = 14, S = Math.min(M.w, M.h) - 2 * pad, ox = (M.w - S) / 2, oy = (M.h - S) / 2;
      const X = (z) => ox + (z + 1.08) / 2.16 * S, Y = (z) => oy + (1.08 - z) / 2.16 * S;
      cx.fillStyle = C.surface; cx.fillRect(0, 0, M.w, M.h);
      cx.strokeStyle = C.grid; cx.lineWidth = 1; cx.strokeRect(Math.round(ox) + 0.5, Math.round(oy) + 0.5, Math.round(S), Math.round(S));
      cx.globalAlpha = 0.45;
      for (let k = 0; k < F.X.length; k++) { cx.beginPath(); cx.arc(X(AE.Z[k][0]), Y(AE.Z[k][1]), 2.8, 0, TAU); cx.fillStyle = SERIE[F.y[k]]; cx.fill(); }
      cx.globalAlpha = 1;
      cx.strokeStyle = C.ink; cx.lineWidth = 1.8; cx.setLineDash([5, 4]);
      cx.beginPath(); cx.moveTo(X(zA[0]), Y(zA[1])); cx.lineTo(X(zB[0]), Y(zB[1])); cx.stroke(); cx.setLineDash([]);
      zs.forEach((z, k) => punto(cx, X(z[0]), Y(z[1]), k === 0 || k === n - 1 ? 7.5 : 4, k === 0 ? SERIE[IT.a] : k === n - 1 ? SERIE[IT.b] : C.ink, 1.8));
      txt(cx, "espacio latente (z₁, z₂)", ox + 6, oy + 15, { tam: 11.5, color: C.ink2, halo: C.surface });
      $("it-estado").innerHTML = AE.ep === 0
        ? "El autoencoder de la pestaña 3 aún no está entrenado: su espacio latente todavía no significa nada. Pulsa <b>«Entrenar el autoencoder»</b>."
        : "Autoencoder de la pestaña 3 · <b>época " + AE.ep + "</b> · error de reconstrucción " + RN.fmt(AE.ecm, 4) + ". Las imágenes de los extremos son las reconstrucciones de las dos imágenes elegidas.";
    }
    const animI = RN.anima(function () {
      for (let q = 0; q < (lento ? 6 : 1); q++) if (AE.ep < AE.meta) aeEpoca();
      itPinta();
      if (AE.ep >= AE.meta) return false;
    }, icv);
    animI.onCambio = (on) => { if (on && AE.ep >= AE.meta) AE.meta = Math.min(AE.ep + 300, 1500); };
    RN.botonPlay($("it-play"), animI, ["▶ Entrenar el autoencoder", "⏸ Pausa"]);
    seg("it-a", (v) => { IT.a = +v; itPinta(); });
    seg("it-b", (v) => { IT.b = +v; itPinta(); });
    RN.alCambiarTam(icv, itPinta);
    cuandoSeMuestre("p-casos", itPinta);
  })();

  // ================================================================== 9 · DESAFÍOS
  (function () {
    // 1 · coste y convergencia (curvas orientativas)
    const s1 = $("x-coste");
    const ejes = (s, x0, y0, x1, y1, tx, ty) => {
      sFlecha(s, s, "M" + x0 + "," + y0 + " L" + x1 + "," + y0, "#9aa5b1", { ancho: 1.4 });
      sFlecha(s, s, "M" + x0 + "," + y0 + " L" + x0 + "," + y1, "#9aa5b1", { ancho: 1.4 });
      sTxt(s, (x0 + x1) / 2, y0 + 20, tx, { tam: 12, peso: 600 });
      sTxt(s, x0 - 14, (y0 + y1) / 2, ty, { tam: 12, peso: 600, rot: -90 });
    };
    ejes(s1, 44, 150, 426, 16, "iteraciones", "pérdida");
    let dA = "", dB = "";
    const rg = RN.rng(5);
    for (let x = 0; x <= 360; x += 3) {
      const la = 0.1 + 0.85 * Math.exp(-x / 70), lb = 0.66 + 0.15 * Math.sin(x / 9) * (0.7 + 0.4 * Math.sin(x / 41)) + 0.035 * RN.normal(rg);
      dA += (x ? "L" : "M") + (50 + x) + "," + (146 - la * 112).toFixed(1);
      dB += (x ? "L" : "M") + (50 + x) + "," + (146 - lb * 112).toFixed(1);
    }
    RN.svg("path", { d: dA, fill: "none", stroke: C.s1, "stroke-width": 2.2 }, s1);
    RN.svg("path", { d: dB, fill: "none", stroke: C.s2, "stroke-width": 2 }, s1);
    sTxt(s1, 420, 117, "red supervisada: baja y se estabiliza", { al: "end", tam: 12.5, peso: 700, color: C.ink, halo: "#fff" });
    sTxt(s1, 420, 30, "GAN: oscila sin asentarse", { al: "end", tam: 12.5, peso: 700, color: C.ink, halo: "#fff" });
    sTxt(s1, 420, 172, "curvas orientativas", { al: "end", tam: 11, peso: 500, color: C.muted, estilo: "italic" });

    // 2 · caja negra
    const s2 = $("x-caja");
    sTxt(s2, 116, 22, "PCA: varianza explicada", { tam: 13.5, peso: 800, color: C.ink });
    [["CP1", 0.62], ["CP2", 0.21], ["CP3", 0.09]].forEach((c, k) => {
      const y = 42 + k * 34;
      sTxt(s2, 18, y + 15, c[0], { al: "start", tam: 12.5, peso: 700, color: C.ink });
      RN.svg("rect", { x: 54, y: y + 2, width: c[1] * 210, height: 18, rx: 3, fill: C.s1 }, s2);
      sTxt(s2, 60 + c[1] * 210, y + 15, RN.fmt(c[1] * 100, 0) + " %", { al: "start", tam: 12.5, peso: 700, color: C.ink2 });
    });
    sTxt(s2, 116, 158, "cada eje tiene un significado", { tam: 12, peso: 600, color: C.ink2 });
    sTxt(s2, 116, 174, "(porcentajes orientativos)", { tam: 11, peso: 500, color: C.muted, estilo: "italic" });
    RN.svg("line", { x1: 236, y1: 14, x2: 236, y2: 170, stroke: "#e4e7eb", "stroke-width": 1.5 }, s2);
    sTxt(s2, 336, 22, "Autoencoder", { tam: 13.5, peso: 800, color: C.ink });
    const rv = RN.rng(12);
    RN.svg("line", { x1: 250, y1: 98, x2: 426, y2: 98, stroke: "#9aa5b1", "stroke-width": 1 }, s2);
    for (let k = 0; k < 10; k++) {
      const v = RN.normal(rv) * 0.8, x = 254 + k * 17.5, h = Math.min(46, Math.abs(v) * 34 + 4);
      RN.svg("rect", { x: x, y: v >= 0 ? 98 - h : 98, width: 12, height: h, rx: 2, fill: v >= 0 ? C.pos : C.neg }, s2);
      sTxt(s2, x + 6, 44, "?", { tam: 13, peso: 800, color: C.ink2 });
      sTxt(s2, x + 6, 160, "z" + (k + 1 < 10 ? "₁₂₃₄₅₆₇₈₉".charAt(k) : "₁₀"), { tam: 10.5, peso: 600, color: C.ink2 });
    }
    sTxt(s2, 336, 175, "¿z₃ es el brillo o la forma?", { tam: 11.5, peso: 600, color: C.ink2 });

    // 3 · colapso de modo
    const s3 = $("x-colapso");
    const PAN = [[110, "bien ajustada"], [330, "colapso de modo"]];
    const modo = (c, k) => [c + Math.cos(k * TAU / 8) * 52, 92 + Math.sin(k * TAU / 8) * 52];
    const rc = RN.rng(3);
    PAN.forEach((p) => {
      sTxt(s3, p[0], 20, p[1], { tam: 13, peso: 800, color: C.ink });
      for (let k = 0; k < 8; k++) { const m = modo(p[0], k); for (let i = 0; i < 5; i++) RN.svg("circle", { cx: m[0] + RN.normal(rc) * 4, cy: m[1] + RN.normal(rc) * 4, r: 3, fill: "#b8c2cc" }, s3); }
    });
    for (let k = 0; k < 32; k++) { const m = modo(110, k % 8); RN.svg("circle", { cx: m[0] + RN.normal(rc) * 5, cy: m[1] + RN.normal(rc) * 5, r: 3.4, fill: C.s2, stroke: "#fff", "stroke-width": 0.8 }, s3); }
    const col = [];
    for (let k = 0; k < 32; k++) col.push({ c: RN.svg("circle", { r: 3.4, fill: C.s2, stroke: "#fff", "stroke-width": 0.8 }, s3), dx: RN.normal(rc) * 5, dy: RN.normal(rc) * 5 });
    sTxt(s3, 220, 170, "gris: datos reales (8 modos) · naranja: muestras del generador", { tam: 11.5, peso: 500, color: C.ink2 });
    let mAct = 0, mSig = 0, tc = 0;
    function ponCol(f) {
      const a = modo(330, mAct), b = modo(330, mSig), t = ease(f);
      col.forEach((q) => { q.c.setAttribute("cx", (a[0] + (b[0] - a[0]) * t + q.dx).toFixed(1)); q.c.setAttribute("cy", (a[1] + (b[1] - a[1]) * t + q.dy).toFixed(1)); });
    }
    ponCol(0);
    const animC = RN.anima(function (dt) {
      tc += dt;
      if (tc < 1.6) return;
      const f = Math.min(1, (tc - 1.6) / 0.7);
      ponCol(f);
      if (f >= 1) { mAct = mSig; tc = 0; }
      else if (mSig === mAct) mSig = (mAct + 3) % 8;
    }, s3);
    if (!lento) animC.iniciar();

    // 4 · generalización
    const s4 = $("x-gen");
    const real = (x) => 78 + 40 * Math.sin((x - 30) / 62);
    const XT = [40, 92, 144, 196, 248, 300, 352, 404];
    let dR = "", dL = "";
    for (let x = 30; x <= 420; x += 2) {
      dR += (x > 30 ? "L" : "M") + x + "," + real(x).toFixed(1);
      const k = Math.max(0, Math.min(XT.length - 2, Math.floor((x - 40) / 52)));
      const u = (x - XT[k]) / 52;
      const desv = (x < 40 || x > 404) ? 0 : 30 * Math.sin(Math.PI * u) * (k % 2 ? -1 : 1);
      dL += (x > 30 ? "L" : "M") + x + "," + (real(x) + desv).toFixed(1);
    }
    RN.svg("path", { d: dR, fill: "none", stroke: "#9aa5b1", "stroke-width": 2, "stroke-dasharray": "6 5" }, s4);
    RN.svg("path", { d: dL, fill: "none", stroke: C.s2, "stroke-width": 2.2 }, s4);
    XT.forEach((x) => RN.svg("circle", { cx: x, cy: real(x), r: 5.5, fill: C.s1, stroke: "#fff", "stroke-width": 1.5 }, s4));
    XT.slice(0, -1).forEach((x) => RN.svg("circle", { cx: x + 26, cy: real(x + 26), r: 5.5, fill: "#fff", stroke: C.s1, "stroke-width": 2 }, s4));
    // leyenda con las mismas marcas
    RN.svg("circle", { cx: 40, cy: 160, r: 5, fill: C.s1, stroke: "#fff", "stroke-width": 1.5 }, s4);
    sTxt(s4, 50, 164, "entrenamiento", { al: "start", tam: 12, peso: 600 });
    RN.svg("circle", { cx: 172, cy: 160, r: 5, fill: "#fff", stroke: C.s1, "stroke-width": 2 }, s4);
    sTxt(s4, 182, 164, "datos nuevos", { al: "start", tam: 12, peso: 600 });
    RN.svg("line", { x1: 30, y1: 180, x2: 50, y2: 180, stroke: C.s2, "stroke-width": 2.5 }, s4);
    sTxt(s4, 56, 184, "representación aprendida", { al: "start", tam: 12, peso: 600 });
    RN.svg("line", { x1: 222, y1: 180, x2: 242, y2: 180, stroke: "#9aa5b1", "stroke-width": 2, "stroke-dasharray": "5 4" }, s4);
    sTxt(s4, 248, 184, "estructura real de los datos", { al: "start", tam: 12, peso: 600 });

    // resumen
    const rs = $("x-resumen");
    rs.setAttribute("viewBox", "0 0 960 214"); rs.setAttribute("role", "img");
    const COLS = [160, 480, 800];
    // autoencoder
    RN.svg("polygon", { points: "100,38 156,68 156,92 100,122", fill: ACENTO_L, stroke: ACENTO_M, "stroke-width": 1.5 }, rs);
    RN.svg("polygon", { points: "164,68 220,38 220,122 164,92", fill: ACENTO_L, stroke: ACENTO_M, "stroke-width": 1.5 }, rs);
    RN.svg("rect", { x: 152, y: 64, width: 16, height: 32, rx: 4, fill: "#fff", stroke: ACENTO, "stroke-width": 2 }, rs);
    // SOM
    const rs2 = RN.rng(2);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      const t = (i + j) / 8, c = t < 0.5 ? RN.mezcla(C.s4, C.s3, t * 2) : RN.mezcla(C.s3, C.s7, (t - 0.5) * 2);
      RN.svg("rect", { x: 430 + j * 20 + rs2() * 0.1, y: 32 + i * 19, width: 18, height: 17, rx: 3, fill: c }, rs);
    }
    // GAN
    sCaja(rs, 712, 40, 64, 40, "G", null, { fill: RN.mezcla("#ffffff", C.s2, 0.14), stroke: C.s2, tam: 17 });
    sCaja(rs, 824, 40, 64, 40, "D", null, { fill: RN.mezcla("#ffffff", C.s3, 0.14), stroke: C.s3, tam: 17 });
    sFlecha(rs, rs, "M778,52 L818,52", C.ink2);
    sFlecha(rs, rs, "M856,84 C856,118 744,118 744,88", C.ink2, { discont: "5 4" });
    [["Autoencoders", "compresión inteligente", "agrupar por el código latente,", "anomalías, eliminar ruido"], ["SOM (Kohonen)", "proyección topológica", "visualizar datos complejos,", "detectar topologías, preprocesar"], ["GAN", "generación de datos", "aprender la distribución,", "generar muestras realistas"]].forEach((t, k) => {
      sTxt(rs, COLS[k], 150, t[0], { tam: 16, peso: 800, color: C.ink });
      sTxt(rs, COLS[k], 170, t[1], { tam: 13.5, peso: 700, color: "#00695C" });
      sTxt(rs, COLS[k], 190, t[2], { tam: 12.5, peso: 500, color: C.ink2 });
      sTxt(rs, COLS[k], 206, t[3], { tam: 12.5, peso: 500, color: C.ink2 });
    });
    [320, 640].forEach((x) => RN.svg("line", { x1: x, y1: 24, x2: x, y2: 200, stroke: "#e4e7eb", "stroke-width": 1.5 }, rs));
  })();
})();
