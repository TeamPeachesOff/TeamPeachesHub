/* Motor de clasificación vocal (Team Peaches Hub) — sin interfaz, probado con tests/classification.test.js.
 * Entrada R (notas en MIDI, Do4 = 60):
 *   { abs:{low,high}, comf:{low,high}, speech:{avg, med?, p10?, p90?}, passaggio?:{midi, conf?} }
 * Reemplaza el promedio simple (grave+agudo)/2 por verosimilitud gaussiana por categoría + reglas fisiológicas.
 * Pesos por defecto: tesitura 50 % · voz hablada 10 % · passaggio 30 % × confianza (0 si no hay) · extensión aguda femenina 15 %.
 * El timbre (voz-timbre.js) se mide y se guarda, pero su peso es 0 hasta calibrarlo con datos propios. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./voz-datos.js'));
  else root.VozMotor = factory(root.VOZ_DATOS);
})(typeof self !== 'undefined' ? self : this, function (D) {
  'use strict';
  const TIPOS = D.TIPOS;
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const gl = z => -0.5 * z * z;                        // log-verosimilitud gaussiana (sin constante)
  const K = 7;                                         // nitidez del softmax (nivel C: se calibra con casos reales)
  const SIG = { centro: 4, piso: 3.5, techo: 4, habla: 4, delta: 2.5, pas: 2.5, ext: 5 };
  const W = { centro: 0.25, piso: 0.15, techo: 0.10, habla: 0.10, delta: 0.08, ext: 0.15, pas: 0.30 };
  const EXT = { soprano: 88, mezzo: 83, contralto: 79 };           // techo absoluto típico femenino (Mi6, Si5, Sol5)
  const DELTA = { tenor: 3, baritono: 7, bajobar: 7, bajo: 7, soprano: 3, mezzo: 3, contralto: 3 };   // habla − piso cómodo (semitonos)
  const nn = v => v != null && isFinite(v);

  function regOf(T, v) {
    if (v < T.lo - 0.75) return 'bajo-cuadro';
    if (v > T.hi + 0.75) return 'sobre-cuadro';
    let i = 0; while (i < T.bnd.length && v >= T.bnd[i]) i++;
    return T.regs[i][0];
  }
  function rangeFit(T, a, b) {
    a = Math.round(a); b = Math.round(b); if (a > b) [a, b] = [b, a];
    let inside = 0; for (let m = a; m <= b; m++) if (m >= T.lo && m <= T.hi) inside++;
    return { cont: inside / (b - a + 1), cover: inside / (T.hi - T.lo + 1) };
  }
  const PASS_EXPECT = {};
  TIPOS.forEach(T => { PASS_EXPECT[T.id] = [(T.p1[0] + T.p2[1]) / 2, T.p1[0] - 1, T.p2[1] + 1]; });

  // Rama vocal: la elige la persona (ids) o, si no, la lectura (mediana < 140 Hz → masculina, > 175 Hz → femenina).
  function rama(R, ids, low, speechHz) {
    if (ids && ids.length) {
      const rs = new Set(TIPOS.filter(T => ids.includes(T.id)).map(T => T.rama));
      return { tipos: TIPOS.filter(T => ids.includes(T.id)), rama: rs.size === 1 ? [...rs][0] : null, motivo: 'elegida' };
    }
    let r = null, motivo = null;
    if (speechHz != null) {
      if (speechHz < D.HABLA.bajaHz) { r = 'm'; motivo = `voz hablada ${Math.round(speechHz)} Hz (< ${D.HABLA.bajaHz} Hz)`; }
      else if (speechHz > D.HABLA.altaHz) { r = 'f'; motivo = `voz hablada ${Math.round(speechHz)} Hz (> ${D.HABLA.altaHz} Hz)`; }
    } else if (low != null) {
      if (low <= 45) { r = 'm'; motivo = 'nota cómoda grave muy baja'; } else if (low >= 55) { r = 'f'; motivo = 'nota cómoda grave alta'; }
    }
    return { tipos: r ? TIPOS.filter(T => T.rama === r) : TIPOS.slice(), rama: r, motivo };
  }

  function classify(R, ids) {
    const comfLow = nn(R.comf.low) ? R.comf.low : null, comfHigh = nn(R.comf.high) ? R.comf.high : null;
    const low = comfLow != null ? comfLow : (nn(R.abs.low) ? R.abs.low : null);
    const high = comfHigh != null ? comfHigh : (nn(R.abs.high) ? R.abs.high : null);
    const basis = comfLow != null && comfHigh != null ? 'cómodo' : 'absoluto';
    const sp = R.speech || null, spMed = sp ? (nn(sp.med) ? sp.med : sp.avg) : null, spHz = nn(spMed) ? hz(spMed) : null;
    const absTops = [R.abs.high, R.comf.high].filter(nn), top = absTops.length ? Math.max(...absTops) : null;
    const ram = rama(R, ids, low, spHz), masc = ram.rama === 'm', fem = ram.rama === 'f';
    const notas = [], sugerencias = [];

    // Techo efectivo. Regla anti-sesgo M2 (perfil masculino): el falsete cómodo no puede arrastrar a un barítono hacia tenor.
    let effHigh = high, reglaM2 = false;
    if (masc && high != null) {
      if (low != null && low <= 42 && spHz != null && spHz < 135) { effHigh = Math.min(high, 72); reglaM2 = high > 72; }
      else effHigh = high > 72 ? 72 + 0.25 * (high - 72) : high;
    }
    const m2Ext = masc && comfHigh != null && comfHigh > 74 ? comfHigh : null;   // pasado D5: se informa, no clasifica
    if (m2Ext != null) notas.push({ k: 'm2', texto: 'Extensión M2 / Falsete cómoda hasta {n}: se reporta aparte y no cuenta como tesitura de pecho.', midi: m2Ext });
    if (R.abs && R.abs.m0 && nn(R.abs.m0.midi)) notas.push({ k: 'm0', texto: 'Zona M0 / vocal fry: llegaste hasta {n}. Es informativa; no cuenta como tu nota grave ni cambia tu tipo de voz.', midi: R.abs.m0.midi });
    const capContratenor = masc && comfHigh != null && comfHigh >= 77;
    if (capContratenor) notas.push({ k: 'contratenor', texto: 'Capacidad de Contratenor (M2): tu voz cómoda llega a la zona de soprano en falsete. No cambia tu tipo de voz de pecho.' });
    const delta = low != null && spMed != null ? spMed - low : null;

    // Regla anti-sesgo grave (perfil femenino): un piso grave en M1 no hace contralto; si se detuvo en D5–E5 pero habla y absoluta son agudas, no es contralto.
    const incongruente = !masc && comfHigh != null && comfHigh >= 74 && comfHigh <= 76 && ((spHz != null && spHz >= 205) || (R.abs.high != null && R.abs.high >= 84));
    if (incongruente) sugerencias.push('Tu voz hablada y tu nota absoluta son agudas, pero tu cómoda se detuvo en Re5–Mi5 (justo antes del secondo passaggio). Calienta y explora voz de cabeza suave por encima de Fa♯5; después repite la prueba.');

    const rows = ram.tipos.map(T => {
      const parts = {}; let s = 0, w = 0;
      const add = (k, wt, z) => { parts[k] = { w: wt, z, ll: gl(z) }; s += wt * gl(z); w += wt; };
      if (low != null && effHigh != null) add('centro', W.centro, ((low + effHigh) / 2 - T.centro) / SIG.centro);
      if (low != null) { let z = (low - T.piso) / SIG.piso; if (T.rama === 'f' && z < 0) z *= 0.4; add('piso', W.piso, z); }   // exceso grave femenino: penalización suave
      if (effHigh != null) add('techo', W.techo, (effHigh - T.techo) / SIG.techo);
      if (spMed != null) add('habla', W.habla, (spMed - T.habla) / SIG.habla);
      if (delta != null) add('delta', W.delta, (delta - DELTA[T.id]) / SIG.delta);
      if (T.rama === 'f' && top != null && EXT[T.id] != null) {
        const sat = (T.id === 'soprano' && top >= EXT.soprano) || (T.id === 'contralto' && top <= EXT.contralto);
        add('ext', W.ext, sat ? 0 : (top - EXT[T.id]) / SIG.ext);
      }
      const pas = R.passaggio && nn(R.passaggio.midi) ? R.passaggio : null;
      if (pas) {
        const c1 = (T.p1[0] + T.p1[1]) / 2, c2 = (T.p2[0] + T.p2[1]) / 2;
        add('pas', W.pas * (nn(pas.conf) ? pas.conf : 0.6), Math.min(Math.abs(pas.midi - c1), Math.abs(pas.midi - c2)) / SIG.pas);
      }
      let ll = w ? s / w : 0;
      if (incongruente && T.id === 'contralto') ll -= 1.2;
      const f = low != null && high != null ? rangeFit(T, Math.min(low, high), Math.max(low, high)) : null;
      const spf = spMed != null ? Math.exp(gl((spMed - T.habla) / SIG.habla)) : null;
      return { T, id: T.id, ll, parts, cont: f ? f.cont : null, sp: spf, total: 0 };
    });
    const mx = Math.max(...rows.map(r => r.ll)), ex = rows.map(r => Math.exp(K * (r.ll - mx))), sum = ex.reduce((a, b) => a + b, 0);
    rows.forEach((r, i) => { r.total = ex[i] / sum; });
    rows.sort((a, b) => b.total - a.total);
    const best = rows[0].T, af = rows[0].total, sec = rows[1] || null;

    // Evidencia en conflicto: si el segundo lugar gana en variables que suman ≥ 30 % del peso y tiene ≥ 10 % de afinidad, no se da veredicto cerrado.
    let conflicto = 0;
    if (sec) for (const k in rows[0].parts) if (sec.parts[k] && sec.parts[k].ll - rows[0].parts[k].ll > 0.2) conflicto += rows[0].parts[k].w;
    const wTot = Object.values(rows[0].parts).reduce((a, p) => a + p.w, 0) || 1;
    let frontera = null;
    if (sec && (af - sec.total < 0.15 || af < 0.5 || (sec.total >= 0.10 && conflicto / wTot >= 0.30))) {
      const ids2 = [rows[0].id, sec.id], par = (a, b) => ids2.includes(a) && ids2.includes(b);
      const etiqueta = par('tenor', 'baritono') ? 'Tenor / Barítono alto' : par('soprano', 'mezzo') ? 'Soprano / Mezzosoprano' : `${rows[0].T.es} / ${sec.T.es}`;
      frontera = { a: rows[0].T, b: sec.T, etiqueta };
      sugerencias.push(`Tu resultado queda en zona fronteriza (${etiqueta}). Calienta bien, sobre todo los agudos, y repite la prueba antes de tomarlo como definitivo.`);
    }

    // Subtipo: solo una tendencia débil (el Fach real depende de peso, timbre y passaggi; el timbre entra más adelante).
    let sub = null;
    if (best.id === 'tenor' && comfHigh != null && comfHigh >= 77 && low != null && low >= 45 && spMed != null && spMed >= 48) sub = [best.fach[0][0], null, null, best.fach[0][1]];

    return {
      rank: rows, best, afinidad: af, secundaria: sec ? { T: sec.T, afinidad: sec.total } : null, frontera,
      span: low != null && high != null ? [Math.min(low, high), Math.max(low, high)] : null, basis,
      sub, subBasis: 'tendencia', subOther: null,
      rama: ram.rama, ramaMotivo: ram.motivo, notas, sugerencias, extM2: m2Ext, capacidadContratenor: capContratenor, reglaM2, incongruente,
      deltaHablaPiso: delta, versionMotor: D.VERSION_MOTOR
    };
  }
  return { classify, regOf, rangeFit, PASS_EXPECT, hz };
});
