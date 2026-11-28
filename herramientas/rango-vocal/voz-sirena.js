/* Detección del passaggio en sirenas — multi-señal (Team Peaches Hub).
 * Ventanas de ~25–30 ms con paso de 10 ms y SIN suavizado Viterbi fuerte (solo mediana de 3 cuadros). Busca coincidencia temporal
 * (±80 ms) de al menos 2 de 3 marcadores:
 *   1) salto abrupto de F0 (≥ 0.8 st respecto a la tendencia),
 *   2) caída súbita de RMS (≥ 3 dB) mientras la altura sube,
 *   3) inversión espectral: salto positivo de H1−H2 (≥ 3 dB) y caída de los parciales 3–5 (≥ 3 dB respecto a H1).
 * Sirenas 1 y 2 en /a/, sirena 3 en /u/: si el quiebre solo aparece en /a/ y no en /u/, puede ser un cruce armónico–formante (Herbst, 2020).
 * Entrada: x (Float32Array), sr, frames [{t, rms, f0, conf}] (analyzePitch con hop 0.01 y raw:true). Funciones puras, sin DOM. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VozSirena = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const P = {
    winSec: 0.03, minConf: 0.45, minVoicedSec: 0.8, minRiseSt: 4,
    jumpSt: 0.8, rmsDropDb: 3, h1h2Db: 3, partialsDb: 3, tolFrames: 8,   // ±80 ms a 10 ms por cuadro
    minRise: 0.004,                                                      // tendencia previa mínima (st por cuadro): la sirena debe venir subiendo
    agreeSt: 2.5, pesoUnico: 0.35, pesoCruce: 0.7                       // pesos del passaggio (× 30 % en el motor)
  };
  const hzToMidi = f => 69 + 12 * Math.log2(f / 440);
  const avg = a => a.reduce((s, v) => s + v, 0) / a.length;
  const med = a => { const s = [...a].sort((p, q) => p - q), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
  const ok = v => v === v && v !== undefined && v !== null;

  function goertzelPow(x, i0, n, sr, f, win) {
    const w = 2 * Math.PI * f / sr, c = 2 * Math.cos(w); let s1 = 0, s2 = 0;
    for (let i = 0; i < n; i++) { const s0 = x[i0 + i] * win[i] + c * s1 - s2; s2 = s1; s1 = s0; }
    return (s1 * s1 + s2 * s2 - c * s1 * s2) / (n * n);
  }
  // Nivel (dB) de los armónicos 1, 2 y del promedio 3–5 alrededor del tiempo t (±3 % de tolerancia por vibrato/deslizamiento).
  function armonicos(x, sr, t, f0, win) {
    const n = win.length, i0 = Math.round(t * sr) - (n >> 1); if (i0 < 0 || i0 + n > x.length || !(f0 > 0)) return null;
    const lvl = h => {
      const f = f0 * h; if (f > 0.45 * sr) return null; let m = 0;
      for (const d of [-0.04, -0.02, 0, 0.02, 0.04]) m = Math.max(m, goertzelPow(x, i0, n, sr, f * (1 + d), win));
      return m;
    };
    const p = [1, 2, 3, 4, 5].map(lvl); if (p[0] == null || p[1] == null) return null;
    const hi = p.slice(2).filter(v => v != null); if (!hi.length) return null;
    const db = v => 10 * Math.log10(v + 1e-14);
    return { h1: db(p[0]), h2: db(p[1]), p345: db(avg(hi)) };
  }

  function detectar(x, sr, frames, opt) {
    opt = Object.assign({}, opt || {});
    const n = frames.length, hop = n > 1 ? frames[1].t - frames[0].t : 0.01, tol = Math.round(0.08 / hop);
    const m = new Float64Array(n).fill(NaN);
    frames.forEach((f, k) => { if (f.f0 > 0 && f.conf >= P.minConf) m[k] = hzToMidi(f.f0); });
    for (let k = 1; k < n - 1; k++) {   // único suavizado: errores de UN cuadro (mediana de 3, respetando escalones reales)
      if (ok(m[k - 1]) && ok(m[k]) && ok(m[k + 1])) { const md = med([m[k - 1], m[k], m[k + 1]]); if (Math.abs(m[k] - md) > 1.5 && Math.abs(m[k - 1] - m[k + 1]) < 1) m[k] = md; }
    }
    const series = Array.from(m, (v, k) => (ok(v) ? { t: frames[k].t, m: v } : null));
    let voiced = 0; for (let k = 0; k < n; k++) if (ok(m[k])) voiced++;
    if (voiced * hop < P.minVoicedSec) return { ok: false, reason: 'poca-voz', series, flags: [] };
    const vs = Array.from(m).filter(ok).sort((a, b) => a - b);
    if (vs[Math.floor(vs.length * 0.95)] - vs[Math.floor(vs.length * 0.05)] < P.minRiseSt) return { ok: false, reason: 'sin-recorrido', series, flags: [] };

    // Series por cuadro: RMS en dB y armónicos (solo donde hay F0)
    const wn = Math.max(64, Math.round(P.winSec * sr)), win = new Float64Array(wn);
    for (let i = 0; i < wn; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (wn - 1));
    const rdb = new Float64Array(n), h1h2 = new Float64Array(n).fill(NaN), rel = new Float64Array(n).fill(NaN);
    for (let k = 0; k < n; k++) {
      rdb[k] = 20 * Math.log10((frames[k].rms || 0) + 1e-7);
      if (ok(m[k])) { const a = armonicos(x, sr, frames[k].t, Math.pow(2, (m[k] - 69) / 12) * 440, win); if (a) { h1h2[k] = a.h1 - a.h2; rel[k] = a.p345 - a.h1; } }
    }
    // Bloques «antes» y «después» alrededor del cuadro k (los 4 cuadros válidos más cercanos de cada lado, sin saltar más de 0.2 s)
    const maxGap = Math.round(0.2 / hop);
    const take = (arr, k, dir, cnt, lim) => { const o = []; for (let j = k, s = 0; j >= 0 && j < n && s <= lim && o.length < cnt; j += dir, s++) if (ok(arr[j])) o.push(arr[j]); return o; };
    const slope = k => {   // pendiente previa (st por cuadro), mínimos cuadrados sobre hasta 12 cuadros con F0
      const xs = [], ys = []; for (let j = k - 1; j >= 0 && k - j <= 14 && xs.length < 12; j--) if (ok(m[j])) { xs.push(j); ys.push(m[j]); }
      if (xs.length < 6) return null; const mx = avg(xs), my = avg(ys); let sxy = 0, sxx = 0; xs.forEach((v, i) => { sxy += (v - mx) * (ys[i] - my); sxx += (v - mx) * (v - mx); });
      return sxx ? sxy / sxx : 0;
    };
    const s1 = new Float64Array(n), s2 = new Float64Array(n), s3 = new Float64Array(n), info = new Array(n);
    for (let k = 4; k < n - 4; k++) {
      const sl = slope(k); if (sl == null || sl < P.minRise) continue;               // tiene que venir subiendo
      const before = take(m, k - 1, -1, 4, 8), after = take(m, k, 1, 4, maxGap);
      if (before.length < 3 || after.length < 3) continue;
      const gap = Math.max(0, (() => { let j = k; while (j < n && !ok(m[j])) j++; return j - k; })());
      // 1) salto de F0
      const jump = med(after) - med(before) - sl * (gap + 3);
      if (Math.abs(jump) >= P.jumpSt) s1[k] = Math.min(3, Math.abs(jump) / P.jumpSt) * (jump > 0 ? 1 : 0.6);
      // 2) caída de RMS
      const dr = avg(take(rdb, k - 1, -1, 4, 6)) - avg(take(rdb, k, 1, 3, 6));
      if (dr >= P.rmsDropDb) s2[k] = Math.min(3, dr / P.rmsDropDb);
      // 3) inversión espectral: H1−H2 sube y los parciales 3–5 (relativos a H1) bajan
      const hb = take(h1h2, k - 1, -1, 4, 8), ha = take(h1h2, k, 1, 4, maxGap), rb = take(rel, k - 1, -1, 4, 8), ra = take(rel, k, 1, 4, maxGap);
      if (hb.length >= 2 && ha.length >= 2 && rb.length >= 2 && ra.length >= 2) {
        const d12 = avg(ha) - avg(hb), dr3 = avg(ra) - avg(rb);
        if (d12 >= P.h1h2Db && dr3 <= -P.partialsDb) s3[k] = Math.min(3, Math.min(d12 / P.h1h2Db, -dr3 / P.partialsDb));
      }
      info[k] = { jump, dropDb: dr, mid: med(before) };
    }
    // Coincidencia temporal (±80 ms) de al menos 2 de 3 marcadores
    const near = (arr, k) => { let b = 0, bj = -1; for (let j = Math.max(0, k - tol); j <= Math.min(n - 1, k + tol); j++) if (arr[j] > b) { b = arr[j]; bj = j; } return { v: b, j: bj }; };
    const cand = [];
    for (let k = 4; k < n - 4; k++) {
      const a = near(s1, k), b = near(s2, k), c = near(s3, k), hits = [a, b, c].filter(o => o.v > 0).length;
      if (hits >= 2) cand.push({ k, hits, score: a.v + b.v + c.v, a, b, c });
    }
    const events = []; let g = [];
    const flush = () => {
      if (!g.length) return;
      const best = g.slice().sort((p, q) => q.hits - p.hits || q.score - p.score || p.k - q.k)[0];
      const kb = best.a.j >= 0 ? best.a.j : (best.b.j >= 0 ? best.b.j : best.c.j), inf = info[kb] || info[best.k];
      if (inf) events.push({ k: kb, t: frames[kb].t, hits: best.hits, score: best.score, jump: inf.jump, dropDb: inf.dropDb, midi: inf.mid,
        markers: { salto: best.a.v > 0, caidaRms: best.b.v > 0, inversionEspectral: best.c.v > 0 } });
      g = [];
    };
    cand.forEach(c => { if (g.length && c.k - g[g.length - 1].k > tol) flush(); g.push(c); }); flush();
    const dbg = { hop, frames: n, params: P, s1: Array.from(s1), s2: Array.from(s2), s3: Array.from(s3), events };
    if (!events.length) return { ok: false, reason: 'sin-quiebre', series, flags: [], debug: dbg };
    events.sort((p, q) => q.hits - p.hits || q.score - p.score || p.k - q.k);
    const e = events[0], names = [];
    if (e.markers.salto) names.push('salto de tono'); if (e.markers.caidaRms) names.push('caída de volumen'); if (e.markers.inversionEspectral) names.push('inversión espectral (H1−H2)');
    return { ok: true, midi: e.midi, t: e.t, tAfter: e.t + 0.08, kind: 'multi', jump: e.jump, score: e.score, hits: e.hits, markers: e.markers,
      conf: e.hits >= 3 ? 'alta' : e.score >= 2.5 ? 'media' : 'baja', flags: names, series, debug: dbg };
  }

  // Resume las sirenas. attempts = [res|null, …]; vowels = ['a','a','u'].
  // Peso dinámico: ≥ 2 sirenas coinciden (±2.5 st) → peso completo; una sola → 0.35; ninguna fiable → sin passaggio (peso 0).
  function resumir(attempts, vowels) {
    const dets = attempts.map((r, i) => (r && r.ok ? { midi: r.midi, v: (vowels && vowels[i]) || 'a', i } : null)).filter(Boolean);
    if (!dets.length) return null;
    let cl = [];
    dets.forEach(d => { const c = dets.filter(o => Math.abs(o.midi - d.midi) <= P.agreeSt); if (c.length > cl.length) cl = c; });
    const final = med(cl.map(d => d.midi)), spread = Math.max(...cl.map(d => d.midi)) - Math.min(...cl.map(d => d.midi));
    const fuera = dets.filter(d => !cl.includes(d)), tieneU = cl.some(d => d.v === 'u'), tieneA = cl.some(d => d.v === 'a');
    let peso, conf, posibleCruce = false;
    if (cl.length >= 2) {
      conf = spread <= 1.5 ? 'alta' : 'media'; peso = 1;
      if (!tieneU && fuera.some(d => d.v === 'u')) { posibleCruce = true; peso = P.pesoCruce; conf = 'media'; }   // /a/ sí, /u/ en otra zona: ¿cruce armónico–formante?
    } else { conf = 'baja'; peso = P.pesoUnico; }
    return { midi: Math.round(final), exact: final, used: cl.length, valid: dets.length, dropped: dets.length - cl.length, spread, conf, all: dets.map(d => d.midi),
      peso, confirmaU: tieneU && tieneA && cl.length >= 2, posibleCruce };
  }
  return { detectar, resumir, PARAMS: P };
});
