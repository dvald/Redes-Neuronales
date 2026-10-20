/* Redes Neuronales · Demos visuales — utilidades comunes (sin dependencias).
   Global: window.RN
     RN.color, RN.serie          paleta (series en orden fijo; pos/neg para pesos; clase0/clase1 para datos)
     RN.fmt(x, d), RN.fmtN(n)    números con formato es-ES
     RN.rng(semilla), RN.normal(r)
     RN.el(tag, attrs, padre, texto), RN.svg(tag, attrs, padre)
     RN.lienzo(canvas, alto)     ajusta un <canvas> a su ancho CSS y a la densidad de la pantalla → {ctx, w, h}
     RN.alCambiarTam(el, fn)     llama fn() cuando el elemento cambia de tamaño (también al mostrarse su pestaña)
     RN.anima(paso, el)          bucle de animación con iniciar/parar/alternar; se congela si el elemento está oculto
     RN.botonPlay(btn, anim)     enlaza un botón ▶/⏸ a una animación
     RN.tween(ms, fn), RN.espera(ms)
     RN.tip.mostrar(html, x, y), RN.tip.ocultar()
     RN.grafica(canvas, opciones)   gráfica de líneas/puntos/barras en canvas con rejilla, ejes y tooltip
     RN.red(svg, opciones)          dibujo de una red por capas en SVG, con pesos, activaciones y pulsos animados
     RN.colorPeso(w, max), RN.mezcla(c1, c2, t), RN.colorSeq(t)
   Las pestañas (.tabs [role=tab]) y la navegación entre temas se montan solas. */
(function (root) {
  "use strict";
  const RN = {};

  RN.color = {
    s1: "#2a78d6", s2: "#eb6834", s3: "#1baf7a", s4: "#eda100", s5: "#e87ba4", s6: "#008300", s7: "#6250d6", s8: "#e34948",
    pos: "#2a78d6", neg: "#eb6834", clase0: "#eb6834", clase1: "#2a78d6",
    ink: "#1F2933", ink2: "#52606D", muted: "#7B8794", grid: "#e1e0d9", axis: "#c3c2b7", surface: "#FCFCFB",
    fund: "#1E88E5", arq: "#8E24AA", apl: "#00897B", esc: "#E65100", ok: "#1B7A1B", bad: "#C62828", warn: "#F0B400"
  };
  RN.serie = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
  RN.acento = function () {
    return (getComputedStyle(document.body).getPropertyValue("--acento") || "").trim() || RN.color.fund;
  };

  // ------------------------------------------------------------------ números
  RN.fmt = function (x, d) {
    if (d === undefined) d = 2;
    if (!Number.isFinite(x)) return "—";
    return x.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d }).replace("-", "−");
  };
  RN.fmtN = function (n) { return Number.isFinite(n) ? Math.round(n).toLocaleString("es-ES").replace("-", "−") : "—"; };
  RN.limita = function (x, a, b) { return Math.max(a, Math.min(b, x)); };
  RN.lerp = function (a, b, t) { return a + (b - a) * t; };

  // Generador pseudoaleatorio reproducible (mulberry32)
  RN.rng = function (semilla) {
    let s = (semilla >>> 0) || 1;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  RN.normal = function (r) {
    let u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  // ------------------------------------------------------------------ DOM
  RN.el = function (tag, attrs, padre, texto) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === "style" && typeof attrs[k] === "object") Object.assign(e.style, attrs[k]);
      else if (k === "html") e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (texto !== undefined) e.textContent = texto;
    if (padre) padre.appendChild(e);
    return e;
  };
  const NS = "http://www.w3.org/2000/svg";
  RN.svg = function (tag, attrs, padre) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) {
      if (k === "text") e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (padre) padre.appendChild(e);
    return e;
  };

  // ------------------------------------------------------------------ canvas
  RN.lienzo = function (cv, alto) {
    const dpr = window.devicePixelRatio || 1;
    if (alto) cv._alto = alto;
    const w = Math.max(10, Math.round(cv.clientWidth || (cv.parentElement && cv.parentElement.clientWidth) || 600));
    let h = cv._alto;
    if (!h) h = Math.round(w * (cv.dataset.ratio ? +cv.dataset.ratio : 0.5));
    if (typeof h === "function") h = h(w);
    cv.style.height = h + "px";
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  };

  RN.alCambiarTam = function (el, fn) {
    let ultimo = -1, pend = null;
    const ro = new ResizeObserver(function () {
      const w = el.clientWidth;
      if (w > 0 && w !== ultimo) {
        ultimo = w;
        if (pend) cancelAnimationFrame(pend);
        pend = requestAnimationFrame(function () { pend = null; fn(w); });
      }
    });
    ro.observe(el);
    return ro;
  };

  // ------------------------------------------------------------------ animación
  RN.reducirMovimiento = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  RN.anima = function (paso, el) {
    let id = null, ultimo = 0, t = 0;
    const ctl = {
      onCambio: null,
      get activo() { return id !== null; },
      get t() { return t; },
      iniciar: function () {
        if (id !== null) return;
        ultimo = performance.now();
        id = requestAnimationFrame(tick);
        if (ctl.onCambio) ctl.onCambio(true);
      },
      parar: function () {
        if (id !== null) cancelAnimationFrame(id);
        const habia = id !== null;
        id = null;
        if (habia && ctl.onCambio) ctl.onCambio(false);
      },
      alternar: function () { if (id === null) ctl.iniciar(); else ctl.parar(); },
      reiniciar: function () { t = 0; }
    };
    function tick(ahora) {
      const dt = Math.max(0, Math.min(0.05, (ahora - ultimo) / 1000));
      ultimo = ahora;
      if (el && (!el.isConnected || el.getClientRects().length === 0)) { id = requestAnimationFrame(tick); return; } // oculto (también vale para SVG)
      t += dt;
      const r = paso(dt, t);
      if (r === false) { id = null; if (ctl.onCambio) ctl.onCambio(false); return; }
      id = requestAnimationFrame(tick);
    }
    return ctl;
  };

  RN.botonPlay = function (btn, anim, textos) {
    const tx = textos || ["▶ Reproducir", "⏸ Pausa"];
    const pinta = function (on) { btn.textContent = on ? tx[1] : tx[0]; btn.setAttribute("aria-pressed", on ? "true" : "false"); };
    const previo = anim.onCambio;
    anim.onCambio = function (on) { pinta(on); if (previo) previo(on); };
    btn.addEventListener("click", function () { anim.alternar(); });
    pinta(anim.activo);
  };

  RN.suave = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  RN.tween = function (ms, fn, ease) {
    const e = ease || RN.suave;
    return new Promise(function (res) {
      if (RN.reducirMovimiento || ms <= 0) { fn(1); res(); return; }
      const t0 = performance.now();
      function f(ahora) {
        const t = Math.min(1, (ahora - t0) / ms);
        fn(e(t));
        if (t < 1) requestAnimationFrame(f); else res();
      }
      requestAnimationFrame(f);
    });
  };
  RN.espera = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  // ------------------------------------------------------------------ colores
  function hex2rgb(h) {
    h = h.replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgb2hex(c) { return "#" + c.map(function (v) { return Math.round(RN.limita(v, 0, 255)).toString(16).padStart(2, "0"); }).join(""); }
  RN.mezcla = function (c1, c2, t) {
    const a = hex2rgb(c1), b = hex2rgb(c2);
    return rgb2hex([RN.lerp(a[0], b[0], t), RN.lerp(a[1], b[1], t), RN.lerp(a[2], b[2], t)]);
  };
  RN.rgba = function (c, alfa) { const a = hex2rgb(c); return "rgba(" + a[0] + "," + a[1] + "," + a[2] + "," + alfa + ")"; };
  // Escala divergente para pesos: azul (+) — gris (0) — naranja (−)
  RN.colorPeso = function (w, max) {
    const t = RN.limita(Math.abs(w) / (max || 1), 0, 1);
    return RN.mezcla("#d5d8dc", w >= 0 ? RN.color.pos : RN.color.neg, Math.sqrt(t));
  };
  // Escala secuencial azul (0 → claro, 1 → oscuro)
  RN.colorSeq = function (t, base) {
    t = RN.limita(t, 0, 1);
    return t < 0.5 ? RN.mezcla("#eef4fc", base || "#2a78d6", t * 2) : RN.mezcla(base || "#2a78d6", "#0d366b", (t - 0.5) * 2);
  };

  // ------------------------------------------------------------------ tooltip
  RN.tip = (function () {
    let d = null;
    function nodo() {
      if (!d) { d = document.createElement("div"); d.className = "tooltip"; d.setAttribute("role", "status"); document.body.appendChild(d); }
      return d;
    }
    return {
      mostrar: function (html, x, y) {
        const e = nodo();
        e.innerHTML = html;
        e.style.display = "block";
        const r = e.getBoundingClientRect();
        let px = x + 14, py = y + 14;
        if (px + r.width > window.innerWidth - 8) px = x - r.width - 14;
        if (py + r.height > window.innerHeight - 8) py = y - r.height - 14;
        e.style.left = px + "px";
        e.style.top = py + "px";
      },
      ocultar: function () { if (d) d.style.display = "none"; }
    };
  })();

  // ------------------------------------------------------------------ gráfica en canvas
  function pasoBonito(rango, n) {
    const bruto = rango / Math.max(1, n);
    const mag = Math.pow(10, Math.floor(Math.log10(bruto)));
    const r = bruto / mag;
    return (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
  }
  RN.marcas = function (min, max, n) {
    const p = pasoBonito(max - min, n || 5);
    const out = [];
    for (let v = Math.ceil(min / p - 1e-9) * p; v <= max + p * 1e-9; v += p) out.push(Math.abs(v) < p * 1e-9 ? 0 : v);
    return out;
  };
  function decimalesDe(paso) {
    for (let d = 0; d <= 4; d++) { const v = paso * Math.pow(10, d); if (Math.abs(v - Math.round(v)) < 1e-6 * Math.max(1, v)) return d; }
    return 4;
  }

  /* opciones: { alto, x:{min,max,titulo,fmt,marcas}, y:{min,max,titulo,fmt,marcas,log},
                 margen:{l,r,t,b}, hover:true, extras(ctx, g) }
     g.dibujar(series): series = [{ nombre, color, puntos:[[x,y],...], ancho:2, discontinua:false,
                                    tipo:'linea'|'puntos'|'area'|'barras', radio:4, etiqueta:true }] */
  RN.grafica = function (cv, op) {
    const g = { op: op, series: [], w: 0, h: 0, ctx: null };
    const m = Object.assign({ l: 56, r: 24, t: 14, b: 46 }, op.margen || {});
    g.m = m;
    g.sx = function (v) { return m.l + (v - op.x.min) / (op.x.max - op.x.min) * (g.w - m.l - m.r); };
    g.sy = function (v) {
      if (op.y.log) { const a = Math.log10(op.y.min), b = Math.log10(op.y.max); return g.h - m.b - (Math.log10(Math.max(v, op.y.min)) - a) / (b - a) * (g.h - m.t - m.b); }
      return g.h - m.b - (v - op.y.min) / (op.y.max - op.y.min) * (g.h - m.t - m.b);
    };
    g.ix = function (px) { return op.x.min + (px - m.l) / (g.w - m.l - m.r) * (op.x.max - op.x.min); };
    g.iy = function (py) { return op.y.min + (g.h - m.b - py) / (g.h - m.t - m.b) * (op.y.max - op.y.min); };
    let hoverX = null;

    g.dibujar = function (series) {
      if (series) g.series = series;
      const L = RN.lienzo(cv, op.alto);
      g.ctx = L.ctx; g.w = L.w; g.h = L.h;
      const c = L.ctx, C = RN.color;
      c.clearRect(0, 0, g.w, g.h);
      c.fillStyle = C.surface; c.fillRect(0, 0, g.w, g.h);
      // rejilla y ejes
      c.font = "12px system-ui, sans-serif";
      c.lineWidth = 1;
      const mx = op.x.marcas || RN.marcas(op.x.min, op.x.max, Math.max(3, Math.round((g.w - m.l - m.r) / 90)));
      const my = op.y.marcas || (op.y.log ? logMarcas(op.y.min, op.y.max) : RN.marcas(op.y.min, op.y.max, Math.max(3, Math.round((g.h - m.t - m.b) / 55))));
      const dx = mx.length > 1 ? decimalesDe(mx[1] - mx[0]) : 0, dy = my.length > 1 ? decimalesDe(my[1] - my[0]) : 0;
      c.strokeStyle = C.grid; c.fillStyle = C.muted; c.textAlign = "center"; c.textBaseline = "top";
      mx.forEach(function (v) {
        const X = Math.round(g.sx(v)) + 0.5;
        c.beginPath(); c.moveTo(X, m.t); c.lineTo(X, g.h - m.b); c.stroke();
        c.fillText(op.x.fmt ? op.x.fmt(v) : RN.fmt(v, dx), X, g.h - m.b + 6);
      });
      c.textAlign = "right"; c.textBaseline = "middle";
      my.forEach(function (v) {
        const Y = Math.round(g.sy(v)) + 0.5;
        c.beginPath(); c.moveTo(m.l, Y); c.lineTo(g.w - m.r, Y); c.stroke();
        c.fillText(op.y.fmt ? op.y.fmt(v) : RN.fmt(v, op.y.log ? Math.max(0, -Math.floor(Math.log10(v))) : dy), m.l - 6, Y);
      });
      c.strokeStyle = C.axis;
      c.beginPath(); c.moveTo(m.l, g.h - m.b + 0.5); c.lineTo(g.w - m.r, g.h - m.b + 0.5); c.stroke();
      if (op.y.min < 0 && op.y.max > 0) { const Y0 = Math.round(g.sy(0)) + 0.5; c.beginPath(); c.moveTo(m.l, Y0); c.lineTo(g.w - m.r, Y0); c.stroke(); }
      if (op.x.min < 0 && op.x.max > 0) { const X0 = Math.round(g.sx(0)) + 0.5; c.beginPath(); c.moveTo(X0, m.t); c.lineTo(X0, g.h - m.b); c.stroke(); }
      c.fillStyle = C.ink2; c.font = "600 12.5px system-ui, sans-serif";
      if (op.x.titulo) { c.textAlign = "center"; c.textBaseline = "bottom"; c.fillText(op.x.titulo, m.l + (g.w - m.l - m.r) / 2, g.h - 4); }
      if (op.y.titulo) { c.save(); c.translate(14, m.t + (g.h - m.t - m.b) / 2); c.rotate(-Math.PI / 2); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(op.y.titulo, 0, 0); c.restore(); }
      // series
      g.series.forEach(function (s) {
        // las líneas se recortan al área del gráfico; los puntos tienen un margen para no cortarse en los bordes
        const hol = s.tipo === "puntos" ? (s.radio || 4) + 3 : 2;
        c.save();
        c.beginPath(); c.rect(m.l - hol, m.t - hol, g.w - m.l - m.r + 2 * hol, g.h - m.t - m.b + 2 * hol); c.clip();
        pintaSerie(c, s);
        c.restore();
      });
      if (op.extras) op.extras(c, g);
      if (hoverX !== null) pintaHover(c);
    };

    function logMarcas(a, b) { const out = []; for (let e = Math.ceil(Math.log10(a)); e <= Math.floor(Math.log10(b)); e++) out.push(Math.pow(10, e)); return out; }

    function pintaSerie(c, s) {
      const P = s.puntos || [];
      const col = s.color || RN.color.s1;
      const tipo = s.tipo || "linea";
      if (tipo === "barras") {
        const anchoB = s.anchoBarra || Math.max(2, (g.w - m.l - m.r) / Math.max(1, P.length) - 2);
        c.fillStyle = col;
        P.forEach(function (p) {
          const X = g.sx(p[0]) - anchoB / 2, Y = g.sy(Math.max(0, p[1])), Y0 = g.sy(Math.min(0, p[1]));
          rectRedondo(c, X, Y, anchoB, Math.max(1, Y0 - Y), 3);
          c.fill();
        });
        return;
      }
      if (tipo === "area" && P.length) {
        c.fillStyle = RN.rgba(col, s.alfa || 0.15);
        c.beginPath(); c.moveTo(g.sx(P[0][0]), g.sy(Math.max(op.y.min, 0)));
        P.forEach(function (p) { c.lineTo(g.sx(p[0]), g.sy(p[1])); });
        c.lineTo(g.sx(P[P.length - 1][0]), g.sy(Math.max(op.y.min, 0))); c.closePath(); c.fill();
      }
      if (tipo === "linea" || tipo === "area") {
        c.strokeStyle = col; c.lineWidth = s.ancho || 2; c.lineJoin = "round"; c.lineCap = "round";
        c.setLineDash(s.discontinua ? [6, 5] : []);
        c.beginPath();
        let pen = false;
        P.forEach(function (p) {
          if (p[1] === null || !Number.isFinite(p[1])) { pen = false; return; }
          const X = g.sx(p[0]), Y = g.sy(p[1]);
          if (!pen) { c.moveTo(X, Y); pen = true; } else c.lineTo(X, Y);
        });
        c.stroke(); c.setLineDash([]);
      }
      if (tipo === "puntos") {
        const r = s.radio || 4;
        P.forEach(function (p) {
          c.beginPath(); c.arc(g.sx(p[0]), g.sy(p[1]), r, 0, 2 * Math.PI);
          c.fillStyle = p[2] || col; c.fill();
          c.lineWidth = 1.5; c.strokeStyle = RN.color.surface; c.stroke();
        });
      }
    }
    function rectRedondo(c, x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      c.beginPath();
      c.moveTo(x, y + h); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
      c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h); c.closePath();
    }
    g.rectRedondo = rectRedondo;

    function valorEn(s, x) {
      const P = s.puntos || [];
      if (!P.length) return null;
      let best = null, bd = Infinity;
      for (let i = 0; i < P.length; i++) { const d = Math.abs(P[i][0] - x); if (d < bd) { bd = d; best = P[i]; } }
      return best;
    }
    function pintaHover(c) {
      const X = g.sx(hoverX);
      c.strokeStyle = "rgba(31,41,51,.35)"; c.lineWidth = 1;
      c.beginPath(); c.moveTo(Math.round(X) + 0.5, m.t); c.lineTo(Math.round(X) + 0.5, g.h - m.b); c.stroke();
      g.series.forEach(function (s) {
        if (s.hover === false || (s.tipo && s.tipo !== "linea" && s.tipo !== "area")) return;
        const p = valorEn(s, hoverX);
        if (!p || p[1] === null || !Number.isFinite(p[1])) return;
        c.beginPath(); c.arc(g.sx(p[0]), g.sy(p[1]), 4.5, 0, 2 * Math.PI);
        c.fillStyle = s.color || RN.color.s1; c.fill(); c.lineWidth = 2; c.strokeStyle = "#fff"; c.stroke();
      });
    }
    if (op.hover !== false) {
      cv.addEventListener("mousemove", function (ev) {
        const r = cv.getBoundingClientRect();
        const px = ev.clientX - r.left;
        if (px < m.l || px > g.w - m.r) { hoverX = null; RN.tip.ocultar(); g.dibujar(); return; }
        hoverX = g.ix(px);
        const filas = [];
        let xr = null;
        g.series.forEach(function (s) {
          if (s.hover === false || !s.nombre || (s.tipo && s.tipo !== "linea" && s.tipo !== "area")) return;
          const p = valorEn(s, hoverX);
          if (!p || p[1] === null || !Number.isFinite(p[1])) return;
          xr = p[0];
          filas.push('<span style="display:inline-block;width:10px;height:3px;border-radius:2px;background:' + (s.color || RN.color.s1) + ';vertical-align:middle;margin-right:6px"></span>' + s.nombre + ": <b>" + (op.y.fmtTip ? op.y.fmtTip(p[1]) : RN.fmt(p[1], 3)) + "</b>");
        });
        g.dibujar();
        if (filas.length) RN.tip.mostrar((op.x.titulo ? op.x.titulo + ": " : "x: ") + "<b>" + (op.x.fmtTip ? op.x.fmtTip(xr) : RN.fmt(xr, 2)) + "</b><br>" + filas.join("<br>"), ev.clientX, ev.clientY);
        else RN.tip.ocultar();
      });
      cv.addEventListener("mouseleave", function () { hoverX = null; RN.tip.ocultar(); g.dibujar(); });
    }
    RN.alCambiarTam(cv, function () { g.dibujar(); });
    return g;
  };

  // ------------------------------------------------------------------ red por capas en SVG
  /* opciones: { capas:[3,4,1], ancho:640, alto:320, radio:16, margen:60,
                 etiquetas:[ ['x₁','x₂','x₃'], null, ['ŷ'] ], titulos:['Entrada','Oculta','Salida'],
                 pesos: W (W[l][j][i] = peso de la neurona i de la capa l a la neurona j de la capa l+1),
                 maxPeso, colorNodo }
     Devuelve { svg, nodos, aristas, ponerPesos(W), ponerActivaciones(l, valores, max), resaltar(l, j), limpiarResaltado(),
                pulso(l, {color, ms, atras}) → Promise } */
  RN.red = function (svg, op) {
    const A = op.ancho || 640, H = op.alto || 320, R = op.radio || 16, M = op.margen || 60;
    const capas = op.capas;
    svg.setAttribute("viewBox", "0 0 " + A + " " + H);
    svg.setAttribute("role", "img");
    if (!svg.getAttribute("aria-label")) svg.setAttribute("aria-label", "Red neuronal con capas " + capas.join("-"));
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const gA = RN.svg("g", { class: "aristas" }, svg);
    const gP = RN.svg("g", { class: "pulsos" }, svg);
    const gN = RN.svg("g", { class: "nodos" }, svg);
    const topT = op.titulos ? 26 : 8;
    const nodos = capas.map(function (n, l) {
      const x = capas.length === 1 ? A / 2 : M + l * (A - 2 * M) / (capas.length - 1);
      const esp = Math.min((H - topT - 2 * R - 10) / Math.max(1, n - 1), R * 3.4);
      const y0 = topT + (H - topT) / 2 - esp * (n - 1) / 2;
      const col = [];
      for (let j = 0; j < n; j++) col.push({ x: x, y: n === 1 ? topT + (H - topT) / 2 : y0 + j * esp });
      return col;
    });
    const aristas = [];
    for (let l = 0; l < capas.length - 1; l++) {
      const L = [];
      for (let j = 0; j < capas[l + 1]; j++) {
        const fila = [];
        for (let i = 0; i < capas[l]; i++) {
          const a = nodos[l][i], b = nodos[l + 1][j];
          fila.push(RN.svg("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: "#c9d1d9", "stroke-width": 1.4, "stroke-linecap": "round" }, gA));
        }
        L.push(fila);
      }
      aristas.push(L);
    }
    nodos.forEach(function (col, l) {
      col.forEach(function (nd, j) {
        nd.c = RN.svg("circle", { cx: nd.x, cy: nd.y, r: R, fill: "#fff", stroke: op.colorNodo || "#52606D", "stroke-width": 2 }, gN);
        const et = op.etiquetas && op.etiquetas[l] && op.etiquetas[l][j];
        nd.t = RN.svg("text", { x: nd.x, y: nd.y + 0.5, "text-anchor": "middle", "dominant-baseline": "middle", "font-size": Math.max(10, R * 0.72), "font-weight": 700, fill: "#1F2933", text: et || "" }, gN);
      });
      if (op.titulos && op.titulos[l]) RN.svg("text", { x: col[0].x, y: 14, "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: "#52606D", text: op.titulos[l] }, svg);
    });
    const red = { svg: svg, nodos: nodos, aristas: aristas, capas: capas };
    red.ponerPesos = function (W, max) {
      let mx = max || 0;
      if (!mx) W.forEach(function (Wl) { Wl.forEach(function (f) { f.forEach(function (w) { mx = Math.max(mx, Math.abs(w)); }); }); });
      W.forEach(function (Wl, l) {
        Wl.forEach(function (f, j) {
          f.forEach(function (w, i) {
            const e = aristas[l] && aristas[l][j] && aristas[l][j][i];
            if (!e) return;
            e.setAttribute("stroke", RN.colorPeso(w, mx));
            e.setAttribute("stroke-width", (0.8 + 4.2 * Math.min(1, Math.abs(w) / (mx || 1))).toFixed(2));
          });
        });
      });
    };
    red.ponerActivaciones = function (l, vals, max) {
      const mx = max || Math.max.apply(null, vals.map(Math.abs).concat([1e-9]));
      vals.forEach(function (v, j) {
        const nd = nodos[l][j];
        if (!nd) return;
        const t = RN.limita(Math.abs(v) / mx, 0, 1);
        nd.c.setAttribute("fill", v >= 0 ? RN.mezcla("#ffffff", RN.color.pos, t * 0.85) : RN.mezcla("#ffffff", RN.color.neg, t * 0.85));
        nd.t.setAttribute("fill", t > 0.55 ? "#fff" : "#1F2933");
      });
    };
    red.resaltar = function (l, j, color) {
      const nd = nodos[l][j];
      nd.c.setAttribute("stroke", color || RN.acento());
      nd.c.setAttribute("stroke-width", 4);
    };
    red.limpiarResaltado = function () {
      nodos.forEach(function (col) { col.forEach(function (nd) { nd.c.setAttribute("stroke", op.colorNodo || "#52606D"); nd.c.setAttribute("stroke-width", 2); }); });
    };
    red.pulso = function (l, o) {
      o = o || {};
      const ms = o.ms || 700, color = o.color || RN.acento();
      const pts = [];
      for (let j = 0; j < capas[l + 1]; j++) for (let i = 0; i < capas[l]; i++) {
        const a = nodos[l][i], b = nodos[l + 1][j];
        const p = o.atras ? [b, a] : [a, b];
        pts.push({ a: p[0], b: p[1], c: RN.svg("circle", { r: o.radio || 4, fill: color, opacity: 0.9 }, gP) });
      }
      return RN.tween(ms, function (t) {
        pts.forEach(function (p) { p.c.setAttribute("cx", RN.lerp(p.a.x, p.b.x, t)); p.c.setAttribute("cy", RN.lerp(p.a.y, p.b.y, t)); });
      }, function (t) { return t; }).then(function () { pts.forEach(function (p) { p.c.remove(); }); });
    };
    return red;
  };

  // ------------------------------------------------------------------ pestañas
  function montarPestanas() {
    const lista = document.querySelector(".tabs");
    if (!lista) return;
    const tabs = Array.from(lista.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;
    lista.setAttribute("role", "tablist");
    function activar(tab, foco, empujarHash) {
      tabs.forEach(function (t) {
        const sel = t === tab;
        t.setAttribute("aria-selected", sel ? "true" : "false");
        t.tabIndex = sel ? 0 : -1;
        const p = document.getElementById(t.getAttribute("aria-controls"));
        if (p) { p.classList.toggle("active", sel); p.hidden = !sel; }
      });
      if (foco) tab.focus();
      if (lista.scrollWidth > lista.clientWidth) tab.scrollIntoView({ inline: "nearest", block: "nearest" });
      const id = tab.getAttribute("aria-controls");
      if (empujarHash) history.replaceState(null, "", "#" + id);
      RN.tip.ocultar();
      document.dispatchEvent(new CustomEvent("rn:pestana", { detail: { id: id } }));
    }
    tabs.forEach(function (t, k) {
      const p = document.getElementById(t.getAttribute("aria-controls"));
      if (p) { p.setAttribute("role", "tabpanel"); p.setAttribute("aria-labelledby", t.id || ""); p.classList.add("panel"); }
      t.addEventListener("click", function () { activar(t, false, true); window.scrollTo({ top: Math.min(window.scrollY, lista.offsetTop), behavior: "instant" }); });
      t.addEventListener("keydown", function (e) {
        let n = null;
        if (e.key === "ArrowRight") n = tabs[(k + 1) % tabs.length];
        else if (e.key === "ArrowLeft") n = tabs[(k - 1 + tabs.length) % tabs.length];
        else if (e.key === "Home") n = tabs[0];
        else if (e.key === "End") n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); activar(n, true, true); }
      });
    });
    const h = decodeURIComponent(location.hash.slice(1));
    const ini = tabs.find(function (t) { return t.getAttribute("aria-controls") === h; }) || tabs.find(function (t) { return t.getAttribute("aria-selected") === "true"; }) || tabs[0];
    activar(ini, false, false);
    RN.irAPestana = function (id) { const t = tabs.find(function (x) { return x.getAttribute("aria-controls") === id; }); if (t) activar(t, false, true); };
  }

  // ------------------------------------------------------------------ navegación entre temas
  RN.paginas = [
    { f: "01_introduccion.html", n: "Tema 1", t: "Introducción a las redes neuronales" },
    { f: "02_frameworks.html", n: "Tema 2", t: "Frameworks: TensorFlow y Keras" },
    { f: "03_neurona_perceptron.html", n: "Tema 3", t: "La neurona artificial y el perceptrón" },
    { f: "04_perceptron_multicapa.html", n: "Tema 4", t: "Perceptrón multicapa" },
    { f: "05_entrenamiento.html", n: "Tema 5", t: "Cómo aprende la red" },
    { f: "06_perdidas_metricas.html", n: "Tema 6", t: "Pérdidas, salidas y métricas" },
    { f: "07_no_supervisado.html", n: "Tema 7", t: "Aplicaciones: aprendizaje no supervisado" },
    { f: "08_optimizacion.html", n: "Tema 8", t: "Optimización y regularización" },
    { f: "09_gpu.html", n: "Tema 9 · I", t: "Big Data: aceleración con GPU" },
    { f: "09_distribuido.html", n: "Tema 9 · II", t: "Big Data: entrenamiento distribuido" },
    { f: "10_produccion.html", n: "Tema 10 · I", t: "Puesta en producción" },
    { f: "10_nube.html", n: "Tema 10 · II", t: "Ecosistemas en la nube" },
    { f: "lab_empresa.html", n: "Laboratorio · I", t: "La red neuronal como sistema" },
    { f: "lab_llm.html", n: "Laboratorio · II", t: "Transformers, RAG y MCP" }
  ];
  function montarNavegacion() {
    const migas = document.querySelector(".header .migas");
    if (!migas) return;
    const f = (document.body.dataset.pagina || location.pathname.split("/").pop() || "").trim();
    const k = RN.paginas.findIndex(function (p) { return p.f === f; });
    migas.innerHTML = "";
    RN.el("a", { href: "index.html" }, migas, "⌂ Índice");
    if (k > 0) RN.el("a", { href: RN.paginas[k - 1].f, title: RN.paginas[k - 1].t }, migas, "‹ " + RN.paginas[k - 1].n + " · " + RN.paginas[k - 1].t);
    if (k >= 0 && k < RN.paginas.length - 1) RN.el("a", { href: RN.paginas[k + 1].f, title: RN.paginas[k + 1].t }, migas, RN.paginas[k + 1].n + " · " + RN.paginas[k + 1].t + " ›");
  }
  function montarZoom() {
    const h = document.querySelector(".header");
    if (!h || h.querySelector(".zoom")) return;
    const z = RN.el("div", { class: "zoom", "aria-label": "Tamaño del texto" }, h);
    const niveles = [0.9, 1, 1.12, 1.25, 1.4];
    let k = +(localStorage.getItem("rn-zoom") || 1);
    if (!(k >= 0 && k < niveles.length)) k = 1;
    function aplica() { document.documentElement.style.fontSize = (16.5 * niveles[k]).toFixed(2) + "px"; localStorage.setItem("rn-zoom", k); }
    [["A−", -1, "Texto más pequeño"], ["A", 0, "Tamaño normal"], ["A+", 1, "Texto más grande"]].forEach(function (b) {
      const e = RN.el("button", { type: "button", title: b[2], "aria-label": b[2] }, z, b[0]);
      e.addEventListener("click", function () { k = b[1] === 0 ? 1 : RN.limita(k + b[1], 0, niveles.length - 1); aplica(); });
    });
    aplica();
  }

  function iniciar() { montarNavegacion(); montarZoom(); montarPestanas(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();

  root.RN = RN;
})(typeof window !== "undefined" ? window : this);
