/* Pruebas del detector de passaggio en sirenas. Ejecutar:  node tests/siren.test.js
 * Sirenas sintéticas: glissando con armónicos; el «quiebre» puede traer salto de tono, caída de volumen e inversión espectral. */
const { detectar, resumir } = require('../herramientas/rango-vocal/voz-sirena.js');
const sr = 44100, hop = 0.01;
function sirena({ m0 = 52, m1 = 76, dur = 5, breakAt = 0.5, jump = 0, dropDb = 0, espectro = false, gap = 0 }) {
  const N = Math.round(dur * sr), x = new Float32Array(N), frames = [], tb = breakAt * dur;
  const mAt = t => m0 + (m1 - m0) * (t / dur) + (t >= tb ? jump : 0);
  let ph = 0;
  for (let i = 0; i < N; i++) {
    const t = i / sr, f = 440 * Math.pow(2, (mAt(t) - 69) / 12); ph += 2 * Math.PI * f / sr;
    const post = t >= tb ? 1 : 0, a2 = espectro ? (post ? 0.1 : 0.6) : 0.4, a345 = espectro ? (post ? 0.05 : 0.4) : 0.2, g = post ? Math.pow(10, -dropDb / 20) : 1;
    x[i] = g * (Math.sin(ph) + a2 * Math.sin(2 * ph) + a345 * (Math.sin(3 * ph) + Math.sin(4 * ph) + Math.sin(5 * ph)) / 3) * 0.3;
  }
  for (let t = 0.015; t < dur - 0.015; t += hop) {
    const i0 = Math.round((t - 0.0125) * sr); let s = 0; for (let i = 0; i < 551; i++) s += x[i0 + i] * x[i0 + i];
    const inGap = gap && t >= tb && t < tb + gap;
    frames.push({ t, rms: Math.sqrt(s / 551), f0: inGap ? 0 : 440 * Math.pow(2, (mAt(t) - 69) / 12), conf: inGap ? 0 : 0.9 });
  }
  return { x, frames };
}
let fallos = 0, total = 0; const ok = (c, m) => { if (!c) throw new Error(m); };
function prueba(n, f) { total++; try { f(); console.log('✔', n); } catch (e) { fallos++; console.log('✘', n, '→', e.message); } }
const run = o => { const s = sirena(o); return detectar(s.x, sr, s.frames); };

prueba('quiebre con las 3 señales: se detecta, confianza alta, ±1 st', () => {
  const r = run({ jump: 2.5, dropDb: 5, espectro: true, gap: 0.03 });
  ok(r.ok, 'no detectó: ' + r.reason); ok(r.hits === 3, 'marcadores ' + r.hits); ok(r.conf === 'alta', 'conf ' + r.conf);
  const real = 52 + 24 * 0.5; ok(Math.abs(r.midi - real) <= 1.2, `midi ${r.midi.toFixed(2)} vs ${real}`); ok(Math.abs(r.t - 2.5) <= 0.1, 't ' + r.t);
});
prueba('quiebre con 2 señales (salto + caída de volumen): se detecta, confianza media', () => {
  const r = run({ jump: 2, dropDb: 4 }); ok(r.ok, 'no detectó: ' + r.reason); ok(r.hits === 2, 'marcadores ' + r.hits); ok(r.conf !== 'alta', 'no debía ser alta');
});
prueba('solo salto de tono (1 marcador): NO es quiebre', () => { const r = run({ jump: 3 }); ok(!r.ok, 'detectó un quiebre con una sola señal'); });
prueba('solo caída de volumen (1 marcador): NO es quiebre', () => { const r = run({ dropDb: 6 }); ok(!r.ok, 'detectó un quiebre con una sola señal'); });
prueba('sirena lisa (mezcla suave): sin quiebre', () => { const r = run({}); ok(!r.ok && r.reason === 'sin-quiebre', 'esperaba sin-quiebre: ' + JSON.stringify([r.ok, r.reason])); });
prueba('sirena que casi no sube: sin recorrido', () => { const r = run({ m0: 60, m1: 62 }); ok(!r.ok && r.reason === 'sin-recorrido', r.reason); });
prueba('debug: devuelve series y eventos', () => { const r = run({ jump: 2.5, dropDb: 5, espectro: true }); ok(r.debug && r.debug.events.length && r.debug.s1.length === r.debug.frames, 'faltan datos de depuración'); });

const A = (m, v) => ({ ok: true, midi: m });
prueba('resumen: 2 sirenas coinciden (±2.5 st) → peso completo', () => { const s = resumir([A(65), A(66), null], ['a', 'a', 'u']); ok(s.peso === 1 && s.used === 2, JSON.stringify(s)); });
prueba('resumen: /a/, /a/ y /u/ coinciden → confirmado por /u/', () => { const s = resumir([A(65), A(65.5), A(66)], ['a', 'a', 'u']); ok(s.confirmaU && s.peso === 1 && s.conf === 'alta', JSON.stringify(s)); });
prueba('resumen: 2 en /a/ y la /u/ lejos → posible cruce armónico–formante, peso 0.7', () => { const s = resumir([A(65), A(65.5), A(71)], ['a', 'a', 'u']); ok(s.posibleCruce && s.peso === 0.7, JSON.stringify(s)); });
prueba('resumen: una sola sirena → peso 0.35', () => { const s = resumir([null, A(66), null], ['a', 'a', 'u']); ok(s.peso === 0.35 && s.conf === 'baja', JSON.stringify(s)); });
prueba('resumen: ninguna fiable → null (peso 0)', () => ok(resumir([null, { ok: false }, null], ['a', 'a', 'u']) === null, 'debía ser null'));
console.log(`\n${total - fallos}/${total} pruebas pasan`); process.exit(fallos ? 1 : 0);
