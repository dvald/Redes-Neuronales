/* Tema 4 · Perceptrón multicapa — código propio de la página 04_perceptron_multicapa.html.
   Usa RN (assets/comun.js) y RNmlp (assets/mlp.js). Cada pestaña es un bloque independiente. */
(function () {
  "use strict";
  const C = RN.color;
  const $ = (id) => document.getElementById(id);
  const S = RN.svg;
  const sig = (z) => 1 / (1 + Math.exp(-z));
  const relu = (z) => (z > 0 ? z : 0);
  const lerp = RN.lerp;
  const SUB = "₀₁₂₃₄₅₆₇₈₉";
  const sub = (n) => String(n).split("").map((c) => SUB[+c]).join("");
  const SUP = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  const sup = (n) => "⁽" + String(n).split("").map((c) => SUP[c]).join("") + "⁾";

  // Números con coma decimal y signo menos tipográfico
  function ns(x, d) {
    if (d === undefined) d = 2;
    if (Math.abs(x) < 0.5 * Math.pow(10, -d)) x = 0;
    return RN.fmt(x, d).replace("-", "−");
  }
  // Entero si lo es; si no, con d decimales
  function nv(x, d) {
    if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x)).replace("-", "−");
    return ns(x, d === undefined ? 2 : d);
  }
  // Factor entre paréntesis si es negativo: 1×(−1)
  const np = (x, d) => (x < 0 ? "(" + nv(x, d) + ")" : nv(x, d));

  // Tinte claro de región de decisión: p = 0 naranja, 0,5 blanco, 1 azul
  function tinteRGB(p, fuerza) {
    const f = fuerza === undefined ? 0.6 : fuerza;
    const t = Math.pow(Math.min(1, Math.abs(2 * p - 1)), 0.75) * f;
    const base = p >= 0.5 ? [42, 120, 214] : [235, 104, 52];
    return [255 + (base[0] - 255) * t, 255 + (base[1] - 255) * t, 255 + (base[2] - 255) * t];
  }
  function tinte(p, fuerza) { const c = tinteRGB(p, fuerza); return "rgb(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + ")"; }

  // Botones segmentados (.seg con data-v). Devuelve set(v, silencioso)
  function seg(id, cb) {
    const el = $(id);
    function botones() { return Array.from(el.querySelectorAll("button")); }
    function set(v, silencio) {
      botones().forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === String(v) ? "true" : "false"));
      if (!silencio && cb) cb(String(v));
    }
    el.addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (b && el.contains(b)) set(b.dataset.v);
    });
    botones().forEach((b) => { b.type = "button"; });
    return set;
  }
  // Deslizador con <output>
  function rango(id, fmtOut, cb) {
    const r = $(id), o = $(id + "-o");
    const pinta = () => { if (o) o.textContent = fmtOut ? fmtOut(+r.value) : r.value; };
    r.addEventListener("input", () => { pinta(); if (cb) cb(+r.value); });
    pinta();
    return r;
  }
  // Texto SVG con halo blanco
  function txt(padre, x, y, s, op) {
    const a = Object.assign({ x: x, y: y, "font-size": 14, fill: C.ink, text: s }, op || {});
    if (a.halo !== false) { a["paint-order"] = "stroke"; a.stroke = "#fff"; a["stroke-width"] = a["stroke-width"] || 4; a["stroke-linejoin"] = "round"; }
    delete a.halo;
    return S("text", a, padre);
  }
  // Texto de canvas con halo
  function ctxTxt(c, s, x, y, color, font, alin, base) {
    c.font = font || "600 13px system-ui, sans-serif";
    c.textAlign = alin || "left"; c.textBaseline = base || "middle";
    c.lineJoin = "round"; c.strokeStyle = "rgba(255,255,255,.92)"; c.lineWidth = 4; c.strokeText(s, x, y);
    c.fillStyle = color || C.ink; c.fillText(s, x, y);
  }
  function flechaDefs(svg, id, color) {
    const d = S("defs", null, svg);
    const m = S("marker", { id: id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 11, markerHeight: 11, markerUnits: "userSpaceOnUse", orient: "auto-start-reverse" }, d);
    S("path", { d: "M0,0 L10,5 L0,10 z", fill: color || C.ink2 }, m);
    return d;
  }

  // ==================================================================================
  // 1 · DEL PERCEPTRÓN AL MLP: la capa oculta transforma el plano
  // ==================================================================================
  (function () {
    const cv = $("x-cv");
    const XS = [[0, 0], [0, 1], [1, 0], [1, 1]], YS = [0, 1, 1, 0];
    const CONF = {
      relu: { act: "relu", W1: [[1, 1], [-1, -1]], b1: [0, 1], W2: [-2, -4], b2: 3 }
    };
    // Segunda opción: una red 2-2-1 con tanh entrenada de verdad (Adam) sobre los cuatro puntos
    const netT = new RNmlp.MLP({ capas: [2, 2, 1], activacion: "tanh", salida: "sigmoid", semilla: 2 });
    const YY = YS.map((v) => [v]);
    let epT = 0;
    while (epT < 3000) { netT.entrenarEpoca(XS, YY, { lote: 4, lr: 0.05, opt: "adam" }); epT++; if (netT.evaluar(XS, YY).perdida < 0.15) break; }
    CONF.tanh = { act: "tanh", W1: netT.W[0], b1: netT.b[0], W2: netT.W[1][0], b2: netT.b[1][0], epocas: epT };

    const fAct = { relu: relu, tanh: Math.tanh };
    const oculta = (cfg, x) => { const z = [0, 1].map((j) => cfg.W1[j][0] * x[0] + cfg.W1[j][1] * x[1] + cfg.b1[j]); return { z: z, h: z.map(fAct[cfg.act]) }; };
    const salida = (cfg, h) => cfg.W2[0] * h[0] + cfg.W2[1] * h[1] + cfg.b2;

    const N = 30, A0 = -0.25, A1 = 1.25;
    const M = (N + 1) * (N + 1);
    let cfgK = "relu", cfg = CONF.relu, T = 0, P, PP, colores, cams;

    function caja(Q, extra) {
      let x0 = 0, x1 = 0, y0 = 0, y1 = 0;
      const mete = (u, v) => { x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v); };
      for (let k = 0; k < Q.length; k += 2) mete(Q[k], Q[k + 1]);
      if (extra) extra.forEach((p) => mete(p[0], p[1]));
      const rx = Math.max(0.6, (x1 - x0) / 2 * 1.08 + 0.12), ry = Math.max(0.6, (y1 - y0) / 2 * 1.08 + 0.12);
      return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: rx, ry: ry };
    }
    function preparar() {
      cfg = CONF[cfgK];
      P = [new Float64Array(2 * M), new Float64Array(2 * M), new Float64Array(2 * M)];
      for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
        const k = i * (N + 1) + j, x = [A0 + (A1 - A0) * j / N, A0 + (A1 - A0) * i / N];
        const o = oculta(cfg, x);
        P[0][2 * k] = x[0]; P[0][2 * k + 1] = x[1];
        P[1][2 * k] = o.z[0]; P[1][2 * k + 1] = o.z[1];
        P[2][2 * k] = o.h[0]; P[2][2 * k + 1] = o.h[1];
      }
      PP = XS.map((x) => { const o = oculta(cfg, x); return [x, o.z, o.h]; });
      colores = [];
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const x = [A0 + (A1 - A0) * (j + 0.5) / N, A0 + (A1 - A0) * (i + 0.5) / N];
        colores.push(tinte(sig(salida(cfg, oculta(cfg, x).h)), 0.55));
      }
      cams = [{ cx: 0.5, cy: 0.5, rx: 0.92, ry: 0.92 }, caja(P[1]), caja(P[2])];
      cams.push(cams[2]);
      tabla(); redPeq(); texto();
    }

    const TIT = ["① Espacio de entrada (x₁, x₂)", "② Tras la suma ponderada: z = W·x + b", "③ Espacio oculto: h = activación(z)", "④ Espacio oculto y recta de la neurona de salida"];
    const EJES = [["x₁", "x₂"], ["z₁", "z₂"], ["h₁", "h₂"], ["h₁", "h₂"]];

    function pinta() {
      const L = RN.lienzo(cv, (w) => Math.round(RN.limita(w * 0.8, 300, 470)));
      const c = L.ctx, W = L.w, H = L.h;
      c.fillStyle = C.surface; c.fillRect(0, 0, W, H);
      const s = Math.min(2, Math.floor(T)), f = T >= 2 ? 0 : T - s;
      const Pa = P[s], Pb = P[Math.min(2, s + 1)];
      const ca = cams[s], cb = cams[Math.min(3, s + 1)];
      const cam = { cx: lerp(ca.cx, cb.cx, f), cy: lerp(ca.cy, cb.cy, f), rx: lerp(ca.rx, cb.rx, f), ry: lerp(ca.ry, cb.ry, f) };
      const padT = 34, pad = 18;
      const k = Math.min((W / 2 - pad) / cam.rx, (H / 2 - padT) / cam.ry);
      const ox = W / 2, oy = H / 2 + 8;
      const X = (u) => ox + (u - cam.cx) * k, Y = (v) => oy - (v - cam.cy) * k;
      const iu = (px) => cam.cx + (px - ox) / k, iv = (py) => cam.cy - (py - oy) / k;
      const aSal = RN.limita(T - 2, 0, 1);

      // semiplanos de la neurona de salida (solo en el espacio oculto)
      if (aSal > 0) {
        const G = 46, cw = W / G, ch = H / G;
        c.globalAlpha = aSal;
        for (let a = 0; a < G; a++) for (let b = 0; b < G; b++) {
          const p = sig(salida(cfg, [iu((a + 0.5) * cw), iv((b + 0.5) * ch)]));
          c.fillStyle = tinte(p, 0.32);
          c.fillRect(a * cw, b * ch, cw + 1, ch + 1);
        }
        c.globalAlpha = 1;
      }
      // mallado transformado
      const px = new Float64Array(M), py = new Float64Array(M);
      for (let q = 0; q < M; q++) { px[q] = X(Pa[2 * q] + (Pb[2 * q] - Pa[2 * q]) * f); py[q] = Y(Pa[2 * q + 1] + (Pb[2 * q + 1] - Pa[2 * q + 1]) * f); }
      c.globalAlpha = 1 - 0.35 * aSal;
      c.lineWidth = 0.6;
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const q = i * (N + 1) + j, q2 = q + N + 1;
        c.beginPath(); c.moveTo(px[q], py[q]); c.lineTo(px[q + 1], py[q + 1]); c.lineTo(px[q2 + 1], py[q2 + 1]); c.lineTo(px[q2], py[q2]); c.closePath();
        c.fillStyle = colores[i * N + j]; c.strokeStyle = colores[i * N + j]; c.fill(); c.stroke();
      }
      c.globalAlpha = 1;
      // ejes
      c.strokeStyle = C.axis; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(0, Y(0)); c.lineTo(W, Y(0)); c.moveTo(X(0), 0); c.lineTo(X(0), H); c.stroke();
      c.fillStyle = C.muted; c.font = "12px system-ui, sans-serif";
      const u0 = Math.ceil(iu(8)), u1 = Math.floor(iu(W - 8)), v0 = Math.ceil(iv(H - 8)), v1 = Math.floor(iv(28));
      c.textAlign = "center"; c.textBaseline = "top";
      for (let u = u0; u <= u1; u++) if (u !== 0) { c.beginPath(); c.moveTo(X(u), Y(0) - 4); c.lineTo(X(u), Y(0) + 4); c.stroke(); c.fillText(String(u).replace("-", "−"), X(u), Y(0) + 6); }
      c.textAlign = "right"; c.textBaseline = "middle";
      for (let v = v0; v <= v1; v++) if (v !== 0) { c.beginPath(); c.moveTo(X(0) - 4, Y(v)); c.lineTo(X(0) + 4, Y(v)); c.stroke(); c.fillText(String(v).replace("-", "−"), X(0) - 7, Y(v)); }
      const et = EJES[Math.round(T)];
      ctxTxt(c, et[0], W - 10, Y(0) - 12, C.ink2, "700 14px system-ui, sans-serif", "right");
      ctxTxt(c, et[1], X(0) + 8, 40, C.ink2, "700 14px system-ui, sans-serif", "left");
      // líneas de la cuadrícula (cada 0,25 en la entrada) y borde del cuadrado [0,1]²
      c.strokeStyle = "rgba(31,41,51,.2)"; c.lineWidth = 1;
      const linea = (fijo, esFila) => { c.beginPath(); for (let t = 0; t <= N; t++) { const q = esFila ? fijo * (N + 1) + t : t * (N + 1) + fijo; if (t) c.lineTo(px[q], py[q]); else c.moveTo(px[q], py[q]); } c.stroke(); };
      for (let g = 0; g <= N; g += 5) { linea(g, true); linea(g, false); }
      c.strokeStyle = C.ink2; c.lineWidth = 1.8;
      [5, 25].forEach((g) => { linea(g, true); linea(g, false); });
      // recta de la neurona de salida
      if (aSal > 0) {
        const w = cfg.W2, b = cfg.b2;
        let p1, p2;
        if (Math.abs(w[1]) > Math.abs(w[0])) { const ua = iu(0), ub = iu(W); p1 = [ua, -(w[0] * ua + b) / w[1]]; p2 = [ub, -(w[0] * ub + b) / w[1]]; }
        else { const va = iv(H), vb = iv(0); p1 = [-(w[1] * va + b) / w[0], va]; p2 = [-(w[1] * vb + b) / w[0], vb]; }
        c.globalAlpha = aSal; c.strokeStyle = C.ink; c.lineWidth = 2.6;
        c.beginPath(); c.moveTo(X(p1[0]), Y(p1[1])); c.lineTo(X(p2[0]), Y(p2[1])); c.stroke();
        c.globalAlpha = 1;
      }
      // los cuatro puntos de XOR
      const OFF = [[-12, 18, "right"], [-12, -16, "right"], [12, 18, "left"], [12, -16, "left"]];
      PP.forEach((pp, n) => {
        const a = pp[s], b = pp[Math.min(2, s + 1)];
        const X0 = X(a[0] + (b[0] - a[0]) * f), Y0 = Y(a[1] + (b[1] - a[1]) * f);
        c.beginPath(); c.arc(X0, Y0, 10, 0, 2 * Math.PI);
        c.fillStyle = YS[n] ? C.clase1 : C.clase0; c.fill();
        c.lineWidth = 2.5; c.strokeStyle = "#fff"; c.stroke();
        const yhat = sig(salida(cfg, pp[2]));
        if (aSal > 0.5 && (yhat >= 0.5 ? 1 : 0) !== YS[n]) {
          c.beginPath(); c.arc(X0, Y0, 16, 0, 2 * Math.PI); c.lineWidth = 2.5; c.strokeStyle = C.bad; c.stroke();
          ctxTxt(c, "✗ mal clasificado", X0, Y0 + 32, C.bad, "700 13px system-ui, sans-serif", "center");
        }
        ctxTxt(c, "(" + XS[n][0] + ", " + XS[n][1] + ")", X0 + OFF[n][0], Y0 + OFF[n][1], C.ink, "600 13px system-ui, sans-serif", OFF[n][2]);
      });
      let tit = TIT[Math.round(T)];
      if (Math.round(T) === 3) { const w = cfg.W2, d = cfg.act === "tanh" ? 1 : 0; tit = "④ Recta de salida: " + nv(w[0], d) + "·h₁ " + (w[1] < 0 ? "− " : "+ ") + nv(Math.abs(w[1]), d) + "·h₂ " + (cfg.b2 < 0 ? "− " : "+ ") + nv(Math.abs(cfg.b2), d) + " = 0"; }
      ctxTxt(c, tit, 12, 16, C.ink, "700 14px system-ui, sans-serif", "left");
    }

    function tabla() {
      const d = cfg.act === "tanh" ? 2 : 0;
      let h = "<thead><tr><th>x₁</th><th>x₂</th><th>XOR</th><th>h₁</th><th>h₂</th><th>ŷ</th><th>¿Acierta?</th></tr></thead><tbody>";
      XS.forEach((x, n) => {
        const o = oculta(cfg, x), y = sig(salida(cfg, o.h)), bien = (y >= 0.5 ? 1 : 0) === YS[n];
        h += "<tr><td class='num'>" + x[0] + "</td><td class='num'>" + x[1] + "</td><td class='num'><b>" + YS[n] + "</b></td><td class='num'>" + nv(o.h[0], d) + "</td><td class='num'>" + nv(o.h[1], d) + "</td><td class='num'>" + ns(y, 2) + "</td>" +
          "<td class='" + (bien ? "" : "mal-fila") + "'>" + (bien ? "<span class='ok-t'>✓ sí</span>" : "<span class='bad-t'>✗ no</span>") + "</td></tr>";
      });
      $("x-tabla").innerHTML = h + "</tbody>";
    }

    function redPeq() {
      const svg = $("x-red");
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const d = cfg.act === "tanh" ? 1 : 0;
      const pos = { x1: [48, 72], x2: [48, 172], h1: [192, 72], h2: [192, 172], o: [330, 122] };
      const ws = [cfg.W1[0][0], cfg.W1[0][1], cfg.W1[1][0], cfg.W1[1][1], cfg.W2[0], cfg.W2[1]];
      const mx = Math.max.apply(null, ws.map(Math.abs));
      const aristas = [["x1", "h1", cfg.W1[0][0], 0.5, 0, -9], ["x2", "h1", cfg.W1[0][1], 0.3, -4, 0], ["x1", "h2", cfg.W1[1][0], 0.3, -4, 4], ["x2", "h2", cfg.W1[1][1], 0.5, 0, 19],
        ["h1", "o", cfg.W2[0], 0.5, 6, -8], ["h2", "o", cfg.W2[1], 0.5, 6, 20]];
      aristas.forEach((a) => {
        const p = pos[a[0]], q = pos[a[1]];
        S("line", { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: RN.colorPeso(a[2], mx), "stroke-width": (1.2 + 4 * Math.abs(a[2]) / mx).toFixed(2), "stroke-linecap": "round" }, svg);
      });
      aristas.forEach((a) => {
        const p = pos[a[0]], q = pos[a[1]];
        txt(svg, lerp(p[0], q[0], a[3]) + a[4], lerp(p[1], q[1], a[3]) + a[5], nv(a[2], d), { "text-anchor": "middle", "font-size": 14, "font-weight": 700 });
      });
      [["x1", "x₁"], ["x2", "x₂"], ["h1", "h₁"], ["h2", "h₂"], ["o", "ŷ"]].forEach((n) => {
        const p = pos[n[0]];
        S("circle", { cx: p[0], cy: p[1], r: 21, fill: "#fff", stroke: C.ink2, "stroke-width": 2 }, svg);
        txt(svg, p[0], p[1] + 5, n[1], { "text-anchor": "middle", "font-size": 16, "font-weight": 700, halo: false });
      });
      txt(svg, 192, 40, "b = " + nv(cfg.b1[0], d), { "text-anchor": "middle", "font-size": 13, fill: C.ink2 });
      txt(svg, 192, 211, "b = " + nv(cfg.b1[1], d), { "text-anchor": "middle", "font-size": 13, fill: C.ink2 });
      txt(svg, 330, 161, "b = " + nv(cfg.b2, d), { "text-anchor": "middle", "font-size": 13, fill: C.ink2 });
      txt(svg, 48, 16, "Entrada", { "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: C.ink2 });
      txt(svg, 192, 16, "Oculta · " + (cfg.act === "relu" ? "ReLU" : "tanh"), { "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: C.ink2 });
      txt(svg, 330, 16, "Salida · sigmoide", { "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: C.ink2 });
    }

    function texto() {
      const t = {
        relu: "Con estos pesos, las dos neuronas ocultas solo miran x₁ + x₂ (cuántos unos hay): el plano se aplasta sobre una recta y la ReLU la dobla. (0, 1) y (1, 0) caen en el mismo punto, el codo; (0, 0) y (1, 1) quedan a los lados. La neurona de salida w = (−2, −4), b = 3 los separa: en la entrada, eso es la franja 0,5 < x₁ + x₂ < 1,5.",
        tanh: "Pesos aprendidos con entrenamiento real (Adam, " + CONF.tanh.epocas + " épocas sobre los cuatro puntos). La red encuentra su propia transformación: tanh comprime el plano en el cuadrado (−1, 1)² y deja cada clase a un lado de una recta."
      };
      $("x-texto").textContent = t[cfgK];
    }

    const setEtapa = seg("x-etapa", (v) => irA(+v));
    seg("x-pesos", (v) => { cfgK = v; preparar(); pinta(); });
    let tok = 0;
    function irA(obj) {
      anim.parar();
      const mio = ++tok, T0 = T;
      RN.tween(Math.abs(obj - T0) * 650 + 150, (e) => { if (mio !== tok) return; T = T0 + (obj - T0) * e; pinta(); });
    }
    let segIni = 0, segT = 0, pausa = 0;
    const anim = RN.anima(function (dt) {
      if (RN.reducirMovimiento) { T = 3; setEtapa(3, true); pinta(); return false; }
      if (pausa > 0) { pausa -= dt; return; }
      segT += dt / 1.35;
      if (segT >= 1) {
        T = segIni + 1; segIni = T; segT = 0; pausa = 0.6;
        setEtapa(Math.round(T), true); pinta();
        if (T >= 3) return false;
        return;
      }
      T = segIni + RN.suave(segT); pinta();
    }, cv);
    anim.onCambio = function (on) { if (on) { tok++; if (T >= 2.999) { T = 0; setEtapa(0, true); } segIni = Math.floor(T); segT = T - segIni; pausa = 0; } };
    RN.botonPlay($("x-play"), anim, ["▶ Transformar", "⏸ Pausa"]);

    preparar();
    RN.alCambiarTam(cv, pinta);
  })();

  // ==================================================================================
  // 2 · ESTRUCTURA EN CAPAS
  // ==================================================================================
  (function () {
    const svg = $("c-svg");
    const xs = [0.8, -0.4, 1.2, 0.3, -1.0, 0.6];
    let red, net, capas, tr, mx = 1, tok = 0;
    const nombre = (l) => l === 0 ? "La capa de entrada" : l === capas.length - 1 ? "La capa de salida" : (capas.length > 3 ? "La capa oculta " + l : "La capa oculta");
    function mostrar(l) {
      red.ponerActivaciones(l, tr.a[l], mx);
      red.nodos[l].forEach((nd, j) => { nd.t.textContent = ns(tr.a[l][j], 1); });
    }
    function limpiar() {
      red.nodos.forEach((col) => col.forEach((nd) => { nd.c.setAttribute("fill", "#fff"); nd.t.textContent = ""; }));
    }
    function texto(l) {
      const e = $("c-texto");
      if (l < 0) { e.textContent = "Cada capa recibe los valores de la anterior y entrega los suyos a la siguiente."; return; }
      const n = capas[l];
      if (l === 0) e.textContent = "La capa de entrada pasa " + n + (n === 1 ? " valor" : " valores") + " sin procesarlos.";
      else if (l === capas.length - 1) e.textContent = "La capa de salida recibe " + capas[l - 1] + (capas[l - 1] === 1 ? " valor" : " valores") + " y da la predicción.";
      else e.textContent = nombre(l) + " recibe " + capas[l - 1] + (capas[l - 1] === 1 ? " valor" : " valores") + ", calcula y entrega " + n + " a la siguiente capa.";
    }
    function construir() {
      tok++;
      const ne = +$("c-ent").value, no = +$("c-noc").value, nn = +$("c-nn").value, nsal = +$("c-sal").value;
      capas = [ne].concat(Array(no).fill(nn), [nsal]);
      const tit = capas.map((_, l) => l === 0 ? "Entrada" : l === capas.length - 1 ? "Salida" : (no > 1 ? "Oculta " + l : "Oculta"));
      red = RN.red(svg, { capas: capas, ancho: 900, alto: Math.max(230, Math.min(360, 100 + 40 * Math.max.apply(null, capas))), radio: 19, titulos: tit, margen: 110 });
      svg.setAttribute("aria-label", "Red " + capas.join("-") + " con los valores que pasa cada capa a la siguiente");
      net = new RNmlp.MLP({ capas: capas, activacion: "relu", salida: "sigmoid", semilla: 7 });
      red.ponerPesos(net.W);
      tr = net.traza(xs.slice(0, ne));
      mx = Math.max.apply(null, tr.a.reduce((acc, v) => acc.concat(v.map(Math.abs)), [1e-6]));
      red.nodos[0].forEach((nd, i) => txt(svg, nd.x - 28, nd.y + 5, "x" + sub(i + 1), { "text-anchor": "end", "font-size": 15, "font-weight": 700, fill: C.ink2, halo: false }));
      red.nodos[capas.length - 1].forEach((nd, j) => txt(svg, nd.x + 28, nd.y + 5, "ŷ" + (nsal > 1 ? sub(j + 1) : ""), { "font-size": 15, "font-weight": 700, fill: C.ink2, halo: false }));
      red.nodos.forEach((col) => col.forEach((nd) => nd.t.setAttribute("font-size", 12.5)));
      for (let l = 0; l < capas.length; l++) mostrar(l);
      texto(-1);
      // recuento
      const tw = [], tb = [];
      let w = 0, b = 0;
      for (let l = 1; l < capas.length; l++) { tw.push(capas[l - 1] + "×" + capas[l]); tb.push(capas[l]); w += capas[l - 1] * capas[l]; b += capas[l]; }
      $("c-pesos").textContent = RN.fmtN(w);
      $("c-sesgos").textContent = RN.fmtN(b);
      $("c-total").textContent = RN.fmtN(w + b);
      $("c-cuenta").textContent = tw.join(" + ") + " = " + w + " pesos · " + tb.join(" + ") + " = " + b + " sesgos";
    }
    async function propagar() {
      const mio = ++tok;
      limpiar();
      mostrar(0); texto(0);
      await RN.espera(700); if (mio !== tok) return;
      for (let l = 0; l < capas.length - 1; l++) {
        red.nodos[l].forEach((nd, j) => red.resaltar(l, j));
        texto(l + 1);
        await red.pulso(l, { ms: 850 }); if (mio !== tok) return;
        red.limpiarResaltado();
        mostrar(l + 1);
        await RN.espera(700); if (mio !== tok) return;
      }
      texto(-1);
    }
    ["c-ent", "c-noc", "c-nn", "c-sal"].forEach((id) => rango(id, null, construir));
    $("c-play").addEventListener("click", propagar);
    construir();
  })();

  // ==================================================================================
  // 3 · PESOS: el ejemplo del gato
  // ==================================================================================
  (function () {
    const svg = $("g-svg");
    svg.setAttribute("viewBox", "0 0 900 360");
    const RASGOS = [
      { n: "Orejas triangulares", w: 2.5, sig: "refuerza" },
      { n: "Bigotes", w: 2.0, sig: "refuerza" },
      { n: "Hierba de fondo", w: 0.05, sig: "casi ignora" },
      { n: "Pico de pato", w: -3.0, sig: "inhibe" }
    ];
    const B = -2;
    const PRE = { gato: [0.9, 0.8, 0.6, 0], pato: [0.1, 0, 0.7, 0.9], duda: [0.5, 0.3, 0.2, 0.2] };
    const ys = [62, 142, 222, 302], XN = 330, XO = 680, YO = 182;
    const mx = 3;
    // iconos
    function icono(k, cx, cy) {
      const g = S("g", { transform: "translate(" + cx + "," + cy + ")" }, svg);
      const tr = { stroke: C.ink2, "stroke-width": 2.2, "stroke-linejoin": "round", "stroke-linecap": "round", fill: "none" };
      if (k === 0) {
        S("path", Object.assign({ d: "M-24,15 L-13,-15 L-2,15 Z" }, tr, { fill: "#fff" }), g);
        S("path", Object.assign({ d: "M2,15 L13,-15 L24,15 Z" }, tr, { fill: "#fff" }), g);
        S("path", { d: "M-18,12 L-13,-3 L-8,12 Z M8,12 L13,-3 L18,12 Z", fill: C.s5, opacity: 0.55 }, g);
      } else if (k === 1) {
        S("path", { d: "M-5,-3 L5,-3 L0,4 Z", fill: C.s5, stroke: C.ink2, "stroke-width": 1.5, "stroke-linejoin": "round" }, g);
        S("path", Object.assign({ d: "M-8,0 L-28,-8 M-8,3 L-29,3 M-8,6 L-27,13 M8,0 L28,-8 M8,3 L29,3 M8,6 L27,13" }, tr), g);
      } else if (k === 2) {
        S("path", { d: "M-24,16 Q-22,0 -16,-12 M-16,16 Q-15,2 -8,-6 M-8,16 Q-8,-2 -1,-16 M0,16 Q2,4 9,-8 M8,16 Q10,0 17,-13 M16,16 Q18,6 24,-4", stroke: C.s6, "stroke-width": 2.4, "stroke-linecap": "round", fill: "none" }, g);
        S("line", { x1: -27, y1: 16, x2: 27, y2: 16, stroke: C.ink2, "stroke-width": 2, "stroke-linecap": "round" }, g);
      } else {
        S("path", { d: "M-24,-3 Q-4,-17 24,-1 Q2,4 -24,3 Z", fill: C.s4, stroke: C.ink2, "stroke-width": 2, "stroke-linejoin": "round" }, g);
        S("path", { d: "M-24,3 Q-2,8 20,3 Q0,15 -24,9 Z", fill: C.s4, stroke: C.ink2, "stroke-width": 2, "stroke-linejoin": "round" }, g);
        S("circle", { cx: -14, cy: -5, r: 1.8, fill: C.ink }, g);
      }
    }
    txt(svg, 20, 22, "Neuronas de la capa anterior: rasgos detectados", { "font-size": 14, "font-weight": 700, fill: C.ink2 });
    txt(svg, XO, 22, "Neurona de salida «gato»", { "font-size": 14, "font-weight": 700, fill: C.ink2, "text-anchor": "middle" });
    const gAr = S("g", null, svg), gPart = S("g", null, svg), gNod = S("g", null, svg);
    const aristas = [], etqs = [], nodos = [];
    RASGOS.forEach((r, k) => {
      icono(k, 46, ys[k]);
      txt(svg, 84, ys[k] + 5, r.n, { "font-size": 15, "font-weight": 600, halo: false });
      const e = S("path", { d: "M" + XN + "," + ys[k] + " C" + (XN + 160) + "," + ys[k] + " " + (XO - 170) + "," + YO + " " + (XO - 40) + "," + YO, fill: "none", stroke: RN.colorPeso(r.w, mx), "stroke-width": (0.9 + 9 * Math.abs(r.w) / mx).toFixed(2), "stroke-linecap": "round" }, gAr);
      aristas.push(e);
      const c = S("circle", { cx: XN, cy: ys[k], r: 24, fill: "#fff", stroke: C.ink2, "stroke-width": 2 }, gNod);
      const t = S("text", { x: XN, y: ys[k] + 5, "text-anchor": "middle", "font-size": 14, "font-weight": 700, fill: C.ink, text: "" }, gNod);
      nodos.push({ c: c, t: t });
    });
    // etiquetas de peso sobre las aristas
    RASGOS.forEach((r, k) => {
      const L = aristas[k].getTotalLength ? aristas[k].getTotalLength() : 0;
      void L;
      const off = 9 + (0.9 + 9 * Math.abs(r.w) / mx) / 2;
      const e = txt(gNod, XN + 34, r.w < 0 ? ys[k] + off + 12 : ys[k] - off, "w = " + (r.w > 0 ? "+" : "") + ns(r.w, r.w === 0.05 ? 2 : 1) + " · " + r.sig, { "font-size": 14, "font-weight": 700, "text-anchor": "start" });
      etqs.push(e);
    });
    const oc = S("circle", { cx: XO, cy: YO, r: 44, fill: "#fff", stroke: C.ink2, "stroke-width": 2.5 }, gNod);
    const ot = S("text", { x: XO, y: YO + 2, "text-anchor": "middle", "font-size": 20, "font-weight": 800, fill: C.ink, text: "" }, gNod);
    txt(gNod, XO, YO + 20, "p(gato)", { "text-anchor": "middle", "font-size": 12, fill: C.ink2, halo: false });
    txt(svg, XO, YO + 68, "b = " + nv(B), { "text-anchor": "middle", "font-size": 13, fill: C.ink2 });
    txt(svg, XO, YO + 88, "activación sigmoide", { "text-anchor": "middle", "font-size": 13, fill: C.ink2 });
    // medidor
    const GX = 790, GY0 = 60, GY1 = 300;
    S("rect", { x: GX, y: GY0, width: 34, height: GY1 - GY0, rx: 8, fill: C.surface, stroke: C.line || "#E4E7EB" }, svg);
    const gBar = S("rect", { x: GX, y: GY1, width: 34, height: 0, rx: 8, fill: C.s1 }, svg);
    S("line", { x1: GX - 6, y1: (GY0 + GY1) / 2, x2: GX + 40, y2: (GY0 + GY1) / 2, stroke: C.ink, "stroke-width": 1.5, "stroke-dasharray": "4 3" }, svg);
    txt(svg, GX + 46, (GY0 + GY1) / 2 + 4, "0,5", { "font-size": 12, fill: C.ink2, halo: false });
    const gPct = txt(svg, GX + 17, GY0 - 10, "", { "font-size": 16, "font-weight": 800, "text-anchor": "middle" });
    const gDec = txt(svg, GX + 17, GY1 + 26, "", { "font-size": 14, "font-weight": 700, "text-anchor": "middle" });

    const sl = [0, 1, 2, 3].map((k) => rango("g-a" + k, (v) => ns(v, 2), () => { setPre("", true); pinta(); }));
    let z = 0, p = 0;
    function pinta() {
      const a = sl.map((r) => +r.value);
      z = B; RASGOS.forEach((r, k) => { z += r.w * a[k]; });
      p = sig(z);
      a.forEach((v, k) => {
        nodos[k].c.setAttribute("fill", RN.mezcla("#ffffff", C.pos, v * 0.8));
        nodos[k].t.textContent = ns(v, 2);
        nodos[k].t.setAttribute("fill", v > 0.6 ? "#fff" : C.ink);
      });
      oc.setAttribute("fill", tinte(p, 0.85));
      ot.textContent = ns(p, 2);
      ot.setAttribute("fill", Math.abs(p - 0.5) > 0.35 ? "#fff" : C.ink);
      const hgt = (GY1 - GY0) * p;
      gBar.setAttribute("y", GY1 - hgt); gBar.setAttribute("height", Math.max(0, hgt));
      gBar.setAttribute("fill", p >= 0.5 ? C.s1 : C.s2);
      gPct.textContent = RN.fmt(p * 100, 0) + " %";
      gDec.textContent = p >= 0.5 ? "gato" : "no gato";
      // ecuación
      let h = "z = ";
      RASGOS.forEach((r, k) => {
        const c = r.w * a[k], col = Math.abs(r.w) < 0.2 ? "#c3c2b7" : (r.w > 0 ? C.pos : C.neg);
        h += (k ? (r.w < 0 ? " − " : " + ") : (r.w < 0 ? "−" : "")) + "<span class='t' style='border-bottom:3px solid " + col + "'>" + ns(Math.abs(r.w), r.w === 0.05 ? 2 : 1) + "·" + ns(a[k], 2) + "</span>";
        void c;
      });
      h += " − " + ns(-B, 1) + " = <b>" + ns(z, 2) + "</b> &nbsp;→&nbsp; p = σ(" + ns(z, 2) + ") = <b>" + ns(p, 2) + "</b>";
      $("g-ecu").innerHTML = h;
    }
    const setPre = seg("g-pre", (v) => { if (!PRE[v]) return; PRE[v].forEach((x, k) => { sl[k].value = x; sl[k].dispatchEvent(new Event("input")); }); setPre(v, true); pinta(); });
    // partículas: su densidad es proporcional a |w·a|
    const PART = 16;
    const parts = RASGOS.map((r, k) => {
      const arr = [];
      for (let q = 0; q < PART; q++) arr.push({ s: q / PART, c: S("circle", { r: 4, fill: r.w >= 0 ? "#174a87" : "#a4401b", opacity: 0 }, gPart) });
      return arr;
    });
    const largos = aristas.map((e) => (e.getTotalLength ? e.getTotalLength() : 1));
    function pintaPart(dt) {
      const a = sl.map((r) => +r.value);
      RASGOS.forEach((r, k) => {
        const n = Math.round(Math.min(1, Math.abs(r.w * a[k]) / 2.5) * PART);
        parts[k].forEach((pt, q) => {
          pt.s = (pt.s + dt * 0.22) % 1;
          const vis = q < n && largos[k] > 1;
          pt.c.setAttribute("opacity", vis ? (0.85 * Math.sin(Math.PI * pt.s)).toFixed(2) : 0);
          if (vis) { const P = aristas[k].getPointAtLength(largos[k] * pt.s); pt.c.setAttribute("cx", P.x.toFixed(1)); pt.c.setAttribute("cy", P.y.toFixed(1)); }
        });
      });
    }
    if (!RN.reducirMovimiento) {
      const an = RN.anima(function (dt) { pintaPart(dt); }, svg.parentElement);
      an.iniciar();
    }
    pinta();
  })();

  // ==================================================================================
  // 4 · ¿POR QUÉ ACTIVACIONES NO LINEALES?
  // ==================================================================================
  (function () {
    const MAXC = 6, MAXN = 8;
    const ACTS = [
      { k: "lineal", col: C.s3, cv: "n-cv-lin", res: "n-res-lin", f: (z) => z },
      { k: "relu", col: C.s1, cv: "n-cv-relu", res: "n-res-relu", f: relu },
      { k: "tanh", col: C.s2, cv: "n-cv-tanh", res: "n-res-tanh", f: Math.tanh }
    ];
    let semilla = 16, big = null, capas, W, b;
    // Pesos de una red grande; cada configuración usa una parte, así añadir una capa conserva las anteriores
    function generar() {
      const r = RN.rng(semilla * 7919 + 13);
      big = { Win: [], bin: [], Wh: [], bh: [], Wout: [], bout: RN.normal(r) * 0.3 };
      for (let j = 0; j < MAXN; j++) { big.Win.push(RN.normal(r) * 1.1); big.bin.push(RN.normal(r) * 1.5); big.Wout.push(RN.normal(r)); }
      for (let l = 0; l < MAXC - 1; l++) {
        const Wl = [], bl = [];
        for (let j = 0; j < MAXN; j++) { const f = []; for (let i = 0; i < MAXN; i++) f.push(RN.normal(r)); Wl.push(f); bl.push(RN.normal(r) * 0.6); }
        big.Wh.push(Wl); big.bh.push(bl);
      }
    }
    function montar() {
      const nC = +$("n-capas").value, nN = +$("n-neu").value;
      capas = [1].concat(Array(nC).fill(nN), [1]);
      W = []; b = [];
      W.push(big.Win.slice(0, nN).map((w) => [w])); b.push(big.bin.slice(0, nN));
      const esc = 1.35 / Math.sqrt(nN);
      for (let l = 0; l < nC - 1; l++) { W.push(big.Wh[l].slice(0, nN).map((f) => f.slice(0, nN).map((w) => w * esc))); b.push(big.bh[l].slice(0, nN)); }
      W.push([big.Wout.slice(0, nN).map((w) => w * esc)]); b.push([big.bout]);
    }
    function evalua(x, f, patron) {
      let a = [x];
      for (let l = 0; l < W.length; l++) {
        const z = W[l].map((fila, j) => fila.reduce((s, w, i) => s + w * a[i], b[l][j]));
        if (l === W.length - 1) return z[0];
        if (patron) z.forEach((v) => patron.push(v > 0 ? 1 : 0));
        a = z.map(f);
      }
    }
    const graficas = ACTS.map((A) => {
      const g = RN.grafica($(A.cv), {
        alto: 250, x: { min: -3, max: 3, titulo: "entrada x" }, y: { min: -1, max: 1, titulo: "salida y" },
        margen: { l: 50, r: 12, t: 12, b: 44 },
        extras: function (ctx, gg) {
          if (!A.codos) return;
          A.codos.forEach((p) => { ctx.beginPath(); ctx.arc(gg.sx(p[0]), gg.sy(p[1]), 4, 0, 2 * Math.PI); ctx.fillStyle = C.ink; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = "#fff"; ctx.stroke(); });
        }
      });
      return g;
    });
    const svg = $("n-svg");
    function pinta() {
      montar();
      const nC = capas.length - 2;
      const tit = capas.map((_, l) => l === 0 ? "x" : l === capas.length - 1 ? "y" : "Oculta " + l);
      const red = RN.red(svg, { capas: capas, ancho: 1000, alto: 210, radio: 10, titulos: tit, margen: 48 });
      red.ponerPesos(W);
      svg.setAttribute("aria-label", "Red 1 → " + Array(nC).fill(capas[1]).join(" → ") + " → 1 con sus pesos");
      ACTS.forEach((A, n) => {
        const pts = [];
        A.codos = null;
        let prev = null;
        const codos = [];
        for (let k = 0; k <= 600; k++) {
          const x = -3 + k * 0.01, pat = A.k === "relu" ? [] : null;
          const y = evalua(x, A.f, pat);
          pts.push([x, y]);
          if (pat) { const key = pat.join(""); if (prev !== null && key !== prev) codos.push([x - 0.005, y]); prev = key; }
        }
        let lo = Infinity, hi = -Infinity;
        pts.forEach((p) => { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); });
        const span = Math.max(0.5, hi - lo), mid = (hi + lo) / 2;
        graficas[n].op.y.min = mid - span * 0.62; graficas[n].op.y.max = mid + span * 0.62;
        if (A.k === "relu") A.codos = codos;
        graficas[n].dibujar([{ nombre: "y", color: A.col, puntos: pts, ancho: 2.5 }]);
        let res = "";
        if (A.k === "lineal") {
          const y0 = evalua(0, A.f), y1 = evalua(1, A.f);
          res = "Una recta: y = " + ns(y1 - y0, 2) + "·x " + (y0 < 0 ? "− " : "+ ") + ns(Math.abs(y0), 2) + ". Equivale a <b>una sola neurona lineal</b>, con " + nC + (nC === 1 ? " capa" : " capas") + " o con cien.";
        } else if (A.k === "relu") {
          res = "Lineal a trozos: <b>" + (codos.length + 1) + " tramos rectos</b> (los puntos marcan los codos). Más capas, más codos posibles.";
        } else res = "Una <b>curva suave</b>: tanh dobla sin codos y acota cada neurona entre −1 y 1.";
        $(A.res).innerHTML = res;
      });
    }
    rango("n-capas", null, pinta);
    rango("n-neu", null, pinta);
    $("n-otros").addEventListener("click", () => { semilla++; generar(); pinta(); });
    generar();
    pinta();
  })();

  // ==================================================================================
  // 5 · CAPAS OCULTAS: REPRESENTACIONES JERÁRQUICAS (dibujo 28×28)
  // ==================================================================================
  (function () {
    const N = 28, cv = $("j-dib");
    let img = new Float32Array(N * N);
    // trazos de los dígitos de ejemplo (coordenadas de la cuadrícula 28×28)
    const elipse = (cx, cy, rx, ry, a0, a1) => { const p = []; const n = 44; for (let k = 0; k <= n; k++) { const t = (a0 || 0) + ((a1 === undefined ? 2 * Math.PI : a1) - (a0 || 0)) * k / n; p.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]); } return p; };
    const DIG = {
      0: [elipse(14, 14, 5.6, 8.6)],
      1: [[[11, 8.5], [15.2, 4.8], [15.2, 23.5]]],
      2: [[[8.6, 9.6], [10, 6.2], [14, 4.8], [18, 6.2], [19.2, 9.6], [17.6, 13.2], [8.2, 23], [20.4, 23]]],
      3: [[[8.6, 6.6], [12, 4.8], [16.8, 5.4], [18.6, 8.6], [16.6, 12.2], [12.4, 13.6], [17, 15], [19.2, 18.6], [17.2, 22.2], [12, 23.3], [8, 21.6]]],
      4: [[[16.5, 4.6], [7.6, 17.2], [21.2, 17.2]], [[17, 8.5], [17, 24]]],
      5: [[[19.6, 5], [10.4, 5], [9.4, 13], [13.2, 11.6], [17.4, 12.6], [19.6, 16.6], [17.6, 21.6], [12.6, 23.2], [8.4, 21.2]]],
      6: [[[17.4, 4.8], [12.4, 7.8], [9.4, 12.6], [8.8, 17.6], [10.8, 22.2], [14.8, 23.4], [18.4, 20.6], [18.6, 16.4], [15.4, 13.6], [11.2, 14.4], [9.2, 17.2]]],
      7: [[[7.8, 5.6], [20.2, 5.6], [12.6, 23.6]]],
      8: [elipse(14, 9.4, 4.4, 4.4), elipse(14, 18.4, 5.4, 5.2)],
      9: [elipse(13.8, 10, 5, 4.8), [[18.8, 10], [18.4, 16.4], [16.2, 23.6]]]
    };
    function pincel(I, x, y) {
      for (let py = Math.floor(y - 2); py <= Math.ceil(y + 2); py++) for (let px = Math.floor(x - 2); px <= Math.ceil(x + 2); px++) {
        if (px < 0 || py < 0 || px >= N || py >= N) continue;
        const d = Math.hypot(px + 0.5 - x, py + 0.5 - y), v = RN.limita((1.6 - d) / 0.85, 0, 1);
        if (v > I[py * N + px]) I[py * N + px] = v;
      }
    }
    function trazo(I, pts) {
      for (let k = 1; k < pts.length; k++) {
        const a = pts[k - 1], b2 = pts[k], L = Math.hypot(b2[0] - a[0], b2[1] - a[1]), n = Math.max(1, Math.ceil(L / 0.2));
        for (let s = 0; s <= n; s++) pincel(I, lerp(a[0], b2[0], s / n), lerp(a[1], b2[1], s / n));
      }
      if (pts.length === 1) pincel(I, pts[0][0], pts[0][1]);
    }
    function digito(d) { const I = new Float32Array(N * N); DIG[d].forEach((t) => trazo(I, t)); return I; }

    // --- capa 1: Sobel + orientación en 4 grupos (vertical, ↗, horizontal, ↘)
    const NOMS1 = ["trazos horizontales", "trazos verticales", "diagonales ↘", "diagonales ↗"];
    const FI = [Math.PI, 0, 1.5 * Math.PI, 0.5 * Math.PI]; // ángulo doble del gradiente
    function capa1(I) {
      const at = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? 0 : I[y * N + x]);
      const M = [0, 1, 2, 3].map(() => new Float32Array(N * N));
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
        const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
        const m = Math.hypot(gx, gy);
        if (m < 1e-6) continue;
        const fi = 2 * Math.atan2(gy, gx);
        for (let k = 0; k < 4; k++) { const c = Math.cos(fi - FI[k]); if (c > 0) M[k][y * N + x] = m * c * c; }
      }
      return M;
    }
    function borroso(A) {
      const O = new Float32Array(N * N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        let s = 0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < N && yy < N) s += A[yy * N + xx]; }
        O[y * N + x] = s / 25;
      }
      return O;
    }
    // --- capa 2: combinaciones de trazos (hechas a mano) y lazos cerrados (relleno desde el borde)
    function capa2(I, M1) {
      const B = M1.map(borroso);
      const esq = new Float32Array(N * N), cur = new Float32Array(N * N);
      for (let q = 0; q < N * N; q++) {
        esq[q] = Math.sqrt(B[0][q] * B[1][q]) + Math.sqrt(B[2][q] * B[3][q]);
        cur[q] = (Math.sqrt(B[0][q] * B[2][q]) + Math.sqrt(B[0][q] * B[3][q]) + Math.sqrt(B[1][q] * B[2][q]) + Math.sqrt(B[1][q] * B[3][q])) / 2;
      }
      const lazo = new Float32Array(N * N), visto = new Uint8Array(N * N), cola = [];
      const muro = (q) => I[q] > 0.3;
      for (let k = 0; k < N; k++) [k, (N - 1) * N + k, k * N, k * N + N - 1].forEach((q) => { if (!muro(q) && !visto[q]) { visto[q] = 1; cola.push(q); } });
      while (cola.length) {
        const q = cola.pop(), x = q % N, y = (q - x) / N;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach((d) => { const xx = x + d[0], yy = y + d[1]; if (xx < 0 || yy < 0 || xx >= N || yy >= N) return; const r = yy * N + xx; if (!visto[r] && !muro(r)) { visto[r] = 1; cola.push(r); } });
      }
      let nLazos = 0;
      const comp = new Uint8Array(N * N);
      for (let q = 0; q < N * N; q++) {
        if (visto[q] || muro(q) || comp[q]) continue;
        const pila = [q]; comp[q] = 1; let tam = 0;
        const celdas = [];
        while (pila.length) {
          const r = pila.pop(), x = r % N, y = (r - x) / N; tam++; celdas.push(r);
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach((d) => { const xx = x + d[0], yy = y + d[1]; if (xx < 0 || yy < 0 || xx >= N || yy >= N) return; const s = yy * N + xx; if (!visto[s] && !muro(s) && !comp[s]) { comp[s] = 1; pila.push(s); } });
        }
        if (tam >= 2) { nLazos++; celdas.forEach((r) => { lazo[r] = 1; }); }
      }
      return { esq: esq, cur: cur, lazo: lazo, nLazos: nLazos };
    }
    // --- capa 3 (ilustrativa): patrón de formas por zonas del dígito, comparado con los dígitos de ejemplo
    function rasgos(I, M1, M2) {
      let x0 = N, x1 = -1, y0 = N, y1 = -1;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (I[y * N + x] > 0.2) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      if (x1 < 0) return null;
      const mx1 = Math.max(1e-6, ...M1.map((m) => Math.max(...m)));
      const mapas = M1.map((m) => m.map((v) => v / mx1)).concat([M2.esq.map((v) => v / mx1), M2.cur.map((v) => v / mx1), M2.lazo]);
      const v = [];
      const w = Math.max(3, x1 - x0 + 1), h = Math.max(3, y1 - y0 + 1);
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, lado = Math.max(w, h * 0.75);
      const ax = cx - lado / 2, aw = lado;
      mapas.forEach((m, n) => {
        for (let a = 0; a < 3; a++) for (let c = 0; c < 3; c++) {
          let s = 0, k = 0;
          for (let y = Math.floor(y0 + h * a / 3); y < Math.ceil(y0 + h * (a + 1) / 3); y++) for (let x = Math.floor(ax + aw * c / 3); x < Math.ceil(ax + aw * (c + 1) / 3); x++) { if (x < 0 || x >= N || y < 0 || y >= N) continue; s += m[y * N + x]; k++; }
          v.push((k ? s / k : 0) * (n >= 4 ? 1.5 : 1));
        }
      });
      const norma = Math.hypot(...v) || 1;
      return v.map((t) => t / norma);
    }
    function analiza(I) { const M1 = capa1(I), M2 = capa2(I, M1); return { M1: M1, M2: M2, v: rasgos(I, M1, M2) }; }
    const PROTO = [];
    for (let d = 0; d <= 9; d++) PROTO.push(analiza(digito(d)).v);

    // --- mapas en pantalla
    function mapaCanvas(padre, nombre) {
      const fig = RN.el("figure", null, padre);
      const c = RN.el("canvas", { width: N, height: N, "aria-label": "Mapa: " + nombre }, fig);
      RN.el("figcaption", null, fig, nombre);
      return { c: c, cap: fig.querySelector("figcaption") };
    }
    const c1 = NOMS1.map((n) => mapaCanvas($("j-c1"), n));
    const c2 = ["esquinas y cruces", "curvas", "lazos cerrados"].map((n) => mapaCanvas($("j-c2"), n));
    function pintaMapa(cvm, A, max) {
      const ctx = cvm.getContext("2d"), id = ctx.createImageData(N, N);
      for (let q = 0; q < N * N; q++) {
        const t = RN.limita(A[q] / (max || 1), 0, 1), col = t < 0.02 ? [255, 255, 255] : hex(RN.colorSeq(0.08 + t * 0.92));
        id.data[4 * q] = col[0]; id.data[4 * q + 1] = col[1]; id.data[4 * q + 2] = col[2]; id.data[4 * q + 3] = 255;
      }
      ctx.putImageData(id, 0, 0);
    }
    function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
    // dígito: barras de probabilidad
    const sv = $("j-dig");
    txt(sv, 0, 16, "probabilidad (softmax)", { "font-size": 13, fill: C.ink2, halo: false });
    const filas = [];
    for (let d = 0; d <= 9; d++) {
      const y = 30 + d * 26.5;
      const t = txt(sv, 12, y + 15, String(d), { "font-size": 16, "font-weight": 800, "text-anchor": "middle", halo: false });
      S("rect", { x: 28, y: y + 2, width: 170, height: 18, rx: 4, fill: C.surface, stroke: "#E4E7EB" }, sv);
      const r = S("rect", { x: 28, y: y + 2, width: 0, height: 18, rx: 4, fill: C.s1 }, sv);
      const p = txt(sv, 206, y + 15, "", { "font-size": 13, halo: false, fill: C.ink2 });
      filas.push({ t: t, r: r, p: p });
    }
    function pintaDibujo() {
      const L = RN.lienzo(cv, 252), ctx = L.ctx, cel = L.w / N;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, L.w, L.h);
      for (let q = 0; q < N * N; q++) { if (img[q] <= 0.01) continue; const x = q % N, y = (q - x) / N; ctx.fillStyle = RN.mezcla("#ffffff", C.ink, img[q]); ctx.fillRect(x * cel, y * cel, cel + 0.5, cel + 0.5); }
      ctx.strokeStyle = "rgba(31,41,51,.07)"; ctx.lineWidth = 1;
      ctx.beginPath(); for (let k = 1; k < N; k++) { ctx.moveTo(Math.round(k * cel) + 0.5, 0); ctx.lineTo(Math.round(k * cel) + 0.5, L.h); ctx.moveTo(0, Math.round(k * cel) + 0.5); ctx.lineTo(L.w, Math.round(k * cel) + 0.5); } ctx.stroke();
    }
    function recalcula() {
      pintaDibujo();
      const R = analiza(img);
      const mx1 = Math.max(1e-6, ...R.M1.map((m) => Math.max(...m)));
      R.M1.forEach((m, k) => pintaMapa(c1[k].c, m, mx1));
      const mx2 = Math.max(1e-6, Math.max(...R.M2.esq), Math.max(...R.M2.cur)) ;
      pintaMapa(c2[0].c, R.M2.esq, mx2);
      pintaMapa(c2[1].c, R.M2.cur, mx2);
      pintaMapa(c2[2].c, R.M2.lazo, 1);
      c2[2].cap.textContent = "lazos cerrados: " + R.M2.nLazos;
      let probs = null;
      if (R.v) {
        const sims = PROTO.map((p) => p.reduce((s, x, i) => s + x * R.v[i], 0));
        probs = RNmlp.softmax(sims.map((s) => s * 22));
      }
      const best = probs ? RNmlp.argmax(probs) : -1;
      filas.forEach((f, d) => {
        const p = probs ? probs[d] : 0;
        f.r.setAttribute("width", (170 * p).toFixed(1));
        f.r.setAttribute("fill", d === best ? C.s1 : RN.mezcla("#ffffff", C.s1, 0.45));
        f.p.textContent = probs ? RN.fmt(p * 100, 0) + " %" : "";
        f.t.setAttribute("fill", d === best ? C.ink : C.muted);
      });
    }
    let pend = false;
    const pide = () => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; recalcula(); }); };
    const setPre = seg("j-pre", (v) => { img = digito(+v); recalcula(); });
    $("j-borrar").addEventListener("click", () => { img = new Float32Array(N * N); setPre("", true); recalcula(); });
    // dibujo con el puntero
    let ultimo = null;
    const celda = (ev) => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) / r.width * N, (ev.clientY - r.top) / r.height * N]; };
    cv.addEventListener("pointerdown", (ev) => { ev.preventDefault(); cv.setPointerCapture(ev.pointerId); ultimo = celda(ev); setPre("", true); trazo(img, [ultimo]); pide(); });
    cv.addEventListener("pointermove", (ev) => { if (!ultimo) return; const p = celda(ev); trazo(img, [ultimo, p]); ultimo = p; pide(); });
    const fin = () => { ultimo = null; };
    cv.addEventListener("pointerup", fin); cv.addEventListener("pointercancel", fin);
    img = digito(7);
    RN.alCambiarTam(cv, recalcula);
  })();

  // ==================================================================================
  // 6 · PROPAGACIÓN HACIA DELANTE PASO A PASO
  // ==================================================================================
  (function () {
    const REDES = {
      xor: { capas: [2, 2, 1], W: [[[1, 1], [-1, -1]], [[-2, -4]]], b: [[0, 1], [3]], act: "relu", sal: "sigmoid", d: 0,
        xs: [{ v: [0, 1], n: "[0, 1]" }, { v: [1, 0], n: "[1, 0]" }, { v: [0, 0], n: "[0, 0]" }, { v: [1, 1], n: "[1, 1]" }] },
      "332": { capas: [3, 3, 2], W: [[[0.5, -1.0, 0.8], [1.2, 0.3, -0.5], [-0.7, 0.9, 0.4]], [[1.0, -0.6, 0.8], [-0.9, 1.1, 0.5]]], b: [[0.1, -0.2, 0.3], [0.2, -0.1]], act: "relu", sal: "softmax", d: 1,
        xs: [{ v: [1.0, 2.0, 0.5], n: "[1,0; 2,0; 0,5]" }, { v: [-1.0, 0.5, 1.5], n: "[−1,0; 0,5; 1,5]" }] }
    };
    const svg = $("f-svg");
    let R, x, k = 0, pasos = [], vals = null, nodos, aristas, etiq, tok = 0, jugando = false;
    const nomNodo = (l, j) => l === 0 ? "x" + sub(j + 1) : l === R.capas.length - 1 ? (R.capas[l] > 1 ? "ŷ" + sub(j + 1) : "ŷ") : "h" + sub(j + 1);
    function calcula() {
      const z = [null], a = [x.slice()];
      for (let l = 0; l < R.W.length; l++) {
        const zl = R.W[l].map((f, j) => f.reduce((s, w, i) => s + w * a[l][i], R.b[l][j]));
        z.push(zl);
        const ult = l === R.W.length - 1;
        a.push(ult ? (R.sal === "softmax" ? RNmlp.softmax(zl) : zl.map(sig)) : zl.map(relu));
      }
      return { z: z, a: a };
    }
    function construir() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const L = R.capas.length, XL = [90, 320, 550];
      nodos = R.capas.map((n, l) => { const esp = n === 2 ? 130 : 100, y0 = 200 - esp * (n - 1) / 2; return Array.from({ length: n }, (_, j) => ({ x: XL[l], y: n === 1 ? 200 : y0 + j * esp })); });
      const mx = Math.max(...R.W.flat(2).map(Math.abs));
      const gA = S("g", null, svg), gE = S("g", null, svg), gP = S("g", null, svg), gN = S("g", null, svg);
      aristas = []; etiq = [];
      for (let l = 0; l < L - 1; l++) {
        aristas.push([]); etiq.push([]);
        for (let j = 0; j < R.capas[l + 1]; j++) {
          aristas[l].push([]); etiq[l].push([]);
          for (let i = 0; i < R.capas[l]; i++) {
            const a = nodos[l][i], b2 = nodos[l + 1][j], w = R.W[l][j][i];
            aristas[l][j].push(S("line", { x1: a.x, y1: a.y, x2: b2.x, y2: b2.y, stroke: RN.colorPeso(w, mx), "stroke-width": (1.2 + 3.8 * Math.abs(w) / mx).toFixed(2), "stroke-linecap": "round" }, gA));
            const t = l === 0 ? 0.3 : 0.55, yy = lerp(a.y, b2.y, t);
            etiq[l][j].push(txt(gE, lerp(a.x, b2.x, t) + 2, yy + (a.y === b2.y ? -8 : l === 0 ? 5 : -7), nv(w, R.d), { "font-size": 14, "font-weight": 700, "text-anchor": "middle" }));
          }
        }
      }
      nodos.forEach((col, l) => col.forEach((nd, j) => {
        nd.c = S("circle", { cx: nd.x, cy: nd.y, r: 27, fill: "#fff", stroke: C.ink2, "stroke-width": 2 }, gN);
        nd.v = S("text", { x: nd.x, y: nd.y + 6, "text-anchor": "middle", "font-size": 16, "font-weight": 800, fill: C.ink, text: "" }, gN);
        const oculta = l > 0 && l < L - 1;
        txt(gN, l === 0 ? nd.x - 36 : oculta ? nd.x + 20 : nd.x + 36, oculta ? nd.y - 29 : nd.y + 5, nomNodo(l, j), { "font-size": 15, "font-weight": 700, fill: C.ink2, "text-anchor": l === 0 ? "end" : "start" });
        if (l > 0) txt(gN, nd.x, nd.y + 46, "b = " + nv(R.b[l - 1][j], R.d), { "font-size": 13, fill: C.ink2, "text-anchor": "middle" });
      }));
      const tits = ["Entrada", "Oculta · ReLU", "Salida · " + (R.sal === "softmax" ? "softmax" : "sigmoide")];
      tits.forEach((t, l) => txt(svg, XL[l], 26, t, { "font-size": 14, "font-weight": 700, fill: C.ink2, "text-anchor": "middle" }));
      nodos.gP = gP;
      pasos = [];
      for (let l = 1; l < L; l++) for (let j = 0; j < R.capas[l]; j++) pasos.push({ l: l, j: j });
      if (R.sal === "softmax") pasos.push({ l: L - 1, soft: true });
    }
    const fAct = (l) => (l === R.capas.length - 1 ? (R.sal === "softmax" ? "softmax" : "σ") : "ReLU");
    function lineaPaso(p) {
      if (p.soft) {
        const z = vals.z[p.l], a = vals.a[p.l];
        return "<span class='q'>Softmax de la capa de salida</span>softmax(" + z.map((v) => ns(v, 2)).join("; ") + ") = (" + a.map((v) => ns(v, 2)).join("; ") + ")";
      }
      const l = p.l, j = p.j, aP = vals.a[l - 1], w = R.W[l - 1][j], z = vals.z[l][j], a = vals.a[l][j];
      const dIn = l === 1 ? R.d : 2;
      let s = "<span class='q'>Neurona " + nomNodo(l, j) + "</span>z = (" + aP.map((v, i) => nv(v, dIn) + "×" + np(w[i], R.d)).join(" + ") + ") " + (R.b[l - 1][j] < 0 ? "− " + nv(-R.b[l - 1][j], R.d) : "+ " + nv(R.b[l - 1][j], R.d)) + " = " + nv(z, 2);
      const f = fAct(l);
      if (f === "ReLU") s += " &nbsp;→&nbsp; a = ReLU(" + nv(z, 2) + ") = <b>" + nv(a, 2) + "</b>";
      else if (f === "σ") s += " &nbsp;→&nbsp; a = σ(" + nv(z, 2) + ") = 1/(1 + e<sup>" + (z > 0 ? "−" : "") + nv(Math.abs(z), 2) + "</sup>) ≈ <b>" + ns(a, 2) + "</b>";
      return s;
    }
    function pinta(anima) {
      const mio = ++tok;
      const hechos = pasos.slice(0, k), act = k > 0 ? pasos[k - 1] : null;
      // valores en los nodos
      nodos.forEach((col, l) => col.forEach((nd, j) => {
        let txtV = "", v = null;
        if (l === 0) { v = x[j]; txtV = nv(v, R.d); }
        else {
          const hecho = hechos.some((p) => (p.l === l && p.j === j) || (p.soft && p.l === l));
          if (hecho) {
            const soft = R.sal === "softmax" && l === R.capas.length - 1;
            const sHecho = hechos.some((p) => p.soft);
            v = soft && !sHecho ? vals.z[l][j] : vals.a[l][j];
            txtV = soft && !sHecho ? "z=" + ns(v, 2) : ns(v, 2).replace(",00", "");
            if (!soft && fAct(l) === "ReLU") txtV = nv(v, 2);
          }
        }
        nd.v.textContent = txtV;
        const salida = l === R.capas.length - 1 && v !== null && txtV.indexOf("z=") < 0;
        nd.c.setAttribute("fill", v === null ? "#fff" : salida ? tinte(v, 0.8) : RN.mezcla("#ffffff", v >= 0 ? C.pos : C.neg, Math.min(1, Math.abs(v) / 2) * 0.55));
        nd.v.setAttribute("font-size", txtV.length > 4 ? 13 : 16);
        const activo = act && act.l === l && (act.soft || act.j === j);
        nd.c.setAttribute("stroke", activo ? RN.acento() : C.ink2);
        nd.c.setAttribute("stroke-width", activo ? 4.5 : 2);
      }));
      // aristas y etiquetas
      aristas.forEach((Ll, l) => Ll.forEach((F, j) => F.forEach((e, i) => {
        const on = act && !act.soft && act.l === l + 1 && act.j === j;
        e.setAttribute("opacity", !act || act.soft ? 1 : on ? 1 : 0.22);
        etiq[l][j][i].setAttribute("opacity", !act || act.soft ? (R.d ? 0.0 : 1) : on ? 1 : (R.d ? 0 : 0.3));
        etiq[l][j][i].setAttribute("font-size", on ? 16 : 14);
      })));
      // pulsos por las aristas que llegan a la neurona activa
      if (anima && act && !act.soft && !RN.reducirMovimiento) {
        const l = act.l, dests = nodos[l][act.j];
        const pts = nodos[l - 1].map((o) => ({ o: o, c: S("circle", { r: 6, fill: RN.acento(), opacity: 0.9 }, nodos.gP) }));
        const v = nodos[l][act.j].v, guard = v.textContent;
        v.textContent = "";
        RN.tween(650, (e) => { if (mio !== tok) return; pts.forEach((p) => { p.c.setAttribute("cx", lerp(p.o.x, dests.x, e)); p.c.setAttribute("cy", lerp(p.o.y, dests.y, e)); }); }, (t) => t).then(() => { pts.forEach((p) => p.c.remove()); if (mio === tok) v.textContent = guard; });
      }
      // lista de cálculo
      let h = "<li><span class='q'>Entrada</span>x = [" + x.map((v) => nv(v, R.d)).join("; ") + "]</li>";
      hechos.forEach((p, n) => { h += "<li class='" + (n === k - 1 ? "act" : "") + "'>" + lineaPaso(p) + "</li>"; });
      if (k === pasos.length) {
        const o = vals.a[R.capas.length - 1];
        if (R.sal === "sigmoid") {
          const xor = x[0] !== x[1] ? 1 : 0, pred = o[0] >= 0.5 ? 1 : 0;
          h += "<li class='fin'><span class='q'>Predicción</span>ŷ = " + ns(o[0], 2) + " ≈ " + pred + " &nbsp;·&nbsp; XOR(" + x.join(", ") + ") = " + xor + " " + (pred === xor ? "<span class='ok-t'>✓</span>" : "<span class='bad-t'>✗</span>") + "</li>";
        } else {
          const m = RNmlp.argmax(o);
          h += "<li class='fin'><span class='q'>Predicción</span>clase " + (m + 1) + " con " + RN.fmt(o[m] * 100, 0) + " % · las probabilidades suman " + ns(o.reduce((s, v) => s + v, 0), 2) + "</li>";
        }
      }
      $("f-calc").innerHTML = h;
      matriz(act);
      nota();
    }
    function mx(filas, on) {
      const n = filas[0].length;
      let h = "<span class='mx' style='grid-template-columns:repeat(" + n + ",auto)'>";
      filas.forEach((f, r) => f.forEach((v, c) => { h += "<span class='" + (on && on(r, c) ? "on" : "") + "'>" + v + "</span>"; }));
      return h + "</span>";
    }
    const blq = (et, cont) => "<span class='mx-blq'>" + cont + "<span class='mx-et'>" + et + "</span></span>";
    function matriz(act) {
      const e = $("f-mat");
      let l = act ? act.l : (k === pasos.length && k > 0 ? R.capas.length - 1 : 0);
      if (l === 0) { e.innerHTML = blq("a⁽⁰⁾ = x", mx(x.map((v) => [nv(v, R.d)]))) + "<span class='mini' style='font-family:system-ui'>La capa de entrada solo pasa los datos.</span>"; return; }
      const W = R.W[l - 1], b = R.b[l - 1], aP = vals.a[l - 1], z = vals.z[l], a = vals.a[l];
      const fila = act && !act.soft ? act.j : -1;
      const hecho = (j) => pasos.slice(0, k).some((p) => p.l === l && (p.soft || p.j === j));
      const sHecho = pasos.slice(0, k).some((p) => p.soft);
      const dIn = l === 1 ? R.d : 2;
      let h = blq("z" + sup(l), mx(z.map((v, j) => [hecho(j) ? nv(v, 2) : "·"]), (r) => r === fila)) + " = ";
      h += blq("W" + sup(l), mx(W.map((f) => f.map((w) => nv(w, R.d))), (r) => r === fila)) + " · ";
      h += blq("a" + sup(l - 1), mx(aP.map((v) => [nv(v, dIn)]), () => fila >= 0)) + " + ";
      h += blq("b" + sup(l), mx(b.map((v) => [nv(v, R.d)]), (r) => r === fila));
      const f = fAct(l), listo = R.sal === "softmax" && l === R.capas.length - 1 ? sHecho : true;
      h += " &nbsp;→&nbsp; " + blq("a" + sup(l) + " = " + f + "(z" + sup(l) + ")", mx(a.map((v, j) => [hecho(j) && listo ? (f === "ReLU" ? nv(v, 2) : ns(v, 2)) : "·"]), (r) => r === fila || (act && act.soft)));
      e.innerHTML = h;
    }
    function nota() {
      const e = $("f-nota");
      const clave = rk + "|" + x.join(",");
      const T = {
        "xor|0,1": "x = [0, 1] → capa oculta [1, 0] → z = −2·1 − 4·0 + 3 = 1 → ŷ = σ(1) ≈ 0,73, es decir, XOR(0, 1) = 1.",
        "xor|1,0": "Con x = [1, 0] la capa oculta da lo mismo que con [0, 1], [1, 0], así que la salida también es σ(1) ≈ 0,73: XOR(1, 0) = 1.",
        "xor|0,0": "Con (0, 0) solo se activa h₂ (por su sesgo, b = 1): z = −4·1 + 3 = −1 y la salida baja a σ(−1) ≈ 0,27: predice 0.",
        "xor|1,1": "Con (1, 1) solo se activa h₁, que vale 2: z = −2·2 + 3 = −1 y la salida es σ(−1) ≈ 0,27: predice 0, como XOR(1, 1) = 0."
      };
      let t = T[clave];
      if (!t) t = "Red de ejemplo con pesos inventados. Cuando z < 0, la ReLU apaga la neurona (a = 0). Con 2 neuronas de salida y softmax, las probabilidades suman 1.";
      e.textContent = t;
    }
    let rk = "xor";
    const setX = seg("f-x", (v) => { x = R.xs[+v].v; vals = calcula(); k = pasos.length; pararJuego(); pinta(false); });
    function ponRed(v) {
      rk = v; R = REDES[v];
      const cont = $("f-x");
      cont.innerHTML = R.xs.map((o, n) => "<button type='button' data-v='" + n + "' aria-pressed='" + (n === 0) + "'>" + o.n + "</button>").join("");
      x = R.xs[0].v;
      construir();
      vals = calcula();
      k = pasos.length;
      pararJuego();
      pinta(false);
    }
    seg("f-red", ponRed);
    function avanzar() { if (k >= pasos.length) k = 0; k++; pinta(true); }
    $("f-paso").addEventListener("click", () => { pararJuego(); avanzar(); });
    $("f-reset").addEventListener("click", () => { pararJuego(); k = 0; pinta(false); });
    const bPlay = $("f-play");
    function pararJuego() { jugando = false; bPlay.textContent = "▶ Reproducir"; bPlay.setAttribute("aria-pressed", "false"); }
    bPlay.addEventListener("click", async () => {
      if (jugando) { pararJuego(); return; }
      jugando = true; bPlay.textContent = "⏸ Pausa"; bPlay.setAttribute("aria-pressed", "true");
      if (k >= pasos.length) { k = 0; pinta(false); await RN.espera(500); }
      while (jugando && k < pasos.length) { avanzar(); await RN.espera(RN.reducirMovimiento ? 300 : 1500); }
      pararJuego();
    });
    void setX;
    ponRed("xor");
  })();

  // ==================================================================================
  // 7 · LA SALIDA SEGÚN EL PROBLEMA
  // ==================================================================================
  (function () {
    // ---------- árbol de decisión
    const sv = $("s-arbol");
    flechaDefs(sv, "s-fl", "#CFD8DC");
    flechaDefs(sv, "s-fl2", RN.acento());
    const NODOS = {
      raiz: { x: 470, y: 26, w: 270, h: 38, t: ["¿Qué hay que predecir?"] },
      clas: { x: 360, y: 98, w: 280, h: 38, t: ["Una categoría → clasificación"] },
      reg: { x: 850, y: 98, w: 250, h: 38, t: ["Un número → regresión"] },
      bin: { x: 130, y: 172, w: 205, h: 54, t: ["2 clases", "1 neurona · sigmoide"], hoja: "bin" },
      multi: { x: 360, y: 172, w: 205, h: 54, t: ["3 o más clases", "K neuronas · softmax"], hoja: "multi" },
      etiq: { x: 590, y: 172, w: 215, h: 54, t: ["Varias etiquetas a la vez", "K neuronas · sigmoide"], hoja: "etiq" },
      lin: { x: 850, y: 172, w: 205, h: 54, t: ["Valor continuo", "1 neurona · lineal"], hoja: "reg" }
    };
    const ARISTAS = [["raiz", "clas"], ["raiz", "reg"], ["clas", "bin"], ["clas", "multi"], ["clas", "etiq"], ["reg", "lin"]];
    const RUTA = { bin: ["raiz", "clas", "bin"], multi: ["raiz", "clas", "multi"], etiq: ["raiz", "clas", "etiq"], reg: ["raiz", "reg", "lin"] };
    const gA = S("g", null, sv), gN = S("g", null, sv);
    const aris = ARISTAS.map((a) => {
      const p = NODOS[a[0]], q = NODOS[a[1]], y0 = p.y + p.h / 2, y1 = q.y - q.h / 2 - 3;
      const ym = (y0 + y1) / 2, rr = Math.min(8, Math.abs(q.x - p.x) / 2), sg = q.x > p.x ? 1 : -1;
      const d = Math.abs(q.x - p.x) < 1 ? "M" + p.x + "," + y0 + " V" + y1 : "M" + p.x + "," + y0 + " V" + (ym - rr) + " Q" + p.x + "," + ym + " " + (p.x + sg * rr) + "," + ym + " H" + (q.x - sg * rr) + " Q" + q.x + "," + ym + " " + q.x + "," + (ym + rr) + " V" + y1;
      return { a: a, e: S("path", { d: d, fill: "none", stroke: C.muted, "stroke-width": 1.6, "marker-end": "url(#s-fl)", "stroke-linejoin": "round" }, gA) };
    });
    Object.keys(NODOS).forEach((k) => {
      const n = NODOS[k];
      const g = S("g", n.hoja ? { class: "hoja", role: "button", tabindex: 0, "aria-label": n.t.join(": ") } : null, gN);
      n.r = S("rect", { x: n.x - n.w / 2, y: n.y - n.h / 2, width: n.w, height: n.h, rx: 9, fill: "#fff", stroke: "#CFD8DC", "stroke-width": 1.6 }, g);
      n.tx = n.t.map((s, i) => S("text", { x: n.x, y: n.y + (n.t.length === 1 ? 5 : i === 0 ? -5 : 15), "text-anchor": "middle", "font-size": i === 0 ? 15 : 14, "font-weight": i === 0 ? 700 : 600, fill: C.ink2, text: s }, g));
      if (n.hoja) {
        g.addEventListener("click", () => setTipo(n.hoja));
        g.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); setTipo(n.hoja); } });
      }
    });
    const nota = S("g", null, sv);
    S("rect", { x: 790, y: 9, width: 196, height: 34, rx: 17, fill: C.surface, stroke: "#E4E7EB" }, nota);
    S("text", { x: 888, y: 31, "text-anchor": "middle", "font-size": 13.5, "font-weight": 700, fill: C.ink2, text: "Capas ocultas: ReLU" }, nota);
    function pintaArbol(tipo) {
      const ruta = RUTA[tipo];
      Object.keys(NODOS).forEach((k) => {
        const on = ruta.indexOf(k) >= 0, n = NODOS[k];
        n.r.setAttribute("fill", on ? "var(--acento-l)" : "#fff");
        n.r.setAttribute("stroke", on ? RN.acento() : "#CFD8DC");
        n.r.setAttribute("stroke-width", on ? 2.5 : 1.6);
        n.tx.forEach((t) => t.setAttribute("fill", on ? C.ink : C.muted));
      });
      aris.forEach((a) => { const on = ruta.indexOf(a.a[0]) >= 0 && ruta.indexOf(a.a[1]) >= 0; a.e.setAttribute("stroke", on ? RN.acento() : "#CFD8DC"); a.e.setAttribute("stroke-width", on ? 2.6 : 1.6); a.e.setAttribute("marker-end", on ? "url(#s-fl2)" : "url(#s-fl)"); if (on) gA.appendChild(a.e); });
    }
    const PANEL = { bin: "s-bin", multi: "s-multi", etiq: "s-etiq", reg: "s-reg" };
    const setSeg = seg("s-tipo", (v) => setTipo(v));
    function setTipo(v) {
      setSeg(v, true);
      Object.keys(PANEL).forEach((k) => { $(PANEL[k]).hidden = k !== v; });
      pintaArbol(v);
    }

    // ---------- binaria: radiografía
    const zR = $("s-z");
    const gB = RN.grafica($("s-bin-cv"), {
      alto: 300, x: { min: -6, max: 6, titulo: "z (suma ponderada de la neurona de salida)" }, y: { min: 0, max: 1, titulo: "p(roto) = σ(z)" },
      extras: function (c, g) {
        const z = +zR.value, p = sig(z);
        c.save(); c.setLineDash([5, 4]); c.strokeStyle = C.ink2; c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(g.sx(-6), g.sy(0.5)); c.lineTo(g.sx(6), g.sy(0.5)); c.stroke();
        c.strokeStyle = C.muted; c.beginPath(); c.moveTo(g.sx(z), g.sy(0)); c.lineTo(g.sx(z), g.sy(p)); c.lineTo(g.sx(-6), g.sy(p)); c.stroke(); c.restore();
        ctxTxt(c, "umbral 0,5", g.sx(6) - 4, g.sy(0.5) + 12, C.ink2, "600 12px system-ui, sans-serif", "right");
        c.beginPath(); c.arc(g.sx(z), g.sy(p), 7, 0, 2 * Math.PI); c.fillStyle = p >= 0.5 ? C.clase1 : C.clase0; c.fill(); c.lineWidth = 2.5; c.strokeStyle = "#fff"; c.stroke();
        ctxTxt(c, "p = " + ns(p, 2), g.sx(z) + (z > 3 ? -12 : 12), g.sy(p) - 14, C.ink, "700 13px system-ui, sans-serif", z > 3 ? "right" : "left");
      }
    });
    const curvaSig = []; for (let z = -6; z <= 6.0001; z += 0.05) curvaSig.push([z, sig(z)]);
    function pintaBin() {
      const z = +zR.value, p = sig(z);
      $("s-z-o").textContent = ns(z, 2);
      gB.dibujar([{ nombre: "σ(z)", color: C.s1, puntos: curvaSig }]);
      $("s-bin-lec").innerHTML = "p(roto) = " + ns(p, 2) + "<small>" + RN.fmt(p * 100, 0) + " % de probabilidad de estar roto → " + (p >= 0.5 ? "«sí, roto»" : "«no roto»") + " con umbral 0,5</small>";
    }
    zR.addEventListener("input", pintaBin);

    // ---------- multiclase: softmax
    const MPRE = {
      animales: { cl: ["Gato", "Perro", "Pájaro", "Reptil"], z: [2.0, 1.0, 0.1, -0.5], nota: "El logit más alto (gato) se lleva el 62,5 %. Las cuatro probabilidades suman 1." },
      contam: { cl: ["ECO", "Baja", "Media", "Alta"], z: [1.0, 0.5, -0.2, 2.0], nota: "Contaminación ambiental: 21,6 %, 13,1 %, 6,5 % y 58,8 % → predicción ALTA." },
      iguales: { cl: ["Gato", "Perro", "Pájaro", "Reptil"], z: [1, 1, 1, 1], nota: "Si todos los z son iguales, softmax da 1/K a cada clase: la red está completamente insegura." },
      peq: { cl: ["A", "B", "C"], z: [0.1, 0.2, 0.3], nota: "z parecidos → probabilidades parecidas: [0,30; 0,33; 0,37]. Compara con z = [1; 2; 3]." },
      gra: { cl: ["A", "B", "C"], z: [1, 2, 3], nota: "Mismas diferencias relativas, pero mayores: [0,09; 0,24; 0,67]. La exponencial amplifica las diferencias." }
    };
    const COLS = [C.s1, C.s2, C.s3, C.s4];
    let mp = "animales", mz = MPRE.animales.z.slice();
    function tablaMulti() {
      const P = MPRE[mp];
      let h = "<thead><tr><th>Clase</th><th>z (salida antes de softmax)</th><th>e<sup>z</sup></th><th>p = e<sup>z</sup> / Σ e<sup>z</sup></th></tr></thead><tbody>";
      P.cl.forEach((c, k) => {
        h += "<tr><td><b>" + c + "</b></td><td><div class='fila'><input type='range' id='s-mz" + k + "' min='-3' max='4' step='0.1' value='" + mz[k] + "' aria-label='z de " + c + "'><output class='num' id='s-mz" + k + "-o'></output></div></td>" +
          "<td><div class='barra'><i id='s-me" + k + "' style='background:" + COLS[k] + "'></i><b id='s-me" + k + "-t'></b></div></td>" +
          "<td><div class='barra'><i id='s-mp" + k + "' style='background:" + COLS[k] + "'></i><b id='s-mp" + k + "-t'></b></div></td></tr>";
      });
      $("s-mtabla").innerHTML = h + "</tbody>";
      P.cl.forEach((c, k) => $("s-mz" + k).addEventListener("input", (ev) => { mz[k] = +ev.target.value; pintaMulti(); }));
      $("s-mnota").textContent = P.nota;
      pintaMulti();
    }
    function pintaMulti() {
      const P = MPRE[mp], e = mz.map(Math.exp), s = e.reduce((a, b) => a + b, 0), p = e.map((v) => v / s), me = Math.max(...e);
      P.cl.forEach((c, k) => {
        $("s-mz" + k + "-o").textContent = ns(mz[k], 1);
        $("s-me" + k).style.width = (100 * e[k] / me).toFixed(1) + "%";
        $("s-me" + k + "-t").textContent = ns(e[k], 3);
        $("s-mp" + k).style.width = (100 * p[k]).toFixed(1) + "%";
        $("s-mp" + k + "-t").textContent = ns(p[k], 3);
      });
      $("s-apilada").innerHTML = P.cl.map((c, k) => "<div style='flex:0 0 " + (100 * p[k]).toFixed(2) + "%;background:" + COLS[k] + "'>" + (p[k] > 0.1 ? c + " " + RN.fmt(p[k] * 100, 1) + " %" : "") + "</div>").join("");
      $("s-mcalc").innerHTML = "e<sup>z</sup> = " + e.map((v) => ns(v, 3)).join(" · ") + " &nbsp;→&nbsp; Σ = " + ns(s, 3) + " &nbsp;→&nbsp; p = (" + p.map((v) => ns(v, 3)).join("; ") + ") &nbsp;·&nbsp; suma = " + ns(p.reduce((a, b) => a + b, 0), 2);
      const m = RNmlp.argmax(p), empate = p.filter((v) => Math.abs(v - p[m]) < 1e-9).length > 1;
      $("s-mpred").innerHTML = empate ? "Empate: " + RN.fmt(100 * p[m], 1) + " % para cada clase empatada" : "Predicción: " + P.cl[m].toUpperCase() + " <small>clase " + m + " con " + RN.fmt(100 * p[m], 1) + " %</small>";
    }
    seg("s-mpre", (v) => { mp = v; mz = MPRE[v].z.slice(); tablaMulti(); });

    // ---------- multietiqueta
    const ET = ["Tecnología", "Viajes", "Deportes"];
    const ez = [Math.log(0.8 / 0.2), Math.log(0.3 / 0.7), Math.log(0.1 / 0.9)];
    (function () {
      let h = "<thead><tr><th>Etiqueta</th><th>z</th><th>σ(z) · umbral 0,5</th><th>¿La lleva?</th></tr></thead><tbody>";
      ET.forEach((c, k) => {
        h += "<tr><td><b>" + c + "</b></td><td><div class='fila'><input type='range' id='s-ez" + k + "' min='-4' max='4' step='0.01' value='" + ez[k].toFixed(3) + "' aria-label='z de " + c + "'><output class='num' id='s-ez" + k + "-o'></output></div></td>" +
          "<td><div class='barra'><i id='s-ep" + k + "' style='background:" + COLS[k] + "'></i><span class='umbral'></span><b id='s-ep" + k + "-t'></b></div></td><td id='s-ed" + k + "' style='font-weight:800'></td></tr>";
      });
      $("s-etabla").innerHTML = h + "</tbody>";
      ET.forEach((c, k) => $("s-ez" + k).addEventListener("input", (ev) => { ez[k] = +ev.target.value; pintaEtiq(); }));
    })();
    function pintaEtiq() {
      const p = ez.map(sig), sm = RNmlp.softmax(ez);
      ET.forEach((c, k) => {
        $("s-ez" + k + "-o").textContent = ns(ez[k], 2);
        $("s-ep" + k).style.width = (100 * p[k]).toFixed(1) + "%";
        $("s-ep" + k + "-t").textContent = ns(p[k], 2);
        $("s-ed" + k).textContent = p[k] >= 0.5 ? "sí (" + RN.fmt(p[k] * 100, 0) + " %)" : "no (" + RN.fmt(p[k] * 100, 0) + " %)";
      });
      $("s-ecalc").innerHTML = "Suma de las salidas = " + ns(p.reduce((a, b) => a + b, 0), 2) + ": no tiene por qué ser 1. Con softmax, los mismos z darían (" + sm.map((v) => ns(v, 2)).join("; ") + ") y obligarían a elegir una sola etiqueta.";
    }

    // ---------- regresión: precio de vivienda (red 4 → 8 → 1 entrenada de verdad)
    const r = RN.rng(11), casas = [];
    const precio = (m2, hab, an, km) => 30 + 1.9 * m2 + 12 * hab - 1.2 * an - 6 * km; // miles de euros
    for (let k = 0; k < 80; k++) {
      const m2 = 50 + 150 * r(), hab = 1 + Math.floor(r() * 5), an = Math.floor(r() * 60), km = 0.5 + 19.5 * r();
      casas.push({ x: [m2, hab, an, km], y: (precio(m2, hab, an, km) + RN.normal(r) * 18) * 1000 });
    }
    const EJ = [120, 3, 15, 5];
    const mu = [0, 1, 2, 3].map((i) => casas.reduce((s, c) => s + c.x[i], 0) / casas.length);
    const de = [0, 1, 2, 3].map((i) => Math.sqrt(casas.reduce((s, c) => s + (c.x[i] - mu[i]) ** 2, 0) / casas.length));
    const est = (x) => x.map((v, i) => (v - mu[i]) / de[i]);
    const muY = casas.reduce((s, c) => s + c.y, 0) / casas.length, deY = Math.sqrt(casas.reduce((s, c) => s + (c.y - muY) ** 2, 0) / casas.length);
    const Xs = casas.map((c) => est(c.x));
    const netL = new RNmlp.MLP({ capas: [4, 8, 1], activacion: "relu", salida: "lineal", perdida: "mse", semilla: 3 });
    const Ys = casas.map((c) => [(c.y - muY) / deY]);
    for (let e = 0; e < 300; e++) netL.entrenarEpoca(Xs, Ys, { lote: 16, lr: 0.01, opt: "adam" });
    // La red da el precio directamente en euros: se pliega el escalado de y en la capa de salida
    netL.W[1][0] = netL.W[1][0].map((w) => w * deY); netL.b[1][0] = netL.b[1][0] * deY + muY;
    const netS = new RNmlp.MLP({ capas: [4, 8, 1], activacion: "relu", salida: "sigmoid", perdida: "mse", semilla: 3 });
    const Ye = casas.map((c) => [c.y]);
    for (let e = 0; e < 100; e++) netS.entrenarEpoca(Xs, Ye, { lote: 16, lr: 0.01, opt: "adam" });
    const pL = casas.map((c, k) => [c.y / 1000, netL.forward(Xs[k])[0] / 1000]);
    const pS = casas.map((c, k) => [c.y / 1000, netS.forward(Xs[k])[0] / 1000]);
    const ejL = netL.forward(est(EJ))[0], ejS = netS.forward(est(EJ))[0], ejR = precio(120, 3, 15, 5) * 1000;
    const gR = RN.grafica($("s-reg-cv"), {
      alto: 320, x: { min: 50, max: 500, titulo: "precio real (miles de €)" }, y: { min: -30, max: 500, titulo: "precio predicho (miles de €)" },
      extras: function (c, g) {
        [[ejR / 1000, ejL / 1000, "vivienda del ejemplo"], [ejR / 1000, ejS / 1000, "con sigmoide: " + ns(ejS, 2) + " €"]].forEach((q, n) => {
          c.beginPath(); c.arc(g.sx(q[0]), g.sy(q[1]), 9, 0, 2 * Math.PI); c.lineWidth = 2.5; c.strokeStyle = C.ink; c.stroke();
          ctxTxt(c, q[2], g.sx(q[0]) + 14, g.sy(q[1]) - (n ? 16 : 12), C.ink, "700 13px system-ui, sans-serif", "left");
        });
      }
    });
    gR.dibujar([
      { nombre: "predicción perfecta", color: C.axis, puntos: [[50, 50], [500, 500]], discontinua: true, hover: false },
      { nombre: "lineal", color: C.s1, puntos: pL, tipo: "puntos", radio: 4.5 },
      { nombre: "sigmoide", color: C.s2, puntos: pS, tipo: "puntos", radio: 4.5 }
    ]);
    const minS = Math.min(...pS.map((p) => p[1] * 1000)), maxS = Math.max(...pS.map((p) => p[1] * 1000));
    $("s-reg-lec").innerHTML = "Salida lineal: " + RN.fmtN(Math.round(ejL / 100) * 100) + " €<small>valor de la fórmula sin ruido: " + RN.fmtN(ejR) + " € (error de " + RN.fmtN(Math.round(Math.abs(ejL - ejR) / 100) * 100) + " €) · con sigmoide: " + ns(ejS, 2) + " €</small>";
    const rangoS = ns(minS, 2) === ns(maxS, 2) ? "valen ≈ " + ns(minS, 2) + " €" : "quedan entre " + ns(minS, 2) + " y " + ns(maxS, 2) + " €";
    $("s-reg-nota").innerHTML = "Datos sintéticos: 80 viviendas generadas con una fórmula para el ejemplo. Las dos redes 4 → 8 → 1 se entrenan de verdad al abrir la página. Con salida sigmoide todas las predicciones " + rangoS + ": la sigmoide no puede pasar de 1.";

    pintaBin(); tablaMulti(); pintaEtiq(); setTipo("bin");
  })();

  // ==================================================================================
  // 8 · DISEÑAR LA ARQUITECTURA Y CONTAR PARÁMETROS
  // ==================================================================================
  (function () {
    const PRE = {
      rx: { c: [256, 128, 64, 1], a: "sigmoide", n: "Radiografía: 256 píxeles de entrada; binaria → 1 neurona sigmoide. Problema médico: mejor ir a lo seguro con 2 capas ocultas que comprimen la información poco a poco (128 → 64). Total: 41.217 parámetros." },
      viv: { c: [4, 8, 1], a: "lineal", n: "Vivienda, relación casi lineal: 4×8 + 8 + 8×1 + 1 = 49 parámetros. Salida lineal porque el precio no tiene límites." },
      vivc: { c: [4, 16, 8, 4, 1], a: "lineal", n: "Vivienda, relaciones no lineales: 80 + 136 + 36 + 5 = 257 parámetros." },
      ani: { c: [784, 256, 128, 64, 4], a: "softmax", n: "Gato, perro, pájaro o reptil: imagen de 28 × 28 = 784 entradas y 4 clases → 4 neuronas softmax (una por clase). Casi todo el peso está en la primera conexión." },
      piz: { c: [3, 2, 1], a: "sigmoide", n: "Una red pequeña que se puede dibujar a mano: 3×2 + 2×1 = 8 pesos, más 3 sesgos." },
      keras: { c: [784, 64, 32, 10], a: "softmax", n: "El modelo de los recursos: Dense(64, relu, input_shape=(784,)) → Dense(32, relu) → Dense(10, softmax)." },
      diez: { c: [256, 256, 256, 256, 256, 256, 256, 256, 256, 256, 256, 1], a: "sigmoide", n: "«¿Y si fuesen 10 capas de 256 neuronas?» Demasiados parámetros: sería difícil de entrenar y propensa al sobreajuste." }
    };
    const ACT = { sigmoide: "sigmoide", softmax: "softmax", lineal: "lineal" };
    let capas = PRE.rx.c.slice(), actSal = "sigmoide", nota = PRE.rx.n;
    const nombre = (l) => (l === 0 ? "entrada" : l === capas.length - 1 ? "salida" : "oculta " + l);
    function editor() {
      const e = $("a-capas");
      let h = "";
      capas.forEach((n, l) => {
        if (l) h += "<span class='flechita'>→</span>";
        h += "<div class='capa'><span>" + (l === 0 ? "Entrada" : l === capas.length - 1 ? "Salida" : "Oculta " + l) + "</span><input type='number' min='1' max='100000' value='" + n + "' data-l='" + l + "' aria-label='Neuronas de la capa " + nombre(l) + "'>" +
          (l > 0 && l < capas.length - 1 ? "<button type='button' data-quita='" + l + "' aria-label='Quitar la capa oculta " + l + "'>quitar</button>" : "") + "</div>";
      });
      h += "<button type='button' class='btn gris' id='a-mas' style='margin-left:.4rem;padding:.35rem .7rem'>+ capa oculta</button>";
      e.innerHTML = h;
    }
    $("a-capas").addEventListener("input", (ev) => {
      const l = ev.target.dataset && ev.target.dataset.l;
      if (l === undefined) return;
      const v = Math.round(+ev.target.value);
      if (!(v >= 1 && v <= 100000)) return;
      capas[+l] = v; nota = "Arquitectura propia."; $("a-pre").value = ""; pinta();
    });
    $("a-capas").addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      if (b.id === "a-mas") { if (capas.length < 14) capas.splice(capas.length - 1, 0, capas[capas.length - 2] > 1 ? capas[capas.length - 2] : 8); }
      else if (b.dataset.quita) capas.splice(+b.dataset.quita, 1);
      nota = "Arquitectura propia."; $("a-pre").value = ""; editor(); pinta();
    });
    $("a-pre").addEventListener("change", () => {
      const p = PRE[$("a-pre").value]; if (!p) return;
      capas = p.c.slice(); actSal = p.a; nota = p.n; $("a-act").value = actSal; editor(); pinta();
    });
    $("a-act").addEventListener("change", () => { actSal = $("a-act").value; pinta(); });

    function dibujo() {
      const sv = $("a-svg"), L = capas.length, Wd = 1000, H = 300;
      while (sv.firstChild) sv.removeChild(sv.firstChild);
      sv.setAttribute("viewBox", "0 0 " + Wd + " " + H);
      const xs = capas.map((_, l) => (L === 1 ? Wd / 2 : 70 + l * (Wd - 140) / (L - 1)));
      const MAXV = 7, R = 10;
      const vis = capas.map((n) => (n <= MAXV ? n : 6));
      const pos = capas.map((n, l) => {
        const v = vis[l], esp = 27, out = [];
        const y0 = 150 - esp * (v - 1) / 2 - (n > MAXV ? esp / 2 : 0);
        for (let j = 0; j < v; j++) { const salto = n > MAXV && j >= 3 ? esp : 0; out.push(y0 + j * esp + salto); }
        return out;
      });
      const gA = S("g", { opacity: 0.55 }, sv);
      for (let l = 0; l < L - 1; l++) pos[l].forEach((ya) => pos[l + 1].forEach((yb) => S("line", { x1: xs[l], y1: ya, x2: xs[l + 1], y2: yb, stroke: "#c9d1d9", "stroke-width": 1 }, gA)));
      capas.forEach((n, l) => {
        pos[l].forEach((y) => S("circle", { cx: xs[l], cy: y, r: R, fill: l === 0 ? "#fff" : l === L - 1 ? "var(--acento-l)" : "#fff", stroke: l === L - 1 ? RN.acento() : C.ink2, "stroke-width": 2 }, sv));
        if (n > MAXV) txt(sv, xs[l], 150 + 6, "⋮", { "font-size": 20, "font-weight": 800, "text-anchor": "middle", fill: C.ink2, halo: false });
        txt(sv, xs[l], 24, l === 0 ? "Entrada" : l === L - 1 ? "Salida" : (L > 9 ? "O" + l : "Oculta " + l), { "font-size": 13, "font-weight": 700, "text-anchor": "middle", fill: C.ink2 });
        txt(sv, xs[l], 262, RN.fmtN(n), { "font-size": 16, "font-weight": 800, "text-anchor": "middle" });
        txt(sv, xs[l], 282, l === 0 ? "" : l === L - 1 ? ACT[actSal] : "ReLU", { "font-size": 13, "text-anchor": "middle", fill: C.ink2 });
      });
      sv.setAttribute("aria-label", "Red " + capas.join(" → "));
    }
    function pinta() {
      dibujo();
      let w = 0, b = 0;
      const tramos = [];
      for (let l = 1; l < capas.length; l++) { const pw = capas[l - 1] * capas[l]; w += pw; b += capas[l]; tramos.push({ l: l, pw: pw, pb: capas[l] }); }
      const tot = w + b;
      $("a-pesos").textContent = RN.fmtN(w); $("a-sesgos").textContent = RN.fmtN(b); $("a-total").textContent = RN.fmtN(tot);
      // tabla de pesos y sesgos por capa
      let h = "<thead><tr><th>Concepto</th><th>Cálculo</th><th class='n'>Parámetros</th></tr></thead><tbody>";
      tramos.forEach((t) => {
        h += "<tr><td>Conexiones " + nombre(t.l - 1) + " → " + nombre(t.l) + "</td><td class='num'>" + RN.fmtN(capas[t.l - 1]) + " × " + RN.fmtN(capas[t.l]) + "</td><td class='n'>" + RN.fmtN(t.pw) + "</td></tr>";
        h += "<tr><td>Sesgos " + nombre(t.l) + "</td><td class='num'>" + RN.fmtN(capas[t.l]) + "</td><td class='n'>" + RN.fmtN(t.pb) + "</td></tr>";
      });
      h += "<tr class='total'><td>TOTAL</td><td></td><td class='n'>" + RN.fmtN(tot) + "</td></tr></tbody>";
      $("a-tabla").innerHTML = h;
      $("a-nota").textContent = nota;
      // barra apilada
      const sv = $("a-barra");
      while (sv.firstChild) sv.removeChild(sv.firstChild);
      const X0 = 10, X1 = 990, y = 34, hB = 30;
      let x = X0;
      tramos.forEach((t, n) => {
        const ww = (X1 - X0) * (t.pw + t.pb) / tot, wp = (X1 - X0) * t.pw / tot;
        const g = S("g", null, sv);
        S("title", { text: "Conexiones " + nombre(t.l - 1) + " → " + nombre(t.l) + ": " + RN.fmtN(t.pw) + " pesos + " + RN.fmtN(t.pb) + " sesgos" }, g);
        S("rect", { x: x, y: y, width: Math.max(0.5, wp), height: hB, fill: C.s1 }, g);
        S("rect", { x: x + wp, y: y, width: Math.max(0, ww - wp), height: hB, fill: C.s4 }, g);
        if (ww > 1.5) S("line", { x1: x + ww, y1: y - 2, x2: x + ww, y2: y + hB + 2, stroke: "#fff", "stroke-width": 2 }, g);
        if (ww > 120) txt(sv, x + ww / 2, y - 8, nombre(t.l - 1) + " → " + nombre(t.l) + ": " + RN.fmt(100 * (t.pw + t.pb) / tot, 1) + " %", { "font-size": 13, "font-weight": 700, "text-anchor": "middle" });
        x += ww;
      });
      txt(sv, X0, y + hB + 20, "0", { "font-size": 12, fill: C.ink2, halo: false });
      txt(sv, X1, y + hB + 20, RN.fmtN(tot) + " parámetros", { "font-size": 13, "font-weight": 700, "text-anchor": "end", halo: false });
      S("rect", { x: X0 + 300, y: y + hB + 9, width: 14, height: 10, fill: C.s1 }, sv);
      txt(sv, X0 + 320, y + hB + 18, "pesos", { "font-size": 12.5, fill: C.ink2, halo: false });
      S("rect", { x: X0 + 380, y: y + hB + 9, width: 14, height: 10, fill: C.s4 }, sv);
      txt(sv, X0 + 400, y + hB + 18, "sesgos", { "font-size": 12.5, fill: C.ink2, halo: false });
    }
    editor();
    pinta();
  })();

  // ==================================================================================
  // 9 · LABORATORIO DE FRONTERAS (tipo TensorFlow Playground)
  // ==================================================================================
  (function () {
    const TIPOS = [["gauss", "Gauss"], ["xor", "XOR"], ["circulos", "Círculos"], ["lunas", "Lunas"], ["espirales", "Espirales"]];
    const st = { tipo: "circulos", ruido: 0.15, n: 400, frac: 0.5, sd: 1, capas: [4, 2], act: "tanh", lr: 0.03, opt: "adam", ep: 0, hist: [], verTe: false, hover: null, semRed: 5 };
    const DOM = 1.25, G = 50, g = 16;
    let net, D, mapasN = null, salidaG = null;
    const cvR = $("l-red"), cvS = $("l-sal"), cab = $("l-cab");
    const curva = RN.grafica($("l-curva"), { alto: 210, x: { min: 0, max: 100, titulo: "época" }, y: { min: 0, max: 0.8, titulo: "pérdida" }, margen: { l: 50, r: 26, t: 10, b: 42 } });

    // ---------- datos
    function datos() {
      const d = RNmlp.datos.clasif(st.tipo, st.n, st.ruido, st.sd * 101 + 7);
      const r = RN.rng(st.sd * 31 + 5), idx = d.X.map((_, k) => k);
      for (let k = idx.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); const t = idx[k]; idx[k] = idx[j]; idx[j] = t; }
      const nt = Math.max(4, Math.min(st.n - 4, Math.round(st.n * st.frac)));
      const tr = idx.slice(0, nt), te = idx.slice(nt);
      D = { Xtr: tr.map((k) => d.X[k]), Ytr: tr.map((k) => d.Y[k]), Xte: te.map((k) => d.X[k]), Yte: te.map((k) => d.Y[k]) };
    }
    function nuevaRed() {
      net = new RNmlp.MLP({ capas: [2].concat(st.capas, [1]), activacion: st.act, salida: "sigmoid", semilla: st.semRed });
      st.ep = 0; st.hist = [];
      evalua();
    }
    function evalua() {
      const a = net.evaluar(D.Xtr, D.Ytr).perdida, b = net.evaluar(D.Xte, D.Yte).perdida;
      st.hist.push([st.ep, a, b]);
    }
    function epocasPorFotograma() { return Math.max(1, Math.round(12 / Math.ceil(D.Xtr.length / 10))); }
    function entrena(n) {
      for (let k = 0; k < n; k++) { net.entrenarEpoca(D.Xtr, D.Ytr, { lote: 10, lr: st.lr, opt: st.opt }); st.ep++; evalua(); }
    }

    // ---------- mapas de activación de todas las neuronas (rejilla g×g) y de la salida (G×G)
    function calculaMapas() {
      const L = net.capas.length;
      mapasN = net.capas.map((n) => Array.from({ length: n }, () => new Float32Array(g * g)));
      for (let a = 0; a < g; a++) for (let b = 0; b < g; b++) {
        const x = [-DOM + 2 * DOM * (b + 0.5) / g, DOM - 2 * DOM * (a + 0.5) / g];
        const T = net.traza(x);
        for (let l = 0; l < L; l++) for (let j = 0; j < net.capas[l]; j++) mapasN[l][j][a * g + b] = T.a[l][j];
      }
      salidaG = new Float32Array(G * G);
      for (let a = 0; a < G; a++) for (let b = 0; b < G; b++) salidaG[a * G + b] = net.forward([-DOM + 2 * DOM * (b + 0.5) / G, DOM - 2 * DOM * (a + 0.5) / G])[0];
    }
    const offN = document.createElement("canvas"); offN.width = g; offN.height = g;
    const offS = document.createElement("canvas"); offS.width = G; offS.height = G;
    const centro = (l) => (l === net.capas.length - 1 || (st.act === "sigmoid" && l > 0) ? 0.5 : 0);
    function aImagen(off, n, vals, c0, escala, fuerza) {
      const ctx = off.getContext("2d"), id = ctx.createImageData(n, n);
      for (let q = 0; q < n * n; q++) {
        const p = 0.5 + 0.5 * RN.limita((vals[q] - c0) / escala, -1, 1);
        const col = tinteRGB(p, fuerza);
        id.data[4 * q] = col[0]; id.data[4 * q + 1] = col[1]; id.data[4 * q + 2] = col[2]; id.data[4 * q + 3] = 255;
      }
      ctx.putImageData(id, 0, 0);
      return off;
    }
    function escalaDe(vals, c0) { let m = 1e-6; for (let q = 0; q < vals.length; q++) m = Math.max(m, Math.abs(vals[q] - c0)); return m; }

    // ---------- dibujo de la red
    let geo = null;
    function pintaRed() {
      const L = net.capas.length;
      const R = RN.lienzo(cvR, (w) => Math.round(RN.limita(w * 0.78, 340, 430)));
      const c = R.ctx, W = R.w, H = R.h;
      c.clearRect(0, 0, W, H);
      const padX = 44, maxN = Math.max(2, ...net.capas);
      const espV = Math.min(58, (H - 16) / maxN), s = Math.round(Math.min(40, espV * 0.8));
      const xs = net.capas.map((_, l) => padX + l * (W - 2 * padX) / (L - 1));
      const ys = net.capas.map((n) => Array.from({ length: n }, (_, j) => H / 2 + (j - (n - 1) / 2) * espV));
      geo = { xs: xs, ys: ys, s: s };
      // aristas
      for (let l = 0; l < L - 1; l++) for (let j = 0; j < net.capas[l + 1]; j++) for (let i = 0; i < net.capas[l]; i++) {
        const w = net.W[l][j][i], x0 = xs[l] + s / 2, y0 = ys[l][i], x1 = xs[l + 1] - s / 2, y1 = ys[l + 1][j], xm = (x0 + x1) / 2;
        c.strokeStyle = RN.colorPeso(w, 2); c.lineWidth = 0.5 + 3.5 * Math.min(1, Math.abs(w) / 2);
        c.beginPath(); c.moveTo(x0, y0); c.bezierCurveTo(xm, y0, xm, y1, x1, y1); c.stroke();
      }
      // neuronas: miniatura de lo que calcula cada una
      c.imageSmoothingEnabled = true;
      for (let l = 0; l < L; l++) for (let j = 0; j < net.capas[l]; j++) {
        const v = mapasN[l][j], c0 = centro(l);
        aImagen(offN, g, v, c0, l === L - 1 ? 0.5 : escalaDe(v, c0), 0.85);
        const x = xs[l] - s / 2, y = ys[l][j] - s / 2;
        c.drawImage(offN, x, y, s, s);
        const hv = st.hover && st.hover.l === l && st.hover.j === j;
        c.lineWidth = hv ? 3 : 1; c.strokeStyle = hv ? RN.acento() : C.ink2;
        c.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
      }
      c.font = "700 14px system-ui, sans-serif"; c.fillStyle = C.ink2; c.textBaseline = "middle"; c.textAlign = "right";
      ys[0].forEach((y, j) => c.fillText("x" + sub(j + 1), xs[0] - s / 2 - 6, y));
      c.textAlign = "left"; c.fillText("ŷ", xs[L - 1] + s / 2 + 6, ys[L - 1][0]);
      // cabeceras alineadas con las columnas
      Array.from(cab.children).forEach((d, l) => { d.style.left = xs[l] + "px"; });
    }
    function cabeceras() {
      const L = st.capas.length + 2;
      let h = "<div><div class='nom'>Entrada</div><div class='mini'>2 rasgos</div></div>";
      st.capas.forEach((n, k) => {
        h += "<div><div class='nom'>Oculta " + (k + 1) + "</div><div class='pm'><button type='button' data-k='" + k + "' data-d='-1' aria-label='Quitar una neurona de la capa oculta " + (k + 1) + "'" + (n <= 1 ? " disabled" : "") + ">−</button><span>" + n + "</span><button type='button' data-k='" + k + "' data-d='1' aria-label='Añadir una neurona a la capa oculta " + (k + 1) + "'" + (n >= 16 ? " disabled" : "") + ">+</button></div></div>";
      });
      h += "<div><div class='nom'>Salida</div><div class='mini'>sigmoide</div></div>";
      cab.innerHTML = h;
      void L;
      $("l-ncapas").textContent = st.capas.length === 1 ? "1 capa oculta" : st.capas.length + " capas ocultas" + (st.capas.length === 0 ? " (perceptrón)" : "");
      $("l-menos-capa").disabled = st.capas.length === 0;
      $("l-mas-capa").disabled = st.capas.length >= 3;
    }
    cab.addEventListener("click", (ev) => {
      const b = ev.target.closest("button"); if (!b || b.dataset.k === undefined) return;
      const k = +b.dataset.k;
      st.capas[k] = RN.limita(st.capas[k] + (+b.dataset.d), 1, 16);
      cambioArq();
    });
    $("l-mas-capa").addEventListener("click", () => { if (st.capas.length < 3) { st.capas.push(st.capas.length ? st.capas[st.capas.length - 1] : 4); cambioArq(); } });
    $("l-menos-capa").addEventListener("click", () => { if (st.capas.length) { st.capas.pop(); cambioArq(); } });

    // ---------- salida: frontera de decisión, curva de nivel 0,5 y puntos
    function contorno(c, vals, n, nivel, W, H) {
      const cw = W / n, ch = H / n, P = (a, b) => [(b + 0.5) * cw, (a + 0.5) * ch];
      c.beginPath();
      for (let a = 0; a < n - 1; a++) for (let b = 0; b < n - 1; b++) {
        const v = [vals[a * n + b], vals[a * n + b + 1], vals[(a + 1) * n + b + 1], vals[(a + 1) * n + b]];
        const esq = [P(a, b), P(a, b + 1), P(a + 1, b + 1), P(a + 1, b)];
        const cr = [];
        for (let e = 0; e < 4; e++) {
          const v0 = v[e], v1 = v[(e + 1) % 4];
          if ((v0 - nivel) * (v1 - nivel) < 0) { const t = (nivel - v0) / (v1 - v0), p0 = esq[e], p1 = esq[(e + 1) % 4]; cr.push([p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t]); }
        }
        if (cr.length >= 2) { c.moveTo(cr[0][0], cr[0][1]); c.lineTo(cr[1][0], cr[1][1]); }
        if (cr.length === 4) { c.moveTo(cr[2][0], cr[2][1]); c.lineTo(cr[3][0], cr[3][1]); }
      }
      c.stroke();
    }
    function pintaSalida() {
      const R = RN.lienzo(cvS, (w) => w), c = R.ctx, W = R.w, H = R.h;
      const hv = st.hover;
      let vals = salidaG, n = G, c0 = 0.5, esc = 0.5, titulo = null;
      if (hv && !(hv.l === net.capas.length - 1)) {
        // mapa de la neurona señalada, a más resolución
        vals = new Float32Array(G * G); n = G;
        for (let a = 0; a < G; a++) for (let b = 0; b < G; b++) vals[a * G + b] = net.traza([-DOM + 2 * DOM * (b + 0.5) / G, DOM - 2 * DOM * (a + 0.5) / G]).a[hv.l][hv.j];
        c0 = centro(hv.l); esc = escalaDe(vals, c0);
        titulo = hv.l === 0 ? "Entrada x" + sub(hv.j + 1) : "Capa oculta " + hv.l + " · neurona " + (hv.j + 1);
      }
      c.imageSmoothingEnabled = true;
      c.drawImage(aImagen(offS, n, vals, c0, esc, 0.42), 0, 0, W, H);
      c.strokeStyle = "rgba(31,41,51,.13)"; c.lineWidth = 1;
      c.beginPath(); c.moveTo(W / 2 + 0.5, 0); c.lineTo(W / 2 + 0.5, H); c.moveTo(0, H / 2 + 0.5); c.lineTo(W, H / 2 + 0.5); c.stroke();
      if (!titulo) { c.strokeStyle = "rgba(31,41,51,.75)"; c.lineWidth = 1.6; contorno(c, vals, n, 0.5, W, H); }
      const X = (u) => (u + DOM) / (2 * DOM) * W, Y = (v) => (DOM - v) / (2 * DOM) * H;
      const punto = (x, y, borde) => { c.beginPath(); c.arc(X(x[0]), Y(x[1]), 4.4, 0, 2 * Math.PI); c.fillStyle = y[0] ? C.clase1 : C.clase0; c.fill(); c.lineWidth = borde === "#fff" ? 1.5 : 1.8; c.strokeStyle = borde; c.stroke(); };
      D.Xtr.forEach((x, k) => punto(x, D.Ytr[k], "#fff"));
      if (st.verTe) D.Xte.forEach((x, k) => punto(x, D.Yte[k], C.ink));
      if (titulo) ctxTxt(c, titulo, 10, 16, C.ink, "700 13px system-ui, sans-serif");
    }
    function pintaCurva() {
      const h = st.hist, ult = h[h.length - 1];
      const xm = [100, 200, 500, 1000, 2000, 5000, 10000].find((v) => v >= st.ep) || st.ep;
      let ym = 0;
      h.forEach((p) => { ym = Math.max(ym, p[1], p[2]); });
      curva.op.x.max = xm;
      curva.op.y.max = [0.8, 1, 1.5, 2, 3, 5, 8, 12].find((v) => v >= ym * 1.05) || 12;
      const paso = Math.max(1, Math.ceil(h.length / 700));
      const tr = [], te = [];
      for (let k = 0; k < h.length; k += paso) { tr.push([h[k][0], h[k][1]]); te.push([h[k][0], h[k][2]]); }
      if ((h.length - 1) % paso) { tr.push([ult[0], ult[1]]); te.push([ult[0], ult[2]]); }
      curva.dibujar([{ nombre: "entrenamiento", color: C.s1, puntos: tr }, { nombre: "prueba", color: C.s2, puntos: te }]);
      $("l-ep").textContent = RN.fmtN(st.ep);
      $("l-ptr").textContent = ns(ult[1], 3);
      $("l-pte").textContent = ns(ult[2], 3);
    }
    function pintaTodo() { calculaMapas(); pintaRed(); pintaSalida(); pintaCurva(); }

    // ---------- interacción con la red (pasar el ratón por una neurona)
    cvR.addEventListener("mousemove", (ev) => {
      if (!geo) return;
      const r = cvR.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top;
      let enc = null;
      geo.xs.forEach((x, l) => geo.ys[l].forEach((y, j) => { if (Math.abs(mx - x) <= geo.s / 2 + 2 && Math.abs(my - y) <= geo.s / 2 + 2) enc = { l: l, j: j }; }));
      const antes = st.hover;
      st.hover = enc;
      if (enc) {
        const L = net.capas.length;
        const nom = enc.l === 0 ? "Entrada x" + sub(enc.j + 1) : enc.l === L - 1 ? "Neurona de salida (sigmoide)" : "Capa oculta " + enc.l + " · neurona " + (enc.j + 1);
        RN.tip.mostrar("<b>" + nom + "</b>" + (enc.l > 0 ? "<br>sesgo b = " + ns(net.b[enc.l - 1][enc.j], 2) : ""), ev.clientX, ev.clientY);
      } else RN.tip.ocultar();
      if ((antes && !enc) || (!antes && enc) || (antes && enc && (antes.l !== enc.l || antes.j !== enc.j))) { pintaRed(); pintaSalida(); }
    });
    cvR.addEventListener("mouseleave", () => { st.hover = null; RN.tip.ocultar(); pintaRed(); pintaSalida(); });

    // ---------- bucle de entrenamiento
    const anim = RN.anima(function () {
      entrena(epocasPorFotograma());
      pintaTodo();
      if (st.ep >= 10000) return false;
    }, cvS);
    RN.botonPlay($("l-play"), anim, ["▶", "⏸"]);
    $("l-play").addEventListener("click", () => $("l-play").setAttribute("aria-label", anim.activo ? "Pausar" : "Entrenar"));
    $("l-paso").addEventListener("click", () => { anim.parar(); entrena(1); pintaTodo(); });
    $("l-reset").addEventListener("click", () => { anim.parar(); st.semRed++; nuevaRed(); pintaTodo(); });

    // ---------- controles de datos y de la red
    const ds = $("l-ds");
    TIPOS.forEach((t) => {
      const b = RN.el("button", { type: "button", "data-v": t[0], "aria-pressed": t[0] === st.tipo ? "true" : "false", title: t[1] }, ds);
      const cvm = RN.el("canvas", { width: 120, height: 120, "aria-label": "Miniatura de los datos " + t[1] }, b);
      RN.el("span", null, b, t[1]);
      const ctx = cvm.getContext("2d"), d = RNmlp.datos.clasif(t[0], 160, 0.06, 3);
      ctx.fillStyle = C.surface; ctx.fillRect(0, 0, 120, 120);
      d.X.forEach((x, k) => { ctx.beginPath(); ctx.arc((x[0] + DOM) / (2 * DOM) * 120, (DOM - x[1]) / (2 * DOM) * 120, 3.2, 0, 7); ctx.fillStyle = d.y[k] ? C.clase1 : C.clase0; ctx.fill(); });
    });
    const setDs = seg("l-ds", (v) => { st.tipo = v; cambioDatos(); });
    const sR = rango("l-ruido", (v) => ns(v, 2), (v) => { st.ruido = v; cambioDatos(); });
    const sN = rango("l-n", (v) => String(v), (v) => { st.n = v; cambioDatos(); });
    const sF = rango("l-frac", (v) => RN.fmt(v * 100, 0) + " %", (v) => { st.frac = v; cambioDatos(); });
    $("l-regen").addEventListener("click", () => { st.sd++; cambioDatos(); });
    $("l-act").addEventListener("change", () => { st.act = $("l-act").value; cambioArq(); });
    $("l-lr").addEventListener("change", () => { st.lr = +$("l-lr").value; });
    $("l-opt").addEventListener("change", () => { st.opt = $("l-opt").value; });
    $("l-verte").addEventListener("change", () => { st.verTe = $("l-verte").checked; pintaSalida(); });
    function cambioDatos() { datos(); nuevaRed(); pintaTodo(); }
    function cambioArq() { cabeceras(); nuevaRed(); pintaTodo(); }

    // ---------- escenarios de «problemas comunes»
    const ESC = {
      sub: { cfg: { tipo: "circulos", ruido: 0.15, n: 400, frac: 0.5, capas: [], act: "tanh", lr: 0.03, opt: "adam" },
        t: "Arquitectura muy simple: subajuste (infraajuste, <i>underfitting</i>)",
        s: ["Error alto incluso en entrenamiento", "Error de prueba ≈ error de entrenamiento: ambos altos", "La red no aprende"],
        c: ["Capacidad insuficiente", "Sin capas ocultas solo puede trazar una recta"],
        r: ["Aumentar capas ocultas", "Aumentar neuronas por capa", "Usar una activación más no lineal"] },
      sobre: { cfg: { tipo: "circulos", ruido: 0.15, n: 60, frac: 0.5, capas: [16, 16, 16], act: "relu", lr: 0.03, opt: "adam", sd: 12 },
        t: "Arquitectura muy compleja con pocos datos: sobreajuste (<i>overfitting</i>)",
        s: ["Error bajo en entrenamiento", "Error alto (y creciente) en prueba", "La red memoriza en vez de aprender: islas alrededor de puntos sueltos"],
        c: ["Demasiada capacidad: 3 capas de 16 neuronas", "Solo 30 puntos de entrenamiento, con ruido"],
        r: ["Reducir capas ocultas", "Reducir neuronas por capa", "Añadir datos de entrenamiento", "Regularización (Tema 8)"] },
      bien: { cfg: { tipo: "circulos", ruido: 0.15, n: 400, frac: 0.5, capas: [4], act: "tanh", lr: 0.03, opt: "adam" },
        t: "Buen ajuste",
        s: ["Pérdidas de entrenamiento y prueba bajas", "Y parecidas entre sí", "Frontera suave que sigue la forma de los datos, no cada punto"],
        c: ["Capacidad adecuada: 1 capa oculta de 4 neuronas", "Datos suficientes (200 para entrenar)"],
        r: ["Empezar con 1 capa oculta", "Subir o bajar capacidad según el diagnóstico", "Volver al paso 3 del flujo de trabajo"] }
    };
    function diag(e) {
      const lista = (a) => "<ul>" + a.map((x) => "<li>" + x + "</li>").join("") + "</ul>";
      $("l-diag").innerHTML = "<h3 style='margin:0 0 .5rem'>" + e.t + "</h3><div class='box'><div><h4>Síntomas</h4>" + lista(e.s) + "</div><div><h4>Causa</h4>" + lista(e.c) + "</div><div><h4>Solución</h4>" + lista(e.r) + "</div></div>";
    }
    document.querySelectorAll("#p-lab [data-esc]").forEach((b) => b.addEventListener("click", () => {
      const e = ESC[b.dataset.esc], cf = e.cfg;
      anim.parar();
      Object.assign(st, { tipo: cf.tipo, ruido: cf.ruido, n: cf.n, frac: cf.frac, capas: cf.capas.slice(), act: cf.act, lr: cf.lr, opt: cf.opt, sd: cf.sd || 1, semRed: 5, verTe: true });
      $("l-verte").checked = true;
      setDs(st.tipo, true);
      sR.value = st.ruido;
      $("l-ruido-o").textContent = ns(st.ruido, 2);
      sN.value = st.n; $("l-n-o").textContent = String(st.n);
      sF.value = st.frac; $("l-frac-o").textContent = RN.fmt(st.frac * 100, 0) + " %";
      $("l-act").value = st.act; $("l-lr").value = String(st.lr); $("l-opt").value = st.opt;
      cabeceras(); datos(); nuevaRed(); pintaTodo(); diag(e);
      anim.iniciar();
    }));

    datos(); cabeceras(); nuevaRed();
    RN.alCambiarTam(cvR, () => { calculaMapas(); pintaRed(); });
    RN.alCambiarTam(cvS, () => { pintaSalida(); });
    pintaCurva();
  })();

  // ==================================================================================
  // 10 · FLUJO DE TRABAJO
  // ==================================================================================
  (function () {
    const sv = $("w-svg");
    flechaDefs(sv, "w-fl", C.ink2);
    flechaDefs(sv, "w-fl2", RN.acento());
    const PASOS = [
      { t: ["Entender", "el problema"], h: "1 · Entender el problema", b: ["¿Cuántas características?", "¿Qué hay que predecir?", "¿Clasificación o regresión?", "¿Cuántas clases?"] },
      { t: ["Preparar", "los datos"], h: "2 · Preparar los datos", b: ["Recopilar y limpiar", "<b>Normalizar y escalar</b>: no es opcional; si se olvida, todos los resultados serán malos", "Dividir en entrenamiento y prueba"] },
      { t: ["Diseñar la", "arquitectura"], h: "3 · Diseñar la arquitectura", b: ["Entrada: tantas neuronas como características", "Ocultas: empezar con 1 capa", "Salida: según el tipo de problema", "Activaciones ReLU en las ocultas"] },
      { t: ["Implementar", "en Keras"], h: "4 · Implementar en Keras", b: ["Modelo <code>Sequential</code>", "Añadir capas <code>Dense</code>", "Compilar con optimizador y pérdida"] },
      { t: ["Entrenar", "model.fit()"], h: "5 · Entrenar", b: ["<code>model.fit()</code> ajusta los pesos", "Vigilar la pérdida"] },
      { t: ["Evaluar", "y ajustar"], h: "6 · Evaluar y ajustar", b: ["¿Error alto? → cambiar la arquitectura", "¿Sobreajuste? → reducir la complejidad", "¿Subajuste? → aumentar la complejidad", "Volver al paso 3 si es necesario"] },
      { t: ["Usar el", "modelo final"], h: "7 · Usar el modelo final", b: ["Predicciones con datos nuevos", "Monitorizar en producción (Tema 10)"] }
    ];
    const DIAG = {
      alto: { t: "Error alto → cambiar la arquitectura", c: (a) => a.length > 3 ? [a[0], 24, 1] : [a[0], 16, 8, 1] },
      sobre: { t: "Sobreajuste → reducir la complejidad", c: (a) => [a[0], 8, 1] },
      sub: { t: "Subajuste → aumentar la complejidad", c: (a) => [a[0], 32, 16, 1] },
      bien: { t: "Todo bien → usar el modelo", c: (a) => a }
    };
    const GUION = ["sub", "sobre", "bien"];
    const BW = 122, GAP = 34, X0 = (1100 - (7 * BW + 6 * GAP)) / 2, YB = 150, BH = 108;
    const bx = (k) => X0 + k * (BW + GAP);
    const ICON = [
      "M-9,-6 a9,9 0 1 1 9,9 v5 M0,13 v1",
      "M-12,10 v-8 M-4,10 v-20 M4,10 v-4 M12,10 v-14",
      "M-11,-9 L1,-5 M-11,-9 L1,5 M-11,0 L1,-5 M-11,0 L1,5 M-11,9 L1,-5 M-11,9 L1,5 M1,-5 L12,0 M1,5 L12,0 M-13.5,-9 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0 M-13.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0 M-13.5,9 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0 M-1.5,-5 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0 M-1.5,5 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0 M9.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0",
      "M-6,-9 L-14,0 L-6,9 M6,-9 L14,0 L6,9 M3,-11 L-3,11",
      "M-14,-10 C-6,6 2,8 14,9",
      "M-11,-3 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0 M8.5,3.5 L14,9",
      "M-8,-11 L12,0 L-8,11 Z"
    ];
    const gA = S("g", null, sv), gB = S("g", null, sv), gT = S("g", null, sv);
    // flechas entre pasos
    const fl = [];
    for (let k = 0; k < 6; k++) fl.push(S("path", { d: "M" + (bx(k) + BW + 3) + "," + (YB + BH / 2) + " L" + (bx(k + 1) - 4) + "," + (YB + BH / 2), stroke: C.ink2, "stroke-width": 2, fill: "none", "marker-end": "url(#w-fl)" }, gA));
    // vuelta del 6 al 3
    const cx3 = bx(2) + BW / 2, cx6 = bx(5) + BW / 2;
    const vuelta = S("path", { d: "M" + cx6 + "," + (YB - 4) + " C" + cx6 + "," + 34 + " " + cx3 + "," + 34 + " " + cx3 + "," + (YB - 6), stroke: C.ink2, "stroke-width": 2, fill: "none", "stroke-dasharray": "7 5", "marker-end": "url(#w-fl)" }, gA);
    const etqV = txt(gA, (cx3 + cx6) / 2, 50, "↺ volver al paso 3 si es necesario", { "font-size": 15, "font-weight": 700, "text-anchor": "middle", fill: C.ink2 });
    const iter = txt(gA, X0, 26, "", { "font-size": 15, "font-weight": 800, fill: C.ink, halo: false });
    const cajas = PASOS.map((p, k) => {
      const g = S("g", { class: "paso", role: "button", tabindex: 0, "aria-label": "Paso " + (k + 1) + ": " + p.t.join(" ") }, gB);
      const r = S("rect", { x: bx(k), y: YB, width: BW, height: BH, rx: 12, fill: "#fff", stroke: "#CFD8DC", "stroke-width": 1.8 }, g);
      const bc = S("circle", { cx: bx(k) + 16, cy: YB + 16, r: 11, fill: "#CFD8DC" }, g);
      S("text", { x: bx(k) + 16, y: YB + 20.5, "text-anchor": "middle", "font-size": 13, "font-weight": 800, fill: "#fff", text: String(k + 1) }, g);
      const ic = S("path", { d: ICON[k], transform: "translate(" + (bx(k) + BW / 2) + "," + (YB + 34) + ")", fill: "none", stroke: C.ink2, "stroke-width": 2.2, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
      const tx = p.t.map((s, i) => S("text", { x: bx(k) + BW / 2, y: YB + 72 + i * 19, "text-anchor": "middle", "font-size": 15, "font-weight": i ? 600 : 800, fill: C.ink, text: s }, g));
      g.addEventListener("click", () => { pararJ(); ir(k, false); });
      g.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); pararJ(); ir(k, false); } });
      return { r: r, bc: bc, ic: ic, tx: tx };
    });
    // diagnóstico junto al paso 6
    const chip = S("g", { opacity: 0 }, gT);
    const chipR = S("rect", { x: cx6 - 150, y: YB + BH + 18, width: 300, height: 36, rx: 18, fill: "#fff", stroke: RN.acento(), "stroke-width": 2 }, chip);
    const chipT = S("text", { x: cx6, y: YB + BH + 41, "text-anchor": "middle", "font-size": 14.5, "font-weight": 700, fill: C.ink, text: "" }, chip);
    const ficha = S("circle", { r: 8, fill: RN.acento(), opacity: 0 }, gT);
    void chipR;

    // ---------- estado
    let paso = 0, it = 1, arq = [4, 4, 1], elegido = null, visit = new Set([0]), tok = 0;
    const diagDe = () => elegido || GUION[Math.min(it - 1, GUION.length - 1)];
    const setDiag = seg("w-diag", (v) => { elegido = v; if (paso === 5) { chipT.textContent = DIAG[v].t; detalle(); } });
    function pinta() {
      cajas.forEach((c, k) => {
        const on = k === paso, hecho = visit.has(k);
        c.r.setAttribute("fill", on ? "var(--acento-l)" : "#fff");
        c.r.setAttribute("stroke", on ? RN.acento() : hecho ? RN.mezcla("#ffffff", RN.acento(), 0.45) : "#CFD8DC");
        c.r.setAttribute("stroke-width", on ? 3 : 1.8);
        c.bc.setAttribute("fill", on || hecho ? RN.acento() : "#CFD8DC");
        c.ic.setAttribute("stroke", on ? RN.acento() : C.ink2);
      });
      iter.textContent = "Iteración " + it + " · arquitectura " + arq.join(" → ");
      const enSeis = paso === 5;
      chip.setAttribute("opacity", enSeis ? 1 : 0);
      if (enSeis) chipT.textContent = DIAG[diagDe()].t;
      setDiag(enSeis ? diagDe() : "", true);
      const vOn = enSeis && diagDe() !== "bien";
      vuelta.setAttribute("stroke", vOn ? RN.acento() : C.ink2);
      vuelta.setAttribute("marker-end", vOn ? "url(#w-fl2)" : "url(#w-fl)");
      etqV.setAttribute("fill", vOn ? C.ink : C.ink2);
      detalle();
    }
    function mueveFicha(path, desde, hasta) {
      if (RN.reducirMovimiento) return Promise.resolve();
      const mio = tok, L = path.getTotalLength();
      ficha.setAttribute("opacity", 1);
      return RN.tween(Math.max(450, L * 2.2), (e) => { if (mio !== tok) return; const p = path.getPointAtLength(L * (desde + (hasta - desde) * e)); ficha.setAttribute("cx", p.x); ficha.setAttribute("cy", p.y); }).then(() => { ficha.setAttribute("opacity", 0); });
    }
    function ir(k, nuevaIter) {
      paso = k; visit.add(k);
      if (nuevaIter) { it++; }
      pinta();
    }
    async function siguiente() {
      const mio = ++tok;
      if (paso < 5) { await mueveFicha(fl[paso], 0, 1); if (mio !== tok) return; ir(paso + 1, false); return; }
      if (paso === 5) {
        const d = diagDe();
        if (d === "bien") { await mueveFicha(fl[5], 0, 1); if (mio !== tok) return; ir(6, false); return; }
        await mueveFicha(vuelta, 0, 1); if (mio !== tok) return;
        arq = DIAG[d].c(arq); elegido = null;
        visit = new Set([0, 1, 2]);
        ir(2, true); return;
      }
      // paso 7: empezar de nuevo
      paso = 0; it = 1; arq = [4, 4, 1]; elegido = null; visit = new Set([0]); pinta();
    }
    let jugando = false;
    const bP = $("w-play");
    function pararJ() { jugando = false; tok++; ficha.setAttribute("opacity", 0); bP.textContent = "▶ Reproducir"; bP.setAttribute("aria-pressed", "false"); }
    bP.addEventListener("click", async () => {
      if (jugando) { pararJ(); return; }
      jugando = true; bP.textContent = "⏸ Pausa"; bP.setAttribute("aria-pressed", "true");
      if (paso === 6 || (paso === 0 && it === 1)) { paso = 0; it = 1; arq = [4, 4, 1]; elegido = null; visit = new Set([0]); pinta(); await RN.espera(700); }
      while (jugando && paso < 6) {
        await siguiente();
        if (!jugando) return;
        await RN.espera(paso === 5 ? 1900 : 1100);
      }
      if (jugando) pararJ();
    });
    $("w-paso").addEventListener("click", () => { pararJ(); siguiente(); });

    // ---------- panel de detalle
    const personas = [[23, 21000], [31, 46000], [38, 82000], [45, 64000], [52, 128000], [29, 35000], [61, 171000], [47, 105000], [35, 58000], [70, 196000], [56, 148000], [26, 27000]];
    const media = (i) => personas.reduce((s, p) => s + p[i], 0) / personas.length;
    const dt = (i) => { const m = media(i); return Math.sqrt(personas.reduce((s, p) => s + (p[i] - m) ** 2, 0) / personas.length); };
    let estand = false, tNorm = 0;
    function pintaNorm() {
      const s2 = $("w-norm"); if (!s2) return;
      while (s2.firstChild) s2.removeChild(s2.firstChild);
      const X0n = 120, X1n = 500, filas = [["Edad (años)", 0, 66], ["Ingresos (€)", 1, 126]];
      const crudo = (v) => X0n + (v / 200000) * (X1n - X0n), est = (z) => X0n + (z + 2.2) / 4.4 * (X1n - X0n);
      filas.forEach((f) => {
        const m = media(f[1]), d = dt(f[1]);
        txt(s2, 8, f[2] + 5, f[0], { "font-size": 13, "font-weight": 700, fill: C.ink2, halo: false });
        S("line", { x1: X0n, y1: f[2], x2: X1n, y2: f[2], stroke: C.axis, "stroke-width": 1.2 }, s2);
        personas.forEach((p) => {
          const x = lerp(crudo(p[f[1]]), est((p[f[1]] - m) / d), tNorm);
          S("circle", { cx: x, cy: f[2], r: 5, fill: f[1] ? C.s1 : C.s3, stroke: "#fff", "stroke-width": 1.5, opacity: 0.9 }, s2);
        });
      });
      const ticks = tNorm < 0.5 ? [[0, "0"], [100000, "100.000"], [200000, "200.000"]].map((t) => [crudo(t[0]), t[1]]) : [[-2, "−2"], [-1, "−1"], [0, "0"], [1, "1"], [2, "2"]].map((t) => [est(t[0]), t[1]]);
      ticks.forEach((t) => txt(s2, t[0], 160, t[1], { "font-size": 12, "text-anchor": "middle", fill: C.muted, halo: false }));
      txt(s2, 310, 22, tNorm < 0.5 ? "Sin normalizar: la edad queda aplastada junto al 0" : "Estandarizado: z = (x − μ) / σ, media 0 y desviación 1", { "font-size": 13, "font-weight": 700, "text-anchor": "middle", fill: C.ink });
    }
    function detalle() {
      const p = PASOS[paso];
      $("w-texto").innerHTML = "<h3>" + p.h + "</h3><ul>" + p.b.map((x) => "<li>" + x + "</li>").join("") + "</ul>" + (paso >= 2 && paso <= 5 ? "<p class='mini'>Los pasos 3 a 6 son iterativos: puede haber muchas vueltas.</p>" : "");
      const e = $("w-extra");
      if (paso === 0) e.innerHTML = "<p class='tit-col'>Ejemplo: precio de una vivienda</p><table class='tabla'><tbody><tr><td>Características</td><td>4: m², habitaciones, antigüedad, distancia al centro</td></tr><tr><td>Qué predecir</td><td>El precio en euros</td></tr><tr><td>Tipo</td><td>Regresión (valor continuo)</td></tr><tr><td>Salida</td><td>1 neurona lineal</td></tr></tbody></table>";
      else if (paso === 1) {
        e.innerHTML = "<div class='fila' style='justify-content:space-between'><p class='tit-col' style='margin:0'>Edad (20-80) frente a ingresos (20.000-200.000)</p><button type='button' class='btn gris' id='w-est'>" + (estand ? "Ver sin normalizar" : "Estandarizar") + "</button></div><svg id='w-norm' viewBox='0 0 520 170' aria-label='Edad e ingresos antes y después de estandarizar'></svg>" +
          "<pre class='code'><span class='kw'>from</span> sklearn.preprocessing <span class='kw'>import</span> StandardScaler\nscaler = <span class='fn'>StandardScaler</span>()\nX_train = scaler.<span class='fn'>fit_transform</span>(X_train)\nX_test = scaler.<span class='fn'>transform</span>(X_test)</pre>";
        $("w-est").addEventListener("click", () => {
          estand = !estand; $("w-est").textContent = estand ? "Ver sin normalizar" : "Estandarizar";
          const t0 = tNorm, t1 = estand ? 1 : 0;
          RN.tween(900, (q) => { tNorm = t0 + (t1 - t0) * q; pintaNorm(); });
        });
        pintaNorm();
      } else if (paso === 2) {
        e.innerHTML = "<p class='tit-col'>Arquitectura de la iteración " + it + "</p><svg id='w-red' class='vacio-svg' aria-label='Red de la iteración actual'></svg><p class='mini'>" + arq.join(" → ") + " · ocultas ReLU, salida lineal</p>";
        const r = RN.red($("w-red"), { capas: arq.map((n) => Math.min(n, 8)), ancho: 520, alto: 190, radio: 9, margen: 40 });
        void r;
      } else if (paso === 3) {
        const cap = arq.slice(1, -1).map((n, i) => "    <span class='fn'>Dense</span>(<span class='num'>" + n + "</span>, activation=<span class='str'>'relu'</span>" + (i === 0 ? ", input_shape=(<span class='num'>" + arq[0] + "</span>,)" : "") + "),").join("\n");
        e.innerHTML = "<p class='tit-col'>Iteración " + it + "</p><pre class='code'><span class='kw'>from</span> tensorflow.keras.models <span class='kw'>import</span> Sequential\n<span class='kw'>from</span> tensorflow.keras.layers <span class='kw'>import</span> Dense\n\nmodel = <span class='fn'>Sequential</span>([\n" + cap + "\n    <span class='fn'>Dense</span>(<span class='num'>1</span>, activation=<span class='str'>'linear'</span>)\n])\nmodel.<span class='fn'>compile</span>(optimizer=<span class='str'>'adam'</span>, loss=<span class='str'>'mse'</span>)</pre>";
      } else if (paso === 4 || paso === 5) {
        const d = paso === 5 ? diagDe() : null;
        e.innerHTML = "<p class='tit-col'>" + (paso === 4 ? "model.fit(): la pérdida baja época a época" : "Curvas de aprendizaje: " + DIAG[d].t.split(" →")[0].toLowerCase()) + " <span class='tag illus' style='margin-left:.3rem'>orientativas</span></p><svg id='w-curvas' class='vacio-svg' viewBox='0 0 520 190' aria-label='Curvas de pérdida orientativas'></svg><div class='leyenda'><span><i style='background:var(--s1)'></i>entrenamiento</span><span><i style='background:var(--s2)'></i>prueba</span></div>";
        curvas($("w-curvas"), paso === 4 ? "fit" : d);
      } else e.innerHTML = "<p class='tit-col'>Modelo listo</p><p>Arquitectura final: <b>" + arq.join(" → ") + "</b>, tras " + it + (it === 1 ? " iteración" : " iteraciones") + " del bucle 3 → 6.</p><p class='mini'>Puesta en producción, servidores de modelos y monitorización: Tema 10.</p>";
    }
    function curvas(s2, tipo) {
      const X0c = 46, X1c = 505, Y0c = 160, Y1c = 14;
      S("line", { x1: X0c, y1: Y0c, x2: X1c, y2: Y0c, stroke: C.axis }, s2);
      S("line", { x1: X0c, y1: Y0c, x2: X0c, y2: Y1c, stroke: C.axis }, s2);
      txt(s2, (X0c + X1c) / 2, 184, "época", { "font-size": 12.5, "text-anchor": "middle", fill: C.ink2, halo: false });
      txt(s2, 14, (Y0c + Y1c) / 2, "pérdida", { "font-size": 12.5, "text-anchor": "middle", fill: C.ink2, halo: false, transform: "rotate(-90 14 " + (Y0c + Y1c) / 2 + ")" });
      const F = {
        fit: [(t) => 0.12 + 0.8 * Math.exp(-4 * t), null],
        sub: [(t) => 0.62 + 0.3 * Math.exp(-5 * t), (t) => 0.66 + 0.3 * Math.exp(-5 * t)],
        alto: [(t) => 0.5 + 0.4 * Math.exp(-3 * t), (t) => 0.56 + 0.38 * Math.exp(-3 * t)],
        sobre: [(t) => 0.05 + 0.85 * Math.exp(-5 * t), (t) => 0.3 + 0.62 * Math.exp(-7 * t) + 0.42 * t * t],
        bien: [(t) => 0.14 + 0.78 * Math.exp(-5 * t), (t) => 0.19 + 0.75 * Math.exp(-5 * t)]
      }[tipo];
      F.forEach((f, n) => {
        if (!f) return;
        let d = "";
        for (let k = 0; k <= 60; k++) { const t = k / 60, x = X0c + t * (X1c - X0c), y = Y0c - f(t) * (Y0c - Y1c); d += (k ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1); }
        S("path", { d: d, fill: "none", stroke: n ? C.s2 : C.s1, "stroke-width": 2.5, "stroke-linecap": "round" }, s2);
      });
    }
    pinta();
  })();
})();
