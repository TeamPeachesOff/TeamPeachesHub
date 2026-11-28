/* Timbre (Team Peaches Hub) — sin interfaz, probado con tests/timbre.test.js.
 * Entrada: audio PCM SIN comprimir de una vocal /a/ cómoda (Float32Array), su frecuencia de muestreo y la nota (MIDI).
 * Salida: formantes F1–F3 (LPC), formante del cantante (SFcf, solo voces masculinas) y pendiente espectral (Alpha ratio).
 * Reglas de la especificación (sección 11): preénfasis 0,95, orden LPC 12, remuestreo a 10 kHz (graves) u 11 kHz (agudas),
 * descartar polos < 90 Hz, > fs/2−200 Hz o con ancho de banda > 400 Hz, y anular el LPC si F0 ≥ ~400 Hz.
 * Los umbrales de calidad son criterio de ingeniería (nivel P). NO hay valores de referencia por tipo de voz:
 * hasta calibrar con datos propios el timbre se muestra y se guarda, pero no decide la clasificación (w_timbre = 0). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VozTimbre = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const PARAMS = { orden: 12, preenfasis: 0.95, f0Max: 400, ventanaMs: 60, saltoMs: 20, segundos: 1.5, bwMax: 400, polo_min: 90,
    minTramos: 5, sfcfBanda: [2200, 3100], sfcfProm: 3, claridad: 0.99, rmsMin: 0.004 };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  /* Remuestreo con filtro paso bajo (sinc ventaneada de Hann) para que no se cuelen frecuencias sobre fsOut/2 */
  function remuestrear(x, sr, fsOut) {
    if (Math.abs(sr - fsOut) < 1) return Float32Array.from(x);
    const ratio = sr / fsOut, fc = 0.45 * Math.min(1, 1 / ratio), half = 16;   // fc normalizado a sr; 16 lóbulos por lado
    const n = Math.floor(x.length / ratio), y = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const c = i * ratio, a = Math.max(0, Math.ceil(c - half * Math.max(1, ratio))), b = Math.min(x.length - 1, Math.floor(c + half * Math.max(1, ratio)));
      let s = 0, w = 0;
      for (let k = a; k <= b; k++) {
        const t = (k - c), u = t * fc * 2, sinc = Math.abs(u) < 1e-9 ? 1 : Math.sin(Math.PI * u) / (Math.PI * u);
        const win = 0.5 * (1 + Math.cos(Math.PI * t / (half * Math.max(1, ratio) + 1)));
        const h = sinc * win; s += x[k] * h; w += h;
      }
      y[i] = w ? s / w : 0;
    }
    return y;
  }

  /* Tramo más estable de ~1,5 s: sonoro (energía alta) y con la energía más pareja */
  function tramoEstable(x, sr, seg) {
    const win = Math.round(0.05 * sr), nF = Math.floor(x.length / win); if (nF < 4) return null;
    const db = []; let mx = -1e9;
    for (let f = 0; f < nF; f++) { let s = 0; for (let i = f * win; i < (f + 1) * win; i++) s += x[i] * x[i]; const d = 10 * Math.log10(s / win + 1e-12); db.push(d); if (d > mx) mx = d; }
    const L = Math.max(4, Math.min(nF, Math.round(seg / 0.05)));
    let best = null;
    for (let a = 0; a + L <= nF; a++) {
      let mean = 0, ok = true; for (let k = a; k < a + L; k++) { mean += db[k]; if (db[k] < mx - 12) ok = false; } mean /= L;
      if (!ok) continue;
      let v = 0; for (let k = a; k < a + L; k++) v += (db[k] - mean) * (db[k] - mean); v /= L;
      if (!best || v < best.v) best = { a, v };
    }
    if (!best) return null;
    return { x: x.subarray(best.a * win, (best.a + L) * win), desv: Math.sqrt(best.v), seg: L * 0.05 };
  }

  /* LPC por autocorrelación + Levinson-Durbin */
  function lpc(fr, p) {
    const n = fr.length, r = new Float64Array(p + 1);
    for (let k = 0; k <= p; k++) { let s = 0; for (let i = 0; i + k < n; i++) s += fr[i] * fr[i + k]; r[k] = s; }
    if (r[0] < 1e-12) return null; r[0] *= 1.0001;   // pequeño suelo para estabilidad numérica
    const a = new Float64Array(p + 1); a[0] = 1; let e = r[0];
    for (let i = 1; i <= p; i++) {
      let acc = r[i]; for (let j = 1; j < i; j++) acc += a[j] * r[i - j];
      const k = -acc / e, tmp = a.slice();
      for (let j = 1; j < i; j++) a[j] = tmp[j] + k * tmp[i - j];
      a[i] = k; e *= (1 - k * k); if (e <= 0) return null;
    }
    return a;
  }

  /* Raíces del polinomio por Durand-Kerner (grado 12: sobrado en velocidad) */
  function raices(a) {
    const p = a.length - 1, re = [], im = [];
    for (let i = 0; i < p; i++) { const ang = 2 * Math.PI * i / p + 0.4; re.push(0.9 * Math.cos(ang)); im.push(0.9 * Math.sin(ang)); }
    for (let it = 0; it < 200; it++) {
      let mov = 0;
      for (let i = 0; i < p; i++) {
        let nr = 1, ni = 0;   // P(z) = z^p + a1 z^(p-1) + ... + ap
        for (let j = 1; j <= p; j++) { const t = nr * re[i] - ni * im[i] + a[j], u = nr * im[i] + ni * re[i]; nr = t; ni = u; }
        let dr = 1, di = 0;
        for (let j = 0; j < p; j++) if (j !== i) { const xr = re[i] - re[j], xi = im[i] - im[j], t = dr * xr - di * xi, u = dr * xi + di * xr; dr = t; di = u; }
        const den = dr * dr + di * di || 1e-30, qr = (nr * dr + ni * di) / den, qi = (ni * dr - nr * di) / den;
        re[i] -= qr; im[i] -= qi; mov = Math.max(mov, Math.abs(qr) + Math.abs(qi));
      }
      if (mov < 1e-10) break;
    }
    return re.map((r, i) => [r, im[i]]);
  }

  /* Formantes de un cuadro: polos con parte imaginaria positiva, filtrados por frecuencia y ancho de banda */
  function formantesCuadro(fr, fs) {
    const w = fr.length, h = new Float64Array(w);
    for (let i = 0; i < w; i++) h[i] = fr[i] * (0.54 - 0.46 * Math.cos(2 * Math.PI * i / (w - 1)));
    const a = lpc(h, PARAMS.orden); if (!a) return [];
    const out = [];
    for (const [r, im] of raices(a)) {
      if (im <= 0) continue;
      const mod = Math.hypot(r, im); if (mod >= 1) continue;
      const f = Math.atan2(im, r) * fs / (2 * Math.PI), bw = -Math.log(mod) * fs / Math.PI;
      if (f < PARAMS.polo_min || f > fs / 2 - 200 || bw > PARAMS.bwMax) continue;
      out.push(f);
    }
    return out.sort((p, q) => p - q);
  }

  const mediana = v => { const s = v.slice().sort((a, b) => a - b), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; };

  /* Espectro promedio de largo plazo (LTAS) por Welch con ventana de Hann; devuelve potencia por bin */
  function ltas(x, sr, N) {
    const hop = N >> 1, P = new Float64Array(N / 2 + 1); let nF = 0;
    const re = new Float64Array(N), im = new Float64Array(N), win = new Float64Array(N);
    for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
    for (let s = 0; s + N <= x.length; s += hop) {
      for (let i = 0; i < N; i++) { re[i] = x[s + i] * win[i]; im[i] = 0; }
      fft(re, im);
      for (let k = 0; k <= N / 2; k++) P[k] += re[k] * re[k] + im[k] * im[k];
      nF++;
    }
    if (!nF) return null;
    for (let k = 0; k <= N / 2; k++) P[k] /= nF;
    return { P, df: sr / N };
  }
  function fft(re, im) {   // radix-2 en sitio
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const a = i + k, b = a + len / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
          re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
          const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
  }
  const bandaE = (L, f1, f2) => { let s = 0; for (let k = Math.ceil(f1 / L.df); k <= Math.floor(f2 / L.df) && k < L.P.length; k++) s += L.P[k]; return s; };

  /* Pendiente espectral: 10·log10(E[1000–5000] / E[50–1000]). Más alto = más brillante */
  function alphaRatio(L) { const hi = bandaE(L, 1000, 5000), lo = bandaE(L, 50, 1000); return hi > 0 && lo > 0 ? 10 * Math.log10(hi / lo) : null; }

  /* SFcf: frecuencia del máximo del LTAS suavizado dentro de 2200–3100 Hz, si sobresale ≥ 3 dB sobre su entorno */
  function sfcf(L, f0) {
    const anchoBins = Math.max(3, Math.round(Math.max(250, 2 * f0) / L.df)), N = L.P.length;
    const db = new Float64Array(N); for (let k = 0; k < N; k++) db[k] = 10 * Math.log10(L.P[k] + 1e-20);
    const sm = new Float64Array(N);
    for (let k = 0; k < N; k++) { let s = 0, c = 0; for (let j = Math.max(0, k - (anchoBins >> 1)); j <= Math.min(N - 1, k + (anchoBins >> 1)); j++) { s += db[j]; c++; } sm[k] = s / c; }
    const [a, b] = PARAMS.sfcfBanda; let best = -1;
    for (let k = Math.ceil(a / L.df); k <= Math.floor(b / L.df) && k < N; k++) if (best < 0 || sm[k] > sm[best]) best = k;
    if (best < 0) return null;
    const ref = []; for (let k = Math.ceil(1500 / L.df); k <= Math.floor(2000 / L.df); k++) ref.push(sm[k]);
    for (let k = Math.ceil(3400 / L.df); k <= Math.floor(4000 / L.df) && k < N; k++) ref.push(sm[k]);
    const prom = sm[best] - mediana(ref);
    return { hz: best * L.df, prom };
  }

  /* Análisis completo. opts: { genero: 'M'|'F'|null }. Siempre devuelve un objeto; valido=false si no se puede medir con calidad. */
  function analizar(x, sr, midi, opts) {
    opts = opts || {};
    const f0 = hz(midi), res = { valido: false, motivos: [], f0, fiab: { formantes: 0, sfcf: 0, alpha: 0 }, f1: null, f2: null, f3: null, sfcf: null, alpha: null, segundos: 0, tramos: 0 };
    if (!x || !x.length || !(sr >= 16000)) { res.motivos.push('sin-audio-sin-comprimir'); return res; }
    let pico = 0; for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > pico) pico = v; }
    if (pico >= PARAMS.claridad) { res.motivos.push('saturado'); return res; }
    const tr = tramoEstable(x, sr, PARAMS.segundos);
    if (!tr) { res.motivos.push('sin-tramo-estable'); return res; }
    let rms = 0; for (let i = 0; i < tr.x.length; i++) rms += tr.x[i] * tr.x[i]; rms = Math.sqrt(rms / tr.x.length);
    if (rms < PARAMS.rmsMin) { res.motivos.push('muy-bajo'); return res; }
    if (tr.seg < 1) { res.motivos.push('tramo-corto'); return res; }
    res.segundos = tr.seg;
    // Pendiente espectral y SFcf (a la frecuencia de muestreo original: hay que llegar a 5 kHz)
    if (sr >= 11000) {
      const L = ltas(tr.x, sr, 4096);
      if (L) {
        const al = alphaRatio(L); if (al != null) { res.alpha = al; res.fiab.alpha = 1; }
        if (opts.genero === 'M') {
          const s = sfcf(L, f0);
          if (s && s.prom >= PARAMS.sfcfProm) { res.sfcf = s.hz; res.sfcfProm = s.prom; res.fiab.sfcf = 1; } else res.motivos.push('sfcf-no-claro');
        } else res.motivos.push(opts.genero === 'F' ? 'sfcf-solo-masculino' : 'sfcf-sin-genero');
      }
    }
    // Formantes por LPC: solo si F0 < ~400 Hz
    if (f0 >= PARAMS.f0Max) res.motivos.push('f0-alta-para-lpc');
    else {
      const fs = f0 < 200 ? 10000 : 11000, y = remuestrear(tr.x, sr, fs);
      for (let i = y.length - 1; i > 0; i--) y[i] -= PARAMS.preenfasis * y[i - 1];
      const w = Math.round(PARAMS.ventanaMs / 1000 * fs), st = Math.round(PARAMS.saltoMs / 1000 * fs), F = [[], [], []];
      for (let s = 0; s + w <= y.length; s += st) {
        const fm = formantesCuadro(y.subarray(s, s + w), fs);
        if (fm.length >= 2) { F[0].push(fm[0]); F[1].push(fm[1]); if (fm.length >= 3) F[2].push(fm[2]); }   // F3 solo cuando el cuadro la muestra
      }
      res.tramos = F[0].length;
      if (F[0].length >= PARAMS.minTramos) {
        res.f1 = mediana(F[0]); res.f2 = mediana(F[1]); res.f3 = F[2].length >= PARAMS.minTramos ? mediana(F[2]) : null;
        if (res.f1 < 200 || res.f1 > 1100 || res.f2 < res.f1 + 150) { res.f1 = res.f2 = res.f3 = null; res.motivos.push('formantes-incoherentes'); }
        else { res.fiab.formantes = Math.min(1, F[0].length / 20); if (res.f3 == null) res.motivos.push('f3-no-fiable'); }
      } else res.motivos.push('pocos-tramos-lpc');
    }
    res.valido = res.fiab.formantes > 0 || res.fiab.sfcf > 0 || res.fiab.alpha > 0;
    return res;
  }

  return { PARAMS, analizar, remuestrear, tramoEstable, formantesCuadro, ltas, alphaRatio, sfcf };
});
