/* Pruebas de regresión del clasificador. Ejecutar:  node tests/classification.test.js
 * Solo identificadores técnicos anónimos. Notas en MIDI (Do4 = 60). */
const path = require('path');
const { classify } = require(path.join(__dirname, '../herramientas/rango-vocal/voz-motor.js'));
const N = { 'C2': 36, 'D#2': 39, 'E2': 40, 'F#2': 42, 'A2': 45, 'A#2': 46, 'C3': 48, 'C#3': 49, 'D#3': 51, 'A3': 57, 'A#3': 58, 'F#3': 54, 'G#3': 56, 'C#4': 61, 'D5': 74, 'F5': 77, 'A5': 81, 'A#5': 82, 'G5': 79, 'G#6': 92, 'A4': 69, 'C5': 72 };
const mid = (...a) => a.reduce((s, x) => s + x, 0) / a.length;
const R = (cl, ch, al, ah, sp, pas) => ({ comf: { low: cl, high: ch }, abs: { low: al == null ? cl : al, high: ah == null ? ch : ah }, speech: { avg: sp, med: sp }, passaggio: pas == null ? undefined : { midi: pas, conf: 0.6 } });
let fallos = 0, total = 0;
function prueba(nombre, fn) {
  total++;
  try { fn(); console.log('✔', nombre); } catch (e) { fallos++; console.log('✘', nombre, '→', e.message); }
}
const ok = (c, m) => { if (!c) throw new Error(m); };
const resumen = C => `${C.best.es} ${Math.round(C.afinidad * 100)}% | 2.º ${C.secundaria ? C.secundaria.T.es + ' ' + Math.round(C.secundaria.afinidad * 100) + '%' : '-'} | frontera=${C.frontera ? C.frontera.etiqueta : 'no'}`;

// 1) Barítono estándar (varios valores dentro de cada rango dado)
[[N['D#2'], N['E2']], [N['D#2'], N['D#2']], [N['E2'], N['E2']]].forEach(([a, b], k) => [N['C5'], mid(N['C5'], N['D5']), N['D5']].forEach(h => [mid(N['A#2'], 49), 46, 49].forEach(sp => prueba(`TEST_CASE_BARITONE_STANDARD (piso ${a}/${b}, alta ${h}, habla ${sp})`, () => {
  const C = classify(R((a + b) / 2, h, null, null, sp, N['C#4']), ['tenor', 'baritono', 'bajobar', 'bajo']);
  ok(C.best.id === 'baritono', 'esperaba Barítono, salió ' + resumen(C)); ok(C.afinidad > 0.70, 'afinidad ' + Math.round(C.afinidad * 100) + '% (≤70%) ' + resumen(C));
}))));

// 2) Barítono con M2 alto y género «Tal vez» (sin ids)
prueba('TEST_CASE_BARITONE_HIGH_M2_UNSPECIFIED_GENDER', () => {
  const C = classify(R(N['E2'], N['G5'], null, null, N['A2']), null);
  ok(C.rama === 'm', 'debía elegir rama masculina, salió ' + C.rama); ok(C.best.id === 'baritono', 'esperaba Barítono, salió ' + resumen(C));
  ok(C.extM2 === N['G5'], 'debía reportar G5 como extensión M2');
});

// 3A) Tenor ligero vocalizado
[N['F5'], N['A#5'], mid(N['F5'], N['A#5'])].forEach(h => [mid(48, 51), 48, 51].forEach(sp => prueba(`TEST_CASE_LIGHT_TENOR_A (alta ${h}, habla ${sp})`, () => {
  const C = classify(R(N['A#2'], h, null, null, sp), ['tenor', 'baritono', 'bajobar', 'bajo']);
  ok(C.best.id === 'tenor', 'esperaba Tenor, salió ' + resumen(C));
  ok(C.sub && /Ligero/.test(C.sub[0]), 'esperaba tendencia Tenor ligero'); ok(C.capacidadContratenor, 'esperaba capacidad M2/contratenor');
})));
// 3B) Tenor sin calentar: frontera Tenor / Barítono alto
prueba('TEST_CASE_LIGHT_TENOR_B (sin calentar)', () => {
  const C = classify(R(N['A2'], N['A4'], null, null, N['A#2']), ['tenor', 'baritono', 'bajobar', 'bajo']);
  const pair = [C.rank[0].id, C.rank[1].id];
  ok(C.frontera, 'debía marcar zona fronteriza, ' + resumen(C)); ok(pair.includes('tenor') && pair.includes('baritono'), 'la frontera debía ser Tenor/Barítono: ' + resumen(C));
  ok(C.sugerencias.some(s => /Calienta/i.test(s)), 'debía recomendar calentar');
});

// 4A) Soprano lírica con agudo abierto
[N['F#3'], N['G#3'], mid(N['F#3'], N['G#3'])].forEach(b => [mid(N['A#3']), N['A#3']].forEach(sp => prueba(`TEST_CASE_LYRIC_SOPRANO_A (piso ${b})`, () => {
  const C = classify(R(b, N['A5'], null, N['G#6'], sp), ['soprano', 'mezzo', 'contralto']);
  ok(C.best.id === 'soprano', 'esperaba Soprano, salió ' + resumen(C));
  ok(C.rank.findIndex(r => r.id === 'contralto') === 2, 'Contralto no debía quedar sobre Mezzo');
})));
// 4B) Soprano detenida en D5 antes del secondo passaggio
[N['A3'], N['A#3'], mid(N['A3'], N['A#3'])].forEach(sp => prueba(`TEST_CASE_LYRIC_SOPRANO_B (habla ${sp})`, () => {
  const C = classify(R(N['F#3'], N['D5'], null, N['G#6'], sp), ['soprano', 'mezzo', 'contralto']);
  ok(C.best.id === 'soprano' || C.best.id === 'mezzo', 'esperaba Soprano/Mezzo, salió ' + resumen(C)); ok(C.incongruente, 'debía detectar la incongruencia');
  ok(C.sugerencias.some(s => /Fa♯5/.test(s)), 'debía sugerir calentar sobre Fa♯5');
}));

console.log(`\n${total - fallos}/${total} pruebas pasan`); process.exit(fallos ? 1 : 0);
