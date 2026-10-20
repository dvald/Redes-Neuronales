/* Redes Neuronales · Demos visuales — perceptrón multicapa en JavaScript puro.
   Calcula de verdad en el navegador (no es una animación): propagación hacia delante, retropropagación,
   SGD, momento, RMSprop y Adam, L1/L2 y dropout. Comprobado con gradientes numéricos y entrenamientos
   de prueba (herramientas/probar_mlp.js, fuera de la carpeta publicada).
   Global en el navegador: window.RNmlp  ·  En Node: module.exports
     new RNmlp.MLP({ capas:[2,8,1], activacion:'relu'|'tanh'|'sigmoid'|'leaky'|'lineal',
                     salida:'sigmoid'|'softmax'|'lineal', perdida:'bce'|'cce'|'mse', semilla:1, init:'he'|'xavier' })
       .forward(x)                      → vector de salida
       .traza(x)                        → { z:[...], a:[...] } por capa (a[0] = x)
       .entrenarLote(X, Y, op)          → pérdida media del lote (op: lr, opt, l2, l1, dropout, momento, beta1, beta2, rho)
       .entrenarEpoca(X, Y, op)         → pérdida media de la época (op.lote = tamaño de lote, barajado con la semilla)
       .evaluar(X, Y)                   → { perdida, precision }
       .numParametros(), .clonar(), .W, .b   (W[l][j][i]: de la neurona i de la capa l a la j de la capa l+1)
     RNmlp.datos.clasif(tipo, n, ruido, semilla)   tipo: 'gauss'|'xor'|'circulos'|'lunas'|'espirales'|'lineal'
       → { X:[[x1,x2]], Y:[[0|1]], y:[0|1] }  (coordenadas en [-1, 1])
     RNmlp.datos.regresion(tipo, n, ruido, semilla) tipo: 'lineal'|'seno'|'cubica' → { X:[[x]], Y:[[y]] }
     RNmlp.ACT, RNmlp.softmax, RNmlp.rng */
(function (root) {
  "use strict";

  function rng(semilla) {
    let s = (semilla >>> 0) || 1;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function normal(r) {
    let u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  const ACT = {
    relu: { f: function (z) { return z > 0 ? z : 0; }, d: function (z) { return z > 0 ? 1 : 0; } },
    leaky: { f: function (z) { return z > 0 ? z : 0.01 * z; }, d: function (z) { return z > 0 ? 1 : 0.01; } },
    tanh: { f: Math.tanh, d: function (z, a) { return 1 - a * a; } },
    sigmoid: { f: function (z) { return 1 / (1 + Math.exp(-z)); }, d: function (z, a) { return a * (1 - a); } },
    lineal: { f: function (z) { return z; }, d: function () { return 1; } },
    escalon: { f: function (z) { return z >= 0 ? 1 : 0; }, d: function () { return 0; } }
  };

  function softmax(z) {
    const m = Math.max.apply(null, z);
    const e = z.map(function (v) { return Math.exp(v - m); });
    const s = e.reduce(function (a, b) { return a + b; }, 0);
    return e.map(function (v) { return v / s; });
  }

  const EPS = 1e-12;

  function MLP(op) {
    this.capas = op.capas.slice();
    this.activacion = op.activacion || "relu";
    this.salida = op.salida || "sigmoid";
    this.perdida = op.perdida || (this.salida === "softmax" ? "cce" : this.salida === "sigmoid" ? "bce" : "mse");
    this.semilla = op.semilla || 1;
    this.r = rng(this.semilla);
    const xav = op.init ? op.init === "xavier" : (this.activacion === "tanh" || this.activacion === "sigmoid");
    this.W = []; this.b = [];
    for (let l = 0; l < this.capas.length - 1; l++) {
      const nIn = this.capas[l], nOut = this.capas[l + 1];
      const esc = xav ? Math.sqrt(1 / nIn) : Math.sqrt(2 / nIn);
      const Wl = [];
      for (let j = 0; j < nOut; j++) {
        const f = [];
        for (let i = 0; i < nIn; i++) f.push(normal(this.r) * esc * (op.escalaInit || 1));
        Wl.push(f);
      }
      this.W.push(Wl);
      this.b.push(new Array(nOut).fill(0));
    }
    this.estado = null;
    this.paso = 0;
  }

  MLP.prototype.actDe = function (l) { // l = índice de la capa de pesos (0..L-1)
    return l === this.W.length - 1 ? this.salida : this.activacion;
  };

  MLP.prototype.traza = function (x, dropout, r) {
    const z = [null], a = [x.slice()], mascaras = [null], pre = [x.slice()];
    let act = x;
    for (let l = 0; l < this.W.length; l++) {
      const Wl = this.W[l], bl = this.b[l];
      const zl = new Array(Wl.length);
      for (let j = 0; j < Wl.length; j++) {
        let s = bl[j];
        const f = Wl[j];
        for (let i = 0; i < f.length; i++) s += f[i] * act[i];
        zl[j] = s;
      }
      const nombre = this.actDe(l);
      let al = nombre === "softmax" ? softmax(zl) : zl.map(ACT[nombre].f);
      pre.push(al.slice());
      let masc = null;
      if (dropout && l < this.W.length - 1) {
        const keep = 1 - dropout;
        masc = al.map(function () { return r() < keep ? 1 / keep : 0; });
        al = al.map(function (v, k) { return v * masc[k]; });
      }
      z.push(zl); a.push(al); mascaras.push(masc);
      act = al;
    }
    return { z: z, a: a, pre: pre, mascaras: mascaras };
  };

  MLP.prototype.forward = function (x) {
    const t = this.traza(x);
    return t.a[t.a.length - 1];
  };

  MLP.prototype.perdidaDe = function (o, y) {
    let s = 0;
    if (this.perdida === "mse") { for (let k = 0; k < o.length; k++) s += (o[k] - y[k]) * (o[k] - y[k]); return s / o.length; }
    if (this.perdida === "bce") { for (let k = 0; k < o.length; k++) s += -(y[k] * Math.log(o[k] + EPS) + (1 - y[k]) * Math.log(1 - o[k] + EPS)); return s / o.length; }
    if (this.perdida === "cce") { for (let k = 0; k < o.length; k++) s += -y[k] * Math.log(o[k] + EPS); return s; }
    if (this.perdida === "mae") { for (let k = 0; k < o.length; k++) s += Math.abs(o[k] - y[k]); return s / o.length; }
    throw new Error("pérdida desconocida: " + this.perdida);
  };

  // Gradientes de un ejemplo; los acumula en gW, gb. Devuelve la pérdida del ejemplo.
  MLP.prototype.retro = function (x, y, gW, gb, dropout, r) {
    const T = this.traza(x, dropout, r);
    const L = this.W.length;
    const o = T.a[L];
    const n = o.length;
    const sal = this.salida, per = this.perdida;
    let delta = new Array(n);
    if ((sal === "sigmoid" && per === "bce") || (sal === "softmax" && per === "cce")) {
      const div = per === "bce" ? n : 1;
      for (let k = 0; k < n; k++) delta[k] = (o[k] - y[k]) / div;
    } else if (sal === "softmax") {
      // pérdida genérica con softmax: dL/dz = J^T dL/da
      const dA = this.dPerdida(o, y);
      let sdot = 0;
      for (let k = 0; k < n; k++) sdot += dA[k] * o[k];
      for (let k = 0; k < n; k++) delta[k] = o[k] * (dA[k] - sdot);
    } else {
      const dA = this.dPerdida(o, y);
      const F = ACT[sal];
      for (let k = 0; k < n; k++) delta[k] = dA[k] * F.d(T.z[L][k], o[k]);
    }
    for (let l = L - 1; l >= 0; l--) {
      const aPrev = T.a[l];
      const Wl = this.W[l];
      for (let j = 0; j < Wl.length; j++) {
        const dj = delta[j];
        gb[l][j] += dj;
        const gf = gW[l][j];
        for (let i = 0; i < aPrev.length; i++) gf[i] += dj * aPrev[i];
      }
      if (l > 0) {
        const nPrev = aPrev.length;
        const nd = new Array(nPrev).fill(0);
        for (let j = 0; j < Wl.length; j++) { const f = Wl[j], dj = delta[j]; for (let i = 0; i < nPrev; i++) nd[i] += f[i] * dj; }
        const F = ACT[this.actDe(l - 1)];
        const masc = T.mascaras[l];
        for (let i = 0; i < nPrev; i++) {
          nd[i] *= F.d(T.z[l][i], T.pre[l][i]);
          if (masc) nd[i] *= masc[i];
        }
        delta = nd;
      }
    }
    return this.perdidaDe(o, y);
  };

  MLP.prototype.dPerdida = function (o, y) {
    const n = o.length;
    if (this.perdida === "mse") return o.map(function (v, k) { return 2 * (v - y[k]) / n; });
    if (this.perdida === "mae") return o.map(function (v, k) { return (v > y[k] ? 1 : v < y[k] ? -1 : 0) / n; });
    if (this.perdida === "bce") return o.map(function (v, k) { return (-(y[k] / (v + EPS)) + (1 - y[k]) / (1 - v + EPS)) / n; });
    if (this.perdida === "cce") return o.map(function (v, k) { return -y[k] / (v + EPS); });
    throw new Error("pérdida desconocida");
  };

  MLP.prototype.ceros = function () {
    return {
      W: this.W.map(function (Wl) { return Wl.map(function (f) { return new Array(f.length).fill(0); }); }),
      b: this.b.map(function (bl) { return new Array(bl.length).fill(0); })
    };
  };

  // Gradiente medio de un lote (sin aplicar). Útil para mostrar ∂L/∂w.
  MLP.prototype.gradiente = function (X, Y, op) {
    op = op || {};
    const g = this.ceros();
    let perd = 0;
    for (let k = 0; k < X.length; k++) perd += this.retro(X[k], Y[k], g.W, g.b, op.dropout || 0, this.r);
    const m = X.length;
    const l2 = op.l2 || 0, l1 = op.l1 || 0;
    for (let l = 0; l < this.W.length; l++) {
      for (let j = 0; j < this.W[l].length; j++) {
        for (let i = 0; i < this.W[l][j].length; i++) {
          const w = this.W[l][j][i];
          g.W[l][j][i] = g.W[l][j][i] / m + 2 * l2 * w + l1 * Math.sign(w);
        }
        g.b[l][j] /= m;
      }
    }
    g.perdida = perd / m;
    return g;
  };

  MLP.prototype.entrenarLote = function (X, Y, op) {
    op = op || {};
    const lr = op.lr === undefined ? 0.05 : op.lr;
    const opt = op.opt || "sgd";
    const g = this.gradiente(X, Y, op);
    if (!this.estado || this.estado.opt !== opt) this.estado = { opt: opt, m: this.ceros(), v: this.ceros() };
    const S = this.estado;
    this.paso++;
    const t = this.paso;
    const b1 = op.beta1 || 0.9, b2 = op.beta2 || 0.999, mom = op.momento === undefined ? 0.9 : op.momento, rho = op.rho || 0.9;
    const self = this;
    function act(P, G, M, V) {
      for (let k = 0; k < P.length; k++) {
        const gr = G[k];
        if (opt === "sgd") P[k] -= lr * gr;
        else if (opt === "momento") { M[k] = mom * M[k] - lr * gr; P[k] += M[k]; }
        else if (opt === "rmsprop") { V[k] = rho * V[k] + (1 - rho) * gr * gr; P[k] -= lr * gr / (Math.sqrt(V[k]) + 1e-7); }
        else if (opt === "adam") {
          M[k] = b1 * M[k] + (1 - b1) * gr;
          V[k] = b2 * V[k] + (1 - b2) * gr * gr;
          const mh = M[k] / (1 - Math.pow(b1, t)), vh = V[k] / (1 - Math.pow(b2, t));
          P[k] -= lr * mh / (Math.sqrt(vh) + 1e-7);
        } else throw new Error("optimizador desconocido: " + opt);
      }
    }
    for (let l = 0; l < self.W.length; l++) {
      for (let j = 0; j < self.W[l].length; j++) act(self.W[l][j], g.W[l][j], S.m.W[l][j], S.v.W[l][j]);
      act(self.b[l], g.b[l], S.m.b[l], S.v.b[l]);
    }
    return g.perdida;
  };

  MLP.prototype.entrenarEpoca = function (X, Y, op) {
    op = op || {};
    const n = X.length, lote = Math.max(1, Math.min(n, op.lote || 32));
    const idx = [];
    for (let k = 0; k < n; k++) idx.push(k);
    if (op.barajar !== false) for (let k = n - 1; k > 0; k--) { const j = Math.floor(this.r() * (k + 1)); const tmp = idx[k]; idx[k] = idx[j]; idx[j] = tmp; }
    let suma = 0, cuenta = 0;
    for (let s = 0; s < n; s += lote) {
      const Xb = [], Yb = [];
      for (let k = s; k < Math.min(n, s + lote); k++) { Xb.push(X[idx[k]]); Yb.push(Y[idx[k]]); }
      suma += this.entrenarLote(Xb, Yb, op) * Xb.length;
      cuenta += Xb.length;
    }
    return suma / cuenta;
  };

  MLP.prototype.evaluar = function (X, Y) {
    let perd = 0, ok = 0;
    for (let k = 0; k < X.length; k++) {
      const o = this.forward(X[k]);
      perd += this.perdidaDe(o, Y[k]);
      if (o.length === 1) { if ((o[0] >= 0.5 ? 1 : 0) === (Y[k][0] >= 0.5 ? 1 : 0)) ok++; }
      else { if (argmax(o) === argmax(Y[k])) ok++; }
    }
    return { perdida: perd / X.length, precision: ok / X.length };
  };

  MLP.prototype.numParametros = function () {
    let s = 0;
    for (let l = 0; l < this.capas.length - 1; l++) s += this.capas[l] * this.capas[l + 1] + this.capas[l + 1];
    return s;
  };

  MLP.prototype.clonar = function () {
    const c = Object.create(MLP.prototype);
    c.capas = this.capas.slice(); c.activacion = this.activacion; c.salida = this.salida; c.perdida = this.perdida;
    c.semilla = this.semilla; c.r = rng(this.semilla + 7);
    c.W = this.W.map(function (Wl) { return Wl.map(function (f) { return f.slice(); }); });
    c.b = this.b.map(function (bl) { return bl.slice(); });
    c.estado = null; c.paso = 0;
    return c;
  };

  function argmax(v) { let k = 0; for (let i = 1; i < v.length; i++) if (v[i] > v[k]) k = i; return k; }

  // ------------------------------------------------------------------ conjuntos de datos sintéticos
  const datos = {
    clasif: function (tipo, n, ruido, semilla) {
      const r = rng(semilla || 1);
      ruido = ruido || 0;
      const X = [], y = [];
      const g = function () { return normal(r) * ruido; };
      for (let k = 0; k < n; k++) {
        const c = k % 2;
        let p;
        if (tipo === "gauss") {
          const cx = c ? 0.45 : -0.45;
          p = [cx + normal(r) * (0.2 + ruido * 0.5), cx * 0.6 + normal(r) * (0.2 + ruido * 0.5)];
        } else if (tipo === "lineal") {
          let a, b;
          do { a = r() * 2 - 1; b = r() * 2 - 1; } while (Math.abs(a * 0.6 - b + 0.1) < 0.08 || ((a * 0.6 - b + 0.1 < 0) ? 1 : 0) !== c);
          p = [a + g(), b + g()];
        } else if (tipo === "xor") {
          let a, b;
          do { a = r() * 2 - 1; b = r() * 2 - 1; } while (Math.abs(a) < 0.08 || Math.abs(b) < 0.08 || ((a * b > 0) ? 1 : 0) !== c);
          p = [a * 0.95 + g(), b * 0.95 + g()];
        } else if (tipo === "circulos") {
          const ang = r() * 2 * Math.PI;
          const rad = c ? r() * 0.38 : 0.62 + r() * 0.33;
          p = [rad * Math.cos(ang) + g(), rad * Math.sin(ang) + g()];
        } else if (tipo === "lunas") {
          const t = r() * Math.PI;
          p = c ? [Math.cos(t) * 0.75 - 0.35, Math.sin(t) * 0.75 - 0.2] : [0.35 - Math.cos(t) * 0.75, -Math.sin(t) * 0.75 + 0.2];
          p = [p[0] + g(), p[1] + g()];
        } else if (tipo === "espirales") {
          const t = Math.sqrt(r()) * 3 * Math.PI;
          const rad = t / (3 * Math.PI) * 0.92;
          const ang = t + (c ? 0 : Math.PI);
          p = [rad * Math.cos(ang) + g() * 0.6, rad * Math.sin(ang) + g() * 0.6];
        } else throw new Error("tipo de datos desconocido: " + tipo);
        X.push([Math.max(-1.2, Math.min(1.2, p[0])), Math.max(-1.2, Math.min(1.2, p[1]))]);
        y.push(c);
      }
      return { X: X, y: y, Y: y.map(function (v) { return [v]; }) };
    },
    regresion: function (tipo, n, ruido, semilla) {
      const r = rng(semilla || 1);
      const X = [], Y = [];
      for (let k = 0; k < n; k++) {
        const x = -1 + 2 * r();
        let f;
        if (tipo === "lineal") f = 0.8 * x + 0.1;
        else if (tipo === "seno") f = Math.sin(Math.PI * x) * 0.8;
        else if (tipo === "cubica") f = x * x * x - 0.5 * x;
        else throw new Error("tipo de regresión desconocido: " + tipo);
        X.push([x]); Y.push([f + normal(r) * (ruido || 0)]);
      }
      return { X: X, Y: Y };
    }
  };

  const API = { MLP: MLP, ACT: ACT, softmax: softmax, rng: rng, normal: normal, argmax: argmax, datos: datos };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.RNmlp = API;
})(typeof window !== "undefined" ? window : this);
