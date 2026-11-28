/* Datos de referencia del Test de rango vocal (Team Peaches Hub).
 * Sustituye al cuadro escolar de López y Benayas (ya no decide nada).
 * Notas en número MIDI: Do4 = 60, La4 = 69 = 440 Hz.
 * nivel: A = fuente primaria/revisada · B = guía pedagógica citada (Miller, Kloiber…) · C = estimación del proyecto.
 * verificado:false = el dato aún no se contrastó nota por nota con la fuente; la pantalla lo marca «por verificar». */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VOZ_DATOS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // rango = rango estándar [grave, agudo]; p1/p2 = zona del primo y secondo passaggio [desde, hasta].
  // centro/piso/techo = valores típicos de la zona CÓMODA que usa el clasificador (nivel C, por calibrar con casos reales).
  // habla = mediana hablada típica (MIDI). ramas: m = masculina, f = femenina.
  const TIPOS = [
    { id: 'soprano', es: 'Soprano', rama: 'f', rango: [60, 84], rangoAmpliado: 89, p1: [64, 66], p2: [76, 81],
      centro: 72, piso: 55, techo: 80, habla: 57.5,
      tracto: '15.3–18.5 cm · F1 700–800 Hz · F agudo 2800–3500 Hz',
      fach: [['Soubrette', 'Voz ligera y fresca, de color juvenil.'], ['Coloratura ligera', 'Agudos fáciles y gran agilidad.'], ['Coloratura dramática', 'Agilidad con más peso.'],
             ['Lírica', 'Timbre brillante y línea cremosa; el núcleo del repertorio.'], ['Spinto', 'Lírica con empuje dramático.'], ['Dramática', 'Voz amplia y potente.'], ['Falcon', 'Soprano de color oscuro y gran peso.']],
      nivel: 'B', verificado: false },
    { id: 'mezzo', es: 'Mezzosoprano', rama: 'f', rango: [57, 81], p1: [62, 65], p2: [76, 79],
      centro: 69, piso: 54, techo: 76, habla: 56,
      tracto: '16.7–18.3 cm · F1 540–600 Hz · F agudo 2700–3000 Hz',
      fach: [['Lírica (Spielmezzo)', 'Cálida y flexible.'], ['Coloratura', 'Mezzo ágil.'], ['Dramática', 'Más peso y color oscuro.'], ['Zwischenfach', 'Entre mezzo y soprano o contralto.']],
      nivel: 'B', verificado: false },
    { id: 'contralto', es: 'Contralto', rama: 'f', rango: [53, 77], p1: [62, 68], p2: [76, 79],
      centro: 65, piso: 52, techo: 72, habla: 54,
      tracto: 'Muy rara en población general; uso fuerte de M1.',
      fach: [['Contralto lírica / ágil (Spiel-Alt)', 'Más ligera y móvil.'], ['Contralto profunda (Kontra-Alt)', 'Grave, oscura y pesada.']],
      nivel: 'B', verificado: false },
    { id: 'tenor', es: 'Tenor', rama: 'm', rango: [48, 72], p1: [60, 62], p2: [65, 67],
      centro: 60, piso: 48, techo: 69, habla: 50,
      tracto: '19.0–22.0 cm · F1 600–640 Hz · formante del cantante 2700–2900 Hz',
      fach: [['Ligero (Tenorino)', 'Brillante y ágil.'], ['Lírico', 'Dulce y flexible.'], ['De carácter', 'Puede bajar hasta La2.'], ['Spinto', 'Lírico con empuje.'], ['Dramático (Heldentenor)', 'Robusto y oscuro.']],
      nivel: 'B', verificado: false },
    { id: 'baritono', es: 'Barítono', rama: 'm', rango: [43, 69], p1: [57, 59], p2: [62, 64],
      centro: 56, piso: 41, techo: 65, habla: 47.5,
      tracto: '21.5–24.0 cm · F1 540–600 Hz · formante del cantante 2500–2700 Hz',
      fach: [['Alto (Baryton-Martin)', 'Barítono de color claro y agudo cómodo.'], ['Lírico ligero', 'Flexible y de timbre suave.'], ['Lírico pleno (Kavalierbariton)', 'Cuerpo y calidez.'], ['De carácter', 'Más actuación que belleza vocal.'], ['Dramático / Verdi', 'Pegada y peso.']],
      nivel: 'B', verificado: false },
    { id: 'bajobar', es: 'Bajo-barítono', rama: 'm', rango: [40, 65], p1: [57, 57], p2: [62, 62],
      centro: 52.5, piso: 40, techo: 62, habla: 46,
      tracto: 'Voz híbrida: graves de bajo y agudos de barítono.',
      fach: [['Bajo-barítono lírico', 'Graves firmes y agudo flexible.'], ['Bajo-barítono dramático', 'Más peso y oscuridad.']],
      nivel: 'B', verificado: false },
    { id: 'bajo', es: 'Bajo', rama: 'm', rango: [40, 64], p1: [56, 57], p2: [62, 62],
      centro: 52, piso: 38.5, techo: 60, habla: 44.5,
      tracto: '23.3–25.0 cm · F1 450–540 Hz · formante del cantante 2300–2500 Hz',
      fach: [['Basso buffo', 'Papel cómico, ágil.'], ['Ligero (Basso cantante)', 'Más móvil y melódico.'], ['Lírico', 'Cálido y redondo.'], ['Dramático / profundo', 'Grave y pesado.'], ['Basso profondo / Oktavista', 'Llega hasta Do2.']],
      nivel: 'B', verificado: false }
  ];

  // Registros que ve la persona en pantalla (doble nomenclatura: pedagógica + mecanismo laríngeo).
  const REG_ES = { strohbass: 'Fry (M0)', pecho: 'Voz de pecho (M1)', medio: 'Mixta (M1–M2)', cabeza: 'Cabeza / falsete (M2)', silbido: 'Silbido (M3)' };

  // Los tramos se arman con los passaggi: pecho hasta el primo, mixta hasta el secondo, cabeza hasta el final del rango.
  // Silbido (M3) solo en soprano, desde Re6.
  TIPOS.forEach(T => {
    const m1 = Math.floor((T.p1[0] + T.p1[1]) / 2), m2 = Math.floor((T.p2[0] + T.p2[1]) / 2);
    T.regs = [['pecho', T.rango[0], m1], ['medio', m1 + 1, m2], ['cabeza', m2 + 1, T.rango[1]]];
    if (T.id === 'soprano') T.regs.push(['silbido', 86, 91]);
    T.lo = T.regs[0][1]; T.hi = T.regs[T.regs.length - 1][2];
    T.bnd = T.regs.slice(1).map((r, i) => (T.regs[i][2] + r[1]) / 2);
    T.speechLo = T.regs[0][1]; T.speechHi = m1 + 3;   // la voz hablada vive en el tramo de pecho
    T.pasos = [['1.º', T.p1[0], T.p1[1], 'Primo passaggio'], ['2.º', T.p2[0], T.p2[1], 'Secondo passaggio']];
    T.subs = T.fach;
  });

  const SPEECH_REF = { hombres: [45, 52], mujeres: [57, 65] };   // referencia dibujada en el mapa (nivel C)

  // Normas de voz hablada (Hz). Ver bibliografía: Sydney Voice Lab (2025); Cantor-Cutiva et al. (2024).
  const HABLA = { mascHz: [85, 180], femHz: [165, 255], ambiguaHz: [140, 180], bajaHz: 140, altaHz: 175 };

  const REFERENCIAS = [
    ['Roubeau, B., Henrich, N., & Castellengo, M. (2009).', 'Laryngeal Vibratory Mechanisms: The Notion of Vocal Register Revisited.', 'Journal of Voice, 23(4), 425–438.'],
    ['Kloiber, R., Konold, W., & Maschka, R. (2002).', 'Handbuch der Oper (Sistema Fach).', 'Bärenreiter.'],
    ['Miller, R. (1996 / 2008).', 'The Structure of Singing / Securing Baritone, Bass-Baritone, and Bass Voices.', 'Schirmer / Oxford University Press.'],
    ['Dmitriev, L., & Kiselev, A. (1979).', 'Relationship between the Formant Structure of Different Types of Singing Voices and the Dimensions of Supraglottic Cavities.', 'Folia Phoniatrica, 31(4), 238–241.'],
    ['Cleveland, T. F. (1977).', 'Acoustic properties of voice timbre types and their influence on voice classification.', 'JASA, 61(6), 1622–1629.'],
    ['Berndtsson, G., & Sundberg, J. (1994).', 'Perceptual significance of the center frequency of singer\u2019s formant.', 'STL-QPSR (KTH), 35(4), 95–105.'],
    ['Herbst, C. T. (2020).', 'Registers — The Snake Pit of Voice Pedagogy.', 'Journal of Singing, 77(2), 175–190.'],
    ['Hollien, H., Dew, D., & Philips, P. (1971).', 'Phonational Frequency Ranges of Adults.', 'Journal of Speech and Hearing Research, 14(4), 755–760.'],
    ['Cantor-Cutiva, L. C., et al. (2024).', 'Association between bilingualism, vocal effort and background noise on voice acoustic parameters.', 'Journal of Voice.'],
    ['Sydney Voice Lab (2025).', 'Acoustic Analysis Normative Data Reference Sheet (normas de F0 conversacional).', ''],
    ['De Cheveigné, A., & Kawahara, H. (2002).', 'YIN, a fundamental frequency estimator for speech and music.', 'JASA, 111(4), 1917–1930.'],
    ['Kim, J. W., Salamon, J., Li, P., & Bello, J. P. (2018).', 'CREPE: A Convolutional Representation for Pitch Estimation.', 'ICASSP.']
  ];

  const AVISO_METODOLOGICO = 'Aviso metodológico: el sistema Fach describe el canto lírico sin amplificación; el canto contemporáneo es más flexible y una misma persona puede cantar en varias categorías. ' +
    'Los rangos por tipo, los passaggi y los parámetros del clasificador son orientativos. ' +
    'Este resultado es una sugerencia, no un diagnóstico; para una clasificación definitiva consulta a un profesor de canto.';

  return { TIPOS, REF: TIPOS, REG_ES, SPEECH_REF, HABLA, REFERENCIAS, AVISO_METODOLOGICO, VERSION_MOTOR: 'm1.2-v4.50' };
});
