/* Redes Neuronales · Demos visuales — Laboratorio · I · La red neuronal como sistema (lab_empresa.html).
   Código propio de esa página (usa RN de comun.js y RNmlp de mlp.js). Organizado por pestañas. */
(function () {
  "use strict";
  const C = RN.color, S = RN.svg, $ = function (id) { return document.getElementById(id); };
  const ACC = "#E65100", ACC_L = "#FFF3E0", INK = C.ink, INK2 = C.ink2, MUT = C.muted;
  const SUAVE = "#F5F7FA", LINEA = "#E4E7EB";
  const RED = RN.reducirMovimiento;
  const fmt = RN.fmt;

  // ================================================================== utilidades
  function mil(n, d) { // número con punto de miles siempre y coma decimal
    if (!Number.isFinite(n)) return "—";
    d = d || 0;
    const s = Math.abs(n).toFixed(d).split(".");
    const e = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (n < 0 ? "−" : "") + e + (s[1] ? "," + s[1] : "");
  }
  function num(x, d) { return (x < 0 ? "−" : "") + fmt(Math.abs(x), d); }
  function pct(x, d) { return fmt(x * 100, d === undefined ? 1 : d) + " %"; }
  const SUP = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };
  function pot(e) { return "10" + String(e).split("").map(function (c) { return SUP[c] || c; }).join(""); }
  function pot10(v) { // etiqueta de 10^v para ejes logarítmicos
    const e = Math.round(v);
    if (Math.abs(v - e) > 1e-6) return fmt(Math.pow(10, v), 1);
    if (e >= -2 && e <= 5) return e < 0 ? fmt(Math.pow(10, e), -e) : mil(Math.pow(10, e));
    return pot(e);
  }
  function tiempo(s) {
    if (!Number.isFinite(s)) return "—";
    if (s >= 1) return fmt(s, s < 10 ? 2 : 1) + " s";
    if (s >= 1e-3) return fmt(s * 1e3, s * 1e3 < 10 ? 2 : 1) + " ms";
    if (s >= 1e-6) return fmt(s * 1e6, s * 1e6 < 10 ? 2 : 1) + " µs";
    return fmt(s * 1e9, 1) + " ns";
  }
  function bytesGB(gb) {
    if (gb >= 1000) return mil(gb / 1000, gb < 1e4 ? 1 : 0) + " TB";
    if (gb >= 1) return fmt(gb, gb < 10 ? 1 : 0) + " GB";
    if (gb >= 1e-3) return mil(gb * 1000) + " MB";
    return mil(gb * 1e6) + " kB";
  }
  function euros(e) {
    if (e >= 1e6) return fmt(e / 1e6, e < 1e7 ? 2 : 1) + " M€";
    if (e >= 100) return mil(e) + " €";
    if (e >= 1) return fmt(e, 2) + " €";
    if (e >= 0.01) return fmt(e, 3) + " €";
    return fmt(e, 4) + " €";
  }
  function params(n) { return n >= 1e12 ? fmt(n / 1e12, n < 1e13 ? 1 : 0) + " billones" : mil(n / 1e6) + " M"; }

  // ---- SVG
  function base(svg, w, h) {
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    svg.setAttribute("role", "img");
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    return svg;
  }
  function tx(p, x, y, s, o) {
    o = o || {};
    const a = { x: x, y: y, "font-size": o.fs || 14, fill: o.fill || INK };
    if (o.anchor) a["text-anchor"] = o.anchor;
    if (o.fw) a["font-weight"] = o.fw;
    if (o.base) a["dominant-baseline"] = o.base;
    if (o.op !== undefined) a.opacity = o.op;
    if (o.italic) a["font-style"] = "italic";
    if (o.ls) a["letter-spacing"] = o.ls;
    const t = S("text", a, p);
    if (Array.isArray(s)) s.forEach(function (l, k) { S("tspan", { x: x, dy: k ? (o.lh || 1.25) + "em" : 0, text: l }, t); });
    else t.textContent = s;
    return t;
  }
  function rc(p, x, y, w, h, o) {
    o = o || {};
    const a = { x: x, y: y, width: Math.max(0, w), height: Math.max(0, h), rx: o.rx === undefined ? 8 : o.rx, fill: o.fill || "#fff" };
    if (o.stroke) { a.stroke = o.stroke; a["stroke-width"] = o.sw || 1.5; }
    if (o.dash) a["stroke-dasharray"] = o.dash;
    if (o.op !== undefined) a.opacity = o.op;
    return S("rect", a, p);
  }
  function ln(p, x1, y1, x2, y2, o) {
    o = o || {};
    const a = { x1: x1, y1: y1, x2: x2, y2: y2, stroke: o.stroke || INK2, "stroke-width": o.sw || 1.5, "stroke-linecap": o.cap || "round" };
    if (o.dash) a["stroke-dasharray"] = o.dash;
    if (o.op !== undefined) a.opacity = o.op;
    if (o.marker) a["marker-end"] = o.marker;
    if (o.markerS) a["marker-start"] = o.markerS;
    return S("line", a, p);
  }
  function ci(p, cx, cy, r, o) {
    o = o || {};
    const a = { cx: cx, cy: cy, r: r, fill: o.fill || "#fff" };
    if (o.stroke) { a.stroke = o.stroke; a["stroke-width"] = o.sw || 1.5; }
    if (o.op !== undefined) a.opacity = o.op;
    if (o.dash) a["stroke-dasharray"] = o.dash;
    return S("circle", a, p);
  }
  function pa(p, d, o) {
    o = o || {};
    const a = { d: d, fill: o.fill || "none" };
    if (o.stroke) { a.stroke = o.stroke; a["stroke-width"] = o.sw || 1.5; a["stroke-linejoin"] = "round"; a["stroke-linecap"] = "round"; }
    if (o.dash) a["stroke-dasharray"] = o.dash;
    if (o.op !== undefined) a.opacity = o.op;
    if (o.marker) a["marker-end"] = o.marker;
    return S("path", a, p);
  }
  let nMarca = 0;
  function flecha(svg, color, tam) {
    const id = "lab-fl-" + (++nMarca);
    let defs = svg.querySelector("defs");
    if (!defs) defs = S("defs", {}, svg);
    const m = S("marker", { id: id, viewBox: "0 0 10 10", refX: 8.5, refY: 5, markerWidth: tam || 7, markerHeight: tam || 7, orient: "auto-start-reverse", markerUnits: "userSpaceOnUse" }, defs);
    m.setAttribute("markerWidth", tam || 10); m.setAttribute("markerHeight", tam || 10);
    S("path", { d: "M0,0 L10,5 L0,10 z", fill: color || INK2 }, m);
    return "url(#" + id + ")";
  }
  function poli(pts) { return pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }
  function puntoSVG(svg, ev) {
    const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  function marcaOK(p, x, y, r, ok) { // icono ✓ / ✕ con círculo de estado
    ci(p, x, y, r, { fill: ok ? C.ok : C.bad });
    if (ok) pa(p, "M" + (x - r * 0.45) + "," + y + " L" + (x - r * 0.1) + "," + (y + r * 0.38) + " L" + (x + r * 0.5) + "," + (y - r * 0.38), { stroke: "#fff", sw: Math.max(1.5, r * 0.28) });
    else { const k = r * 0.38; pa(p, "M" + (x - k) + "," + (y - k) + " L" + (x + k) + "," + (y + k) + " M" + (x + k) + "," + (y - k) + " L" + (x - k) + "," + (y + k), { stroke: "#fff", sw: Math.max(1.5, r * 0.28) }); }
  }

  // ---- controles
  function seg(id, cb) {
    const el = $(id);
    const bs = Array.from(el.querySelectorAll("button"));
    bs.forEach(function (b) {
      b.addEventListener("click", function () {
        bs.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        if (cb) cb(b.dataset.v, b);
      });
    });
    return function () { const b = bs.find(function (x) { return x.getAttribute("aria-pressed") === "true"; }) || bs[0]; return b.dataset.v; };
  }
  function ponerSeg(id, v) {
    Array.from($(id).querySelectorAll("button")).forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.v === String(v) ? "true" : "false"); });
  }
  function rango(id, fmtSalida, cb) {
    const i = $(id), o = $(id + "o");
    function f() { if (o) o.textContent = fmtSalida(+i.value); if (cb) cb(+i.value); }
    i.addEventListener("input", f);
    if (o) o.textContent = fmtSalida(+i.value);
    return i;
  }
  function ponerRango(i, v) { i.value = v; i.dispatchEvent(new Event("input")); }
  function kpis(el, lista) {
    el.innerHTML = lista.map(function (k) {
      return '<div class="kpi"><div class="t">' + k[0] + '</div><div class="v">' + k[1] + "</div>" + (k[2] ? '<div class="s">' + k[2] + "</div>" : "") + "</div>";
    }).join("");
  }
  function alMostrar(el, fn) { // ejecuta fn la primera vez que el elemento tiene tamaño (pestaña visible)
    let hecho = false;
    RN.alCambiarTam(el, function () { if (!hecho) { hecho = true; fn(); } });
  }
  function anima(paso, el) { // RN.anima con dt ≥ 0 (el primer fotograma puede dar un dt negativo)
    let t = 0;
    if (el && !(el instanceof HTMLElement)) el = el.closest("div, section") || el.parentElement;
    return RN.anima(function (dt) { dt = Math.max(0, dt); t += dt; return paso(dt, t); }, el);
  }
  function bucle(paso, el) { return anima(function (dt, t) { paso(dt, t); }, el); }
  // tinte de fondo para fronteras de decisión (clase 1 azul, clase 0 naranja)
  const TINTE0 = RN.mezcla("#ffffff", C.clase0, 0.38), TINTE1 = RN.mezcla("#ffffff", C.clase1, 0.38);
  function pintaFrontera(ctx, w, h, f, rango, n) {
    n = n || 60;
    const cw = w / n, chh = h / n;
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
      const x = -rango + 2 * rango * (a + 0.5) / n, y = rango - 2 * rango * (b + 0.5) / n;
      ctx.fillStyle = RN.mezcla(TINTE0, TINTE1, RN.limita(f(x, y), 0, 1));
      ctx.fillRect(a * cw, b * chh, cw + 1, chh + 1);
    }
  }
  function punto(ctx, x, y, r, col, hueco) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI);
    if (hueco) { ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = col; ctx.stroke(); }
    else { ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = "#fff"; ctx.stroke(); }
  }
  function textoC(ctx, s, x, y, o) {
    o = o || {};
    ctx.font = (o.fw || 400) + " " + (o.fs || 13) + "px system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
    ctx.fillStyle = o.fill || INK; ctx.textAlign = o.align || "left"; ctx.textBaseline = o.base || "alphabetic";
    ctx.fillText(s, x, y);
  }
  function rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function aspa(ctx, x, y, k) { ctx.beginPath(); ctx.moveTo(x - k, y - k); ctx.lineTo(x + k, y + k); ctx.moveTo(x + k, y - k); ctx.lineTo(x - k, y + k); ctx.stroke(); }

  // ================================================================== 1 · PROGRESO
  (function () {
    // ---------- caja isométrica: datos × cómputo × modelo
    const svg = $("l1-caja");
    const iD = rango("l1-d", function (v) { return "×" + fmt(v, 1); }, dibuja);
    const iC = rango("l1-c", function (v) { return "×" + fmt(v, 1); }, dibuja);
    const iM = rango("l1-m", function (v) { return "×" + fmt(v, 1); }, dibuja);
    const P0 = [330, 372], U = 16;
    function pt(a, b, c) { return [P0[0] + (a - b) * U * 0.866, P0[1] - (a + b) * U * 0.5 - c * U]; }
    function dibuja() {
      const a = +iD.value, b = +iC.value, c = +iM.value;
      base(svg, 1000, 400);
      // caja máxima de referencia
      const g0 = S("g", { opacity: 0.55 }, svg);
      [[pt(0, 0, 0), pt(10, 0, 0)], [pt(10, 0, 0), pt(10, 10, 0)], [pt(0, 0, 0), pt(0, 10, 0)], [pt(0, 10, 0), pt(10, 10, 0)],
       [pt(0, 0, 10), pt(10, 0, 10)], [pt(10, 0, 10), pt(10, 10, 10)], [pt(10, 10, 10), pt(0, 10, 10)], [pt(0, 10, 10), pt(0, 0, 10)],
       [pt(0, 0, 0), pt(0, 0, 10)], [pt(10, 0, 0), pt(10, 0, 10)], [pt(0, 10, 0), pt(0, 10, 10)], [pt(10, 10, 0), pt(10, 10, 10)]]
        .forEach(function (s) { ln(g0, s[0][0], s[0][1], s[1][0], s[1][1], { stroke: "#C3CFDC", sw: 1, dash: "4 4" }); });
      tx(svg, pt(10, 10, 10)[0], pt(10, 10, 10)[1] - 10, "máximo: ×10 × 10 × 10", { fs: 13, fill: MUT, anchor: "middle" });
      // caras visibles
      S("polygon", { points: poli([pt(0, 0, 0), pt(a, 0, 0), pt(a, 0, c), pt(0, 0, c)]), fill: "#DCE6F1", stroke: "#8FA6BF", "stroke-width": 1.5, "stroke-linejoin": "round" }, svg);
      S("polygon", { points: poli([pt(0, 0, 0), pt(0, b, 0), pt(0, b, c), pt(0, 0, c)]), fill: "#C6D4E4", stroke: "#8FA6BF", "stroke-width": 1.5, "stroke-linejoin": "round" }, svg);
      S("polygon", { points: poli([pt(0, 0, c), pt(a, 0, c), pt(a, b, c), pt(0, b, c)]), fill: "#EEF3F9", stroke: "#8FA6BF", "stroke-width": 1.5, "stroke-linejoin": "round" }, svg);
      // aristas con su ingrediente
      const e1 = [pt(0, 0, 0), pt(a, 0, 0)], e2 = [pt(0, 0, 0), pt(0, b, 0)], e3 = [pt(a, 0, 0), pt(a, 0, c)];
      ln(svg, e1[0][0], e1[0][1], e1[1][0], e1[1][1], { stroke: C.s1, sw: 6 });
      ln(svg, e2[0][0], e2[0][1], e2[1][0], e2[1][1], { stroke: C.s2, sw: 6 });
      ln(svg, e3[0][0], e3[0][1], e3[1][0], e3[1][1], { stroke: C.s3, sw: 6 });
      const m1 = [(e1[0][0] + e1[1][0]) / 2, (e1[0][1] + e1[1][1]) / 2], m2 = [(e2[0][0] + e2[1][0]) / 2, (e2[0][1] + e2[1][1]) / 2], m3 = [(e3[0][0] + e3[1][0]) / 2, (e3[0][1] + e3[1][1]) / 2];
      tx(svg, m1[0] + 12, m1[1] + 22, "Datos ×" + fmt(a, 1), { fs: 15, fw: 700 });
      tx(svg, m2[0] - 12, m2[1] + 22, "Cómputo ×" + fmt(b, 1), { fs: 15, fw: 700, anchor: "end" });
      tx(svg, m3[0] + 14, m3[1] + 5, "Modelo ×" + fmt(c, 1), { fs: 15, fw: 700 });
      // panel derecho
      const V = a * b * c;
      tx(svg, 620, 70, "Volumen = datos × cómputo × modelo", { fs: 17, fw: 700 });
      const t = tx(svg, 620, 128, "", { fs: 32, fw: 800 });
      [[fmt(a, 1), C.s1], [" × ", null], [fmt(b, 1), C.s2], [" × ", null], [fmt(c, 1), C.s3], [" = " + mil(V), null]].forEach(function (p) {
        const s = S("tspan", { text: p[0] }, t);
        if (p[1]) { s.setAttribute("text-decoration", "underline"); s.setAttribute("style", "text-decoration-color:" + p[1] + ";text-decoration-thickness:4px;text-underline-offset:6px"); }
      });
      rc(svg, 620, 158, 350, 22, { fill: SUAVE, stroke: LINEA, rx: 6 });
      rc(svg, 620, 158, Math.max(3, 350 * V / 1000), 22, { fill: ACC, rx: 6 });
      tx(svg, 620, 200, "volumen sobre el máximo (1.000)", { fs: 13, fill: MUT });
      const mn = Math.min(a, b, c), mx = Math.max(a, b, c);
      let msg;
      if (mx >= 6 && mn / mx < 0.45) msg = ["Una arista corta aplana la caja:", "el ingrediente que falta limita", "a los otros dos."];
      else if (mn >= 9) msg = ["Los tres a la vez: el volumen es", "×" + fmt(V / 64, 1) + " el del punto de partida (4 × 4 × 4)."];
      else msg = ["El volumen crece con el producto:", "duplicar las tres aristas multiplica", "la capacidad por ocho."];
      tx(svg, 620, 250, msg, { fs: 15, fill: INK2, lh: 1.35 });
    }
    function animaA(obj) {
      const ini = [+iD.value, +iC.value, +iM.value];
      return RN.tween(RED ? 0 : 1500, function (t) {
        iD.value = RN.lerp(ini[0], obj[0], t); iC.value = RN.lerp(ini[1], obj[1], t); iM.value = RN.lerp(ini[2], obj[2], t);
        $("l1-do").textContent = "×" + fmt(+iD.value, 1); $("l1-co").textContent = "×" + fmt(+iC.value, 1); $("l1-mo").textContent = "×" + fmt(+iM.value, 1);
        dibuja();
      });
    }
    $("l1-todos").addEventListener("click", function () { animaA([10, 10, 10]); });
    $("l1-solo").addEventListener("click", function () { animaA([4, 4, 10]); });
    $("l1-reset").addEventListener("click", function () { animaA([4, 4, 4]); });
    dibuja();

    // ---------- mito y realidad (gráfica de mariposa)
    const sm = $("l1-mito");
    base(sm, 1000, 400);
    const filas = [
      { t: "Precisión en el laboratorio", a: 96, b: 94, max: 100, f: function (v) { return v + " %"; }, nota: "más es mejor" },
      { t: "Coste por 1.000 inferencias", a: 4, b: 0.2, max: 4, f: function (v) { return fmt(v, 2) + " €"; }, nota: "menos es mejor", prod: true },
      { t: "Latencia (percentil 95)", a: 1800, b: 45, max: 1800, f: function (v) { return mil(v) + " ms"; }, nota: "menos es mejor", prod: true },
      { t: "Precisión durante 30 días", a: [96, 95.6, 94.6, 93, 90.8, 88.2], b: [94, 94, 93.9, 93.7, 93.6, 93.5], spark: true, nota: "¿se degrada?", prod: true }
    ];
    const XA = 385, XB = 615, LMAX = 320;
    tx(sm, 225, 30, "Modelo A", { fs: 18, fw: 800, anchor: "middle" });
    tx(sm, 225, 50, "el campeón del laboratorio", { fs: 14, fill: INK2, anchor: "middle" });
    tx(sm, 775, 30, "Modelo B", { fs: 18, fw: 800, anchor: "middle" });
    tx(sm, 775, 50, "el que se puede operar", { fs: 14, fill: INK2, anchor: "middle" });
    const grupos = [];
    filas.forEach(function (f, k) {
      const y = 92 + k * 68, g = S("g", {}, sm);
      grupos.push(g);
      tx(g, 500, y - 2, f.t, { fs: 14, fw: 700, anchor: "middle" });
      tx(g, 500, y + 16, f.nota, { fs: 13, fill: MUT, anchor: "middle" });
      if (f.spark) {
        [["a", XA - LMAX, XA, C.s1], ["b", XB, XB + LMAX, C.s2]].forEach(function (s) {
          const vals = f[s[0]], x0 = s[1] + 10, x1 = s[2] - 10;
          const yy = function (v) { return y + 22 - (v - 86) / 11 * 44; };
          rc(g, s[1], y - 26, LMAX, 54, { fill: SUAVE, rx: 6 });
          const pts = vals.map(function (v, i) { return [x0 + i / (vals.length - 1) * (x1 - x0 - 60), yy(v)]; });
          S("polyline", { points: poli(pts), fill: "none", stroke: s[3], "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
          pts.forEach(function (p) { ci(g, p[0], p[1], 3.5, { fill: s[3], stroke: "#fff", sw: 1.2 }); });
          const ult = pts[pts.length - 1];
          tx(g, ult[0] + 10, ult[1] + 5, fmt(vals[vals.length - 1], 1) + " %", { fs: 14, fw: 700 });
        });
        return;
      }
      const la = f.a / f.max * LMAX, lb = f.b / f.max * LMAX;
      rc(g, XA - la, y - 14, la, 26, { fill: C.s1, rx: 5 });
      rc(g, XB, y - 14, Math.max(3, lb), 26, { fill: C.s2, rx: 5 });
      if (la > 250) tx(g, XA - la + 10, y + 5, f.f(f.a), { fs: 15, fw: 700, fill: "#fff" });
      else tx(g, XA - la - 8, y + 5, f.f(f.a), { fs: 15, fw: 700, anchor: "end" });
      if (lb > 250) tx(g, XB + lb - 10, y + 5, f.f(f.b), { fs: 15, fw: 700, fill: "#fff", anchor: "end" });
      else tx(g, XB + Math.max(3, lb) + 8, y + 5, f.f(f.b), { fs: 15, fw: 700 });
    });
    const veredicto = tx(sm, 500, 382, "", { fs: 16, fw: 700, anchor: "middle" });
    let prodOp = 0;
    function pintaMito(t) {
      prodOp = t;
      grupos.forEach(function (g, k) { if (filas[k].prod) g.setAttribute("opacity", (0.12 + 0.88 * t).toFixed(3)); });
    }
    function modoMito(v) {
      const ini = prodOp, fin = v === "prod" ? 1 : 0;
      veredicto.textContent = v === "prod" ? "En producción, B es el que sirve: 20 veces más barato, 40 veces más rápido y estable." : "En el laboratorio, A parece el mejor: 96 % frente a 94 %.";
      RN.tween(RED ? 0 : 700, function (t) { pintaMito(RN.lerp(ini, fin, t)); });
    }
    seg("l1-seg", modoMito);
    pintaMito(0); modoMito("lab");

    // ---------- mosaico de riesgos silenciosos
    const cv = $("l1-mosaico");
    const r = RN.rng(17), NB = 1000, NX = 200;
    const perm = []; for (let i = 0; i < NB; i++) perm.push(i);
    for (let i = NB - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    const inv = new Array(NB); perm.forEach(function (v, k) { inv[v] = k; });
    const enB = new Array(NB).fill(false); for (let i = 0; i < 30; i++) enB[perm[i * 33 % NB]] = true;
    const idxA = [], idxB = []; for (let i = 0; i < NB; i++) (enB[i] ? idxB : idxA).push(i);
    const err = new Array(NB).fill(false);
    [idxA[137], idxA[688]].forEach(function (i) { err[i] = true; });
    [0, 3, 5, 8, 12, 17, 21, 26].forEach(function (k) { err[idxB[k]] = true; });
    const memo = new Array(NB).fill(false); [idxA[50], idxA[402], idxA[777], idxA[905]].forEach(function (i) { memo[i] = true; });
    const errX = new Array(NX).fill(false); { const pX = []; for (let i = 0; i < NX; i++) pX.push(i); for (let i = NX - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = pX[i]; pX[i] = pX[j]; pX[j] = t; } for (let i = 0; i < 70; i++) errX[pX[i]] = true; }
    let modo = "global", posAct = null, alfaX = 0, alfaEt = 1, etiquetas = [];
    function disposicion(m, w, h) {
      const P = new Array(NB), PX = new Array(NX), et = [];
      if (m === "global" || m === "priv") {
        const cel = Math.min((w - 40) / 50, (h - 30) / 20), x0 = (w - 50 * cel) / 2 + cel / 2, y0 = 18 + cel / 2;
        for (let i = 0; i < NB; i++) { const k = inv[i]; P[i] = [x0 + (k % 50) * cel, y0 + Math.floor(k / 50) * cel, cel]; }
        for (let i = 0; i < NX; i++) PX[i] = [w + 40, h / 2, cel];
        return { P: P, PX: PX, et: et, ax: 0 };
      }
      const cel = Math.min((w * 0.62) / 40, (h - 52) / 25);
      const x0 = 24 + cel / 2, y0 = 44 + cel / 2;
      const iA = m === "sesgo" ? idxA : perm.slice();
      iA.forEach(function (i, k) { P[i] = [x0 + (k % 40) * cel, y0 + Math.floor(k / 40) * cel, cel]; });
      if (m === "sesgo") {
        const c2 = cel * 1.7, bx = 24 + 40 * cel + (w - 24 - 40 * cel - 6 * c2) / 2 + c2 / 2;
        idxB.forEach(function (i, k) { P[i] = [bx + (k % 6) * c2, y0 + Math.floor(k / 6) * c2, cel]; });
        for (let i = 0; i < NX; i++) PX[i] = [w + 40, h / 2, cel];
        et.push([24, 28, "Grupo mayoritario (970): 968 aciertos · 99,8 %"], [bx - c2 / 2, 28, "Grupo minoritario (30): 22 aciertos · 73,3 %"]);
        return { P: P, PX: PX, et: et, ax: 0 };
      }
      const bx = 24 + 40 * cel + (w - 24 - 40 * cel - 10 * cel) / 2 + cel / 2;
      for (let i = 0; i < NX; i++) PX[i] = [bx + (i % 10) * cel, y0 + Math.floor(i / 10) * cel, cel];
      et.push([24, 28, "Datos parecidos a los de entrenamiento: 99,0 %"], [bx - cel / 2 - 60, 28, "Datos nuevos (otra cámara, otro mes): 65,0 %"]);
      return { P: P, PX: PX, et: et, ax: 1 };
    }
    let L = null;
    function pintaMosaico() {
      L = RN.lienzo(cv, 380);
      const ctx = L.ctx; ctx.clearRect(0, 0, L.w, L.h); ctx.fillStyle = C.surface; ctx.fillRect(0, 0, L.w, L.h);
      if (!posAct) return;
      const corr = "#9cc0ea";
      function dot(p, e, m) {
        const rr = Math.max(4, p[2] * 0.38);
        ctx.beginPath(); ctx.arc(p[0], p[1], rr, 0, 7);
        ctx.fillStyle = e ? C.bad : corr; ctx.fill();
        if (e) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.6; aspa(ctx, p[0], p[1], rr * 0.5); }
        if (m && modo === "priv") { ctx.beginPath(); ctx.arc(p[0], p[1], rr + 5, 0, 7); ctx.strokeStyle = ACC; ctx.lineWidth = 3; ctx.stroke(); }
      }
      for (let i = 0; i < NB; i++) dot(posAct.P[i], err[i], memo[i]);
      if (alfaX > 0.01) { ctx.globalAlpha = alfaX; for (let i = 0; i < NX; i++) dot(posAct.PX[i], errX[i], false); ctx.globalAlpha = 1; }
      ctx.globalAlpha = alfaEt;
      etiquetas.forEach(function (e) { textoC(ctx, e[2], e[0], e[1], { fs: 14, fw: 700 }); });
      if (modo === "priv") {
        const p = posAct.P[idxA[402]];
        const tx0 = Math.min(L.w - 400, p[0] + 18), ty0 = Math.max(22, p[1] - 14);
        ctx.fillStyle = "rgba(255,255,255,.94)"; rrect(ctx, tx0 - 8, ty0 - 17, 392, 26, 6); ctx.fill(); ctx.strokeStyle = ACC; ctx.lineWidth = 1.5; ctx.stroke();
        textoC(ctx, "registros que el modelo memorizó: la precisión no lo mide", tx0, ty0, { fs: 13, fw: 700, fill: ACC });
      }
      ctx.globalAlpha = 1;
    }
    function irA(m) {
      modo = m;
      const w = cv.clientWidth || 900, h = 380;
      const fin = disposicion(m, w, h);
      const ini = posAct || fin;
      const a0 = alfaX;
      etiquetas = fin.et;
      const datos = {
        global: [["Aciertos", "990"], ["Errores", "10"], ["Precisión", "99,0 %"]],
        sesgo: [["Global", "99,0 %"], ["Grupo mayoritario", "99,8 %", "968 de 970"], ["Grupo minoritario", "73,3 %", "22 de 30"]],
        ood: [["Datos como los de entrenamiento", "99,0 %"], ["Datos nuevos", "65,0 %", "130 de 200"]],
        priv: [["Precisión", "99,0 %"], ["Registros memorizados", "4", "la métrica no los ve"]]
      }[m];
      kpis($("l1-kpis"), datos);
      RN.tween(RED || !posAct ? 0 : 900, function (t) {
        posAct = {
          P: fin.P.map(function (p, i) { const q = ini.P[i]; return [RN.lerp(q[0], p[0], t), RN.lerp(q[1], p[1], t), RN.lerp(q[2], p[2], t)]; }),
          PX: fin.PX.map(function (p, i) { const q = ini.PX[i]; return [RN.lerp(q[0], p[0], t), RN.lerp(q[1], p[1], t), RN.lerp(q[2], p[2], t)]; })
        };
        alfaX = RN.lerp(a0, fin.ax, t); alfaEt = t;
        pintaMosaico();
      });
    }
    seg("l1-riesgo", irA);
    RN.alCambiarTam(cv, function () { posAct = null; irA(modo); });
  })();

  // ================================================================== 2 · ESCALAR
  (function () {
    const iC = rango("e2-c", function (v) { return "×" + (v <= 3.001 ? mil(Math.pow(10, v)) : mil(Math.pow(10, v))); }, pinta);
    const iA = rango("e2-a", function (v) { return fmt(v, 2); }, pinta);
    let ejes = "log";
    const op = {
      alto: 340, margen: { l: 60, r: 24 },
      x: { min: 0, max: 6, titulo: "cómputo de entrenamiento (relativo)" },
      y: { min: 0.1, max: 1.2, titulo: "pérdida" },
      extras: function (ctx, g) {
        const al = +iA.value, c = Math.pow(10, +iC.value), L0 = Math.pow(c, -al), L2 = Math.pow(2 * c, -al);
        const X = function (cc) { return ejes === "log" ? g.sx(Math.log10(cc)) : g.sx(cc); };
        // pérdida a la mitad
        const Y5 = g.sy(L0 / 2);
        ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = INK2; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(g.m.l, Y5); ctx.lineTo(g.w - g.m.r, Y5); ctx.stroke(); ctx.restore();
        const cm = c * Math.pow(2, 1 / al);
        textoC(ctx, "la mitad de pérdida: ×" + mil(Math.pow(2, 1 / al)) + " de cómputo" + (cm > 1e6 ? " (fuera de la gráfica)" : ""), g.w - g.m.r - 6, Y5 - 7, { fs: 13, fill: INK2, align: "right", fw: 600 });
        // ×2
        const xa = X(c), ya = g.sy(L0), xb = X(2 * c), yb = g.sy(L2);
        if (2 * c <= 1e6) { ctx.beginPath(); ctx.arc(xb, yb, 6, 0, 7); ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = ACC; ctx.stroke(); }
        ctx.beginPath(); ctx.arc(xa, ya, 7, 0, 7); ctx.fillStyle = ACC; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke();
        const izq = xa > g.w * 0.62;
        textoC(ctx, "tu presupuesto: pérdida " + fmt(L0, 3), xa + (izq ? -14 : 14), ya - 12, { fs: 13.5, fw: 700, align: izq ? "right" : "left" });
        if (2 * c <= 1e6) textoC(ctx, "○ con el doble de cómputo: " + fmt(L2, 3), xb + (izq ? -16 : 16), yb + 26, { fs: 13, fill: INK2, align: izq ? "right" : "left" });
      }
    };
    const g = RN.grafica($("e2-ley"), op);
    function configura() {
      if (ejes === "log") {
        op.x = { min: 0, max: 6, marcas: [0, 1, 2, 3, 4, 5, 6], titulo: "cómputo de entrenamiento (relativo, escala log.)", fmt: function (v) { return "×" + pot10(v); }, fmtTip: function (v) { return "×" + mil(Math.pow(10, v)); } };
        op.y = { min: 0.1, max: 1.2, log: true, marcas: [0.1, 0.2, 0.3, 0.5, 0.7, 1], fmt: function (v) { return fmt(v, 1); }, titulo: "pérdida (escala log.)" };
      } else {
        op.x = { min: 0, max: 1e6, marcas: [0, 2e5, 4e5, 6e5, 8e5], titulo: "cómputo de entrenamiento (relativo, escala lineal)", fmt: function (v) { return v ? "×" + mil(v) : "0"; }, fmtTip: function (v) { return "×" + mil(v); } };
        op.y = { min: 0, max: 1.1, titulo: "pérdida (escala lineal)" };
      }
    }
    function pinta() {
      const al = +iA.value, c = Math.pow(10, +iC.value);
      const pts = [];
      for (let v = 0; v <= 6.0001; v += 0.01) pts.push([ejes === "log" ? v : Math.pow(10, v), Math.pow(10, -al * v)]);
      configura();
      g.dibujar([{ nombre: "pérdida L(C)", color: C.s1, puntos: pts, ancho: 2.5 }]);
      const L0 = Math.pow(c, -al), d2 = Math.pow(2, -al);
      kpis($("e2-kpis"), [
        ["Pérdida con tu presupuesto", fmt(L0, 3)],
        ["Duplicar el cómputo", "−" + fmt((1 - d2) * 100, 1) + " %", "pérdida × " + fmt(d2, 3)],
        ["Bajar la pérdida un 10 %", "×" + (Math.pow(0.9, -1 / al) < 100 ? fmt(Math.pow(0.9, -1 / al), 1) : mil(Math.pow(0.9, -1 / al))), "más cómputo"],
        ["Reducirla a la mitad", "×" + mil(Math.pow(2, 1 / al)), "más cómputo"]
      ]);
    }
    seg("e2-ejes", function (v) { ejes = v; pinta(); });
    pinta();

    // ---------- iconos del precio de la escala
    (function () {
      let s = base($("e2-i1"), 200, 90);
      [[40, 3], [80, 5], [120, 7], [160, 9]].forEach(function (p) {
        for (let k = 0; k < p[1]; k++) {
          const y = 76 - k * 7;
          S("ellipse", { cx: p[0], cy: y, rx: 16, ry: 5, fill: RN.mezcla("#ffffff", C.s4, 0.55), stroke: RN.mezcla(C.s4, INK, 0.25), "stroke-width": 1.2 }, s);
        }
      });
      tx(s, 160, 12, "€", { fs: 15, fw: 800, anchor: "middle", fill: INK2 });
      s = base($("e2-i2"), 200, 90);
      ci(s, 62, 45, 30, { fill: "#fff", stroke: INK2, sw: 3 });
      ln(s, 62, 45, 62, 25, { stroke: INK, sw: 3 }); ln(s, 62, 45, 78, 52, { stroke: ACC, sw: 3 });
      rc(s, 108, 36, 80, 16, { fill: SUAVE, stroke: LINEA, rx: 8 }); rc(s, 108, 36, 22, 16, { fill: C.s1, rx: 8 });
      tx(s, 148, 72, "esperando…", { fs: 13, fill: MUT, anchor: "middle" });
      s = base($("e2-i3"), 200, 90);
      S("polygon", { points: "70,8 44,50 64,50 54,84 90,36 68,36 80,8", fill: C.s4, stroke: RN.mezcla(C.s4, INK, 0.3), "stroke-width": 1.5, "stroke-linejoin": "round" }, s);
      pa(s, "M112,62 a14,14 0 0 1 6,-26 a18,18 0 0 1 34,-4 a14,14 0 0 1 14,30 z", { fill: "#E4E7EB", stroke: "#B8C2CC" });
      tx(s, 140, 56, "CO₂", { fs: 14, fw: 700, anchor: "middle", fill: INK2 });
      s = base($("e2-i4"), 200, 90);
      pa(s, "M24,58 a14,14 0 0 1 6,-26 a18,18 0 0 1 34,-4 a14,14 0 0 1 14,30 z", { fill: "#DCE6F1", stroke: "#8FA6BF" });
      tx(s, 50, 52, "nube", { fs: 13, fw: 700, anchor: "middle", fill: INK2 });
      for (let k = 0; k < 3; k++) S("ellipse", { cx: 96 + k * 16, cy: 46, rx: 10, ry: 6, fill: "none", stroke: INK2, "stroke-width": 3 }, s);
      rc(s, 150, 34, 36, 30, { fill: ACC, rx: 5 }); pa(s, "M158,34 v-8 a10,10 0 0 1 20,0 v8", { stroke: ACC, sw: 4 });
      ci(s, 168, 49, 3.5, { fill: "#fff" });
    })();

    // ---------- matriz de compromisos
    const sd = base($("e2-dilema"), 1000, 340);
    const ops = [["Modelo el doble", "de grande"], ["Más datos y más", "pasos de entrenamiento"], ["Capacidad reservada", "con un solo proveedor"], ["Gastarlo en servir:", "destilar y más réplicas"]];
    const filasD = ["Calidad del modelo", "Coste de servir", "Latencia", "Consumo de energía", "Independencia del proveedor", "Necesidad de datos nuevos"];
    const V = [[1, -2, -1, -1, 0, -1], [1, 0, 0, -1, 0, -2], [1, 1, 0, -1, -2, 0], [-1, 2, 2, 1, 0, 0]];
    rc(sd, 14, 16, 12, 12, { fill: C.s1, rx: 2 }); tx(sd, 32, 27, "mejora", { fs: 13, fill: INK2 });
    rc(sd, 14, 38, 12, 12, { fill: C.s2, rx: 2 }); tx(sd, 32, 49, "empeora", { fs: 13, fill: INK2 });
    ops.forEach(function (o, k) {
      const cx = 300 + 180 * k + 60;
      tx(sd, cx, 26, o, { fs: 14, fw: 700, anchor: "middle", lh: 1.2 });
    });
    filasD.forEach(function (f, i) {
      const y = 100 + i * 40;
      if (i) ln(sd, 10, y - 20, 990, y - 20, { stroke: LINEA, sw: 1 });
      tx(sd, 14, y + 5, f, { fs: 14, fw: 600 });
      V.forEach(function (col, k) {
        const cx = 300 + 180 * k + 60, v = col[i];
        ln(sd, cx, y - 13, cx, y + 13, { stroke: "#C3CFDC", sw: 1.5 });
        if (v === 0) { tx(sd, cx, y + 5, "=", { fs: 15, fw: 700, fill: MUT, anchor: "middle" }); return; }
        const w = Math.abs(v) * 34;
        rc(sd, v > 0 ? cx + 2 : cx - 2 - w, y - 9, w, 18, { fill: v > 0 ? C.s1 : C.s2, rx: 4 });
      });
    });
  })();

  // ================================================================== 3 · MOVER DATOS
  const GPU = { bw: 2.039e12, pico: 312e12, pcie: 32e9, nvlink: 600e9 };
  (function () {
    // ---------- energía: computar frente a mover
    const s = base($("m3-energia"), 1000, 420);
    rc(s, 360, 22, 615, 136, { fill: "none", stroke: "#B8C2CC", dash: "6 5", rx: 14 });
    tx(s, 372, 40, "dentro del chip", { fs: 13, fill: MUT });
    function caja(x, y, w, t1, t2) { rc(s, x, y, w, 90, { fill: "#fff", stroke: "#8FA6BF", sw: 1.8, rx: 10 }); tx(s, x + w / 2, y + 40, t1, { fs: 17, fw: 700, anchor: "middle" }); tx(s, x + w / 2, y + 62, t2, { fs: 13, fill: INK2, anchor: "middle" }); }
    caja(30, 48, 190, "DRAM", "memoria principal");
    caja(400, 48, 170, "Caché SRAM", "memoria cercana");
    caja(770, 48, 190, "Unidad de cálculo", "multiplicar y sumar");
    ln(s, 220, 93, 400, 93, { stroke: "#D5DDE6", sw: 14, cap: "butt" }); ln(s, 220, 93, 400, 93, { stroke: "#fff", sw: 1.5, dash: "8 8", cap: "butt" });
    ln(s, 570, 93, 770, 93, { stroke: "#D5DDE6", sw: 14, cap: "butt" }); ln(s, 570, 93, 770, 93, { stroke: "#fff", sw: 1.5, dash: "8 8", cap: "butt" });
    tx(s, 310, 74, "640 pJ", { fs: 15, fw: 800, anchor: "middle" }); tx(s, 310, 124, "por cada 32 bits", { fs: 13, fill: INK2, anchor: "middle" });
    tx(s, 670, 74, "5 pJ", { fs: 15, fw: 800, anchor: "middle" }); tx(s, 670, 124, "por cada 32 bits", { fs: 13, fill: INK2, anchor: "middle" });
    const flash = rc(s, 770, 48, 190, 90, { fill: ACC, rx: 10, op: 0 });
    const paq = S("g", {}, s); rc(paq, -24, -11, 48, 22, { fill: ACC, rx: 5 }); tx(paq, 0, 5, "32 b", { fs: 13, fw: 700, fill: "#fff", anchor: "middle" });
    const cont = tx(s, 30, 186, "", { fs: 15, fw: 600 });
    // barras log
    tx(s, 30, 222, "Energía por operación (picojulios, escala logarítmica)", { fs: 14, fw: 700 });
    const ops = [["Sumar enteros", 0.1, 0], ["Sumar en coma flotante", 0.9, 0], ["Leer un registro", 1, 1], ["Multiplicar enteros", 3.1, 0], ["Multiplicar en coma flotante", 3.7, 0], ["Leer de la caché SRAM", 5, 1], ["Leer de la DRAM", 640, 1]];
    const XB0 = 250, PXD = 64; // px por década, desde 0,01 pJ
    [0.01, 0.1, 1, 10, 100, 1000].forEach(function (v) { const x = XB0 + (Math.log10(v) + 2) * PXD; ln(s, x, 232, x, 404, { stroke: LINEA, sw: 1 }); tx(s, x, 416, mil(v, v < 1 ? (v < 0.1 ? 2 : 1) : 0), { fs: 12.5, fill: MUT, anchor: "middle" }); });
    ops.forEach(function (o, k) {
      const y = 248 + k * 23, w = (Math.log10(o[1]) + 2) * PXD;
      tx(s, 30, y + 5, o[0], { fs: 13.5 });
      rc(s, XB0, y - 8, w, 16, { fill: o[2] ? C.s2 : C.s1, rx: 3 });
      tx(s, XB0 + w + 6, y + 5, fmt(o[1], o[1] % 1 ? 1 : 0), { fs: 13.5, fw: 700 });
    });
    rc(s, 470, 236, 12, 12, { fill: C.s1, rx: 2 }); tx(s, 487, 246, "calcular", { fs: 13, fill: INK2 });
    rc(s, 552, 236, 12, 12, { fill: C.s2, rx: 2 }); tx(s, 569, 246, "mover", { fs: 13, fill: INK2 });
    // gofre
    tx(s, 650, 222, "Con la energía de leer 32 bits de la DRAM…", { fs: 14, fw: 700 });
    const cuad = [];
    for (let k = 0; k < 173; k++) cuad.push(rc(s, 650 + (k % 18) * 17, 234 + Math.floor(k / 18) * 17, 14, 14, { fill: C.s1, rx: 2.5 }));
    tx(s, 650, 412, "…da para ≈ 173 multiplicaciones (640 ÷ 3,7)", { fs: 13.5, fw: 700 });
    function estado(xp, mover, calc, nCuad) {
      paq.setAttribute("transform", "translate(" + xp + ",93)");
      cont.textContent = "Energía gastada: moviendo " + fmt(mover, mover % 1 ? 1 : 0) + " pJ · calculando " + fmt(calc, 1) + " pJ";
      cuad.forEach(function (q, k) { q.setAttribute("opacity", k < nCuad ? 1 : 0.15); });
    }
    estado(248, 0, 0, 173);
    $("m3-play").addEventListener("click", async function () {
      const b = this; b.disabled = true;
      flash.setAttribute("opacity", 0);
      await RN.tween(RED ? 0 : 2200, function (t) { estado(RN.lerp(248, 485, t), 640 * t, 0, Math.round(173 * t)); }, function (t) { return t; });
      await RN.tween(RED ? 0 : 500, function (t) { estado(RN.lerp(485, 865, t), 640 + 5 * t, 0, 173); });
      await RN.tween(RED ? 0 : 500, function (t) { flash.setAttribute("opacity", (0.35 * Math.sin(Math.PI * t)).toFixed(3)); estado(865, 645, 3.7 * t, 173); });
      flash.setAttribute("opacity", 0);
      b.disabled = false;
    });

    // ---------- autopista de datos
    const sa = base($("m3-autopista"), 1000, 260);
    rc(sa, 20, 132, 170, 108, { fill: "#fff", stroke: "#8FA6BF", sw: 1.8, rx: 10 });
    tx(sa, 105, 180, "CPU + RAM", { fs: 16, fw: 700, anchor: "middle" }); tx(sa, 105, 202, "memoria del sistema", { fs: 13, fill: INK2, anchor: "middle" });
    rc(sa, 360, 14, 280, 228, { fill: "#fff", stroke: "#8FA6BF", sw: 1.8, rx: 12 });
    tx(sa, 376, 36, "GPU 0", { fs: 15, fw: 800 });
    rc(sa, 380, 50, 240, 58, { fill: RN.mezcla("#ffffff", C.s1, 0.12), stroke: "#8FA6BF", rx: 8 });
    for (let i = 0; i < 26; i++) for (let j = 0; j < 4; j++) rc(sa, 388 + i * 8.8, 58 + j * 11, 6.5, 8, { fill: RN.mezcla("#ffffff", C.s1, 0.5), rx: 1.2 });
    rc(sa, 380, 160, 240, 52, { fill: "#EEF3F9", stroke: "#8FA6BF", rx: 8 });
    tx(sa, 500, 183, "Memoria HBM", { fs: 15, fw: 700, anchor: "middle" }); tx(sa, 500, 202, "80 GB", { fs: 13, fill: INK2, anchor: "middle" });
    rc(sa, 810, 132, 170, 108, { fill: "#fff", stroke: "#8FA6BF", sw: 1.8, rx: 10 });
    tx(sa, 895, 180, "GPU 1", { fs: 16, fw: 700, anchor: "middle" }); tx(sa, 895, 202, "otra tarjeta", { fs: 13, fill: INK2, anchor: "middle" });
    const tubos = [
      { x1: 190, y1: 186, x2: 380, y2: 186, w: 5, bw: GPU.pcie, v: 45, n: "PCIe 4.0 ×16", b: "≈ 32 GB/s", lx: 285, ly: 150 },
      { x1: 640, y1: 186, x2: 810, y2: 186, w: 11, bw: GPU.nvlink, v: 120, n: "NVLink", b: "≈ 600 GB/s", lx: 725, ly: 150 },
      { x1: 500, y1: 160, x2: 500, y2: 108, w: 20, bw: GPU.bw, v: 70, n: "", b: "", lx: 0, ly: 0 }
    ];
    const gPart = S("g", {}, sa);
    tubos.forEach(function (t) {
      ln(sa, t.x1, t.y1, t.x2, t.y2, { stroke: "#C9D6E5", sw: t.w + 4, cap: "butt" });
      ln(sa, t.x1, t.y1, t.x2, t.y2, { stroke: "#DCE6F1", sw: t.w, cap: "butt" });
      if (t.n) { tx(sa, t.lx, t.ly - 14, t.n, { fs: 14, fw: 700, anchor: "middle" }); tx(sa, t.lx, t.ly + 4, t.b, { fs: 13, fill: INK2, anchor: "middle" }); }
      t.tt = tx(sa, t.lx || 514, t.ly ? 222 : 141, "", { fs: 16, fw: 800, anchor: t.ly ? "middle" : "start", fill: ACC });
      const len = Math.hypot(t.x2 - t.x1, t.y2 - t.y1), n = Math.floor(len / 22);
      t.p = []; for (let k = 0; k < n; k++) t.p.push(ci(gPart, 0, 0, Math.max(2, Math.min(5, t.w * 0.28)), { fill: ACC, op: 0.85 }));
      t.len = len;
    });
    tx(sa, 486, 130, "HBM → núcleos", { fs: 13, fw: 700, anchor: "end" }); tx(sa, 486, 148, "≈ 2.039 GB/s", { fs: 13, fill: INK2, anchor: "end" });
    sa.appendChild(gPart);
    const iGB = rango("m3-gb", function (v) { return bytesGB(Math.pow(10, v)); }, pintaAut);
    function pintaAut() {
      const gb = Math.pow(10, +iGB.value);
      tubos.forEach(function (t) { t.tt.textContent = tiempo(gb * 1e9 / t.bw); });
    }
    $("m3-pre1").addEventListener("click", function () { ponerRango(iGB, Math.log10(14)); });
    $("m3-pre2").addEventListener("click", function () { ponerRango(iGB, Math.log10(32 * 224 * 224 * 3 * 4 / 1e9)); });
    pintaAut();
    function mueve(t) {
      tubos.forEach(function (tb) {
        const n = tb.p.length;
        tb.p.forEach(function (c, k) {
          const f = ((k / n) + t * tb.v / tb.len) % 1;
          c.setAttribute("cx", RN.lerp(tb.x1, tb.x2, f).toFixed(1)); c.setAttribute("cy", RN.lerp(tb.y1, tb.y2, f).toFixed(1));
        });
      });
    }
    mueve(0.3);
    if (!RED) bucle(function (dt, t) { mueve(t); }, sa).iniciar();

    // ---------- ¿FLOPS o ancho de banda?
    const getOp = seg("m3-op", pintaRoof), getSrc = seg("m3-src", pintaRoof);
    const iN = rango("m3-n", function (v) { return mil(Math.pow(2, v)); }, pintaRoof);
    const sb = base($("m3-balanza"), 500, 330);
    const gBal = S("g", {}, sb);
    let angAct = 0, ultimo = null;
    function cuenta() {
      const n = Math.pow(2, +iN.value), mm = getOp() === "mm";
      const flop = mm ? 2 * n * n * n : 2 * n * n, bytes = mm ? 3 * n * n * 2 : (n * n + 2 * n) * 2;
      const bw = getSrc() === "hbm" ? GPU.bw : GPU.pcie;
      return { n: n, flop: flop, bytes: bytes, I: flop / bytes, tc: flop / GPU.pico, tm: bytes / bw, bw: bw };
    }
    function dibujaBal(ang, c) {
      while (gBal.firstChild) gBal.removeChild(gBal.firstChild);
      const px = 250, py = 92, Lb = 160, a = ang * Math.PI / 180;
      S("polygon", { points: "250,92 218,262 282,262", fill: "#EEF3F9", stroke: "#8FA6BF", "stroke-width": 1.5 }, gBal);
      rc(gBal, 175, 260, 150, 10, { fill: "#C6D4E4", rx: 4 });
      const xl = px - Lb * Math.cos(a), yl = py - Lb * Math.sin(a), xr = px + Lb * Math.cos(a), yr = py + Lb * Math.sin(a);
      ln(gBal, xl, yl, xr, yr, { stroke: INK, sw: 6 });
      ci(gBal, px, py, 8, { fill: INK });
      [[xl, yl, "Mover datos", c.tm, C.s2], [xr, yr, "Calcular", c.tc, C.s1]].forEach(function (p) {
        ln(gBal, p[0], p[1], p[0] - 60, p[1] + 58, { stroke: INK2, sw: 1.2 }); ln(gBal, p[0], p[1], p[0] + 60, p[1] + 58, { stroke: INK2, sw: 1.2 });
        pa(gBal, "M" + (p[0] - 74) + "," + (p[1] + 58) + " h148 a74,30 0 0 1 -148,0 z", { fill: RN.mezcla("#ffffff", p[4], 0.22), stroke: p[4], sw: 2 });
        tx(gBal, p[0], p[1] - 14, p[2], { fs: 14.5, fw: 700, anchor: "middle" });
        tx(gBal, p[0], p[1] + 80, tiempo(p[3]), { fs: 15, fw: 800, anchor: "middle" });
      });
      const memoria = c.tm > c.tc;
      tx(gBal, 250, 298, memoria ? "Cuello de botella: la memoria" : "Cuello de botella: el cálculo", { fs: 16, fw: 800, anchor: "middle", fill: ACC });
      tx(gBal, 250, 320, "intensidad: " + (c.I < 10 ? fmt(c.I, 2) : mil(c.I)) + " operaciones por byte", { fs: 13.5, fill: INK2, anchor: "middle" });
    }
    const roof = RN.grafica($("m3-techo"), {
      alto: 330, margen: { l: 62, r: 34 },
      x: { min: -1, max: 5, titulo: "operaciones por byte (escala log.)", fmt: function (v) { return pot10(v); }, fmtTip: function (v) { return fmt(Math.pow(10, v), Math.pow(10, v) < 10 ? 2 : 0); } },
      y: { min: 0.01, max: 1000, log: true, titulo: "TFLOPS alcanzables (escala log.)", fmt: function (v) { return v >= 1 ? mil(v) : fmt(v, v >= 0.1 ? 1 : 2); }, fmtTip: function (v) { return fmt(v, v < 1 ? 3 : 1); } },
      extras: function (ctx, g) {
        if (!ultimo) return;
        const c = ultimo, lx = Math.log10(c.I);
        textoC(ctx, "techo de cálculo: 312 TFLOPS", g.sx(4.9), g.sy(312) - 8, { fs: 12.5, fill: INK2, align: "right", fw: 600 });
        ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = ACC; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(g.sx(lx), g.m.t); ctx.lineTo(g.sx(lx), g.h - g.m.b); ctx.stroke(); ctx.restore();
        const y = Math.min(312, c.bw / 1e12 * c.I);
        ctx.beginPath(); ctx.arc(g.sx(lx), g.sy(y), 7, 0, 7); ctx.fillStyle = ACC; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke();
        const arriba = y >= 311;
        textoC(ctx, fmt(y, y < 1 ? 2 : (y < 10 ? 1 : 0)) + " TFLOPS", g.sx(lx) + (arriba ? -12 : 12), g.sy(y) + 22, { fs: 13, fw: 700, align: arriba ? "right" : "left" });
      }
    });
    const roofHBM = [], roofPCIe = [];
    for (let v = -1; v <= 5.0001; v += 0.02) { roofHBM.push([v, Math.min(312, 2.039 * Math.pow(10, v))]); roofPCIe.push([v, Math.min(312, 0.032 * Math.pow(10, v))]); }
    function pintaRoof() {
      const c = cuenta();
      ultimo = c;
      roof.dibujar([{ nombre: "techo HBM", color: C.s1, puntos: roofHBM, ancho: 2.5 }, { nombre: "techo PCIe", color: C.s2, puntos: roofPCIe, ancho: 2.5 }]);
      const fin = RN.limita(-Math.log10(c.tm / c.tc) * 7, -20, 20), ini = angAct;
      RN.tween(RED ? 0 : 450, function (t) { angAct = RN.lerp(ini, fin, t); dibujaBal(angAct, c); });
    }
    pintaRoof();

    // ---------- cuantización
    const getBits = seg("m3-bits", pintaQ);
    const iNP = rango("m3-np", function (v) { return params(Math.pow(10, v)); }, pintaQ);
    Array.from(document.querySelectorAll("[data-np]")).forEach(function (b) { b.addEventListener("click", function () { ponerRango(iNP, Math.log10(+b.dataset.np)); }); });
    const sbits = base($("m3-bitsvg"), 1000, 132);
    const celdas = [];
    for (let k = 0; k < 32; k++) {
      const r = rc(sbits, 20 + k * 30.5, 42, 27, 36, { fill: "#fff", stroke: "#C3CFDC", rx: 4 });
      r.style.transition = "fill .35s, opacity .35s"; celdas.push(r);
    }
    const etqBits = S("g", {}, sbits);
    const totBits = tx(sbits, 20, 114, "", { fs: 16, fw: 800 });
    const CAMPOS = { 32: [["signo", 1, INK2], ["exponente (8)", 8, RN.colorSeq(0.85)], ["mantisa (23)", 23, RN.colorSeq(0.4)]], 16: [["signo", 1, INK2], ["exp. (5)", 5, RN.colorSeq(0.85)], ["mantisa (10)", 10, RN.colorSeq(0.4)]], 8: [["entero con signo (8 bits)", 8, RN.colorSeq(0.62)]], 4: [["entero (4)", 4, RN.colorSeq(0.62)]] };
    // pesos de ejemplo
    const rq = RN.rng(5), W = []; for (let i = 0; i < 4000; i++) W.push(RN.normal(rq));
    let maxAbs = 0; W.forEach(function (w) { maxAbs = Math.max(maxAbs, Math.abs(w)); });
    function f16(x) { if (x === 0) return 0; const a = Math.abs(x); let e = Math.floor(Math.log2(a)); if (e < -14) e = -14; const p = Math.pow(2, e - 10); return Math.sign(x) * Math.round(a / p) * p; }
    function cuantiza(b) {
      if (b === 32) return { q: W.slice(), paso: 0, niveles: null };
      if (b === 16) return { q: W.map(f16), paso: 0, niveles: null };
      const qmax = Math.pow(2, b - 1) - 1, esc = maxAbs / qmax;
      return { q: W.map(function (w) { return RN.limita(Math.round(w / esc), -qmax, qmax) * esc; }), paso: esc, qmax: qmax };
    }
    let Q = null;
    const hist = RN.grafica($("m3-hist"), {
      alto: 300, margen: { l: 52, r: 14 }, hover: false,
      x: { min: -4.5, max: 4.5, titulo: "valor del peso (en desviaciones típicas)" },
      y: { min: 0, max: 0.5, titulo: "densidad" },
      extras: function (ctx, g) {
        if (!Q) return;
        // histograma original
        const nb = 72, bw = 9 / nb, cnt = new Array(nb).fill(0);
        W.forEach(function (w) { const k = Math.floor((w + 4.5) / bw); if (k >= 0 && k < nb) cnt[k]++; });
        ctx.beginPath(); ctx.moveTo(g.sx(-4.5), g.sy(0));
        cnt.forEach(function (c, k) { const d = c / (W.length * bw); ctx.lineTo(g.sx(-4.5 + k * bw), g.sy(d)); ctx.lineTo(g.sx(-4.5 + (k + 1) * bw), g.sy(d)); });
        ctx.lineTo(g.sx(4.5), g.sy(0)); ctx.closePath(); ctx.fillStyle = "#d5dde6"; ctx.fill();
        const b = +getBits();
        if (Q.paso) {
          const mapa = new Map();
          Q.q.forEach(function (v) { const k = Math.round(v / Q.paso); mapa.set(k, (mapa.get(k) || 0) + 1); });
          ctx.strokeStyle = ACC; ctx.lineWidth = b === 4 ? 3 : 1.4;
          mapa.forEach(function (c, k) { const x = g.sx(k * Q.paso); ctx.beginPath(); ctx.moveTo(x, g.sy(0)); ctx.lineTo(x, g.sy(Math.min(0.5, c / (W.length * Q.paso)))); ctx.stroke(); });
        }
        let se = 0; for (let i = 0; i < W.length; i++) se += (W[i] - Q.q[i]) * (W[i] - Q.q[i]);
        const rmse = Math.sqrt(se / W.length);
        const t1 = b === 32 ? "32 bits: los pesos se guardan tal cual" : b === 16 ? "16 bits: redondeo tan fino que no se ve" : "valores posibles: " + (2 * Q.qmax + 1) + " (escala = máx |w| ÷ " + Q.qmax + ")";
        textoC(ctx, t1, g.m.l + 10, g.m.t + 18, { fs: 13.5, fw: 700 });
        textoC(ctx, "error medio (RMSE): " + (rmse === 0 ? "0" : rmse < 0.001 ? fmt(rmse * 100, 3) + " % de σ" : fmt(rmse * 100, 1) + " % de σ"), g.m.l + 10, g.m.t + 38, { fs: 13.5, fill: INK2 });
      }
    });
    const smem = base($("m3-mem"), 500, 300);
    const gMem = S("g", {}, smem);
    function pintaQ() {
      const b = +getBits(), N = Math.pow(10, +iNP.value);
      // tira de bits
      const campos = CAMPOS[b]; let k = 0;
      while (etqBits.firstChild) etqBits.removeChild(etqBits.firstChild);
      campos.forEach(function (c) {
        const x0 = 20 + k * 30.5, x1 = 20 + (k + c[1]) * 30.5 - 3.5;
        tx(etqBits, (x0 + x1) / 2, 30, c[0], { fs: 13, fw: 600, anchor: "middle", fill: INK2 });
        ln(etqBits, x0 + 2, 36, x1 - 2, 36, { stroke: "#B8C2CC", sw: 1.2 });
        for (let j = 0; j < c[1]; j++) { celdas[k].style.fill = c[2]; celdas[k].style.opacity = 1; k++; }
      });
      for (; k < 32; k++) { celdas[k].style.fill = "#fff"; celdas[k].style.opacity = 0.35; }
      totBits.textContent = "1 peso = " + b + " bits = " + fmt(b / 8, b === 4 ? 1 : 0) + (b === 8 ? " byte" : " bytes") + (b <= 8 ? "  (+ una escala compartida por tensor)" : "");
      // memoria
      while (gMem.firstChild) gMem.removeChild(gMem.firstChild);
      tx(gMem, 16, 24, "Memoria de los pesos · " + params(N) + " parámetros", { fs: 15, fw: 700 });
      const X0 = 92, PX = 64, xg = function (gb) { return X0 + (Math.log10(Math.max(gb, 0.01)) + 2) * PX; };
      [0.01, 0.1, 1, 10, 100, 1000, 10000].forEach(function (v) { const x = xg(v); ln(gMem, x, 44, x, 250, { stroke: LINEA, sw: 1 }); tx(gMem, x, 290, v >= 1000 ? fmt(v / 1000, 0) + " TB" : (v < 1 ? fmt(v, v < 0.1 ? 2 : 1) : mil(v)) + (v < 1000 ? " GB" : ""), { fs: 12, fill: MUT, anchor: "middle" }); });
      [[24, "GPU de 24 GB"], [80, "de 80 GB"]].forEach(function (m, i) { const x = xg(m[0]); ln(gMem, x, 40, x, 256, { stroke: INK2, sw: 1.2, dash: "5 4" }); tx(gMem, x + (i ? 4 : -4), 270, m[1], { fs: 12.5, fill: INK2, anchor: i ? "start" : "end", fw: 600 }); });
      [32, 16, 8, 4].forEach(function (bb, i) {
        const y = 62 + i * 48, gb = N * bb / 8 / 1e9, w = Math.max(2, xg(gb) - X0);
        tx(gMem, 16, y + 13, bb + " bits", { fs: 14, fw: bb === b ? 800 : 500 });
        rc(gMem, X0, y, w, 22, { fill: bb === b ? ACC : "#B8C4D0", rx: 4 });
        const dentro = w > 330;
        tx(gMem, dentro ? X0 + w - 6 : X0 + w + 6, y + 16, bytesGB(gb), { fs: 13.5, fw: 700, anchor: dentro ? "end" : "start", fill: dentro ? "#fff" : INK });
        tx(gMem, X0, y + 38, "leerlos todos una vez: " + tiempo(gb * 1e9 / GPU.bw), { fs: 12, fill: INK2 });
      });
      Q = cuantiza(b);
      hist.dibujar([]);
    }
    pintaQ();

    // ---------- batching
    const iB = rango("m3-b", function (v) { return mil(Math.pow(2, v)); }, pintaB);
    const getPrec = seg("m3-prec", pintaB);
    const NP = 7e9;
    function paso(B, bits) {
      const tm = NP * bits / 8 / GPU.bw, tc = 2 * NP * B / GPU.pico;
      return { tm: tm, tc: tc, t: Math.max(tm, tc), caudal: B / Math.max(tm, tc) };
    }
    const sl = base($("m3-lote"), 1000, 262);
    rc(sl, 20, 30, 210, 150, { fill: "#EEF3F9", stroke: "#8FA6BF", sw: 1.8, rx: 10 });
    tx(sl, 125, 54, "Memoria HBM", { fs: 15, fw: 700, anchor: "middle" });
    const tPesos = tx(sl, 125, 168, "", { fs: 13, fill: INK2, anchor: "middle" });
    const bloquesP = []; for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) bloquesP.push(rc(sl, 52 + i * 25, 68 + j * 21, 21, 17, { fill: RN.colorSeq(0.55), rx: 3 }));
    rc(sl, 470, 30, 230, 150, { fill: "#fff", stroke: "#8FA6BF", sw: 1.8, rx: 10 });
    tx(sl, 585, 54, "Núcleos de cálculo", { fs: 15, fw: 700, anchor: "middle" });
    const nucleos = []; for (let i = 0; i < 12; i++) for (let j = 0; j < 5; j++) nucleos.push(rc(sl, 488 + i * 16.5, 68 + j * 19, 13, 15, { fill: "#E4E7EB", rx: 2 }));
    ln(sl, 230, 105, 470, 105, { stroke: "#D5DDE6", sw: 16, cap: "butt" });
    const camion = S("g", {}, sl); rc(camion, -32, -13, 64, 26, { fill: RN.colorSeq(0.55), rx: 5 }); tx(camion, 0, 5, "pesos", { fs: 13, fw: 700, fill: "#fff", anchor: "middle" });
    tx(sl, 850, 46, "Peticiones del lote", { fs: 15, fw: 700, anchor: "middle" });
    const peticiones = []; for (let k = 0; k < 128; k++) peticiones.push(ci(sl, 738 + (k % 16) * 14.6, 64 + Math.floor(k / 16) * 14.6, 5, { fill: "#fff", stroke: "#B8C2CC", sw: 1.5 }));
    const tMas = tx(sl, 850, 196, "", { fs: 13, fill: INK2, anchor: "middle" });
    const barLeer = rc(sl, 170, 208, 0, 16, { fill: RN.colorSeq(0.55), rx: 4 }), barCalc = rc(sl, 170, 234, 0, 16, { fill: ACC, rx: 4 });
    tx(sl, 20, 221, "Leer los pesos", { fs: 13.5, fw: 600 }); tx(sl, 20, 247, "Calcular el lote", { fs: 13.5, fw: 600 });
    const tLeer = tx(sl, 0, 221, "", { fs: 13.5, fw: 700 }), tCalc = tx(sl, 0, 247, "", { fs: 13.5, fw: 700 });
    const fondoL = rc(sl, 170, 208, 560, 16, { fill: "none", stroke: LINEA, rx: 4 }), fondoC = rc(sl, 170, 234, 560, 16, { fill: "none", stroke: LINEA, rx: 4 });
    const tPaso = tx(sl, 990, 240, "", { fs: 15, fw: 800, anchor: "end" });
    let pAct = paso(16, 16), Bact = 16;
    function escenaLote(f) { // f: fase del paso de 0 a 1
      const rl = pAct.tm / pAct.t, rcc = pAct.tc / pAct.t;
      const fl = Math.min(1, f / rl), fc = Math.min(1, f / rcc);
      camion.setAttribute("transform", "translate(" + RN.lerp(262, 438, fl).toFixed(1) + ",105)");
      camion.setAttribute("opacity", fl >= 1 ? 0.25 : 1);
      barLeer.setAttribute("width", (560 * rl * fl).toFixed(1)); barCalc.setAttribute("width", Math.max(2, 560 * rcc * fc).toFixed(1));
      const act = fc < 1 ? 1 : 0.25;
      nucleos.forEach(function (n, k) { n.setAttribute("fill", (k * 7 % 60) / 60 < Math.min(1, Bact / 64) * act + 0.04 ? ACC : "#E4E7EB"); });
      peticiones.forEach(function (p, k) { const on = k < Bact; p.setAttribute("fill", on ? (f > 0.97 ? ACC : RN.mezcla("#ffffff", ACC, 0.45)) : "#fff"); p.setAttribute("stroke", on ? ACC : "#B8C2CC"); });
    }
    const curvas = { 16: [], 8: [], 4: [] };
    [16, 8, 4].forEach(function (b) { for (let v = 0; v <= 9.0001; v += 0.05) curvas[b].push([v, paso(Math.pow(2, v), b).caudal]); });
    const gq = RN.grafica($("m3-caudal"), {
      alto: 300, margen: { l: 68, r: 18 },
      x: { min: 0, max: 9, titulo: "peticiones en el lote (escala log.)", fmt: function (v) { return mil(Math.pow(2, v)); }, fmtTip: function (v) { return mil(Math.pow(2, v)); } },
      y: { min: 100, max: 40000, log: true, marcas: [100, 300, 1000, 3000, 10000, 30000], titulo: "tokens por segundo (escala log.)", fmt: function (v) { return mil(v); }, fmtTip: function (v) { return mil(v); } },
      extras: function (ctx, g) {
        const v = +iB.value, b = +getPrec(), p = paso(Math.pow(2, v), b);
        ctx.beginPath(); ctx.arc(g.sx(v), g.sy(p.caudal), 7, 0, 7); ctx.fillStyle = ACC; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke();
        textoC(ctx, mil(p.caudal) + " tokens/s", g.sx(v) - 12, g.sy(p.caudal) - 12, { fs: 13.5, fw: 700, align: "right" });
        textoC(ctx, "techo de cálculo: " + mil(GPU.pico / (2 * NP)) + " tokens/s", g.sx(8.9), g.sy(GPU.pico / (2 * NP)) + 20, { fs: 12.5, fill: INK2, align: "right", fw: 600 });
      }
    });
    function pintaB() {
      Bact = Math.pow(2, +iB.value);
      const b = +getPrec();
      pAct = paso(Bact, b);
      tPesos.textContent = "pesos: " + bytesGB(NP * b / 8 / 1e9) + " (" + (b === 16 ? "FP16" : "INT" + b) + ")";
      tMas.textContent = Bact > 128 ? "+ " + mil(Bact - 128) + " peticiones más" : "";
      const rl = pAct.tm / pAct.t, rcc = pAct.tc / pAct.t;
      tLeer.setAttribute("x", 170 + 560 * rl + 8); tLeer.textContent = tiempo(pAct.tm);
      tCalc.setAttribute("x", 170 + Math.max(2, 560 * rcc) + 8); tCalc.textContent = tiempo(pAct.tc);
      tPaso.textContent = "";
      kpis($("m3-bkpis"), [
        ["Tiempo por paso", tiempo(pAct.t), "máx(leer, calcular)"],
        ["Caudal", mil(pAct.caudal) + " tokens/s"],
        ["Uso del cálculo", pct(pAct.tc / pAct.t, 0)],
        ["Manda", pAct.tm >= pAct.tc ? "la memoria" : "el cálculo"]
      ]);
      gq.dibujar([16, 8, 4].map(function (bb, k) { return { nombre: bb === 16 ? "FP16" : "INT" + bb, color: [C.s1, C.s2, C.s3][k], puntos: curvas[bb], ancho: bb === b ? 3 : 1.6 }; }));
      if (!animL.activo) escenaLote(1);
    }
    let fase = 0;
    const animL = anima(function (dt) { fase = (fase + dt / 1.8) % 1.15; escenaLote(Math.min(1, fase)); }, sl);
    pintaB();
    if (!RED) animL.iniciar();
    RN.botonPlay($("m3-bplay"), animL, ["▶ Animar", "⏸ Pausa"]);
  })();

  // ================================================================== 4 · ICEBERG
  (function () {
    const s = base($("i4-iceberg"), 1000, 440);
    const defs = S("defs", {}, s);
    const gr = S("linearGradient", { id: "lab-mar", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    S("stop", { offset: "0%", "stop-color": "#D9E9F7" }, gr); S("stop", { offset: "100%", "stop-color": "#86ABD1" }, gr);
    const forma = [[505, 104], [520, 66], [548, 34], [575, 26], [600, 50], [622, 80], [636, 104], [692, 124], [742, 170], [762, 236], [748, 300], [716, 352], [668, 398], [600, 428], [520, 426], [455, 396], [412, 344], [396, 280], [404, 206], [432, 148], [470, 116]];
    const cp = S("clipPath", { id: "lab-ice" }, defs); S("polygon", { points: poli(forma) }, cp);
    rc(s, 0, 0, 1000, 104, { fill: "#F7FAFD", rx: 0 });
    rc(s, 0, 104, 1000, 336, { fill: "url(#lab-mar)", rx: 0 });
    const capas = [
      { y0: 20, y1: 104, t: "Entrenamiento", g: "Lo que se ve", d: ["Lo vistoso: sale en las noticias.", "A menudo no es lo más caro."] },
      { y0: 104, y1: 159, t: "Datos: adquisición y limpieza", g: "Coste real", d: ["Conseguir los datos, limpiarlos", "y prepararlos, una y otra vez."] },
      { y0: 159, y1: 214, t: "Etiquetado manual", g: "Coste real", d: ["Personas que etiquetan ejemplos:", "lento, caro y hay que revisarlo."] },
      { y0: 214, y1: 269, t: "Inferencia continua", g: "Coste real", d: ["Cada consulta cuesta, día tras día:", "el gasto no acaba al entrenar."] },
      { y0: 269, y1: 324, t: "Observabilidad", g: "Coste oculto", d: ["Métricas y registros para saber", "qué está pasando en producción."] },
      { y0: 324, y1: 379, t: "Gestión del drift (degradación)", g: "Coste oculto", d: ["Detectar cuándo el modelo se degrada", "porque cambian los datos, y reentrenar."] },
      { y0: 379, y1: 434, t: "Cumplimiento normativo", g: "Coste oculto", d: ["Protección de datos, auditorías", "y regulación (compliance)."] }
    ];
    const gIce = S("g", { "clip-path": "url(#lab-ice)" }, s);
    const fondos = ["#FFFFFF", "#EAF2FA", "#DFEAF5", "#EAF2FA", "#D3E1EF", "#C8D9EA", "#D3E1EF"];
    capas.forEach(function (c, k) {
      c.r = rc(gIce, 380, c.y0, 400, c.y1 - c.y0, { fill: fondos[k], rx: 0 });
      c.r.classList.add("clic");
      if (k) ln(gIce, 380, c.y0, 780, c.y0, { stroke: "#fff", sw: 2 });
    });
    S("polygon", { points: poli(forma), fill: "none", stroke: "#7C9BBB", "stroke-width": 2, "stroke-linejoin": "round" }, s);
    let ola = "M0,104"; for (let x = 0; x <= 1000; x += 20) ola += " Q" + (x + 10) + "," + (x / 20 % 2 ? 98 : 110) + " " + (x + 20) + ",104";
    pa(s, ola, { stroke: "#9CC0EA", sw: 2 });
    capas.forEach(function (c, k) {
      c.tt = tx(s, 578, (c.y0 + c.y1) / 2 + (k ? 5 : 14), c.t, { fs: k ? 14.5 : 16, fw: 700, anchor: "middle" });
      c.tt.setAttribute("pointer-events", "none");
    });
    // corchetes de grupo
    function corchete(y0, y1, t1, t2) {
      pa(s, "M786," + (y0 + 4) + " h10 v" + (y1 - y0 - 8) + " h-10", { stroke: INK, sw: 2 });
      tx(s, 810, (y0 + y1) / 2 - 12, t1, { fs: 16, fw: 800 });
      tx(s, 810, (y0 + y1) / 2 + 8, t2, { fs: 13, fill: INK, op: 0.8, lh: 1.3 });
    }
    tx(s, 810, 56, "Lo que se ve", { fs: 16, fw: 800 }); tx(s, 810, 76, "el entrenamiento", { fs: 13, fill: INK2 });
    corchete(104, 269, "Costes reales", ["datos, etiquetado", "e inferencia"]);
    corchete(269, 434, "Costes ocultos", ["observabilidad, deriva", "y cumplimiento"]);
    // panel de descripción
    const pan = S("g", {}, s);
    rc(pan, 24, 150, 330, 150, { fill: "#fff", stroke: "#B8C9DB", rx: 12 });
    const pG = tx(pan, 44, 182, "", { fs: 13, fw: 800, fill: ACC, ls: ".04em" });
    const pT = tx(pan, 44, 210, "", { fs: 19, fw: 800 });
    const pD = S("g", {}, pan);
    let sel = 0;
    function selecciona(k) {
      sel = k;
      capas.forEach(function (c, i) { c.r.setAttribute("fill", i === k ? ACC_L : fondos[i]); c.tt.setAttribute("fill", i === k ? ACC : INK); });
      pG.textContent = capas[k].g.toUpperCase(); pT.textContent = capas[k].t;
      while (pD.firstChild) pD.removeChild(pD.firstChild);
      tx(pD, 44, 242, capas[k].d, { fs: 15, fill: INK2, lh: 1.4 });
    }
    capas.forEach(function (c, k) { c.r.addEventListener("mouseenter", function () { selecciona(k); }); c.r.addEventListener("click", function () { selecciona(k); }); });
    selecciona(0);
    $("i4-play").addEventListener("click", async function () {
      const b = this; b.disabled = true;
      capas.forEach(function (c, k) { if (k) { c.r.setAttribute("opacity", 0.2); c.tt.setAttribute("opacity", 0.2); } });
      for (let k = 0; k < capas.length; k++) {
        capas[k].r.setAttribute("opacity", 1); capas[k].tt.setAttribute("opacity", 1);
        selecciona(k);
        await RN.espera(RED ? 0 : 1500);
      }
      b.disabled = false;
    });

    // ---------- deriva y PSI
    const cortes = [-1.2816, -0.8416, -0.5244, -0.2533, 0, 0.2533, 0.5244, 0.8416, 1.2816];
    const ND = 80, NM = 500, DIA_QUEJA = 65;
    let dias = [], diaAct = ND, alerta = null;
    const iDer = rango("i4-d", function (v) { return fmt(v, 2) + " σ"; }, function () { simula(); pintaDer(); });
    const iUmb = rango("i4-u", function (v) { return fmt(v, 2); }, function () { calcAlerta(); pintaDer(); });
    function simula() {
      const r = RN.rng(31), d = +iDer.value;
      dias = [];
      for (let k = 0; k <= ND; k++) {
        const mu = k < 30 ? 0 : d * Math.min(1, (k - 30) / 20);
        const cnt = new Array(10).fill(0), hb = new Array(32).fill(0);
        for (let i = 0; i < NM; i++) {
          const x = RN.normal(r) + mu;
          let b = 0; while (b < 9 && x > cortes[b]) b++;
          cnt[b]++;
          const h = Math.floor((x + 4) / 0.25); if (h >= 0 && h < 32) hb[h]++;
        }
        let psi = 0; cnt.forEach(function (c) { const a = (c + 0.5) / (NM + 5); psi += (a - 0.1) * Math.log(a / 0.1); });
        dias.push({ mu: mu, psi: psi, hb: hb });
      }
      calcAlerta();
    }
    function calcAlerta() { const u = +iUmb.value; alerta = null; for (let k = 0; k <= ND; k++) if (dias[k].psi > u) { alerta = k; break; } }
    const refC = []; for (let x = -4; x <= 4.0001; x += 0.05) refC.push([x, Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI)]);
    const gH = RN.grafica($("i4-hist"), {
      alto: 270, margen: { l: 52, r: 14 }, hover: false,
      x: { min: -4, max: 4, titulo: "valor de la entrada (en σ del entrenamiento)" }, y: { min: 0, max: 0.55, titulo: "densidad" },
      extras: function (ctx, g) {
        const d = dias[diaAct]; if (!d) return;
        ctx.fillStyle = RN.rgba(C.s2, 0.3); ctx.strokeStyle = C.s2; ctx.lineWidth = 1;
        d.hb.forEach(function (c, k) {
          const v = c / (NM * 0.25), x0 = g.sx(-4 + k * 0.25), x1 = g.sx(-4 + (k + 1) * 0.25);
          ctx.fillRect(x0 + 0.5, g.sy(v), x1 - x0 - 1, g.sy(0) - g.sy(v)); ctx.strokeRect(x0 + 0.5, g.sy(v), x1 - x0 - 1, g.sy(0) - g.sy(v));
        });
        textoC(ctx, "Día " + diaAct, g.m.l + 10, g.m.t + 18, { fs: 15, fw: 800 });
        textoC(ctx, "media de la entrada: " + num(d.mu, 2) + " σ", g.m.l + 10, g.m.t + 38, { fs: 13, fill: INK2 });
      }
    });
    const gP = RN.grafica($("i4-psi"), {
      alto: 270, margen: { l: 52, r: 14 },
      x: { min: 0, max: ND, titulo: "día" }, y: { min: 0, max: 0.8, titulo: "PSI" },
      extras: function (ctx, g) {
        ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = MUT; ctx.lineWidth = 1.2;
        [30, DIA_QUEJA].forEach(function (d) { const X = g.sx(d); ctx.beginPath(); ctx.moveTo(X, g.m.t); ctx.lineTo(X, g.h - g.m.b); ctx.stroke(); });
        textoC(ctx, "empieza la deriva", g.sx(30) + 6, g.m.t + 14, { fs: 12.5, fill: INK2, fw: 600 });
        textoC(ctx, "sin monitorización:", g.sx(DIA_QUEJA) - 6, g.sy(0.13) - 4, { fs: 12.5, fill: INK2, fw: 600, align: "right" });
        textoC(ctx, "queja del usuario", g.sx(DIA_QUEJA) - 6, g.sy(0.13) + 12, { fs: 12.5, fill: INK2, fw: 600, align: "right" });
        ctx.restore();
        if (alerta !== null && alerta <= diaAct) {
          const X = g.sx(alerta), Y = g.sy(Math.min(g.op.y.max, dias[alerta].psi));
          ctx.beginPath(); ctx.arc(X, Y, 7, 0, 7); ctx.fillStyle = ACC; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke();
          textoC(ctx, "alerta: día " + alerta, X - 10, Y - 10, { fs: 13.5, fw: 800, fill: ACC, align: "right" });
        }
      }
    });
    const pasosI = Array.from($("i4-pasos").children);
    function pintaDer() {
      const u = +iUmb.value;
      const pts = dias.slice(0, diaAct + 1).map(function (d, k) { return [k, d.psi]; });
      let mx = 0.6; dias.forEach(function (d) { mx = Math.max(mx, d.psi * 1.1); });
      gP.op.y.max = Math.ceil(mx * 10) / 10;
      gP.dibujar([{ nombre: "PSI", color: C.s1, puntos: pts, ancho: 2.5 }, { nombre: "umbral", color: INK2, puntos: [[0, u], [ND, u]], discontinua: true, ancho: 1.5 }]);
      gH.dibujar([{ nombre: "referencia", color: C.s1, puntos: refC, ancho: 2.5 }]);
      const hitos = [0, 30, alerta === null ? Infinity : alerta, alerta === null ? Infinity : alerta + 3, alerta === null ? Infinity : alerta + 6, alerta === null ? Infinity : alerta + 9];
      pasosI.forEach(function (li, k) {
        const hecho = diaAct >= hitos[k], sig = k + 1 < hitos.length ? diaAct >= hitos[k + 1] : false;
        li.classList.toggle("hecho", hecho && sig); li.classList.toggle("activo", hecho && !sig);
      });
      kpis($("i4-kpis"), [
        ["Alerta automática", alerta === null ? "no salta" : "día " + alerta],
        ["Sin monitorización", "≈ día " + DIA_QUEJA, "ilustrativo"]
      ]);
    }
    simula(); pintaDer();
    let corriendo = false;
    $("i4-sim").addEventListener("click", async function () {
      if (corriendo) return; corriendo = true; this.disabled = true;
      if (RED) { diaAct = ND; pintaDer(); }
      else { for (let k = 0; k <= ND; k++) { diaAct = k; pintaDer(); await RN.espera(90); } }
      corriendo = false; this.disabled = false;
    });

    // ---------- mapa arrastrable
    const sm = base($("i4-mapa"), 1000, 400);
    const X0 = 80, X1 = 980, Y0 = 24, Y1 = 352;
    rc(sm, X0, Y0, (X1 - X0) / 2, (Y1 - Y0) / 2, { fill: ACC_L, rx: 0, op: 0.7 });
    rc(sm, X0, Y0, X1 - X0, Y1 - Y0, { fill: "none", stroke: LINEA, rx: 0 });
    ln(sm, (X0 + X1) / 2, Y0, (X0 + X1) / 2, Y1, { stroke: "#C3CFDC", dash: "5 5" });
    ln(sm, X0, (Y0 + Y1) / 2, X1, (Y0 + Y1) / 2, { stroke: "#C3CFDC", dash: "5 5" });
    const fA = flecha(sm, INK2);
    ln(sm, X0, Y1 + 18, X1 - 4, Y1 + 18, { stroke: INK2, sw: 1.5, marker: fA });
    tx(sm, (X0 + X1) / 2, Y1 + 40, "lo que se ve: glamur, visibilidad →", { fs: 14, fw: 700, anchor: "middle", fill: INK2 });
    ln(sm, X0 - 18, Y1, X0 - 18, Y0 + 4, { stroke: INK2, sw: 1.5, marker: fA });
    const ty = tx(sm, 0, 0, "lo que se rompe si falla →", { fs: 14, fw: 700, anchor: "middle", fill: INK2 });
    ty.setAttribute("transform", "translate(" + (X0 - 30) + "," + ((Y0 + Y1) / 2) + ") rotate(-90)");
    tx(sm, X0 + 12, Y0 + 22, "Poco glamurosa, muy crítica", { fs: 15, fw: 800, fill: ACC });
    tx(sm, X1 - 12, Y0 + 22, "Vistosa y crítica", { fs: 14, fw: 700, fill: MUT, anchor: "end" });
    tx(sm, X0 + 12, Y1 - 12, "Ni vistosa ni crítica", { fs: 14, fw: 700, fill: MUT });
    tx(sm, X1 - 12, Y1 - 12, "Vistosa, poco crítica", { fs: 14, fw: 700, fill: MUT, anchor: "end" });
    const piezas = [["Limpieza de datos", 0.15, 0.90], ["Etiquetado", 0.40, 0.90], ["Monitorización y alertas", 0.24, 0.79], ["Pipeline de datos", 0.12, 0.68], ["Cumplimiento normativo", 0.37, 0.68], ["Versionado de datos y modelos", 0.25, 0.57],
      ["Entrenar a gran escala", 0.72, 0.80], ["Arquitectura del modelo", 0.80, 0.64], ["Interfaz de usuario", 0.64, 0.36], ["Demo para la dirección", 0.84, 0.20]];
    piezas.forEach(function (p) {
      const g = S("g", { class: "chip-arr" }, sm);
      const w = p[0].length * 7.6 + 34;
      rc(g, -w / 2, -15, w, 30, { fill: "#fff", stroke: INK2, sw: 1.5, rx: 15 });
      for (let k = 0; k < 3; k++) { ci(g, -w / 2 + 12, -5 + k * 5, 1.4, { fill: MUT }); ci(g, -w / 2 + 16.5, -5 + k * 5, 1.4, { fill: MUT }); }
      tx(g, 9, 5, p[0], { fs: 14, fw: 600, anchor: "middle" });
      let x = X0 + p[1] * (X1 - X0), y = Y1 - p[2] * (Y1 - Y0);
      g.setAttribute("transform", "translate(" + x + "," + y + ")");
      let arr = null;
      g.addEventListener("pointerdown", function (ev) { const q = puntoSVG(sm, ev); arr = [q.x - x, q.y - y]; g.setPointerCapture(ev.pointerId); sm.appendChild(g); });
      g.addEventListener("pointermove", function (ev) {
        if (!arr) return; const q = puntoSVG(sm, ev);
        x = RN.limita(q.x - arr[0], X0 + w / 2, X1 - w / 2); y = RN.limita(q.y - arr[1], Y0 + 15, Y1 - 15);
        g.setAttribute("transform", "translate(" + x + "," + y + ")");
      });
      g.addEventListener("pointerup", function () { arr = null; });
    });
  })();

  // ================================================================== 5 · INFERENCIA
  (function () {
    const getMod = seg("n5-mod", pinta), getPrec = seg("n5-prec", pinta);
    const iB = rango("n5-b", function (v) { return mil(Math.pow(2, v)); }, pinta);
    const iQ = rango("n5-q", function (v) { return mil(Math.pow(10, v)); }, pinta);
    const iP = rango("n5-p", function (v) { return fmt(v, 2) + " €"; }, pinta);
    function coste(N, bits, B, Qd, P) {
      const W = N * bits / 8, g = Math.max(1, Math.ceil(W / 72e9));
      const tm = W / (g * GPU.bw), tc = 2 * N * B / (g * GPU.pico), t = Math.max(tm, tc);
      const tok = B / t, qrep = tok / 300, Qs = Qd / 86400;
      const rep = Math.max(1, Math.ceil(Qs / qrep));
      const dia = rep * g * 24 * P;
      return { g: g, rep: rep, lat: 300 * t, c1000: dia / (Qd / 1000), mes: dia * 30, t: t };
    }
    const s = base($("n5-costes"), 1000, 372);
    const X0 = 250, X1 = 860, D0 = -4, D1 = 3, xc = function (e) { return X0 + (Math.log10(Math.max(e, 1e-4)) - D0) / (D1 - D0) * (X1 - X0); };
    const MODS = [["70", 70e9, "Grande", "70.000 M"], ["7", 7e9, "Mediano", "7.000 M"], ["1", 1e9, "Destilado", "1.000 M"]], PRS = [["16", "FP16", C.s1], ["8", "INT8", C.s2], ["4", "INT4", C.s3]];
    for (let e = D0; e <= D1; e++) { const x = xc(Math.pow(10, e)); ln(s, x, 18, x, 330, { stroke: LINEA, sw: 1 }); tx(s, x, 352, euros(Math.pow(10, e)).replace(/(,\d*?)0+ €/, "$1 €").replace(", €", " €"), { fs: 12.5, fill: MUT, anchor: "middle" }); }
    tx(s, (X0 + X1) / 2, 370, "coste por 1.000 consultas (escala logarítmica)", { fs: 12.5, fill: INK2, anchor: "middle", fw: 600 });
    const gB = S("g", {}, s);
    function pinta() {
      const B = Math.pow(2, +iB.value), Qd = Math.pow(10, +iQ.value), P = +iP.value, m = getMod(), b = getPrec();
      while (gB.firstChild) gB.removeChild(gB.firstChild);
      MODS.forEach(function (M, i) {
        PRS.forEach(function (pr, j) {
          const y = 22 + i * 104 + j * 30, c = coste(M[1], +pr[0], B, Qd, P), act = M[0] === m && pr[0] === b;
          const g = S("g", { class: "clic" }, gB);
          rc(g, 6, y - 3, 988, 30, { fill: act ? ACC_L : "#fff", op: act ? 1 : 0, rx: 6 });
          if (j === 0) { tx(g, 16, y + 17, M[2], { fs: 14.5, fw: 800 }); tx(g, 16, y + 47, M[3] + " parám.", { fs: 13, fill: INK2 }); }
          tx(g, X0 - 12, y + 17, pr[1], { fs: 13.5, fw: act ? 800 : 500, anchor: "end" });
          const w = xc(c.c1000) - X0;
          rc(g, X0, y + 3, Math.max(3, w), 18, { fill: pr[2], rx: 4, stroke: act ? ACC : null, sw: 2.5 });
          tx(g, X0 + Math.max(3, w) + 8, y + 17, euros(c.c1000), { fs: 14, fw: 800 });
          tx(g, X0 + Math.max(3, w) + 8 + euros(c.c1000).length * 8.4 + 6, y + 17, "· " + fmt(c.lat, c.lat < 10 ? 1 : 0) + " s", { fs: 13, fill: MUT });
          g.addEventListener("click", function () { ponerSeg("n5-mod", M[0]); ponerSeg("n5-prec", pr[0]); pinta(); });
        });
      });
      const M = MODS.find(function (x) { return x[0] === m; }), c = coste(M[1], +b, B, Qd, P);
      kpis($("n5-kpis"), [
        ["GPU por réplica", String(c.g)], ["Réplicas", mil(c.rep)],
        ["Latencia de una respuesta", fmt(c.lat, c.lat < 10 ? 2 : 1) + " s", "300 tokens de " + tiempo(c.t)],
        ["Coste por 1.000 consultas", euros(c.c1000)], ["Coste al mes", euros(c.mes)]
      ]);
    }
    pinta();

    // ---------- destilación
    const capP = [4, 8, 8, 3], capA = [4, 3, 3];
    function pesosAzar(capas, sem) { const r = RN.rng(sem); const W = []; for (let l = 0; l < capas.length - 1; l++) { const Wl = []; for (let j = 0; j < capas[l + 1]; j++) { const f = []; for (let i = 0; i < capas[l]; i++) f.push(RN.normal(r)); Wl.push(f); } W.push(Wl); } return W; }
    function nPar(c) { let n = 0; for (let l = 0; l < c.length - 1; l++) n += c[l] * c[l + 1] + c[l + 1]; return n; }
    const titulos = ["", "", "", ""];
    const redP = RN.red($("n5-prof"), { capas: capP, ancho: 360, alto: 300, radio: 11, titulos: titulos, margen: 40 });
    redP.ponerPesos(pesosAzar(capP, 3));
    tx($("n5-prof"), 180, 18, "Profesor · " + nPar(capP) + " parámetros", { fs: 15, fw: 800, anchor: "middle" });
    const redA = RN.red($("n5-alum"), { capas: capA, ancho: 360, alto: 300, radio: 11, titulos: titulos, margen: 70 });
    redA.ponerPesos(pesosAzar(capA, 8));
    tx($("n5-alum"), 180, 18, "Alumno · " + nPar(capA) + " parámetros", { fs: 15, fw: 800, anchor: "middle" });
    const sp = base($("n5-probs"), 290, 300);
    tx(sp, 145, 22, "Probabilidades de salida", { fs: 14.5, fw: 800, anchor: "middle" });
    const clases = ["perro", "lobo", "gato"], PROF = [0.72, 0.24, 0.04];
    const barras = clases.map(function (c, k) {
      const y = 60 + k * 70;
      tx(sp, 14, y + 12, c, { fs: 14, fw: 700 });
      rc(sp, 70, y, 190, 16, { fill: SUAVE, rx: 3 }); rc(sp, 70, y + 22, 190, 16, { fill: SUAVE, rx: 3 });
      const bp = rc(sp, 70, y, 0, 16, { fill: C.s1, rx: 3 }), ba = rc(sp, 70, y + 22, 0, 16, { fill: C.s2, rx: 3 });
      const tp = tx(sp, 0, y + 13, "", { fs: 13, fw: 700 }), ta = tx(sp, 0, y + 35, "", { fs: 13, fw: 700 });
      return { bp: bp, ba: ba, tp: tp, ta: ta };
    });
    rc(sp, 40, 268, 12, 12, { fill: C.s1, rx: 2 }); tx(sp, 57, 279, "profesor", { fs: 13, fill: INK2 });
    rc(sp, 140, 268, 12, 12, { fill: C.s2, rx: 2 }); tx(sp, 157, 279, "alumno", { fs: 13, fill: INK2 });
    function ponProbs(pp, pa_) {
      barras.forEach(function (b, k) {
        const wp = 190 * pp[k], wa = 190 * pa_[k];
        b.bp.setAttribute("width", wp); b.ba.setAttribute("width", wa);
        b.tp.setAttribute("x", 70 + wp + 5); b.tp.textContent = fmt(pp[k], 2);
        b.ta.setAttribute("x", 70 + wa + 5); b.ta.textContent = fmt(pa_[k], 2);
      });
    }
    const FINAL = [0.69, 0.26, 0.05];
    ponProbs(PROF, FINAL);
    redP.ponerActivaciones(3, PROF); redA.ponerActivaciones(2, FINAL);
    $("n5-dest").addEventListener("click", async function () {
      const b = this; b.disabled = true;
      const u = [1 / 3, 1 / 3, 1 / 3];
      ponProbs([0, 0, 0], u); redA.ponerActivaciones(2, u);
      for (let l = 0; l < 3; l++) await redP.pulso(l, { ms: RED ? 0 : 450 });
      await RN.tween(RED ? 0 : 500, function (t) { ponProbs(PROF.map(function (v) { return v * t; }), u); });
      redP.ponerActivaciones(3, PROF);
      let prev = u;
      for (let ep = 1; ep <= 4; ep++) {
        for (let l = 0; l < 2; l++) await redA.pulso(l, { ms: RED ? 0 : 300, color: C.s2 });
        const f = 1 - Math.pow(0.45, ep), obj = u.map(function (v, k) { return RN.lerp(v, FINAL[k], f); }), ini = prev;
        await RN.tween(RED ? 0 : 400, function (t) { const q = ini.map(function (v, k) { return RN.lerp(v, obj[k], t); }); ponProbs(PROF, q); redA.ponerActivaciones(2, q); });
        prev = obj;
      }
      ponProbs(PROF, FINAL); redA.ponerActivaciones(2, FINAL);
      b.disabled = false;
    });

    // ---------- triángulo de compromisos
    const st = base($("n5-tri"), 1000, 390);
    const V = [[250, 44], [52, 352], [448, 352]], NOM = ["Calidad", "Frescura", "Personalización"], COL = [C.s1, C.s2, C.s3];
    S("polygon", { points: poli(V), fill: SUAVE, stroke: INK2, "stroke-width": 2, "stroke-linejoin": "round" }, st);
    V.forEach(function (v, k) { const m = [(V[(k + 1) % 3][0] + V[(k + 2) % 3][0]) / 2, (V[(k + 1) % 3][1] + V[(k + 2) % 3][1]) / 2]; ln(st, v[0], v[1], m[0], m[1], { stroke: LINEA, sw: 1 }); });
    V.forEach(function (v, k) { ci(st, v[0], v[1], 9, { fill: COL[k], stroke: "#fff", sw: 2 }); });
    tx(st, 250, 28, "Calidad", { fs: 16, fw: 800, anchor: "middle" });
    tx(st, 52, 380, "Frescura", { fs: 16, fw: 800, anchor: "middle" });
    tx(st, 448, 380, "Personalización", { fs: 16, fw: 800, anchor: "middle" });
    const PAL = [["Modelo destilado o cuantizado", "Respuestas más cortas"], ["Caché de respuestas frecuentes", "Precalcular por lotes de noche", "Actualizar índice o modelo con menos frecuencia"], ["Respuestas comunes para todos (caché compartida)", "Menos contexto propio de cada usuario"]];
    const grupos = PAL.map(function (lst, k) {
      const y = 22 + k * 128, g = S("g", {}, st);
      ci(g, 538, y + 2, 7, { fill: COL[k] });
      const h = tx(g, 552, y + 8, "", { fs: 16, fw: 800 });
      rc(g, 552, y + 18, 220, 10, { fill: SUAVE, stroke: LINEA, rx: 5 });
      const bar = rc(g, 552, y + 18, 0, 10, { fill: COL[k], rx: 5 });
      const sub = tx(g, 552, y + 48, "", { fs: 13, fw: 700, fill: INK2 });
      const pal = S("g", {}, g);
      lst.forEach(function (t, i) { tx(pal, 560, y + 68 + i * 19, "· " + t, { fs: 14.5 }); });
      return { h: h, bar: bar, sub: sub, pal: pal };
    });
    const asa = S("g", { class: "chip-arr" }, st);
    ci(asa, 0, 0, 22, { fill: RN.rgba(INK, 0.12) }); ci(asa, 0, 0, 12, { fill: INK, stroke: "#fff", sw: 2.5 });
    let w = [1 / 3, 1 / 3, 1 / 3];
    function ponAsa() {
      const x = w[0] * V[0][0] + w[1] * V[1][0] + w[2] * V[2][0], y = w[0] * V[0][1] + w[1] * V[1][1] + w[2] * V[2][1];
      asa.setAttribute("transform", "translate(" + x + "," + y + ")");
      grupos.forEach(function (g, k) {
        g.h.textContent = NOM[k] + " · la proteges al " + mil(w[k] * 100) + " %";
        g.bar.setAttribute("width", 220 * w[k]);
        const libre = 1 - w[k];
        g.sub.textContent = libre > 0.6 ? "Palancas de ahorro disponibles si la sacrificas:" : libre > 0.4 ? "Palancas que podrías usar con cuidado:" : "Palancas que no quieres tocar:";
        g.pal.setAttribute("opacity", (0.22 + 0.78 * Math.pow(libre, 1.4)).toFixed(2));
      });
    }
    function bary(x, y) {
      const [a, b, c] = V, det = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
      let l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / det, l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / det;
      let l3 = 1 - l1 - l2;
      l1 = Math.max(0, l1); l2 = Math.max(0, l2); l3 = Math.max(0, l3); const sm = l1 + l2 + l3;
      return [l1 / sm, l2 / sm, l3 / sm];
    }
    let arr = false;
    asa.addEventListener("pointerdown", function (ev) { arr = true; asa.setPointerCapture(ev.pointerId); });
    asa.addEventListener("pointermove", function (ev) { if (!arr) return; const q = puntoSVG(st, ev); w = bary(q.x, q.y); ponAsa(); });
    asa.addEventListener("pointerup", function () { arr = false; });
    st.addEventListener("click", function (ev) { const q = puntoSVG(st, ev); if (q.x < 470) { w = bary(q.x, q.y); ponAsa(); } });
    ponAsa();
  })();

  // ================================================================== 6 · ROI
  (function () {
    // ---------- mosaico de casos animados
    const sa = base($("r6-a"), 240, 150), sbq = base($("r6-b"), 240, 150), sc = base($("r6-c"), 240, 150), sd = base($("r6-d"), 240, 150);
    function lista(svg, y0, n, conBusq) {
      const items = [];
      for (let k = 0; k < n; k++) {
        const g = S("g", {}, svg);
        rc(g, 0, 0, 200, 26, { fill: "#fff", stroke: LINEA, rx: 5 });
        rc(g, 5, 4, 18, 18, { fill: RN.serie[k], rx: 3, op: 0.85 });
        rc(g, 30, 7, 90 - k * 12, 5, { fill: "#C3CFDC", rx: 2 }); rc(g, 30, 15, 60, 4, { fill: LINEA, rx: 2 });
        const barra = rc(g, 140, 10, 0, 7, { fill: ACC, rx: 3 });
        items.push({ g: g, y: y0 + k * 31, barra: barra, p: 0.9 - k * 0.2 });
      }
      return items;
    }
    if (true) { rc(sbq, 20, 10, 200, 22, { fill: "#fff", stroke: INK2, rx: 11 }); ci(sbq, 34, 21, 5, { fill: "none", stroke: INK2, sw: 1.8 }); ln(sbq, 38, 25, 42, 29, { stroke: INK2, sw: 1.8 }); tx(sbq, 50, 26, "zapatillas de montaña", { fs: 13, fill: INK2 }); }
    tx(sa, 20, 20, "Para ti", { fs: 13, fw: 800 });
    const LA = lista(sa, 28, 4), LB = lista(sbq, 40, 3);
    // fraude
    rc(sc, 104, 18, 30, 112, { fill: RN.mezcla("#ffffff", C.s1, 0.15), stroke: C.s1, rx: 6 });
    tx(sc, 119, 142, "modelo", { fs: 12, fill: INK2, anchor: "middle" });
    tx(sc, 200, 20, "aprobada", { fs: 12, fill: INK2, anchor: "middle" }); tx(sc, 200, 142, "bloqueada", { fs: 12, fill: INK2, anchor: "middle" });
    const trans = []; for (let k = 0; k < 5; k++) { const g = S("g", {}, sc); rc(g, -14, -9, 28, 18, { fill: "#fff", stroke: INK2, rx: 3 }); tx(g, 0, 4, "€", { fs: 12, fw: 800, anchor: "middle" }); const m = S("g", {}, g); trans.push({ g: g, m: m, f: k / 5 }); }
    // visión
    rc(sd, 10, 104, 220, 12, { fill: "#C3CFDC", rx: 6 });
    for (let k = 0; k < 9; k++) ci(sd, 20 + k * 25, 110, 4, { fill: "#fff", stroke: "#9AA7B4", sw: 1 });
    rc(sd, 98, 22, 34, 22, { fill: INK2, rx: 4 }); ci(sd, 115, 33, 6, { fill: "#fff" }); ci(sd, 115, 33, 3, { fill: C.s1 });
    S("polygon", { points: "106,44 124,44 140,100 90,100", fill: RN.rgba(C.s4, 0.18) }, sd);
    const piezasD = []; for (let k = 0; k < 4; k++) { const g = S("g", {}, sd); rc(g, -11, -11, 22, 22, { fill: RN.mezcla("#ffffff", C.s3, 0.5), stroke: C.s3, rx: 3 }); const grieta = pa(g, "M-6,-9 L0,-1 L-3,3 L4,10", { stroke: C.bad, sw: 2 }); piezasD.push({ g: g, f: k / 4, mala: k === 2, grieta: grieta }); }
    const onda = pa(sd, "", { stroke: C.s7, sw: 2 });
    tx(sd, 186, 22, "voz", { fs: 12, fill: INK2, anchor: "middle" });
    let fase = 0;
    function cuadro(t) {
      // listas que se reordenan
      [LA, LB].forEach(function (L, q) {
        const per = q ? 3.2 : 2.6, ciclo = Math.floor(t / per) % L.length;
        const orden = L.map(function (_, k) { return (k + ciclo) % L.length; });
        L.forEach(function (it, k) {
          const slot = orden.indexOf(k), objY = (q ? 40 : 28) + slot * 31;
          it.y += (objY - it.y) * 0.12;
          it.g.setAttribute("transform", "translate(20," + it.y.toFixed(1) + ")");
          it.barra.setAttribute("width", (50 * (1 - slot / L.length) + 4).toFixed(1));
        });
      });
      // fraude
      trans.forEach(function (tr, k) {
        const f = (tr.f + t * 0.16) % 1, mala = k === 3;
        let x = -20 + f * 250, y = 74;
        if (x > 119) { const d = Math.min(1, (x - 119) / 50); y = 74 + (mala ? 1 : -1) * d * 34; }
        tr.g.setAttribute("transform", "translate(" + x.toFixed(1) + "," + y.toFixed(1) + ")");
        while (tr.m.firstChild) tr.m.removeChild(tr.m.firstChild);
        if (x > 125) marcaOK(tr.m, 15, -9, 6, !mala);
      });
      // cinta transportadora
      piezasD.forEach(function (p) {
        const f = (p.f + t * 0.12) % 1; let x = 10 + f * 230, y = 92;
        if (p.mala && x > 160) { y = 92 + Math.min(40, (x - 160) * 1.2); }
        p.g.setAttribute("transform", "translate(" + x.toFixed(1) + "," + y.toFixed(1) + ")");
        p.grieta.setAttribute("opacity", p.mala ? 1 : 0);
      });
      let d = "M160,40"; for (let x = 0; x <= 60; x += 2) d += " L" + (160 + x) + "," + (48 + Math.sin(x * 0.35 + t * 6) * 9 * Math.sin(x / 60 * Math.PI)).toFixed(1);
      onda.setAttribute("d", d);
    }
    LA.forEach(function (it) { it.y = it.y; }); cuadro(0.5);
    if (!RED) bucle(function (dt, t) { cuadro(t); }, sa).iniciar();

    // ---------- valor de una mejora
    const ent = {}, VOL = [], VAL = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];
    for (let e = 1; e <= 9; e++) [1, 2, 5].forEach(function (m) { if (VOL.length < 25) VOL.push(m * Math.pow(10, e)); });
    ["av", "ae", "am", "bv", "be", "bm"].forEach(function (k) {
      const f = k[1] === "v" ? function (v) { return mil(VOL[v]); } : k[1] === "e" ? function (v) { const e = VAL[v]; return fmt(e, e < 0.01 ? 3 : 2) + " €"; } : function (v) { return fmt(v, v % 1 ? 1 : 0) + " %"; };
      ent[k] = rango("r6-" + k, f, pintaV);
    });
    const sv = base($("r6-valor"), 1000, 340);
    const gV = S("g", {}, sv);
    function pintaV() {
      const A = { v: VOL[+ent.av.value], e: VAL[+ent.ae.value], m: +ent.am.value / 100 }, B = { v: VOL[+ent.bv.value], e: VAL[+ent.be.value], m: +ent.bm.value / 100 };
      A.val = A.v * A.e * A.m * 365; B.val = B.v * B.e * B.m * 365;
      const mx = Math.max(A.val, B.val);
      while (gV.firstChild) gV.removeChild(gV.firstChild);
      [[A, 250, "A · Ranking de un gran buscador", C.s1, "ae"], [B, 750, "B · Asistente interno", C.s2, "be"]].forEach(function (q) {
        const o = q[0], lado = Math.max(2, 220 * Math.sqrt(o.val / mx));
        tx(gV, q[1], 26, q[2], { fs: 16, fw: 800, anchor: "middle" });
        tx(gV, q[1], 48, mil(o.v) + " × " + fmt(o.e, o.e < 0.01 ? 3 : 2) + " € × " + fmt(o.m * 100, (o.m * 100) % 1 ? 1 : 0) + " % × 365 días", { fs: 13.5, fill: INK2, anchor: "middle" });
        rc(gV, q[1] - lado / 2, 318 - lado, lado, lado, { fill: RN.mezcla("#ffffff", q[3], 0.3), stroke: q[3], sw: 2, rx: 3 });
        tx(gV, q[1], lado < 12 ? 240 : Math.min(318 - lado - 12, 300), "= " + euros(o.val) + " al año", { fs: 20, fw: 800, anchor: "middle" });
        if (lado < 12) { const fl = flecha(sv, INK2); ln(gV, q[1] + 70, 278, q[1] + 8, 314, { stroke: INK2, marker: fl }); tx(gV, q[1] + 76, 280, "aquí: casi no se ve", { fs: 13, fill: INK2 }); }
      });
      const r = A.val >= B.val ? A.val / B.val : B.val / A.val;
      tx(gV, 500, 170, "×" + (r < 10 ? fmt(r, 1) : mil(r)), { fs: 30, fw: 800, anchor: "middle", fill: ACC });
      tx(gV, 500, 194, (A.val >= B.val ? "A" : "B") + " vale más que " + (A.val >= B.val ? "B" : "A"), { fs: 14, fill: INK2, anchor: "middle" });
    }
    pintaV();

    // ---------- A/B, canary y sombra
    const s = base($("r6-trafico"), 1000, 330);
    const fl1 = flecha(s, "#B8C2CC");
    // usuarios
    for (let k = 0; k < 3; k++) { const x = 40 + k * 30, y = 150 + (k % 2) * 16; ci(s, x, y - 14, 9, { fill: INK2 }); pa(s, "M" + (x - 13) + "," + (y + 18) + " a13,13 0 0 1 26,0 z", { fill: INK2 }); }
    tx(s, 70, 210, "Usuarios", { fs: 14, fw: 700, anchor: "middle" });
    S("polygon", { points: "300,135 330,165 300,195 270,165", fill: "#fff", stroke: INK2, "stroke-width": 2 }, s);
    tx(s, 300, 220, "Enrutador", { fs: 14, fw: 700, anchor: "middle" });
    ln(s, 130, 165, 268, 165, { stroke: "#D5DDE6", sw: 6 });
    pa(s, "M330,165 C400,165 400,80 470,80", { stroke: "#D5DDE6", sw: 6 });
    pa(s, "M330,165 C400,165 400,250 470,250", { stroke: "#D5DDE6", sw: 6 });
    rc(s, 470, 40, 200, 80, { fill: RN.mezcla("#ffffff", C.s1, 0.12), stroke: C.s1, sw: 2, rx: 10 });
    tx(s, 570, 76, "v1 · modelo actual", { fs: 15, fw: 800, anchor: "middle" });
    const tv1 = tx(s, 570, 98, "", { fs: 13, fill: INK2, anchor: "middle" });
    rc(s, 470, 210, 200, 80, { fill: RN.mezcla("#ffffff", C.s2, 0.12), stroke: C.s2, sw: 2, rx: 10 });
    tx(s, 570, 246, "v2 · modelo nuevo", { fs: 15, fw: 800, anchor: "middle" });
    const tv2 = tx(s, 570, 268, "", { fs: 13, fill: INK2, anchor: "middle" });
    const gReg = S("g", {}, s); rc(gReg, 694, 232, 84, 36, { fill: "#fff", stroke: INK2, sw: 1.5, rx: 6, dash: "4 3" }); tx(gReg, 736, 255, "registro", { fs: 13, fw: 700, anchor: "middle" });
    const panel = S("g", {}, s);
    const gP = S("g", {}, s);
    const getModo = seg("r6-modo", reinicia), getPct = seg("r6-pct", function () { pct2 = +getPct(); });
    let pct2 = 0.05;
    $("r6-back").addEventListener("click", function () { pct2 = 0; ponerSeg("r6-pct", "x"); });
    let parts = [], cuenta = null, acum = 0;
    const rr = RN.rng(77);
    function reinicia() {
      const m = getModo();
      $("r6-cctl").hidden = m !== "canary"; $("r6-back").hidden = m !== "canary";
      if (m === "canary") { pct2 = +getPct(); }
      gReg.setAttribute("opacity", m === "sombra" ? 1 : 0.12);
      parts.forEach(function (p) { p.c.remove(); if (p.c2) p.c2.remove(); }); parts = [];
      cuenta = { n1: 0, n2: 0, k1: 0, k2: 0, e1: 0, e2: 0, coinc: 0, comp: 0 };
      tv1.textContent = ""; tv2.textContent = m === "sombra" ? "solo recibe copias" : "";
      pintaPanel();
    }
    const RUTA_IN = [[130, 165], [270, 165]];
    function ruta(v) { // de enrutador a versión
      const y = v === 1 ? 80 : 250;
      return function (f) { const t = f, x = Math.pow(1 - t, 3) * 330 + 3 * Math.pow(1 - t, 2) * t * 400 + 3 * (1 - t) * t * t * 400 + t * t * t * 470; const yy = Math.pow(1 - t, 3) * 165 + 3 * Math.pow(1 - t, 2) * t * 165 + 3 * (1 - t) * t * t * y + t * t * t * y; return [x, yy]; };
    }
    function nueva() {
      const m = getModo();
      let v = 1;
      if (m === "ab") v = rr() < 0.5 ? 1 : 2;
      else if (m === "canary") v = rr() < pct2 ? 2 : 1;
      const p = { t: 0, v: v, y0: 165 + (rr() - 0.5) * 20, c: ci(gP, 130, 165, 5.5, { fill: INK2, stroke: "#fff", sw: 1.2 }) };
      if (m === "sombra") p.c2 = ci(gP, 300, 165, 5, { fill: "#fff", stroke: C.s2, sw: 2, op: 0 });
      parts.push(p);
    }
    function pos(p) { // 0-1 entrada, 1-2 hacia versión, 2-2,3 proceso, 2,3-3,3 respuesta
      const t = p.t;
      if (t < 1) return [RN.lerp(130, 270, t), RN.lerp(p.y0, 165, t)];
      if (t < 2) return ruta(p.v)(t - 1);
      const bx = 470, by = p.v === 1 ? 80 : 250;
      if (t < 2.3) return [bx + 20, by];
      const f = Math.min(1, (t - 2.3));
      if (f < 0.55) return ruta(p.v)(1 - f / 0.55);
      const h = (f - 0.55) / 0.45; return [RN.lerp(330, 130, h), RN.lerp(165, p.y0, h)];
    }
    function llega(p) {
      const m = getModo();
      if (m === "sombra") { cuenta.n1++; cuenta.comp++; if (rr() < 0.94) cuenta.coinc++; return; }
      if (p.v === 1) { cuenta.n1++; if (rr() < (m === "ab" ? 0.10 : 0)) cuenta.k1++; if (rr() < 0.005) cuenta.e1++; }
      else { cuenta.n2++; if (rr() < (m === "ab" ? 0.12 : 0)) cuenta.k2++; if (rr() < 0.02) cuenta.e2++; }
    }
    function filaPanel(y, et, v1, v2, f1, f2) {
      tx(panel, 806, y, et, { fs: 13, fw: 700, fill: INK2 });
      [[v1, f1, C.s1, 0], [v2, f2, C.s2, 1]].forEach(function (q) {
        const yy = y + 12 + q[3] * 22;
        tx(panel, 806, yy + 11, q[3] ? "v2" : "v1", { fs: 13, fw: 700 });
        rc(panel, 832, yy, 90, 14, { fill: SUAVE, rx: 3 }); rc(panel, 832, yy, 90 * RN.limita(q[1], 0, 1), 14, { fill: q[2], rx: 3 });
        tx(panel, 928, yy + 12, q[0], { fs: 13, fw: 700 });
      });
    }
    function pintaPanel() {
      while (panel.firstChild) panel.removeChild(panel.firstChild);
      rc(panel, 790, 20, 200, 290, { fill: "#fff", stroke: LINEA, rx: 10 });
      const m = getModo(), c = cuenta;
      tx(panel, 806, 46, m === "ab" ? "Métrica de negocio" : m === "canary" ? "Salud de v2" : "Comparación en sombra", { fs: 14.5, fw: 800 });
      if (m === "ab") {
        const r1 = c.n1 ? c.k1 / c.n1 : 0, r2 = c.n2 ? c.k2 / c.n2 : 0;
        filaPanel(76, "peticiones", mil(c.n1), mil(c.n2), c.n1 / Math.max(1, c.n1 + c.n2) * 2 * 0.5, c.n2 / Math.max(1, c.n1 + c.n2));
        filaPanel(146, "conversión", pct(r1), pct(r2), r1 * 5, r2 * 5);
        const p = (c.k1 + c.k2) / Math.max(1, c.n1 + c.n2), se = Math.sqrt(p * (1 - p) * (1 / Math.max(1, c.n1) + 1 / Math.max(1, c.n2)));
        const z = se > 0 ? (r2 - r1) / se : 0;
        tx(panel, 806, 236, "z = " + num(z, 2), { fs: 15, fw: 800 });
        tx(panel, 806, 256, Math.abs(z) > 1.96 ? "diferencia significativa (95 %)" : "aún no concluyente (|z| < 1,96)", { fs: 12.5, fill: INK2 });
        tx(panel, 806, 290, "simulado: v1 10 %, v2 12 %", { fs: 12, fill: MUT });
      } else if (m === "canary") {
        tx(panel, 806, 72, "tráfico a v2: " + fmt(pct2 * 100, 0) + " %", { fs: 14, fw: 700, fill: ACC });
        const r1 = c.n1 ? c.e1 / c.n1 : 0, r2 = c.n2 ? c.e2 / c.n2 : 0;
        filaPanel(98, "peticiones", mil(c.n1), mil(c.n2), c.n1 / Math.max(1, c.n1 + c.n2), c.n2 / Math.max(1, c.n1 + c.n2));
        filaPanel(168, "tasa de errores", pct(r1), pct(r2), r1 * 20, r2 * 20);
        tx(panel, 806, 262, pct2 === 0 ? "rollback: todo vuelve a v1" : "si v2 falla, se vuelve atrás", { fs: 13, fw: 700, fill: pct2 === 0 ? C.ok : INK2 });
        tx(panel, 806, 290, "simulado: v1 0,5 %, v2 2 %", { fs: 12, fill: MUT });
      } else {
        tx(panel, 806, 80, "peticiones atendidas por v1", { fs: 13, fill: INK2 }); tx(panel, 806, 102, mil(c.n1), { fs: 18, fw: 800 });
        tx(panel, 806, 136, "respuestas de v2 al usuario", { fs: 13, fill: INK2 }); tx(panel, 806, 158, "0", { fs: 18, fw: 800 });
        tx(panel, 806, 192, "v2 coincide con v1", { fs: 13, fill: INK2 }); tx(panel, 806, 214, c.comp ? pct(c.coinc / c.comp) : "—", { fs: 18, fw: 800 });
        tx(panel, 806, 250, ["las discrepancias se revisan", "antes de exponer a v2"], { fs: 12.5, fill: INK2 });
      }
    }
    function paso(dt) {
      acum += dt;
      while (acum > 0.16) { acum -= 0.16; nueva(); }
      const m = getModo();
      parts = parts.filter(function (p) {
        p.t += dt * 1.4;
        const q = pos(p);
        p.c.setAttribute("cx", q[0].toFixed(1)); p.c.setAttribute("cy", q[1].toFixed(1));
        const col = p.v === 1 ? C.s1 : C.s2;
        if (p.t < 1) { p.c.setAttribute("fill", INK2); p.c.setAttribute("stroke", "#fff"); }
        else if (p.t < 2.3) { p.c.setAttribute("fill", col); p.c.setAttribute("stroke", "#fff"); }
        else { p.c.setAttribute("fill", "#fff"); p.c.setAttribute("stroke", col); p.c.setAttribute("stroke-width", 2); }
        if (p.c2) {
          if (p.t >= 1 && p.t < 2) { const r2 = ruta(2)(p.t - 1); p.c2.setAttribute("cx", r2[0].toFixed(1)); p.c2.setAttribute("cy", r2[1].toFixed(1)); p.c2.setAttribute("opacity", 1); }
          else if (p.t >= 2 && p.t < 2.6) { const f = (p.t - 2) / 0.6; p.c2.setAttribute("cx", RN.lerp(672, 690, f).toFixed(1)); p.c2.setAttribute("cy", 250); p.c2.setAttribute("opacity", (1 - f).toFixed(2)); }
          else if (p.t >= 2.6) p.c2.setAttribute("opacity", 0);
        }
        if (p.t >= 2.3 && !p.contado) { p.contado = true; llega(p); }
        if (p.t >= 3.3) { p.c.remove(); if (p.c2) p.c2.remove(); return false; }
        return true;
      });
      pintaPanel();
    }
    reinicia();
    if (RED) { for (let k = 0; k < 120; k++) paso(0.05); }
    else { for (let k = 0; k < 60; k++) paso(0.05); }
    const anim = bucle(function (dt) { paso(dt); }, s);
    if (!RED) anim.iniciar();
    RN.botonPlay($("r6-play"), anim, ["▶ Reanudar", "⏸ Pausa"]);
  })();

  // ================================================================== 7 · DATOS Y EVALUACIÓN
  (function () {
    // ---------- el foso
    const s = base($("d7-foso"), 1000, 400);
    const CX = 280, CY = 192, RF = 128;
    ci(s, CX, CY, RF + 22, { fill: "#C9DDF0" }); ci(s, CX, CY, RF - 22, { fill: C.surface });
    ci(s, CX, CY, RF + 22, { fill: "none", stroke: "#8FB2D6", sw: 1.5 }); ci(s, CX, CY, RF - 22, { fill: "none", stroke: "#8FB2D6", sw: 1.5 });
    // castillo
    const gc = S("g", {}, s);
    gc.setAttribute("transform", "translate(-20,-18)");
    rc(gc, 252, 182, 96, 62, { fill: "#E4E7EB", stroke: INK2, sw: 1.8, rx: 2 });
    [[236, 160, 30, 84], [332, 160, 30, 84], [285, 140, 30, 50]].forEach(function (t) {
      rc(gc, t[0], t[1], t[2], t[3], { fill: "#D5DDE6", stroke: INK2, sw: 1.8, rx: 2 });
      for (let k = 0; k < 3; k++) rc(gc, t[0] + 2 + k * 10, t[1] - 7, 7, 8, { fill: "#D5DDE6", stroke: INK2, sw: 1.4, rx: 1 });
    });
    pa(gc, "M288,244 v-22 a12,12 0 0 1 24,0 v22 z", { fill: INK2 });
    ln(gc, 300, 133, 300, 112, { stroke: INK2, sw: 2 }); S("polygon", { points: "300,112 322,118 300,124", fill: ACC }, gc);
    tx(s, CX, 250, "Tu modelo", { fs: 15, fw: 800, anchor: "middle" });
    tx(s, CX, 268, "(la arquitectura es pública)", { fs: 12.5, fill: INK2, anchor: "middle" });
    // bucle de realimentación sobre el foso
    const nodos = ["Producto", "Usuarios", "Interacciones", "Datos propios", "Mejor modelo"];
    const gPart = S("g", {}, s);
    const parts = []; for (let k = 0; k < 30; k++) parts.push(ci(gPart, 0, 0, 3.6, { fill: "#fff", stroke: C.s1, sw: 1.6 }));
    nodos.forEach(function (n, k) {
      const a = (-90 + k * 72) * Math.PI / 180, x = CX + RF * Math.cos(a), y = CY + RF * Math.sin(a), w = n.length * 8 + 22;
      rc(s, x - w / 2, y - 15, w, 30, { fill: "#fff", stroke: C.s1, sw: 2, rx: 15 });
      tx(s, x, y + 5, n, { fs: 14, fw: 700, anchor: "middle" });
    });
    // competencia
    const gk = S("g", {}, s);
    rc(gk, 20, 360, 36, 28, { fill: "#fff", stroke: MUT, sw: 1.5, rx: 2, dash: "3 3" });
    tx(gk, 66, 372, "La competencia copia la arquitectura…", { fs: 13, fill: INK2 });
    tx(gk, 66, 390, "…pero no tus datos ni tu bucle.", { fs: 13, fw: 700 });
    const fl = flecha(s, MUT);
    ln(s, 42, 355, 150, 290, { stroke: MUT, dash: "4 4", marker: fl });
    // Data Wars
    tx(s, 610, 40, "Data Wars: el campo de batalla", { fs: 17, fw: 800 });
    [["Scraping", "recoger datos de la web sin permiso"], ["Licencias", "quién puede usar qué datos y para qué"], ["Privacidad", "datos personales de los usuarios"]].forEach(function (f, k) {
      const y = 82 + k * 58;
      rc(s, 610, y - 22, 370, 46, { fill: SUAVE, stroke: LINEA, rx: 8 });
      rc(s, 620, y - 12, 26, 26, { fill: ACC_L, stroke: ACC, rx: 6 });
      tx(s, 633, y + 6, "⚖", { fs: 14, anchor: "middle", fill: ACC });
      tx(s, 658, y - 1, f[0], { fs: 14.5, fw: 800 }); tx(s, 658, y + 16, f[1], { fs: 13, fill: INK2 });
    });
    tx(s, 610, 272, "Estas barreras condicionan qué modelos se pueden", { fs: 13.5, fill: INK2 });
    tx(s, 610, 290, "entrenar y comercializar.", { fs: 13.5, fill: INK2 });
    rc(s, 610, 312, 178, 70, { fill: "#fff", stroke: LINEA, rx: 8 }); marcaOK(s, 632, 334, 10, true);
    tx(s, 650, 339, "Datos legales", { fs: 14, fw: 800 }); tx(s, 622, 368, "y sostenibles = activo", { fs: 13.5 });
    rc(s, 802, 312, 178, 70, { fill: "#fff", stroke: LINEA, rx: 8 }); marcaOK(s, 824, 334, 10, false);
    tx(s, 842, 339, "Datos ilegales", { fs: 14, fw: 800 }); tx(s, 814, 368, "= pasivo, no activo", { fs: 13.5 });
    function giro(t) {
      parts.forEach(function (p, k) {
        const a = (-90 + (k / parts.length) * 360 + t * 22) * Math.PI / 180;
        p.setAttribute("cx", (CX + RF * Math.cos(a)).toFixed(1)); p.setAttribute("cy", (CY + RF * Math.sin(a)).toFixed(1));
      });
    }
    giro(0);
    if (!RED) bucle(function (dt, t) { giro(t); }, s).iniciar();

    // ---------- dilema a tres años
    const iV = rango("d7-v", function (v) { return v + " puntos"; }, pinta3), iDr = rango("d7-dr", function (v) { return fmt(v, 1) + " %"; }, pinta3), iG = rango("d7-g", function (v) { return fmt(v, 1) + " %"; }, pinta3);
    let cruce = null;
    const g3 = RN.grafica($("d7-tres"), {
      alto: 300, margen: { l: 56, r: 18 },
      x: { min: 0, max: 36, titulo: "meses" }, y: { min: 0, max: 200, titulo: "valor (índice, hoy = 100)" },
      extras: function (ctx, g) {
        if (cruce === null || cruce > 36) { textoC(ctx, "no se cruzan en 3 años", g.w - g.m.r - 8, g.m.t + 16, { fs: 13.5, fw: 700, fill: INK2, align: "right" }); return; }
        const v = 100 * Math.pow(1 - +iDr.value / 100, cruce);
        ctx.beginPath(); ctx.arc(g.sx(cruce), g.sy(v), 7, 0, 7); ctx.fillStyle = ACC; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke();
        textoC(ctx, "se cruzan en el mes " + fmt(cruce, 1), g.sx(cruce) + 10, g.sy(v) + 24, { fs: 13.5, fw: 800 });
      }
    });
    function pinta3() {
      const B0 = 100 - +iV.value, d = +iDr.value / 100, gg = +iG.value / 100;
      const A = [], B = []; let mx = 120;
      for (let m = 0; m <= 36; m += 0.5) { A.push([m, 100 * Math.pow(1 - d, m)]); const b = B0 * Math.pow(1 + gg, m); B.push([m, b]); mx = Math.max(mx, b); }
      g3.op.y.max = Math.ceil(mx / 20) * 20;
      const den = Math.log((1 + gg) / (1 - d));
      cruce = B0 >= 100 ? 0 : (den > 0 ? Math.log(100 / B0) / den : null);
      g3.dibujar([{ nombre: "modelo puntero", color: C.s1, puntos: A, ancho: 2.5 }, { nombre: "flujo de datos", color: C.s2, puntos: B, ancho: 2.5 }]);
      kpis($("d7-kpis"), [["A los 36 meses", "modelo " + mil(A[A.length - 1][1]) + " · flujo " + mil(B[B.length - 1][1])]]);
    }
    pinta3();

    // ---------- trampas de la evaluación
    const cv = $("d7-trampas");
    const datos = RNmlp.datos.clasif("gauss", 1400, 0.45, 11);
    const TR = [], TE = [], MU = []; for (let i = 0; i < 1400; i++) (i < 200 ? TR : i < 400 ? TE : MU).push(i);
    function nn(train, i) { let b = -1, bd = Infinity; const x = datos.X[i]; for (let k = 0; k < train.length; k++) { const j = train[k], dx = x[0] - datos.X[j][0], dy = x[1] - datos.X[j][1], dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; b = j; } } return datos.y[b]; }
    function exact(train, test) { let ok = 0; test.forEach(function (i) { if (nn(train, i) === datos.y[i]) ok++; }); return ok / test.length; }
    // benchmark: 500 variantes con exactitud real del 70 %
    const rb = RN.rng(123), PUNT = [];
    for (let k = 0; k < 500; k++) { let c = 0; for (let i = 0; i < 200; i++) if (rb() < 0.7) c++; PUNT.push(c / 200); }
    const KS = [1, 2, 5, 10, 20, 50, 100, 200, 500];
    // demos
    const rd = RN.rng(8), DEMO = []; for (let k = 0; k < 48; k++) DEMO.push({ ok: rd() < 0.66, sem: rd() });
    let okIdx = DEMO.map(function (d, k) { return d.ok ? k : -1; }).filter(function (k) { return k >= 0; }).slice(0, 4);
    let vista = "fuga", tDemo = 0;
    const iF = rango("d7-f", function (v) { return v + " %"; }, pintaT), iK = rango("d7-k", function (v) { return mil(KS[v]); }, pintaT);
    const getDm = seg("d7-dm", function (v) { const ini = tDemo, fin = v === "todo" ? 1 : 0; RN.tween(RED ? 0 : 900, function (t) { tDemo = RN.lerp(ini, fin, t); pintaT(); }); });
    seg("d7-trampa", function (v) {
      vista = v;
      ["fuga", "bench", "demo"].forEach(function (k) { $("d7-c-" + k).hidden = k !== v; });
      $("d7-meta").innerHTML = v === "demo" ? '<span class="tag illus">Ejemplo ilustrativo</span>' : '<span class="tag real">Cálculo real en el navegador</span>' + (v === "bench" ? '<span class="tag illus">Variantes simuladas</span>' : "");
      pintaT();
    });
    const TXT = {
      fuga: "Fuga de datos (<em>leakage</em>): parte de los datos de prueba se ha colado en el entrenamiento. Un modelo que memoriza (aquí, el vecino más cercano) acierta esos ejemplos de memoria: la nota de la prueba sube; la del mundo real, no.",
      bench: "Optimizar el benchmark: todas las variantes aciertan de verdad un 70 %. Si pruebas muchas contra el mismo test y te quedas con la mejor, eliges la que tuvo suerte con ese test: su nota está inflada.",
      demo: "Demos escogidas (<em>cherry-picked</em>): se enseñan los mejores casos y se esconden los fallos que aparecen fuera de guion."
    };
    function barrasH(ctx, x, y, w, filas) {
      filas.forEach(function (f, k) {
        const yy = y + k * 70;
        textoC(ctx, f[0], x, yy, { fs: 14, fw: 700 });
        rrect(ctx, x, yy + 10, w, 24, 5); ctx.fillStyle = SUAVE; ctx.fill(); ctx.strokeStyle = LINEA; ctx.lineWidth = 1; ctx.stroke();
        rrect(ctx, x, yy + 10, Math.max(4, w * f[1]), 24, 5); ctx.fillStyle = f[2]; ctx.fill();
        textoC(ctx, pct(f[1]), x + Math.max(4, w * f[1]) + 8, yy + 28, { fs: 15, fw: 800 });
      });
    }
    function pintaT() {
      const L = RN.lienzo(cv, 380), ctx = L.ctx, w = L.w, h = L.h;
      ctx.fillStyle = C.surface; ctx.fillRect(0, 0, w, h);
      $("d7-ttxt").innerHTML = TXT[vista];
      if (vista === "fuga") {
        const f = +iF.value / 100, nf = Math.round(f * 200), fug = TE.slice(0, nf), train = TR.concat(fug);
        const aT = exact(train, TE), aM = exact(train, MU);
        const S0 = Math.min(h - 24, w * 0.42), ox = 12, oy = 12, R = 1.4;
        const px = function (v) { return ox + (v + R) / (2 * R) * S0; }, py = function (v) { return oy + (R - v) / (2 * R) * S0; };
        ctx.strokeStyle = LINEA; ctx.strokeRect(ox, oy, S0, S0);
        TR.forEach(function (i) { punto(ctx, px(datos.X[i][0]), py(datos.X[i][1]), 4, datos.y[i] ? C.clase1 : C.clase0); });
        TE.forEach(function (i, k) {
          const x = px(datos.X[i][0]), y = py(datos.X[i][1]);
          if (k < nf) { ctx.beginPath(); ctx.arc(x, y, 8.5, 0, 7); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(); punto(ctx, x, y, 4.5, datos.y[i] ? C.clase1 : C.clase0); }
          else punto(ctx, x, y, 4.5, datos.y[i] ? C.clase1 : C.clase0, true);
        });
        const bx = ox + S0 + 40, bw = Math.max(120, w - bx - 110);
        barrasH(ctx, bx, 50, bw, [["Exactitud en la prueba (contaminada)", aT, ACC], ["Exactitud con datos nuevos de verdad", aM, "#8FA6BF"]]);
        let y = 230;
        [["●", "entrenamiento (200)"], ["○", "prueba (200)"], ["◎", "prueba que también está en el entrenamiento (" + nf + ")"]].forEach(function (l, k) {
          if (k === 2) { ctx.beginPath(); ctx.arc(bx + 6, y + k * 24 - 5, 7, 0, 7); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(); punto(ctx, bx + 6, y + k * 24 - 5, 3.5, INK2); }
          else punto(ctx, bx + 6, y + k * 24 - 5, 4.5, INK2, k === 1);
          textoC(ctx, l[1], bx + 22, y + k * 24, { fs: 13.5, fill: INK2 });
        });
        textoC(ctx, "azul y naranja: las dos clases", bx, y + 78, { fs: 13, fill: MUT });
        kpis($("d7-tkpis"), [["Prueba (contaminada)", pct(aT)], ["Datos nuevos", pct(aM)], ["Nota inflada", "+" + fmt((aT - aM) * 100, 1) + " puntos"]]);
      } else if (vista === "bench") {
        const K = KS[+iK.value], sc = PUNT.slice(0, K); let best = 0; sc.forEach(function (v, k) { if (v > sc[best]) best = k; });
        const ax0 = 50, ax1 = w * 0.6, xs = function (v) { return ax0 + (v - 0.55) / 0.35 * (ax1 - ax0); }, base0 = h - 50;
        ctx.strokeStyle = C.axis; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ax0, base0 + 0.5); ctx.lineTo(ax1, base0 + 0.5); ctx.stroke();
        for (let v = 0.55; v <= 0.9001; v += 0.05) { textoC(ctx, mil(v * 100) + " %", xs(v), base0 + 18, { fs: 12.5, fill: MUT, align: "center" }); ctx.beginPath(); ctx.moveTo(xs(v), base0); ctx.lineTo(xs(v), base0 + 5); ctx.stroke(); }
        textoC(ctx, "exactitud en el test del benchmark (200 ejemplos)", (ax0 + ax1) / 2, base0 + 40, { fs: 12.5, fill: INK2, fw: 600, align: "center" });
        const pila = {}; const rr = Math.max(2.5, Math.min(5, 140 / Math.sqrt(K)));
        sc.forEach(function (v, k) { const b = Math.round(v * 200); pila[b] = (pila[b] || 0) + 1; const y = base0 - 6 - (pila[b] - 1) * (rr * 2 + 1); punto(ctx, xs(v), y, rr, k === best ? ACC : "#8FA6BF"); });
        ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xs(0.7), 30); ctx.lineTo(xs(0.7), base0); ctx.stroke(); ctx.restore();
        textoC(ctx, "exactitud real de todas: 70 %", xs(0.7) - 6, 26, { fs: 13, fw: 700, align: "right" });
        const yb = base0 - 6 - ((pila[Math.round(sc[best] * 200)] || 1) - 1) * (rr * 2 + 1);
        textoC(ctx, "la elegida: " + pct(sc[best]), xs(sc[best]) + 10, Math.max(46, yb - 12), { fs: 13.5, fw: 800, fill: ACC });
        const bx = ax1 + 50, bw = Math.max(120, w - bx - 100);
        barrasH(ctx, bx, 70, bw, [["La elegida en el benchmark", sc[best], ACC], ["La elegida en el mundo real", 0.7, "#8FA6BF"]]);
        kpis($("d7-tkpis"), [["Variantes probadas", mil(K)], ["Benchmark de la elegida", pct(sc[best])], ["Mundo real", "70,0 %"], ["Nota inflada", "+" + fmt((sc[best] - 0.7) * 100, 1) + " puntos"]]);
      } else {
        const cols = 12, filas = 4, cel = Math.min((w - 40) / cols, (h - 30) / filas), x0 = (w - cols * cel) / 2, y0 = (h - filas * cel) / 2;
        const big = Math.min(h - 70, (w - 80) / 4 - 20), bx0 = (w - 4 * (big + 20) + 20) / 2, by0 = (h - big) / 2;
        DEMO.forEach(function (d, k) {
          const iDemo = okIdx.indexOf(k);
          let x = x0 + (k % cols) * cel + 4, y = y0 + Math.floor(k / cols) * cel + 4, s2 = cel - 8, al = 1;
          if (iDemo >= 0) { const xd = bx0 + iDemo * (big + 20), yd = by0; x = RN.lerp(xd, x, tDemo); y = RN.lerp(yd, y, tDemo); s2 = RN.lerp(big, cel - 8, tDemo); }
          else al = tDemo;
          ctx.globalAlpha = al;
          rrect(ctx, x, y, s2, s2, 8); ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = LINEA; ctx.lineWidth = 1.5; ctx.stroke();
          // «salida generada» esquemática
          const cx = x + s2 * (0.35 + d.sem * 0.3), cy = y + s2 * 0.38, rr = s2 * 0.13;
          ctx.fillStyle = RN.mezcla("#ffffff", C.s4, 0.6); ctx.beginPath();
          if (d.ok) ctx.arc(cx, cy, rr, 0, 7); else ctx.ellipse(cx, cy, rr * 1.7, rr * 0.5, 0.6, 0, 7);
          ctx.fill();
          ctx.strokeStyle = RN.mezcla("#ffffff", C.s3, 0.2); ctx.lineWidth = Math.max(1.5, s2 * 0.035);
          ctx.beginPath(); ctx.moveTo(x + s2 * 0.1, y + s2 * 0.72);
          if (d.ok) ctx.quadraticCurveTo(x + s2 * 0.5, y + s2 * 0.55, x + s2 * 0.9, y + s2 * 0.72); else { ctx.lineTo(x + s2 * 0.4, y + s2 * 0.6); ctx.lineTo(x + s2 * 0.55, y + s2 * 0.85); ctx.lineTo(x + s2 * 0.9, y + s2 * 0.62); }
          ctx.stroke();
          const rb2 = Math.max(6, s2 * 0.1), bxx = x + s2 - rb2 - 4, byy = y + rb2 + 4;
          ctx.beginPath(); ctx.arc(bxx, byy, rb2, 0, 7); ctx.fillStyle = d.ok ? C.ok : C.bad; ctx.fill();
          ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(1.5, rb2 * 0.28);
          if (d.ok) { ctx.beginPath(); ctx.moveTo(bxx - rb2 * 0.45, byy); ctx.lineTo(bxx - rb2 * 0.1, byy + rb2 * 0.38); ctx.lineTo(bxx + rb2 * 0.5, byy - rb2 * 0.38); ctx.stroke(); }
          else aspa(ctx, bxx, byy, rb2 * 0.38);
          ctx.globalAlpha = 1;
        });
        const nOK = DEMO.filter(function (d) { return d.ok; }).length;
        if (tDemo < 0.5) textoC(ctx, "La demo: 4 de 4 perfectas", w / 2, by0 - 14, { fs: 16, fw: 800, align: "center", fill: INK });
        kpis($("d7-tkpis"), tDemo < 0.5 ? [["En la demo", "4 de 4 bien"]] : [["En la demo", "4 de 4 bien"], ["Fuera de guion", nOK + " de 48 bien", pct(nOK / 48, 0)]]);
      }
    }
    RN.alCambiarTam(cv, pintaT);

    // ---------- panel de evaluación
    const sp = base($("d7-panel"), 500, 320);
    const filas = ["Global", "Clientes nuevos", "Móvil", "Otro idioma", "Fuera de distribución"], cols = ["Exactitud", "Robustez", "Latencia", "Equidad"];
    const E = [[0, 0, 0, 0], [0, 1, 0, 0], [0, 0, 2, 0], [1, 0, 0, 2], [2, 1, 0, 1]];
    tx(sp, 16, 26, "Panel de evaluación por segmentos", { fs: 15, fw: 800 });
    cols.forEach(function (c, j) { tx(sp, 205 + j * 72, 56, c, { fs: 13, fw: 700, anchor: "middle", fill: INK2 }); });
    filas.forEach(function (f, i) {
      const y = 68 + i * 44;
      tx(sp, 16, y + 26, f, { fs: 14, fw: i ? 600 : 800 });
      E[i].forEach(function (e, j) {
        const x = 172 + j * 72;
        rc(sp, x, y + 4, 66, 38, { fill: ["#E8F5E9", "#FFF8E1", "#FFEBEE"][e], stroke: ["#A5D6A7", "#F0D78C", "#EF9A9A"][e], rx: 6 });
        if (e === 1) { ci(sp, x + 33, y + 23, 9, { fill: C.warn }); tx(sp, x + 33, y + 28, "!", { fs: 14, fw: 800, anchor: "middle", fill: "#fff" }); }
        else marcaOK(sp, x + 33, y + 23, 9, e === 0);
      });
      if (!i) ln(sp, 14, y + 45, 486, y + 45, { stroke: INK2, sw: 1.2 });
    });
    tx(sp, 16, 306, "La fila global sale bien; los problemas aparecen al segmentar.", { fs: 13, fill: INK2 });

    // ---------- el último 10 %
    const NT = 10000, H = new Float64Array(NT + 1); for (let k = 1; k <= NT; k++) H[k] = H[k - 1] + 1 / k;
    function necesita(p) { const obj = p * H[NT]; let lo = 1, hi = NT; while (lo < hi) { const m = (lo + hi) >> 1; if (H[m] >= obj) hi = m; else lo = m + 1; } return lo; }
    const curva = [[0, 0]]; for (let k = 1; k <= NT; k += (k < 200 ? 1 : 25)) curva.push([k, H[k] / H[NT] * 100]); curva.push([NT, 100]);
    const iObj = rango("d7-obj", function (v) { return v + " %"; }, pintaCola);
    const gc2 = RN.grafica($("d7-cola"), {
      alto: 270, margen: { l: 52, r: 26 },
      x: { min: 0, max: NT, titulo: "tipos de caso resueltos (de los más frecuentes a los más raros)", fmt: function (v) { return mil(v); }, fmtTip: function (v) { return mil(v); } },
      y: { min: 0, max: 100, titulo: "% de casos cubiertos" },
      extras: function (ctx, g) {
        [[0.85, INK2], [0.95, INK2], [+iObj.value / 100, ACC]].forEach(function (q, k) {
          const kk = necesita(q[0]), X = g.sx(kk), Y = g.sy(q[0] * 100);
          ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = q[1]; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(g.m.l, Y); ctx.lineTo(X, Y); ctx.lineTo(X, g.h - g.m.b); ctx.stroke(); ctx.restore();
          ctx.beginPath(); ctx.arc(X, Y, k === 2 ? 7 : 5, 0, 7); ctx.fillStyle = q[1]; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke();
          if (k < 2) textoC(ctx, mil(q[0] * 100) + " % → " + mil(kk) + " tipos", X + 8, Y + 18, { fs: 12.5, fw: 700, fill: INK2 });
        });
      }
    });
    function pintaCola() {
      gc2.dibujar([{ nombre: "cobertura", color: C.s1, puntos: curva, ancho: 2.5 }]);
      const k85 = necesita(0.85), k95 = necesita(0.95), ko = necesita(+iObj.value / 100);
      kpis($("d7-ckpis"), [["85 % de los casos", mil(k85) + " tipos"], ["95 % de los casos", mil(k95) + " tipos"], ["Del 85 al 95 %", "×" + fmt(k95 / k85, 1), "tipos de caso que resolver"], ["Tu objetivo: " + iObj.value + " %", mil(ko) + " tipos"]]);
    }
    pintaCola();

    // ---------- balanza +2 % frente a −50 %
    const sb = base($("d7-balanza"), 1000, 320);
    const gb = S("g", {}, sb);
    const CI = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000], VP = CI.map(function (v) { return v * 10; });
    const iInc = rango("d7-inc", function (v) { return mil(v); }, pintaBal), iCi = rango("d7-ci", function (v) { return euros(CI[v]); }, pintaBal), iVp = rango("d7-vp", function (v) { return euros(VP[v]); }, pintaBal);
    let angB = 0;
    function dibujaBalanza(ang, Lv, Rv) {
      while (gb.firstChild) gb.removeChild(gb.firstChild);
      const px = 500, py = 70, Lb = 300, a = ang * Math.PI / 180;
      S("polygon", { points: "500,70 470,286 530,286", fill: "#EEF3F9", stroke: "#8FA6BF", "stroke-width": 1.5 }, gb);
      rc(gb, 420, 284, 160, 10, { fill: "#C6D4E4", rx: 4 });
      const xl = px - Lb * Math.cos(a), yl = py - Lb * Math.sin(a), xr = px + Lb * Math.cos(a), yr = py + Lb * Math.sin(a);
      ln(gb, xl, yl, xr, yr, { stroke: INK, sw: 6 }); ci(gb, px, py, 9, { fill: INK });
      [[xl, yl, "+2 % en el benchmark", Lv, C.s1, ["fácil de comunicar", "titular para la dirección"]], [xr, yr, "−50 % de incidentes", Rv, C.s2, ["clientes que no sufren el fallo", "menos guardias y urgencias"]]].forEach(function (p) {
        ln(gb, p[0], p[1], p[0] - 120, p[1] + 70, { stroke: INK2, sw: 1.2 }); ln(gb, p[0], p[1], p[0] + 120, p[1] + 70, { stroke: INK2, sw: 1.2 });
        pa(gb, "M" + (p[0] - 135) + "," + (p[1] + 70) + " h270 a135,34 0 0 1 -270,0 z", { fill: RN.mezcla("#ffffff", p[4], 0.2), stroke: p[4], sw: 2 });
        tx(gb, p[0], p[1] - 16, p[2], { fs: 16, fw: 800, anchor: "middle" });
        tx(gb, p[0], p[1] + 92, euros(p[3]) + " al año", { fs: 16, fw: 800, anchor: "middle" });
        tx(gb, p[0], p[1] + 126, p[5][0] + " · " + p[5][1], { fs: 12.5, fill: INK2, anchor: "middle" });
      });
    }
    function pintaBal() {
      const inc = +iInc.value, ci_ = CI[+iCi.value], vp = VP[+iVp.value];
      const Lv = 2 * vp, Rv = 0.5 * inc * 12 * ci_;
      const fin = RN.limita(Math.log10(Rv / Lv) * 9, -14, 14), ini = angB;
      RN.tween(RED ? 0 : 400, function (t) { angB = RN.lerp(ini, fin, t); dibujaBalanza(angB, Lv, Rv); });
    }
    pintaBal();
  })();

  // ================================================================== 8 · ROBUSTEZ
  (function () {
    // ---------- escenas
    const se = base($("b8-esc"), 1000, 200);
    function vaca(g, x, y) {
      [[-22, 14], [-10, 16], [14, 16], [24, 14]].forEach(function (l) { ln(g, x + l[0], y + 8, x + l[0], y + 8 + l[1] + 8, { stroke: INK, sw: 4 }); });
      S("ellipse", { cx: x, cy: y, rx: 36, ry: 19, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
      S("ellipse", { cx: x - 10, cy: y - 4, rx: 9, ry: 7, fill: INK }, g); S("ellipse", { cx: x + 14, cy: y + 5, rx: 7, ry: 6, fill: INK }, g);
      rc(g, x + 30, y - 22, 22, 18, { fill: "#fff", stroke: INK, sw: 2, rx: 6 });
      ln(g, x + 33, y - 22, x + 30, y - 30, { stroke: INK, sw: 2 }); ln(g, x + 49, y - 22, x + 52, y - 30, { stroke: INK, sw: 2 });
      S("ellipse", { cx: x + 46, cy: y - 9, rx: 6, ry: 4, fill: C.s5 }, g);
      pa(g, "M" + (x - 36) + "," + (y - 4) + " q-10,6 -6,20", { stroke: INK, sw: 2 });
    }
    function camello(g, x, y) {
      const col = RN.mezcla("#ffffff", C.s4, 0.55), bor = RN.mezcla(C.s4, INK, 0.45);
      [[-20, 0], [-8, 0], [12, 0], [24, 0]].forEach(function (l) { ln(g, x + l[0], y + 8, x + l[0], y + 36, { stroke: bor, sw: 4 }); });
      pa(g, "M" + (x - 34) + "," + (y + 8) + " q0,-22 18,-22 q8,-18 20,0 q10,-12 18,4 l6,18 z", { fill: col, stroke: bor, sw: 2 });
      pa(g, "M" + (x + 26) + "," + (y - 2) + " q14,-6 16,-30 l10,0 q2,8 -6,10 q-2,20 -12,30", { fill: col, stroke: bor, sw: 2 });
    }
    function fondo(g, x, y, w, h, tipo) {
      const cesped = RN.mezcla("#ffffff", C.s6, 0.22), arena = RN.mezcla("#ffffff", C.s4, 0.3), mar = RN.mezcla("#ffffff", C.s1, 0.3);
      rc(g, x, y, w, h, { fill: tipo === "hierba" ? cesped : arena, rx: 10 });
      if (tipo === "playa") { pa(g, "M" + x + "," + (y + 10) + " a10,10 0 0 1 10,-10 h" + (w - 20) + " a10,10 0 0 1 10,10 v34 h-" + w + " z", { fill: mar }); for (let k = 0; k < 4; k++) pa(g, "M" + (x + 20 + k * 55) + "," + (y + 24) + " q8,-6 16,0 q8,6 16,0", { stroke: "#fff", sw: 2 }); }
      if (tipo === "hierba") for (let k = 0; k < 14; k++) { const gx = x + 10 + (k * 37) % (w - 20), gy = y + 30 + (k * 53) % (h - 40); pa(g, "M" + gx + "," + gy + " l3,-8 l3,8 l3,-6", { stroke: RN.mezcla("#ffffff", C.s6, 0.55), sw: 1.6 }); }
      else for (let k = 0; k < 12; k++) ci(g, x + 12 + (k * 41) % (w - 24), y + 56 + (k * 29) % (h - 66), 1.6, { fill: RN.mezcla(C.s4, "#ffffff", 0.3) });
    }
    const ESC = [["hierba", 1, "Entrenamiento: vaca en hierba"], ["arena", 0, "Entrenamiento: camello en arena"], ["playa", 1, "Prueba: vaca en la playa"], ["hierba", 0, "Prueba: camello en hierba"]];
    const preds = ESC.map(function (e, k) {
      const x = 8 + k * 248, g = S("g", {}, se);
      fondo(g, x, 8, 236, 150, e[0]);
      if (e[1]) vaca(g, x + 110, 96); else camello(g, x + 110, 96);
      tx(se, x + 118, 180, e[2], { fs: 13.5, fw: 700, anchor: "middle" });
      return S("g", {}, se);
    });
    function predEscenas(m) {
      ESC.forEach(function (e, k) {
        const g = preds[k]; while (g.firstChild) g.removeChild(g.firstChild);
        const x = 8 + k * 248, p = m.forward([e[1] ? 0.45 : -0.45, e[0] === "hierba" ? 0.6 : -0.6])[0], dice = p >= 0.5 ? 1 : 0, ok = dice === e[1];
        rc(g, x + 8, 16, 178, 26, { fill: "#fff", stroke: ok ? C.ok : C.bad, sw: 1.8, rx: 13 });
        marcaOK(g, x + 22, 29, 8, ok);
        tx(g, x + 36, 34, "dice: " + (dice ? "vaca" : "camello") + " (" + mil(Math.max(p, 1 - p) * 100) + " %)", { fs: 13, fw: 700 });
      });
    }
    // ---------- datos y entrenamiento
    function datosVaca(n, p, sem) {
      const r = RN.rng(sem), X = [], Y = [];
      for (let k = 0; k < n; k++) {
        const y = k % 2, forma = (y ? 0.45 : -0.45) + RN.normal(r) * 0.6, coincide = r() < p;
        X.push([RN.limita(forma, -1.35, 1.35), RN.limita((y ? 1 : -1) * (coincide ? 1 : -1) * 0.6 + RN.normal(r) * 0.15, -1.35, 1.35)]); Y.push([y]);
      }
      return { X: X, Y: Y };
    }
    const iP = rango("b8-p", function (v) { return v + " %"; }, function () { entrena(false); });
    let x10 = false, ver = "train", m = null, tr = null, ctxT = null, playa = null, ep = 0;
    $("b8-x10").addEventListener("click", function () { x10 = !x10; this.setAttribute("aria-pressed", x10 ? "true" : "false"); this.textContent = x10 ? "×10 datos con el mismo sesgo ✓" : "×10 datos con el mismo sesgo"; entrena(false); });
    seg("b8-ver", function (v) { ver = v; pintaPlano(); });
    const cvP = $("b8-plano"), sbar = base($("b8-barras"), 500, 340), gbar = S("g", {}, sbar);
    function pintaPlano() {
      if (!m) return;
      const L = RN.lienzo(cvP, function (w) { return w; }), ctx = L.ctx, R = 1.4;
      pintaFrontera(ctx, L.w, L.h, function (x, y) { return m.forward([x, y])[0]; }, R, 56);
      const D = ver === "train" ? tr : playa, n = Math.min(D.X.length, 400);
      for (let k = 0; k < n; k++) punto(ctx, (D.X[k][0] + R) / (2 * R) * L.w, (R - D.X[k][1]) / (2 * R) * L.h, 4.2, D.Y[k][0] ? C.clase1 : C.clase0);
      ctx.fillStyle = "rgba(255,255,255,.8)"; rrect(ctx, L.w / 2 - 92, L.h - 27, 184, 22, 6); ctx.fill(); rrect(ctx, 4, L.h / 2 - 92, 22, 184, 6); ctx.fill();
      textoC(ctx, "silueta: ← camello · vaca →", L.w / 2, L.h - 11, { fs: 13, fw: 700, align: "center" });
      ctx.save(); ctx.translate(20, L.h / 2); ctx.rotate(-Math.PI / 2); textoC(ctx, "fondo: ← arena · hierba →", 0, 0, { fs: 13, fw: 700, align: "center" }); ctx.restore();
      textoC(ctx, ver === "train" ? "Entrenamiento (" + mil(tr.X.length) + " fotos)" : "Contexto cambiado: fondos al revés", 12, 22, { fs: 14, fw: 800 });
    }
    function pintaBarras() {
      while (gbar.firstChild) gbar.removeChild(gbar.firstChild);
      const w1 = Math.abs(m.W[0][0][0]), w2 = Math.abs(m.W[0][0][1]), mx = Math.max(w1, w2, 1e-6);
      tx(gbar, 16, 28, "Lo que mira el modelo (peso aprendido)", { fs: 15, fw: 800 });
      [["silueta", w1], ["fondo", w2]].forEach(function (q, k) {
        const y = 52 + k * 44, w = 300 * q[1] / mx, dom = q[1] === mx;
        tx(gbar, 16, y + 17, q[0], { fs: 14, fw: 700 });
        rc(gbar, 90, y, Math.max(3, w), 24, { fill: dom ? ACC : "#8FA6BF", rx: 4 });
        tx(gbar, 90 + Math.max(3, w) + 8, y + 17, fmt(q[1], 2), { fs: 14, fw: 800 });
      });
      const a1 = m.evaluar(ctxT.X, ctxT.Y).precision, a2 = m.evaluar(playa.X, playa.Y).precision;
      tx(gbar, 16, 172, "Exactitud", { fs: 15, fw: 800 });
      [["Con el fondo habitual", a1], ["Con el contexto cambiado", a2]].forEach(function (q, k) {
        const y = 192 + k * 64;
        tx(gbar, 16, y + 14, q[0], { fs: 14, fw: 700 });
        rc(gbar, 16, y + 22, 360, 24, { fill: SUAVE, stroke: LINEA, rx: 5 });
        rc(gbar, 16, y + 22, Math.max(3, 360 * q[1]), 24, { fill: k ? ACC : "#8FA6BF", rx: 5 });
        tx(gbar, 16 + Math.max(3, 360 * q[1]) + 8, y + 40, pct(q[1], 0), { fs: 15, fw: 800 });
      });
      tx(gbar, 16, 330, "Fotos de entrenamiento: " + mil(tr.X.length) + " · con el fondo habitual: " + $("b8-p").value + " %", { fs: 12.5, fill: INK2 });
    }
    let animE = null;
    function entrena(animado) {
      const p = +$("b8-p").value / 100, n = x10 ? 2000 : 200;
      tr = datosVaca(n, p, 3); ctxT = datosVaca(400, p, 5); playa = datosVaca(400, 0, 7);
      m = new RNmlp.MLP({ capas: [2, 1], salida: "sigmoid", semilla: 2 }); ep = 0;
      if (animE) animE.parar();
      if (!animado || RED) { for (; ep < 150; ep++) m.entrenarEpoca(tr.X, tr.Y, { lote: 32, lr: 0.05, opt: "adam" }); pintaTodo(); return; }
      animE = anima(function () { for (let k = 0; k < 3 && ep < 150; k++, ep++) m.entrenarEpoca(tr.X, tr.Y, { lote: 32, lr: 0.05, opt: "adam" }); pintaTodo(); if (ep >= 150) return false; }, cvP);
      animE.iniciar();
    }
    function pintaTodo() { pintaPlano(); pintaBarras(); predEscenas(m); }
    $("b8-train").addEventListener("click", function () { entrena(true); });
    alMostrar(cvP, function () { entrena(false); RN.alCambiarTam(cvP, pintaPlano); });

    // ---------- ejemplos adversarios
    const NPX = 16;
    function senal(tipo, r) {
      const cx = 7.5 + (r() - 0.5) * 2, cy = 7.5 + (r() - 0.5) * 2, R = 5.8 + r() * 1.1, br = 0.85 + (r() - 0.5) * 0.2;
      const img = new Array(NPX * NPX);
      for (let i = 0; i < NPX; i++) for (let j = 0; j < NPX; j++) {
        const dx = j - cx, dy = i - cy; let v = 0.06;
        if (tipo === 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) <= R && Math.abs(dx) + Math.abs(dy) <= R * 1.32) v = br;
          if (Math.abs(dy) <= 1 && Math.abs(dx) <= R * 0.62) v = 0.25;
        } else {
          const d = Math.hypot(dx, dy);
          if (d <= R && d >= R * 0.64) v = br;
          else if (d < R * 0.64) { v = 0.08; if ((Math.abs(dx + 1.5) <= 0.75 || Math.abs(dx - 1.5) <= 0.75) && Math.abs(dy) <= 1.8) v = 0.7; }
        }
        img[i * NPX + j] = RN.limita(v + RN.normal(r) * 0.12, 0, 1);
      }
      return img;
    }
    let clf = null, TEST = [], stops = [], iStop = 0, epsMin = 0, accAdv = 0;
    const iEps = rango("b8-eps", function (v) { return fmt(v, 3); }, pintaAdv);
    function zDe(x) { const w = clf.W[0][0]; let z = clf.b[0][0]; for (let i = 0; i < x.length; i++) z += w[i] * x[i]; return z; }
    function perturba(x, e) { const w = clf.W[0][0]; return x.map(function (v, i) { return RN.limita(v - e * Math.sign(w[i]), 0, 1); }); }
    function buscaEps(x) { for (let e = 0; e <= 0.5; e += 0.0005) if (zDe(perturba(x, e)) < 0) return e; return 0.5; }
    function preparaAdv() {
      const r = RN.rng(21), X = [], Y = [];
      for (let k = 0; k < 600; k++) { const t = k % 2; X.push(senal(t, r)); Y.push([t]); }
      TEST = []; const YT = []; for (let k = 0; k < 400; k++) { const t = k % 2; TEST.push(senal(t, r)); YT.push([t]); }
      clf = new RNmlp.MLP({ capas: [NPX * NPX, 1], salida: "sigmoid", semilla: 3 });
      for (let e = 0; e < 30; e++) clf.entrenarEpoca(X, Y, { lote: 32, lr: 0.01, opt: "adam" });
      accAdv = clf.evaluar(TEST, YT).precision;
      stops = []; TEST.forEach(function (x, k) { if (YT[k][0] === 1 && zDe(x) > 0) stops.push({ x: x, e: buscaEps(x) }); });
      stops.sort(function (a, b) { return a.e - b.e; });
      iStop = Math.floor(stops.length * 0.35);
      epsMin = stops[iStop].e;
    }
    function pintaImg(cv, f) {
      const L = RN.lienzo(cv, function (w) { return w; }), ctx = L.ctx, c = L.w / NPX;
      for (let i = 0; i < NPX; i++) for (let j = 0; j < NPX; j++) { ctx.fillStyle = f(i * NPX + j); ctx.fillRect(Math.floor(j * c), Math.floor(i * c), Math.ceil(c) + 1, Math.ceil(c) + 1); }
    }
    const sProb = base($("b8-prob"), 300, 330);
    function pintaAdv() {
      if (!clf) return;
      const e = +iEps.value, x = stops[iStop].x, xp = perturba(x, e);
      const gris = function (v) { return RN.mezcla("#ffffff", INK, v); };
      pintaImg($("b8-orig"), function (k) { return gris(x[k]); });
      pintaImg($("b8-pert"), function (k) { const d = xp[k] - x[k]; return e > 0 ? RN.colorPeso(d, e) : "#d5d8dc"; });
      pintaImg($("b8-mod"), function (k) { return gris(xp[k]); });
      while (sProb.firstChild) sProb.removeChild(sProb.firstChild);
      tx(sProb, 10, 22, "El clasificador dice", { fs: 15, fw: 800 });
      [["Original", x], ["Modificada", xp]].forEach(function (q, k) {
        const p = 1 / (1 + Math.exp(-zDe(q[1]))), y = 50 + k * 110, stop = p >= 0.5;
        tx(sProb, 10, y + 14, q[0], { fs: 14, fw: 700, fill: INK2 });
        tx(sProb, 10, y + 38, stop ? "STOP" : "Límite de velocidad", { fs: 17, fw: 800, fill: k && !stop ? ACC : INK });
        rc(sProb, 10, y + 50, 280, 20, { fill: "#D5DDE6", rx: 4 });
        rc(sProb, 10, y + 50, Math.max(0, 280 * p), 20, { fill: INK2, rx: 4 });
        tx(sProb, 10, y + 88, "STOP " + pct(p) + " · límite " + pct(1 - p), { fs: 13, fill: INK2 });
      });
      rc(sProb, 10, 278, 12, 12, { fill: INK2, rx: 2 }); tx(sProb, 27, 289, "STOP", { fs: 13, fill: INK2 });
      rc(sProb, 85, 278, 12, 12, { fill: "#D5DDE6", rx: 2 }); tx(sProb, 102, 289, "límite de velocidad", { fs: 13, fill: INK2 });
      kpis($("b8-akpis"), [["Exactitud en 400 señales nuevas", pct(accAdv)], ["ε mínimo que engaña", fmt(stops[iStop].e, 3), "≈ " + mil(stops[iStop].e * 100) + " % del brillo"], ["Ruido propio de las imágenes", "σ = 0,12"]]);
    }
    $("b8-otra").addEventListener("click", function () { if (!clf) return; iStop = (iStop + 7) % stops.length; ponerRango(iEps, 0); });
    $("b8-min").addEventListener("click", function () { if (!clf) return; ponerRango(iEps, Math.min(0.2, Math.ceil(stops[iStop].e / 0.002) * 0.002)); });
    alMostrar($("b8-orig"), function () { preparaAdv(); iEps.value = Math.min(0.2, Math.ceil(stops[iStop].e / 0.002) * 0.002); $("b8-epso").textContent = fmt(+iEps.value, 3); pintaAdv(); RN.alCambiarTam($("b8-orig"), pintaAdv); });

    // ---------- casos del mundo real
    let s1 = base($("b8-c1"), 300, 150);
    ci(s1, 150, 72, 42, { fill: RN.mezcla("#ffffff", C.s4, 0.25), stroke: INK2, sw: 2 });
    ci(s1, 136, 64, 4, { fill: INK }); ci(s1, 164, 64, 4, { fill: INK }); pa(s1, "M136,92 q14,10 28,0", { stroke: INK, sw: 2 });
    pa(s1, "M108,58 q42,-30 84,0 v18 q-42,-14 -84,0 z", { fill: RN.rgba(C.s7, 0.35), stroke: C.s7, sw: 1.5 });
    [[96, 22, 1, 1], [204, 22, -1, 1], [96, 122, 1, -1], [204, 122, -1, -1]].forEach(function (c) { pa(s1, "M" + c[0] + "," + (c[1] + c[3] * 16) + " v" + (-c[3] * 16) + " h" + (c[2] * 16), { stroke: ACC, sw: 3 }); });
    tx(s1, 150, 142, "¿es Ana o alguien con su máscara?", { fs: 13, fill: INK2, anchor: "middle" });
    s1 = base($("b8-c2"), 300, 150);
    const oct = []; for (let k = 0; k < 8; k++) { const a = (22.5 + k * 45) * Math.PI / 180; oct.push([150 + 48 * Math.cos(a), 70 + 48 * Math.sin(a)]); }
    S("polygon", { points: poli(oct), fill: C.s8, stroke: "#fff", "stroke-width": 3 }, s1);
    tx(s1, 150, 79, "STOP", { fs: 24, fw: 800, fill: "#fff", anchor: "middle" });
    rc(s1, 128, 82, 16, 9, { fill: C.s4, rx: 1 }).setAttribute("transform", "rotate(-14 136 86)");
    rc(s1, 162, 50, 14, 9, { fill: "#fff", rx: 1 }).setAttribute("transform", "rotate(12 169 54)");
    for (let k = 0; k < 16; k++) ln(s1, 20 + k * 18, 10 + (k * 23) % 40, 12 + k * 18, 26 + (k * 23) % 40, { stroke: RN.rgba(C.s1, 0.5), sw: 1.5 });
    tx(s1, 150, 142, "pegatinas y lluvia: ¿sigue siendo un STOP?", { fs: 13, fill: INK2, anchor: "middle" });
    s1 = base($("b8-c3"), 300, 150);
    rc(s1, 80, 10, 140, 112, { fill: "#1F2933", rx: 6 });
    for (let k = 0; k < 5; k++) { pa(s1, "M150," + (34 + k * 15) + " q-40,-6 -52,10", { stroke: "#9AA7B4", sw: 3 }); pa(s1, "M150," + (34 + k * 15) + " q40,-6 52,10", { stroke: "#9AA7B4", sw: 3 }); }
    ln(s1, 150, 24, 150, 112, { stroke: "#CBD2D9", sw: 4 });
    tx(s1, 98, 36, "L", { fs: 18, fw: 800, fill: "#fff", anchor: "middle" }); ci(s1, 98, 30, 14, { fill: "none", stroke: ACC, sw: 2.5 });
    tx(s1, 150, 142, "la marca del hospital, no el pulmón", { fs: 13, fill: INK2, anchor: "middle" });

    // ---------- el 0,1 % crítico
    const cvR = $("b8-riesgo"), rr = RN.rng(4), FALLOS = [];
    while (FALLOS.length < 10) { const k = Math.floor(rr() * 10000); if (FALLOS.indexOf(k) < 0) FALLOS.push(k); }
    const iImp = rango("b8-imp", function (v) { return "×" + mil(Math.pow(10, v)); }, pintaR);
    function pintaR() {
      const L = RN.lienzo(cvR, 380), ctx = L.ctx, imp = Math.pow(10, +iImp.value);
      ctx.fillStyle = C.surface; ctx.fillRect(0, 0, L.w, L.h);
      const lado = 330, c = lado / 100, x0 = 14, y0 = 15;
      ctx.fillStyle = "#9cc0ea";
      for (let i = 0; i < 100; i++) for (let j = 0; j < 100; j++) ctx.fillRect(x0 + j * c, y0 + i * c, c - 0.6, c - 0.6);
      ctx.save(); ctx.beginPath(); ctx.rect(x0 - 2, y0 - 2, lado + 4, lado + 4); ctx.clip();
      FALLOS.forEach(function (k) {
        const s2 = Math.max(c, c * Math.sqrt(imp)), cx = x0 + (k % 100 + 0.5) * c, cy = y0 + (Math.floor(k / 100) + 0.5) * c;
        ctx.fillStyle = RN.rgba(C.bad, imp > 30 ? 0.45 : 0.95); ctx.fillRect(cx - s2 / 2, cy - s2 / 2, s2, s2);
        ctx.strokeStyle = C.bad; ctx.lineWidth = 1; ctx.strokeRect(cx - s2 / 2, cy - s2 / 2, s2, s2);
      });
      ctx.restore();
      textoC(ctx, "10.000 casos: 9.990 aciertos y 10 fallos (0,1 %)", x0, y0 + lado + 8 + 12, { fs: 12.5, fill: INK2 });
      const pa_ = 9990, pf = 10 * imp, fr = pf / (pa_ + pf);
      const bx = x0 + lado + 50, bw = Math.max(200, L.w - bx - 30);
      textoC(ctx, "Peso de cada grupo en el impacto total", bx, 50, { fs: 15, fw: 800 });
      rrect(ctx, bx, 66, bw, 36, 6); ctx.fillStyle = "#9cc0ea"; ctx.fill();
      ctx.save(); rrect(ctx, bx, 66, bw, 36, 6); ctx.clip(); ctx.fillStyle = C.bad; ctx.fillRect(bx + bw * (1 - fr), 66, bw * fr, 36); ctx.restore();
      textoC(ctx, "aciertos: 9.990 × 1 = 9.990", bx, 130, { fs: 14 });
      textoC(ctx, "fallos: 10 × " + mil(imp) + " = " + mil(pf), bx, 154, { fs: 14 });
      textoC(ctx, "Los fallos son el " + pct(fr) + " del impacto", bx, 196, { fs: 18, fw: 800, fill: fr > 0.5 ? C.bad : INK });
      textoC(ctx, "aunque solo sean el 0,1 % de los casos.", bx, 220, { fs: 14, fill: INK2 });
      kpis($("b8-rkpis"), [["Fallos", "0,1 %", "10 de 10.000"], ["Su peso en el impacto", pct(fr)]]);
    }
    RN.alCambiarTam(cvR, pintaR);
  })();

  // ================================================================== 9 · PRIVACIDAD
  (function () {
    seg("p9-ataque", function (v) { $("p9-v-mia").hidden = v !== "mia"; $("p9-v-ext").hidden = v !== "ext"; });
    // ---------- memorización e inferencia de pertenencia
    const d = RNmlp.datos.clasif("lunas", 160, 0.22, 4), rf = RN.rng(9);
    const Yr = d.Y.map(function (y) { return [rf() < 0.15 ? 1 - y[0] : y[0]]; });
    const XM = [], YM = [], XO = [], YO = [];
    for (let k = 0; k < 160; k++) { if ((k >> 1) % 2) { XO.push(d.X[k]); YO.push(Yr[k]); } else { XM.push(d.X[k]); YM.push(Yr[k]); } }
    const EPM = 500;
    let mm = null, epm = 0, l2 = 0, animM = null, umbral = null;
    const getReg = seg("p9-reg", function (v) { l2 = +v; entrenaM(true); });
    function perdidas(m, X, Y) { return X.map(function (x, k) { return m.perdidaDe(m.forward(x), Y[k]); }); }
    function ataque(lm, lo) {
      const todos = lm.concat(lo).slice().sort(function (a, b) { return a - b; });
      let best = 0.5, tb = todos[0];
      todos.forEach(function (t) { let a = 0; lm.forEach(function (v) { if (v <= t) a++; }); lo.forEach(function (v) { if (v > t) a++; }); a /= (lm.length + lo.length); if (a > best) { best = a; tb = t; } });
      return { acc: best, t: tb };
    }
    const cvF = $("p9-mfront");
    const gHM = RN.grafica($("p9-mhist"), {
      alto: 420, margen: { l: 50, r: 16 }, hover: false,
      x: { min: -5, max: 1, marcas: [-5, -4, -3, -2, -1, 0, 1], titulo: "pérdida de cada ejemplo (escala log.)", fmt: function (v) { return v >= 0 ? mil(Math.pow(10, v)) : fmt(Math.pow(10, v), -v); } },
      y: { min: 0, max: 30, titulo: "nº de ejemplos" },
      extras: function (ctx, g) {
        if (!mm) return;
        const lm = perdidas(mm, XM, YM), lo = perdidas(mm, XO, YO);
        const bw = 0.25, nb = 24;
        function hist(L) { const h = new Array(nb).fill(0); L.forEach(function (v) { const k = Math.floor((RN.limita(Math.log10(v + 1e-9), -4.999, 0.999) + 5) / bw); h[k]++; }); return h; }
        const hm = hist(lm), ho = hist(lo);
        const ym = Math.max(10, Math.ceil((Math.max.apply(null, hm.concat(ho)) + 3) / 5) * 5);
        if (g.op.y.max !== ym) { g.op.y.max = ym; g.dibujar(); return; }
        [[hm, C.s7], [ho, C.s4]].forEach(function (q) {
          ctx.fillStyle = RN.rgba(q[1], 0.5); ctx.strokeStyle = q[1]; ctx.lineWidth = 1.2;
          q[0].forEach(function (c, k) { if (!c) return; const x0 = g.sx(-5 + k * bw), x1 = g.sx(-5 + (k + 1) * bw), y = g.sy(Math.min(g.op.y.max, c)); ctx.fillRect(x0 + 1, y, x1 - x0 - 2, g.sy(0) - y); ctx.strokeRect(x0 + 1, y, x1 - x0 - 2, g.sy(0) - y); });
        });
        const at = ataque(lm, lo); umbral = at;
        const X = g.sx(RN.limita(Math.log10(at.t + 1e-9), -5, 1));
        ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = ACC; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X, g.m.t); ctx.lineTo(X, g.h - g.m.b); ctx.stroke(); ctx.restore();
        textoC(ctx, "← «estaba en el entrenamiento»", X - 6, g.m.t + 16, { fs: 12.5, fw: 700, fill: ACC, align: "right" });
        textoC(ctx, "«no estaba» →", X + 6, g.m.t + 34, { fs: 12.5, fw: 700, fill: ACC });
        textoC(ctx, "Época " + epm, g.w - g.m.r - 8, g.m.t + 60, { fs: 14, fw: 800, align: "right" });
      }
    });
    function pintaM() {
      const L = RN.lienzo(cvF, function (w) { return w; }), ctx = L.ctx, R = 1.25;
      pintaFrontera(ctx, L.w, L.h, function (x, y) { return mm.forward([x, y])[0]; }, R, 56);
      const P = function (v) { return [(v[0] + R) / (2 * R) * L.w, (R - v[1]) / (2 * R) * L.h]; };
      XO.forEach(function (x, k) { const q = P(x); punto(ctx, q[0], q[1], 5, YO[k][0] ? C.clase1 : C.clase0, true); });
      XM.forEach(function (x, k) { const q = P(x); punto(ctx, q[0], q[1], 5, YM[k][0] ? C.clase1 : C.clase0); });
      gHM.dibujar([]);
      const at = umbral || { acc: 0.5 };
      kpis($("p9-mkpis"), [["Exactitud en entrenamiento", pct(mm.evaluar(XM, YM).precision, 0)], ["Exactitud en datos no vistos", pct(mm.evaluar(XO, YO).precision, 0)], ["Acierto del atacante", pct(at.acc, 0), "50 % = adivinar"]]);
    }
    function entrenaM(animado) {
      mm = new RNmlp.MLP({ capas: [2, 48, 48, 1], activacion: "relu", salida: "sigmoid", semilla: 5 }); epm = 0;
      if (animM) animM.parar();
      const op = { lote: 16, lr: 0.01, opt: "adam", l2: l2 };
      if (!animado || RED) { for (; epm < EPM; epm++) mm.entrenarEpoca(XM, YM, op); pintaM(); return; }
      animM = anima(function () { for (let k = 0; k < 10 && epm < EPM; k++, epm++) mm.entrenarEpoca(XM, YM, op); pintaM(); if (epm >= EPM) return false; }, cvF);
      animM.iniciar();
    }
    $("p9-mplay").addEventListener("click", function () { entrenaM(true); });
    alMostrar(cvF, function () { entrenaM(false); RN.alCambiarTam(cvF, function () { if (mm) pintaM(); }); });

    // ---------- extracción del modelo
    let vict = null, copia = null, Q = null, epc = 0, animC = null;
    const iQ = rango("p9-q", function (v) { return mil(Math.round(Math.pow(10, v))); }, function () { copiar(false); });
    const cvV = $("p9-vict"), cvC = $("p9-copia");
    function preparaVictima() {
      const dv = RNmlp.datos.clasif("lunas", 300, 0.12, 2);
      vict = new RNmlp.MLP({ capas: [2, 24, 24, 1], activacion: "relu", salida: "sigmoid", semilla: 11 });
      for (let e = 0; e < 300; e++) vict.entrenarEpoca(dv.X, dv.Y, { lote: 32, lr: 0.01, opt: "adam" });
    }
    function concordancia() { let ok = 0, n = 0; for (let a = 0; a < 50; a++) for (let b = 0; b < 50; b++) { const x = [-1.25 + 2.5 * (a + 0.5) / 50, -1.25 + 2.5 * (b + 0.5) / 50]; if ((vict.forward(x)[0] >= 0.5) === (copia.forward(x)[0] >= 0.5)) ok++; n++; } return ok / n; }
    function pintaE() {
      const R = 1.25;
      let L = RN.lienzo(cvV, function (w) { return w; }), ctx = L.ctx;
      pintaFrontera(ctx, L.w, L.h, function (x, y) { return vict.forward([x, y])[0] >= 0.5 ? 0.92 : 0.08; }, R, 92);
      rrect(ctx, 10, 10, 236, 50, 8); ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.fill();
      textoC(ctx, "Víctima: caja negra en una API", 20, 31, { fs: 14, fw: 800 }); textoC(ctx, "solo devuelve la clase", 20, 50, { fs: 13, fill: INK2 });
      L = RN.lienzo(cvC, function (w) { return w; }); ctx = L.ctx;
      pintaFrontera(ctx, L.w, L.h, function (x, y) { return copia.forward([x, y])[0] >= 0.5 ? 0.92 : 0.08; }, R, 92);
      const rad = Q.X.length > 400 ? 2.6 : 3.8;
      Q.X.forEach(function (x, k) { punto(ctx, (x[0] + R) / (2 * R) * L.w, (R - x[1]) / (2 * R) * L.h, rad, Q.Y[k][0] ? C.clase1 : C.clase0); });
      rrect(ctx, 10, 10, 250, 50, 8); ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.fill();
      textoC(ctx, "Copia del atacante · época " + epc, 20, 31, { fs: 14, fw: 800 }); textoC(ctx, mil(Q.X.length) + " consultas y sus respuestas", 20, 50, { fs: 13, fill: INK2 });
      kpis($("p9-ekpis"), [["Consultas", mil(Q.X.length)], ["Concordancia con la víctima", pct(concordancia())], ["Pesos de la víctima vistos", "0"]]);
    }
    function copiar(animado) {
      if (!vict) return;
      const n = Math.round(Math.pow(10, +iQ.value)), r = RN.rng(17);
      Q = { X: [], Y: [] };
      for (let k = 0; k < n; k++) { const x = [-1.25 + 2.5 * r(), -1.25 + 2.5 * r()]; Q.X.push(x); Q.Y.push([vict.forward(x)[0] >= 0.5 ? 1 : 0]); }
      copia = new RNmlp.MLP({ capas: [2, 24, 24, 1], activacion: "relu", salida: "sigmoid", semilla: 23 }); epc = 0;
      if (animC) animC.parar();
      const op = { lote: 32, lr: 0.01, opt: "adam" }, EP = 150;
      if (!animado || RED) { for (; epc < EP; epc++) copia.entrenarEpoca(Q.X, Q.Y, op); pintaE(); return; }
      animC = anima(function () { for (let k = 0; k < 5 && epc < EP; k++, epc++) copia.entrenarEpoca(Q.X, Q.Y, op); pintaE(); if (epc >= EP) return false; }, cvC);
      animC.iniciar();
    }
    $("p9-eplay").addEventListener("click", function () { copiar(true); });
    alMostrar(cvV, function () { preparaVictima(); copiar(false); RN.alCambiarTam(cvV, function () { if (copia) pintaE(); }); });

    // ---------- defensas
    seg("p9-def", function (v) { ["dp", "fl", "rt"].forEach(function (k) { $("p9-v-" + k).hidden = k !== v; }); });
    const iE = rango("p9-eps", function (v) { return fmt(Math.pow(10, v), 2); }, pintaDP);
    let publicada = null;
    const gDP = RN.grafica($("p9-dp"), {
      alto: 300, margen: { l: 56, r: 18 },
      x: { min: 30, max: 56, titulo: "respuesta publicada (nº de pacientes)" }, y: { min: 0, max: 0.3, titulo: "densidad" },
      extras: function (ctx, g) {
        if (publicada === null) return;
        const X = g.sx(publicada);
        ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(X, g.m.t + 22); ctx.lineTo(X, g.h - g.m.b); ctx.stroke();
        textoC(ctx, "publicada: " + fmt(publicada, 1), X, g.m.t + 14, { fs: 13.5, fw: 800, align: "center" });
      }
    });
    function pintaDP() {
      const e = Math.pow(10, +iE.value), b = 1 / e, half = Math.max(8, 5 * b);
      gDP.op.x.min = Math.floor(42.5 - half); gDP.op.x.max = Math.ceil(42.5 + half);
      gDP.op.y.max = Math.max(0.02, e / 2 * 1.15);
      const lap = function (c) { const P = []; for (let x = gDP.op.x.min; x <= gDP.op.x.max + 1e-9; x += (gDP.op.x.max - gDP.op.x.min) / 400) P.push([x, e / 2 * Math.exp(-e * Math.abs(x - c))]); return P; };
      gDP.dibujar([{ nombre: "con Ana (43)", color: C.s1, puntos: lap(43), tipo: "area", alfa: 0.15, ancho: 2.5 }, { nombre: "sin Ana (42)", color: C.s2, puntos: lap(42), tipo: "area", alfa: 0.15, ancho: 2.5 }]);
      kpis($("p9-dkpis"), [["Ruido típico", "± " + fmt(Math.SQRT2 / e, 2), "desviación típica √2/ε"], ["El atacante distingue", "×" + fmt(Math.exp(e), 2), "como mucho, e<sup>ε</sup>"], ["Respuesta publicada", publicada === null ? "—" : fmt(publicada, 1)]]);
    }
    const rl = RN.rng(99);
    function publica() { const e = Math.pow(10, +iE.value), u = rl() - 0.5; publicada = 43 - (1 / e) * Math.sign(u) * Math.log(1 - 2 * Math.abs(u)); pintaDP(); }
    $("p9-pub").addEventListener("click", publica);
    publica();

    // ---------- aprendizaje federado
    const sf = base($("p9-fed"), 1000, 340);
    rc(sf, 390, 16, 220, 76, { fill: "#EEF3F9", stroke: "#8FA6BF", sw: 2, rx: 12 });
    tx(sf, 500, 46, "Servidor", { fs: 16, fw: 800, anchor: "middle" }); tx(sf, 500, 68, "modelo global", { fs: 13, fill: INK2, anchor: "middle" });
    const tRonda = tx(sf, 500, 86, "", { fs: 12.5, fill: ACC, fw: 700, anchor: "middle" });
    const CLX = [110, 305, 500, 695, 890], CLY = 250;
    const progreso = [];
    CLX.forEach(function (x, k) {
      rc(sf, x - 62, CLY - 40, 124, 92, { fill: "#fff", stroke: INK2, sw: 1.8, rx: 12 });
      tx(sf, x, CLY - 20, "Dispositivo " + (k + 1), { fs: 13.5, fw: 700, anchor: "middle" });
      const r = RN.rng(40 + k); for (let i = 0; i < 7; i++) ci(sf, x - 44 + r() * 50, CLY + 2 + r() * 30, 4, { fill: r() < 0.5 ? C.clase1 : C.clase0 });
      rc(sf, x + 22, CLY + 6, 24, 20, { fill: INK2, rx: 3 }); pa(sf, "M" + (x + 27) + "," + (CLY + 6) + " v-6 a7,7 0 0 1 14,0 v6", { stroke: INK2, sw: 2.5 });
      rc(sf, x - 50, CLY + 40, 100, 6, { fill: SUAVE, rx: 3 });
      progreso.push(rc(sf, x - 50, CLY + 40, 0, 6, { fill: ACC, rx: 3 }));
    });
    const fx = flecha(sf, C.bad);
    ln(sf, 110, CLY - 46, 200, 120, { stroke: C.bad, sw: 1.8, dash: "5 4", marker: fx });
    marcaOK(sf, 155, 183, 10, false); tx(sf, 172, 188, "los datos crudos no salen", { fs: 13, fw: 700, fill: C.bad });
    const fase = tx(sf, 20, 30, "", { fs: 15, fw: 800 });
    const gMov = S("g", {}, sf);
    const viajeros = CLX.map(function () { const g = S("g", {}, gMov); rc(g, -18, -11, 36, 22, { rx: 5, fill: C.s1 }); const t = tx(g, 0, 5, "", { fs: 12, fw: 800, fill: "#fff", anchor: "middle" }); return { g: g, t: t, r: g.firstChild }; });
    const sparkP = [0.5];
    const spk = pa(sf, "", { stroke: C.s3, sw: 2.5 });
    tx(sf, 820, 30, "precisión del modelo global (esquema)", { fs: 12.5, fill: INK2, anchor: "middle" });
    rc(sf, 720, 38, 200, 70, { fill: "none", stroke: LINEA, rx: 6 });
    let ronda = 0, tt = 0;
    const FASES = ["1 · El servidor envía el modelo", "2 · Cada dispositivo entrena con sus datos", "3 · Solo suben las actualizaciones (Δw)", "4 · El servidor las promedia"];
    function fed(dt) {
      tt += dt; const ciclo = 4.4, f = (tt % ciclo) / 1.1, ph = Math.floor(f), u = f - ph;
      const r = Math.floor(tt / ciclo) + 1;
      if (r !== ronda) { ronda = r; sparkP.push(0.55 + 0.4 * (1 - Math.exp(-ronda / 4))); if (sparkP.length > 12) sparkP.shift(); }
      fase.textContent = FASES[ph]; tRonda.textContent = "ronda " + ronda;
      viajeros.forEach(function (v, k) {
        let x = CLX[k], y = CLY, vis = 1;
        if (ph === 0) { x = RN.lerp(500, CLX[k], u); y = RN.lerp(92, CLY - 52, u); v.t.textContent = "w"; v.r.setAttribute("fill", C.s1); }
        else if (ph === 2) { x = RN.lerp(CLX[k], 500, u); y = RN.lerp(CLY - 52, 92, u); v.t.textContent = "Δw"; v.r.setAttribute("fill", ACC); }
        else vis = 0;
        v.g.setAttribute("transform", "translate(" + x.toFixed(1) + "," + y.toFixed(1) + ")"); v.g.setAttribute("opacity", vis);
      });
      progreso.forEach(function (p, k) { p.setAttribute("width", ph === 1 ? 100 * Math.min(1, u * (1 + k * 0.15)) : ph > 1 ? 100 : 0); });
      let dd = ""; sparkP.forEach(function (v, k) { dd += (k ? " L" : "M") + (730 + k * 16) + "," + (100 - (v - 0.5) * 120).toFixed(1); }); spk.setAttribute("d", dd);
    }
    fed(0.6);
    const animF = bucle(function (dt) { fed(dt); }, sf);
    if (!RED) animF.iniciar();
    RN.botonPlay($("p9-fplay"), animF, ["▶ Reanudar", "⏸ Pausa"]);

    // ---------- red teaming
    const sr = base($("p9-rt"), 1000, 250);
    const RT = [[170, 60, "1 · Atacar", "jailbreaks, extracción, sesgos"], [470, 60, "2 · Encontrar fallos", "y medir su gravedad"], [470, 190, "3 · Corregir", "y documentar"], [170, 190, "4 · Volver a atacar", "¿sigue el fallo?"]];
    const fr = flecha(sr, INK2);
    [[0, 1], [1, 2], [2, 3], [3, 0]].forEach(function (e) {
      const a = RT[e[0]], b = RT[e[1]], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ox = dx / L, oy = dy / L;
      const mx = Math.abs(dx) > 0 ? 112 : 0, my = Math.abs(dy) > 0 ? 34 : 0;
      ln(sr, a[0] + ox * mx, a[1] + oy * my, b[0] - ox * (mx + 4), b[1] - oy * (my + 4), { stroke: INK2, sw: 2, marker: fr });
    });
    RT.forEach(function (n) { rc(sr, n[0] - 105, n[1] - 30, 210, 60, { fill: "#fff", stroke: C.s8, sw: 2, rx: 12 }); tx(sr, n[0], n[1] - 4, n[2], { fs: 15, fw: 800, anchor: "middle" }); tx(sr, n[0], n[1] + 17, n[3], { fs: 13, fill: INK2, anchor: "middle" }); });
    ln(sr, 580, 125, 700, 125, { stroke: INK2, sw: 2, marker: fr, dash: "6 4" });
    tx(sr, 640, 114, "cuando no quedan", { fs: 12.5, fill: INK2, anchor: "middle" }); tx(sr, 640, 146, "fallos graves", { fs: 12.5, fill: INK2, anchor: "middle" });
    rc(sr, 706, 92, 270, 66, { fill: "#E8F5E9", stroke: C.ok, sw: 2, rx: 12 });
    tx(sr, 841, 120, "Despliegue", { fs: 16, fw: 800, anchor: "middle" }); tx(sr, 841, 142, "con monitorización", { fs: 13, fill: INK2, anchor: "middle" });
    const ficha = ci(sr, 0, 0, 8, { fill: C.s8, stroke: "#fff", sw: 2 });
    function rtPaso(t) { const f = (t * 0.35) % 4, k = Math.floor(f), u = f - k, a = RT[k], b = RT[(k + 1) % 4]; ficha.setAttribute("cx", RN.lerp(a[0], b[0], u).toFixed(1)); ficha.setAttribute("cy", RN.lerp(a[1], b[1], u).toFixed(1)); }
    rtPaso(0.2);
    if (!RED) bucle(function (dt, t) { rtPaso(t); }, sr).iniciar();

    // ---------- linaje
    const sl = base($("p9-linaje"), 1000, 290);
    const COLS = [[110, "Datos"], [370, "Código de entrenamiento"], [630, "Modelos"], [880, "Despliegue"]];
    COLS.forEach(function (c) { tx(sl, c[0], 26, c[1], { fs: 14, fw: 800, anchor: "middle", fill: INK2 }); });
    const N = {
      D1: [110, 80, "datos v1 · enero"], D2: [110, 160, "datos v2 · marzo"], D3: [110, 240, "datos v3 · junio"],
      C1: [370, 120, "código a1f3"], C2: [370, 200, "código 7c2e"],
      M1: [630, 80, "modelo 1.0"], M2: [630, 160, "modelo 1.1"], M3: [630, 240, "modelo 2.0"],
      P: [880, 200, "producción"]
    };
    const AR = [["D1", "M1"], ["C1", "M1"], ["D2", "M2"], ["C1", "M2"], ["D3", "M3"], ["C2", "M3"], ["M3", "P"]];
    const fla = flecha(sl, "#B8C2CC"), flb = flecha(sl, ACC);
    const gA = S("g", {}, sl), gN = S("g", {}, sl);
    const aristas = AR.map(function (a) { const p = N[a[0]], q = N[a[1]]; return { a: a, l: pa(gA, "M" + (p[0] + 85) + "," + p[1] + " C" + (p[0] + 150) + "," + p[1] + " " + (q[0] - 150) + "," + q[1] + " " + (q[0] - 89) + "," + q[1], { stroke: "#B8C2CC", sw: 2, marker: fla }) }; });
    const nodosL = {};
    Object.keys(N).forEach(function (k) {
      const n = N[k], g = S("g", { class: "clic" }, gN);
      const r = rc(g, n[0] - 85, n[1] - 18, 170, 36, { fill: "#fff", stroke: INK2, sw: 1.8, rx: 18 });
      const t = tx(g, n[0], n[1] + 5, n[2], { fs: 14, fw: 700, anchor: "middle" });
      nodosL[k] = { r: r, t: t };
      g.addEventListener("click", function () { linaje(k); });
    });
    function relacionados(k) {
      const S2 = new Set([k]); let cambio = true;
      while (cambio) { cambio = false; AR.forEach(function (a) { if (S2.has(a[1]) && !S2.has(a[0]) && (a[1] === k || isAnc(a[1]))) { S2.add(a[0]); cambio = true; } }); }
      function isAnc(x) { return S2.has(x); }
      const des = new Set([k]); cambio = true;
      while (cambio) { cambio = false; AR.forEach(function (a) { if (des.has(a[0]) && !des.has(a[1])) { des.add(a[1]); cambio = true; } }); }
      des.forEach(function (x) { S2.add(x); });
      return S2;
    }
    function linaje(k) {
      const S2 = relacionados(k);
      Object.keys(nodosL).forEach(function (n) { const on = S2.has(n); nodosL[n].r.setAttribute("fill", n === k ? ACC : on ? ACC_L : "#fff"); nodosL[n].r.setAttribute("stroke", on ? ACC : "#C3CFDC"); nodosL[n].t.setAttribute("fill", n === k ? "#fff" : on ? INK : MUT); });
      aristas.forEach(function (a) { const on = S2.has(a.a[0]) && S2.has(a.a[1]); a.l.setAttribute("stroke", on ? ACC : "#D5DDE6"); a.l.setAttribute("stroke-width", on ? 3 : 2); a.l.setAttribute("marker-end", on ? flb : fla); });
    }
    linaje("P");
    $("p9-traza").addEventListener("click", async function () {
      const b = this; b.disabled = true;
      for (const k of ["P", "M3", "C2", "D3"]) { linaje(k); await RN.espera(RED ? 0 : 700); }
      linaje("P"); b.disabled = false;
    });

    // ---------- ¿qué auditar?
    const sa = base($("p9-aud"), 1000, 320);
    const NIV = [["D", "Datos", C.s1, "p9-aD"], ["P", "Entrenamiento", C.s2, "p9-aP"], ["S", "Salidas", C.s3, "p9-aS"]];
    const RIES = [["Sesgo en el origen de los datos", "DS"], ["Datos sin licencia o personales", "D"], ["Fuga entre entrenamiento y prueba", "P"], ["Modelo imposible de reproducir", "P"], ["Discriminación en producción", "S"], ["Degradación con datos nuevos", "S"], ["Respuestas que revelan datos personales", "SD"]];
    const sel = { D: true, P: false, S: false };
    const gAu = S("g", {}, sa);
    const fau = flecha(sa, INK2);
    function pintaAud() {
      while (gAu.firstChild) gAu.removeChild(gAu.firstChild);
      NIV.forEach(function (n, k) {
        const x = 40 + k * 330, on = sel[n[0]];
        rc(gAu, x, 16, 260, 54, { fill: on ? RN.mezcla("#ffffff", n[2], 0.2) : "#fff", stroke: on ? n[2] : "#C3CFDC", sw: on ? 2.5 : 1.5, rx: 12 });
        tx(gAu, x + 130, 49, n[1], { fs: 15, fw: 800, anchor: "middle", fill: on ? INK : MUT });
        if (k < 2) ln(gAu, x + 266, 43, x + 324, 43, { stroke: INK2, sw: 2, marker: fau });
        if (on) { ci(gAu, x + 22, 43, 8, { fill: "none", stroke: n[2], sw: 2.5 }); ln(gAu, x + 28, 49, x + 34, 55, { stroke: n[2], sw: 3 }); }
      });
      let cub = 0;
      RIES.forEach(function (r, k) {
        const fila = k < 4 ? 0 : 1, col = fila ? k - 4 : k, w = 232, x = fila ? 40 + col * 312 + 40 : 16 + col * 245, y = 100 + fila * 96;
        const on = r[1].split("").some(function (c) { return sel[c]; });
        if (on) cub++;
        const g = S("g", { opacity: on ? 1 : 0.45 }, gAu);
        rc(g, x, y, w, 80, { fill: on ? "#fff" : SUAVE, stroke: on ? C.ok : "#C3CFDC", sw: on ? 2 : 1.5, rx: 10, dash: on ? null : "5 4" });
        const pal = r[0].split(" "), l1 = [], l2_ = []; pal.forEach(function (p) { (l1.join(" ").length + p.length < 24 && !l2_.length ? l1 : l2_).push(p); });
        tx(g, x + 14, y + 26, [l1.join(" "), l2_.join(" ")], { fs: 14, fw: 700 });
        r[1].split("").forEach(function (c, i) { const n = NIV.find(function (q) { return q[0] === c; }); ci(g, x + 20 + i * 18, y + 64, 6, { fill: n[2] }); });
        tx(g, x + 20 + r[1].length * 18, y + 69, "lo detecta", { fs: 12.5, fill: INK2 });
        if (on) marcaOK(g, x + w - 18, y + 18, 9, true); else tx(g, x + w - 12, y + 70, "sin cubrir", { fs: 12.5, fw: 700, fill: MUT, anchor: "end" });
      });
      tx(gAu, 500, 312, "Riesgos a la vista: " + cub + " de " + RIES.length, { fs: 16, fw: 800, anchor: "middle", fill: cub === RIES.length ? C.ok : INK });
    }
    NIV.forEach(function (n) { const b = $(n[3]); b.addEventListener("click", function () { sel[n[0]] = !sel[n[0]]; b.setAttribute("aria-pressed", sel[n[0]] ? "true" : "false"); pintaAud(); }); });
    pintaAud();
  })();

  // ================================================================== 10 · CIENCIA
  (function () {
    // ---------- modelos sustitutos
    const f = function (x) { return 0.55 * Math.sin(3.2 * x + 0.4) - 0.1 * x; };
    const XS = []; for (let k = 0; k < 9; k++) XS.push(-1 + k * 1.05 / 8);
    const DX = XS.map(function (x) { return [x]; }), DY = XS.map(function (x) { return [f(x)]; });
    let sus = [], eps = 0, validado = false, cand = null, tEval = null, animS = null;
    const EPS = 1500;
    function nuevos() { sus = []; for (let s = 1; s <= 5; s++) sus.push(new RNmlp.MLP({ capas: [1, 24, 24, 1], activacion: "relu", salida: "lineal", semilla: s * 13 })); eps = 0; }
    function entrenaS(n) { for (let k = 0; k < n && eps < EPS; k++, eps++) sus.forEach(function (m) { m.entrenarEpoca(DX, DY, { lote: 9, lr: 0.01, opt: "adam", barajar: false }); }); }
    function media(x) { let s = 0; sus.forEach(function (m) { s += m.forward([x])[0]; }); return s / sus.length; }
    const gS = RN.grafica($("c10-sust"), {
      alto: 340, margen: { l: 52, r: 18 },
      x: { min: -1, max: 1, titulo: "diseño candidato (p. ej. una variable de la molécula)" }, y: { min: -1, max: 4.5, titulo: "propiedad que se quiere maximizar" },
      extras: function (ctx, g) {
        ctx.fillStyle = RN.rgba(C.s1, 0.06); ctx.fillRect(g.sx(-1), g.m.t, g.sx(XS[8]) - g.sx(-1), g.h - g.m.t - g.m.b);
        textoC(ctx, "zona con simulaciones", g.sx(-0.98), g.m.t + 16, { fs: 12.5, fw: 700, fill: INK2 });
        textoC(ctx, "zona sin datos", g.sx(0.98), g.m.t + 16, { fs: 12.5, fw: 700, fill: INK2, align: "right" });
        if (!cand) return;
        const X = g.sx(cand.x), Y = g.sy(cand.y);
        ctx.beginPath(); ctx.arc(X, Y, 8, 0, 7); ctx.fillStyle = ACC; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke();
        textoC(ctx, "candidato elegido: predice " + fmt(cand.y, 2), X - 12, Y - 4, { fs: 13.5, fw: 800, align: "right" });
        if (validado) {
          const Yr = g.sy(f(cand.x));
          ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = C.bad; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X, Y + 8); ctx.lineTo(X, Yr - 7); ctx.stroke(); ctx.restore();
          ctx.beginPath(); ctx.arc(X, Yr, 7, 0, 7); ctx.fillStyle = INK; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke();
          textoC(ctx, "en el laboratorio: " + fmt(f(cand.x), 2), X - 12, Yr + 22, { fs: 13.5, fw: 800, fill: C.bad, align: "right" });
        }
      }
    });
    function pintaS() {
      const series = [];
      if (eps > 0) {
        sus.forEach(function (m, k) { const P = []; for (let x = -1; x <= 1.0001; x += 0.01) P.push([x, m.forward([x])[0]]); series.push({ nombre: k ? null : "un sustituto", color: "#9cc0ea", puntos: P, ancho: 1.4, hover: false }); });
        const P = []; for (let x = -1; x <= 1.0001; x += 0.01) P.push([x, media(x)]);
        series.push({ nombre: "media de los sustitutos", color: C.s1, puntos: P, ancho: 3 });
        // candidato: máximo de la media en 1.000 puntos (se mide el tiempo)
        const t0 = performance.now(); let bx = -1, by = -Infinity;
        for (let i = 0; i < 1000; i++) { const x = -1 + 2 * i / 999, y = media(x); if (y > by) { by = y; bx = x; } }
        tEval = performance.now() - t0; cand = { x: bx, y: by };
      } else cand = null;
      if (validado) { const P = []; for (let x = -1; x <= 1.0001; x += 0.01) P.push([x, f(x)]); series.push({ nombre: "realidad", color: INK2, puntos: P, ancho: 2, discontinua: true }); }
      series.push({ nombre: "simulaciones", color: INK, puntos: DX.map(function (x, k) { return [x[0], DY[k][0]]; }), tipo: "puntos", radio: 5.5 });
      gS.dibujar(series);
      const desac = cand ? Math.sqrt(sus.reduce(function (s, m) { const v = m.forward([cand.x])[0] - cand.y; return s + v * v; }, 0) / sus.length) : 0;
      kpis($("c10-skpis"), [["Evaluar 1.000 candidatos", cand ? fmt(tEval, 1) + " ms" : "—", "medido en este navegador"], ["Predicción del candidato", cand ? fmt(cand.y, 2) : "—", cand ? "± " + fmt(desac, 2) + " entre sustitutos" : ""], ["En el laboratorio", validado && cand ? fmt(f(cand.x), 2) : "sin validar"]]);
    }
    $("c10-train").addEventListener("click", function () {
      nuevos(); validado = false; if (animS) animS.parar();
      if (RED) { entrenaS(EPS); pintaS(); return; }
      animS = anima(function () { entrenaS(30); pintaS(); if (eps >= EPS) return false; }, $("c10-sust")); animS.iniciar();
    });
    $("c10-val").addEventListener("click", function () { validado = true; pintaS(); });
    $("c10-reset").addEventListener("click", function () { validado = false; pintaS(); });
    alMostrar($("c10-sust"), function () { nuevos(); entrenaS(EPS); pintaS(); });

    // ---------- escalera de evidencia
    const se = base($("c10-esc"), 1000, 260);
    const ESC = [["Una demo", "que funciona"], ["Métricas en un", "conjunto de prueba"], ["Validación externa", "(otros centros,", "otras poblaciones)"], ["Estudio", "prospectivo"], ["Ensayo clínico y", "aprobación", "regulatoria"], ["Vigilancia tras", "el despliegue"]];
    const gE = S("g", {}, se);
    const iG = rango("c10-g", function (v) { return v < 20 ? "una molestia" : v < 40 ? "un perjuicio leve" : v < 60 ? "pérdidas económicas" : v < 80 ? "un daño grave" : "un daño irreversible"; }, pintaE);
    $("c10-gv").addEventListener("click", function () { ponerRango(iG, 25); });
    $("c10-gm").addEventListener("click", function () { ponerRango(iG, 100); });
    function pintaE() {
      const g = +iG.value, req = Math.min(6, 1 + Math.floor(g / 17));
      while (gE.firstChild) gE.removeChild(gE.firstChild);
      ESC.forEach(function (e, k) {
        const x = 18 + k * 162, top = 180 - k * 26, on = k < req;
        rc(gE, x, top, 154, 250 - top, { fill: on ? ACC_L : "#fff", stroke: on ? ACC : "#C3CFDC", sw: on ? 2.2 : 1.5, rx: 8 });
        tx(gE, x + 12, top + 22, String(k + 1), { fs: 15, fw: 800, fill: on ? ACC : MUT });
        tx(gE, x + 12, top + 44, e, { fs: 13, fw: 600, fill: on ? INK : MUT, lh: 1.25 });
      });
      tx(gE, 18, 30, "Exigencia: hasta el escalón " + req + " de 6", { fs: 16, fw: 800 });
      tx(gE, 18, 52, "si un error supone " + $("c10-go").textContent, { fs: 14, fill: INK2 });
      [[25, "recomendación de vídeos"], [100, "diagnóstico médico"]].forEach(function (q) {
        const rq = Math.min(6, 1 + Math.floor(q[0] / 17)), x = 18 + (rq - 1) * 162 + 77, top = 180 - (rq - 1) * 26;
        tx(gE, x, top - 10, "▼ " + q[1], { fs: 12.5, fw: 700, fill: INK2, anchor: "middle" });
      });
      ln(gE, 10, 251, 990, 251, { stroke: INK2, sw: 1.5 });
    }
    pintaE();

    // ---------- tendencias de hardware
    const h1 = base($("c10-h1"), 300, 160), h2 = base($("c10-h2"), 300, 160), h3 = base($("c10-h3"), 300, 160);
    const NEU = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) NEU.push([50 + i * 66, 34 + j * 46]);
    const SIN = []; const rn = RN.rng(5); NEU.forEach(function (a, i) { NEU.forEach(function (b, j) { if (j > i && Math.hypot(a[0] - b[0], a[1] - b[1]) < 90 && rn() < 0.6) SIN.push([i, j]); }); });
    SIN.forEach(function (s) { ln(h1, NEU[s[0]][0], NEU[s[0]][1], NEU[s[1]][0], NEU[s[1]][1], { stroke: "#D5DDE6", sw: 1.5 }); });
    const cN = NEU.map(function (n) { return ci(h1, n[0], n[1], 9, { fill: "#fff", stroke: INK2, sw: 2 }); });
    const pico = ci(h1, 0, 0, 4, { fill: ACC, op: 0 });
    // analógico
    for (let i = 0; i < 4; i++) { ln(h2, 30, 30 + i * 28, 210, 30 + i * 28, { stroke: C.s1, sw: 2 }); tx(h2, 22, 35 + i * 28, "V" + (i + 1), { fs: 12, fw: 700, anchor: "end" }); }
    for (let j = 0; j < 3; j++) { ln(h2, 70 + j * 55, 18, 70 + j * 55, 128, { stroke: C.s2, sw: 2 }); tx(h2, 70 + j * 55, 146, "I" + (j + 1), { fs: 12, fw: 700, anchor: "middle" }); }
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) rc(h2, 64 + j * 55, 24 + i * 28, 12, 12, { fill: RN.colorSeq(0.2 + ((i * 3 + j) * 37 % 10) / 14), rx: 2 });
    tx(h2, 258, 64, "I = Σ G·V", { fs: 13, fw: 800, anchor: "middle" }); tx(h2, 258, 84, "(Ohm y", { fs: 12, fill: INK2, anchor: "middle" }); tx(h2, 258, 99, "Kirchhoff)", { fs: 12, fill: INK2, anchor: "middle" });
    const gotas = []; for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) gotas.push({ j: j, f: k / 3, c: ci(h2, 0, 0, 3, { fill: C.s2 }) });
    // fotónico
    const guias = ["M10,50 C60,50 70,80 110,80 L190,80 C230,80 240,50 290,50", "M10,110 C60,110 70,80 110,80", "M190,80 C230,80 240,110 290,110"];
    guias.forEach(function (d) { pa(h3, d, { stroke: "#CBD5E1", sw: 6 }); });
    const luz = []; const pth = h3.querySelectorAll("path");
    for (let k = 0; k < 8; k++) luz.push({ p: pth[k % 3], f: k / 8, c: ci(h3, 0, 0, 4, { fill: C.s4 }) });
    rc(h3, 96, 62, 108, 36, { fill: "#fff", stroke: C.s7, sw: 2, rx: 6 }); tx(h3, 150, 85, "interferómetro", { fs: 12, fw: 700, anchor: "middle" });
    tx(h3, 150, 145, "pulsos de luz por guías de onda", { fs: 12, fill: INK2, anchor: "middle" });
    let ultimoPico = -1, origen = 0, destino = 0;
    function hw(t) {
      const ci_ = Math.floor(t / 0.9);
      if (ci_ !== ultimoPico) { ultimoPico = ci_; const s = SIN[(ci_ * 7) % SIN.length]; origen = s[0]; destino = s[1]; }
      const u = (t / 0.9) % 1;
      cN.forEach(function (c, k) { c.setAttribute("fill", (k === origen && u < 0.25) || (k === destino && u > 0.8) ? ACC : "#fff"); });
      pico.setAttribute("cx", RN.lerp(NEU[origen][0], NEU[destino][0], u)); pico.setAttribute("cy", RN.lerp(NEU[origen][1], NEU[destino][1], u)); pico.setAttribute("opacity", 1);
      gotas.forEach(function (g) { const f2 = (g.f + t * 0.4) % 1; g.c.setAttribute("cx", 70 + g.j * 55); g.c.setAttribute("cy", 18 + f2 * 110); });
      luz.forEach(function (l) { const L = l.p.getTotalLength(), q = l.p.getPointAtLength(((l.f + t * 0.3) % 1) * L); l.c.setAttribute("cx", q.x.toFixed(1)); l.c.setAttribute("cy", q.y.toFixed(1)); });
    }
    alMostrar($("c10-h3"), function () { hw(0.5); if (!RED) bucle(function (dt, t) { hw(t); }, h1).iniciar(); });

    // ---------- olvido catastrófico
    function tarea(cual, n, sem) {
      const r = RN.rng(sem), X = [], Y = [];
      while (X.length < n) { const x1 = cual === "A" ? -1 + r() * 0.8 : 0.2 + r() * 0.8, x2 = -1 + 2 * r(); if (Math.abs(x2) < 0.08) continue; X.push([x1, x2]); Y.push([cual === "A" ? (x2 > 0 ? 1 : 0) : (x2 < 0 ? 1 : 0)]); }
      return { X: X, Y: Y };
    }
    const TA = tarea("A", 200, 1), TB = tarea("B", 200, 2), TAt = tarea("A", 300, 3), TBt = tarea("B", 300, 4);
    let mo = null, epo = 0, hist = { a: [], b: [] }, animO = null, rr = null;
    const cvO = $("c10-ofront");
    const gO = RN.grafica($("c10-ocurva"), {
      alto: 240, margen: { l: 50, r: 16 },
      x: { min: 0, max: 120, titulo: "época" }, y: { min: 0, max: 100, titulo: "exactitud (%)" },
      extras: function (ctx, g) {
        ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = INK2; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(g.sx(60), g.m.t); ctx.lineTo(g.sx(60), g.h - g.m.b); ctx.stroke(); ctx.restore();
        textoC(ctx, "solo tarea A", g.sx(30), g.m.t + 14, { fs: 12.5, fw: 700, fill: INK2, align: "center" });
        textoC(ctx, "solo tarea B", g.sx(90), g.m.t + 14, { fs: 12.5, fw: 700, fill: INK2, align: "center" });
      }
    });
    function pasoO() {
      let X = TA.X, Y = TA.Y;
      if (epo >= 60) { X = TB.X.slice(); Y = TB.Y.slice(); if ($("c10-rep").checked) for (let k = 0; k < 20; k++) { const i = Math.floor(rr() * 200); X.push(TA.X[i]); Y.push(TA.Y[i]); } }
      mo.entrenarEpoca(X, Y, { lote: 16, lr: 0.01, opt: "adam" }); epo++;
      hist.a.push([epo, mo.evaluar(TAt.X, TAt.Y).precision * 100]); hist.b.push([epo, mo.evaluar(TBt.X, TBt.Y).precision * 100]);
    }
    function pintaO() {
      const L = RN.lienzo(cvO, function (w) { return w; }), ctx = L.ctx, R = 1.1;
      pintaFrontera(ctx, L.w, L.h, function (x, y) { return mo.forward([x, y])[0]; }, R, 50);
      const P = function (v) { return [(v[0] + R) / (2 * R) * L.w, (R - v[1]) / (2 * R) * L.h]; };
      TA.X.forEach(function (x, k) { if (k % 2) return; const q = P(x); punto(ctx, q[0], q[1], 4.5, TA.Y[k][0] ? C.clase1 : C.clase0); });
      TB.X.forEach(function (x, k) { if (k % 2) return; const q = P(x); ctx.fillStyle = TB.Y[k][0] ? C.clase1 : C.clase0; ctx.fillRect(q[0] - 4.5, q[1] - 4.5, 9, 9); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.strokeRect(q[0] - 4.5, q[1] - 4.5, 9, 9); });
      ctx.fillStyle = "rgba(255,255,255,.85)"; rrect(ctx, 8, 8, L.w - 16, 30, 6); ctx.fill();
      textoC(ctx, "Tarea A (●): arriba = azul", 16, 28, { fs: 13, fw: 700 });
      textoC(ctx, "Tarea B (■): abajo = azul", L.w - 16, 28, { fs: 13, fw: 700, align: "right" });
      textoC(ctx, "época " + epo, L.w - 12, L.h - 12, { fs: 13.5, fw: 800, align: "right" });
      gO.dibujar([{ nombre: "tarea A", color: C.s1, puntos: hist.a, ancho: 2.5 }, { nombre: "tarea B", color: C.s2, puntos: hist.b, ancho: 2.5 }]);
    }
    function correO(animado) {
      mo = new RNmlp.MLP({ capas: [2, 16, 1], activacion: "relu", salida: "sigmoid", semilla: 7 }); epo = 0; hist = { a: [[0, mo.evaluar(TAt.X, TAt.Y).precision * 100]], b: [[0, mo.evaluar(TBt.X, TBt.Y).precision * 100]] }; rr = RN.rng(5);
      if (animO) animO.parar();
      if (!animado || RED) { while (epo < 120) pasoO(); pintaO(); return; }
      let acc = 0;
      animO = anima(function (dt) { acc += dt; while (acc > 0.025 && epo < 120) { acc -= 0.025; pasoO(); } pintaO(); if (epo >= 120) return false; }, cvO);
      animO.iniciar();
    }
    $("c10-oplay").addEventListener("click", function () { correO(true); });
    $("c10-rep").addEventListener("change", function () { correO(false); });
    alMostrar(cvO, function () { correO(false); RN.alCambiarTam(cvO, function () { if (mo) pintaO(); }); });

    // ---------- colapso del modelo
    const K = 30, PV = []; let sz = 0; for (let k = 1; k <= K; k++) { PV.push(1 / Math.pow(k, 1.1)); sz += PV[k - 1]; } for (let k = 0; k < K; k++) PV[k] /= sz;
    function muestrea(p, n, r) { const c = new Array(K).fill(0), acu = []; let s = 0; p.forEach(function (v) { s += v; acu.push(s); }); for (let i = 0; i < n; i++) { const u = r() * s; let k = 0; while (k < K - 1 && acu[k] < u) k++; c[k]++; } return c; }
    function generaciones(n, real, sem) {
      const r = RN.rng(sem), G = []; let p = PV.slice();
      for (let g = 0; g <= 30; g++) {
        const nr = g === 0 ? n : Math.round(n * real), ns = n - nr;
        const c1 = muestrea(PV, nr, r), c2 = ns > 0 ? muestrea(p, ns, r) : new Array(K).fill(0);
        const c = c1.map(function (v, k) { return v + c2[k]; });
        p = c.map(function (v) { return v / n; });
        G.push(p);
      }
      return G;
    }
    const iN = rango("c10-n", function (v) { return mil(Math.round(Math.pow(10, v))); }, function () { calcC(); genAct = 30; pintaC(); });
    const iR = rango("c10-r", function (v) { return v + " %"; }, function () { calcC(); genAct = 30; pintaC(); });
    let GEN = null, GEN0 = null, genAct = 30;
    function calcC() { const n = Math.round(Math.pow(10, +iN.value)); GEN = generaciones(n, +iR.value / 100, 12); GEN0 = generaciones(n, 0, 12); }
    const vivas = function (p) { return p.filter(function (v) { return v > 0; }).length; };
    const cvB = $("c10-cbar");
    const gCC = RN.grafica($("c10-ccurva"), {
      alto: 220, margen: { l: 50, r: 16 },
      x: { min: 0, max: 30, titulo: "generación" }, y: { min: 0, max: 30, titulo: "categorías vivas" }
    });
    function pintaC() {
      const L = RN.lienzo(cvB, 230), ctx = L.ctx; ctx.fillStyle = C.surface; ctx.fillRect(0, 0, L.w, L.h);
      const p = GEN[genAct], x0 = 40, x1 = L.w - 12, y0 = 44, y1 = L.h - 26, bw = (x1 - x0) / K, mx = Math.max(PV[0], Math.max.apply(null, p)) * 1.05;
      ctx.strokeStyle = C.axis; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y1 + 0.5); ctx.lineTo(x1, y1 + 0.5); ctx.stroke();
      for (let k = 0; k < K; k++) {
        const hv = (y1 - y0) * p[k] / mx, hr = (y1 - y0) * PV[k] / mx, x = x0 + k * bw;
        if (p[k] > 0) { ctx.fillStyle = C.s1; ctx.fillRect(x + 2, y1 - hv, bw - 4, hv); }
        ctx.strokeStyle = INK2; ctx.lineWidth = 1.5; ctx.strokeRect(x + 2, y1 - hr, bw - 4, hr);
        if (p[k] === 0) { ctx.strokeStyle = C.bad; ctx.lineWidth = 1.6; aspa(ctx, x + bw / 2, y1 - hr - 9, 4); }
      }
      textoC(ctx, "categorías (de la más frecuente a la más rara)", (x0 + x1) / 2, L.h - 8, { fs: 12.5, fill: INK2, fw: 600, align: "center" });
      textoC(ctx, "Generación " + genAct + " · categorías vivas: " + vivas(p) + " de " + K, x0, 24, { fs: 15, fw: 800 });
      const A = GEN.slice(0, genAct + 1).map(function (q, g) { return [g, vivas(q)]; });
      const series = [{ nombre: "categorías vivas", color: C.s1, puntos: A, ancho: 2.5 }];
      if (+iR.value > 0) series.push({ nombre: "sin datos reales", color: C.s2, puntos: GEN0.slice(0, genAct + 1).map(function (q, g) { return [g, vivas(q)]; }), ancho: 2, discontinua: true });
      gCC.dibujar(series);
    }
    $("c10-cplay").addEventListener("click", async function () {
      const b = this; b.disabled = true;
      for (let g = 0; g <= 30; g++) { genAct = g; pintaC(); await RN.espera(RED ? 0 : 220); }
      b.disabled = false;
    });
    calcC();
    alMostrar(cvB, function () { pintaC(); RN.alCambiarTam(cvB, pintaC); });

    // ---------- recapitulación
    const sr = base($("c10-recap"), 1000, 250);
    S("polygon", { points: "500,12 140,74 860,74", fill: "#EEF3F9", stroke: "#8FA6BF", "stroke-width": 2, "stroke-linejoin": "round" }, sr);
    tx(sr, 500, 62, "Sistema socio-técnico", { fs: 17, fw: 800, anchor: "middle" });
    [["Escala + plataforma", "Transformers y cómputo", "como base", C.s1], ["Operación", "del «entrenar» al", "«servir» industrial", C.s2], ["Seguridad", "gobernanza y", "fiabilidad crítica", C.s3]].forEach(function (p, k) {
      const x = 190 + k * 230;
      rc(sr, x, 84, 160, 120, { fill: RN.mezcla("#ffffff", p[3], 0.14), stroke: p[3], sw: 2, rx: 6 });
      tx(sr, x + 80, 116, p[0], { fs: 15.5, fw: 800, anchor: "middle" });
      tx(sr, x + 80, 146, [p[1], p[2]], { fs: 13.5, fill: INK, anchor: "middle", lh: 1.3 });
    });
    rc(sr, 140, 210, 720, 32, { fill: "#EEF3F9", stroke: "#8FA6BF", sw: 2, rx: 4 });
    tx(sr, 500, 232, "economía · infraestructura · gobernanza", { fs: 15, fw: 700, anchor: "middle" });

    // ---------- válvulas
    const sv = base($("c10-valv"), 1000, 250);
    const VAL = [["Datos", "c10-vd", 250], ["Energía", "c10-ve", 430], ["Regulación", "c10-vr", 610], ["Hardware", "c10-vh", 790]];
    const AP = VAL.map(function (v) { return +$(v[1]).value / 100; });
    const YC = 135, HMAX = 70;
    const gT = S("g", {}, sv), gPp = S("g", {}, sv), gV = S("g", {}, sv);
    tx(sv, 20, 40, "Ideas y demanda", { fs: 14, fw: 800 }); tx(sv, 980, 40, "Progreso", { fs: 14, fw: 800, anchor: "end" });
    const tCaudal = tx(sv, 980, 214, "", { fs: 14, fw: 700, fill: INK2, anchor: "end" });
    function ancho(x) { let w = HMAX; VAL.forEach(function (v, k) { const d = Math.abs(x - v[2]); if (d < 60) { const s = 0.5 + 0.5 * Math.cos(Math.PI * d / 60); w = Math.min(w, HMAX * (1 - s * (1 - AP[k]))); } }); return w; }
    function pintaTubo() {
      while (gT.firstChild) gT.removeChild(gT.firstChild); while (gV.firstChild) gV.removeChild(gV.firstChild);
      let arriba = "", abajo = "";
      for (let x = 30; x <= 970; x += 5) { const w = ancho(x); arriba += (x === 30 ? "M" : " L") + x + "," + (YC - w / 2).toFixed(1); abajo = " L" + x + "," + (YC + w / 2).toFixed(1) + abajo; }
      pa(gT, arriba + abajo.replace(/^ L/, " L") + " Z", { fill: "#DCE8F4", stroke: "#8FA6BF", sw: 2 });
      const mn = Math.min.apply(null, AP), kmin = AP.indexOf(mn);
      VAL.forEach(function (v, k) {
        const esMin = AP[k] === mn;
        tx(gV, v[2], 62, v[0], { fs: 15, fw: 800, anchor: "middle", fill: esMin ? ACC : INK });
        tx(gV, v[2], 80, "abierta al " + mil(AP[k] * 100) + " %", { fs: 12.5, fill: INK2, anchor: "middle" });
        rc(gV, v[2] - 7, YC - ancho(v[2]) / 2 - 16, 14, 12, { fill: esMin ? ACC : INK2, rx: 3 });
        if (esMin && k === kmin) tx(gV, v[2], 214, "▲ cuello de botella", { fs: 14, fw: 800, anchor: "middle", fill: ACC });
      });
      tCaudal.textContent = "caudal: " + mil(mn * 100) + " % del máximo";
    }
    VAL.forEach(function (v, k) { rango(v[1], function (x) { return x + " %"; }, function (x) { AP[k] = x / 100; pintaTubo(); }); });
    pintaTubo();
    const gotasV = []; const rv = RN.rng(3); for (let k = 0; k < 60; k++) gotasV.push({ x: 30 + rv() * 940, u: rv() - 0.5, c: ci(gPp, 0, 0, 3.5, { fill: C.s1, op: 0.8 }) });
    function fluye(dt) {
      const mn = Math.min.apply(null, AP), v = 40 + 160 * mn;
      gotasV.forEach(function (g) {
        const w = ancho(g.x);
        g.x += dt * v * HMAX / Math.max(8, w) * mn;
        if (g.x > 970) { g.x = 30; g.u = rv() - 0.5; }
        g.c.setAttribute("cx", g.x.toFixed(1)); g.c.setAttribute("cy", (YC + g.u * (ancho(g.x) - 8)).toFixed(1));
      });
    }
    fluye(0);
    if (!RED) bucle(function (dt) { fluye(dt); }, sv).iniciar();
  })();
})();
