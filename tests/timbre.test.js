/* Pruebas del módulo de timbre con vocales sintéticas: node tests/timbre.test.js */
const T = require('../herramientas/rango-vocal/voz-timbre.js');
let ok = 0, fail = 0;
const t = (n, c, extra) => { if (c) ok++; else { fail++; console.log('FALLA:', n, extra !== undefined ? extra : ''); } };

// Resonador digital de 2º orden (formante a f, ancho bw)
function reson(x, sr, f, bw, gain) {
  const r = Math.exp(-Math.PI * bw / sr), th = 2 * Math.PI * f / sr, b1 = 2 * r * Math.cos(th), b2 = -r * r, y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = (1 - r) * x[i] * gain + b1 * (i > 0 ? y[i - 1] : 0) + b2 * (i > 1 ? y[i - 2] : 0);
  return y;
}
// Vocal sintética: tren de pulsos suavizado (fuente) + formantes en cascada. Opcional: formante del cantante.
function vocal(f0, sr, seg, F, cantante, nivel) {
  const n = Math.round(sr * seg), src = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) { ph += f0 / sr; if (ph >= 1) { ph -= 1; src[i] = 1; } }
  let y = src; for (let k = 0; k < 1; k++) { const o = new Float32Array(n); let p = 0; for (let i = 0; i < n; i++) { p = 0.97 * p + y[i]; o[i] = p; } y = o; }   // fuente con -12 dB/oct menos +6 de radiación labial
  for (const [f, bw] of F) y = reson(y, sr, f, bw, 1);
  if (cantante) y = reson(y, sr, cantante, 250, 1);
  let m = 0; for (const v of y) m = Math.max(m, Math.abs(v)); const g = (nivel || 0.5) / m; return y.map(v => v * g);
}
const A = [[700, 90], [1220, 110], [2600, 160]];
const midiDe = f => 69 + 12 * Math.log2(f / 440);

// 1) /a/ masculina a 130 Hz: formantes cerca de lo configurado
let x = vocal(130, 48000, 2, A), r = T.analizar(x, 48000, midiDe(130), { genero: 'M' });
t('1 válido', r.valido, r.motivos);
t('1 F1 ±120 Hz', r.f1 && Math.abs(r.f1 - 700) < 120, r.f1);
t('1 F2 ±180 Hz', r.f2 && Math.abs(r.f2 - 1220) < 180, r.f2);
t('1 F3 ±300 Hz', r.f3 && Math.abs(r.f3 - 2600) < 300, r.f3);
t('1 alpha numérico', typeof r.alpha === 'number' && isFinite(r.alpha), r.alpha);

// 2) Con formante del cantante en 2800 Hz: SFcf cerca y alpha más alto que sin él
const xs = vocal(130, 48000, 2, A, 2850), rs = T.analizar(xs, 48000, midiDe(130), { genero: 'M' });
t('2 SFcf detectada', rs.sfcf && Math.abs(rs.sfcf - 2850) < 350 && rs.fiab.sfcf === 1, [rs.sfcf, rs.motivos]);
t('2 alpha sube con el formante del cantante', rs.alpha > r.alpha, [rs.alpha, r.alpha]);

// 3) Voz femenina: SFcf siempre con fiabilidad 0
const rf = T.analizar(xs, 48000, midiDe(130), { genero: 'F' });
t('3 sin SFcf en femenina', rf.sfcf === null && rf.fiab.sfcf === 0 && rf.motivos.includes('sfcf-solo-masculino'));
t('3 sin género tampoco', T.analizar(xs, 48000, midiDe(130), {}).fiab.sfcf === 0);

// 4) F0 alta (soprano ~ Do5 = 523 Hz): el LPC se anula, el alpha puede seguir
const xa = vocal(523, 48000, 2, A), ra = T.analizar(xa, 48000, midiDe(523), { genero: 'F' });
t('4 LPC anulado con F0 alta', ra.f1 === null && ra.fiab.formantes === 0 && ra.motivos.includes('f0-alta-para-lpc'), ra.motivos);
t('4 alpha sí', ra.fiab.alpha === 1);

// 5) Calidad: saturado, silencio, corto, audio comprimido de baja frecuencia de muestreo
const sat = x.map(v => v * 3.5); t('5 saturado', !T.analizar(sat, 48000, 48, { genero: 'M' }).valido && T.analizar(sat, 48000, 48, {}).motivos.includes('saturado'));
t('5 silencio', !T.analizar(new Float32Array(96000), 48000, 48, {}).valido);
t('5 corto', !T.analizar(vocal(130, 48000, 0.6, A), 48000, 48, { genero: 'M' }).valido);
t('5 sin audio', T.analizar(null, 48000, 48, {}).motivos.includes('sin-audio-sin-comprimir'));
t('5 fs baja', !T.analizar(x.subarray(0, 8000), 8000, 48, {}).valido);

// 6) Funciona también a 44100 Hz y con ruido leve
const x44 = vocal(110, 44100, 2, A); for (let i = 0; i < x44.length; i++) x44[i] += (Math.random() - 0.5) * 0.01;
const r44 = T.analizar(x44, 44100, midiDe(110), { genero: 'M' });
t('6 44.1 kHz con ruido', r44.valido && r44.f1 && Math.abs(r44.f1 - 700) < 150, [r44.f1, r44.motivos]);

// 7) Determinista y rápido
const t0 = Date.now(); T.analizar(x, 48000, midiDe(130), { genero: 'M' }); t('7 rápido (< 2 s)', Date.now() - t0 < 2000, Date.now() - t0);

console.log(`\n${ok}/${ok + fail} pruebas pasan`); process.exit(fail ? 1 : 0);
