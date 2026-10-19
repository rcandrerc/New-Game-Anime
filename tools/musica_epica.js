// Música épica do jogo de hábitos, composta e gerada por código (sem direitos autorais de ninguém).
// Pra gerar de novo: abra tools/musica_epica.html num navegador, ele baixa musica_epica.wav (38,4 s + 3 s de cauda);
// depois some a cauda no começo e converta pra .ogg (veja tools/LEIAME.md).
// Ré menor, 100 bpm, 16 compassos que se repetem: tambores, cordas, ostinato no grave e metais com a melodia
function compoeMusica() {
  const CAUDA = 3, BPM = 100, B = 60 / BPM, BAR = B * 4, NB = 16, DUR = BAR * NB, sr = 44100;
  const ctx = new OfflineAudioContext(2, Math.ceil(sr * (DUR + CAUDA)), sr); // a cauda do eco volta pro começo (o laço fica sem emenda)
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const mestre = ctx.createGain(); mestre.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; mestre.connect(comp); comp.connect(ctx.destination);
  // reverberação de salão (ruído que decai)
  const rev = ctx.createConvolver(), ir = ctx.createBuffer(2, sr * 2.6, sr);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.6) }
  rev.buffer = ir; const molhado = ctx.createGain(); molhado.gain.value = 0.32; rev.connect(molhado); molhado.connect(mestre);
  const saida = (g, wet) => { g.connect(mestre); if (wet) { const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(rev) } };
  // acordes: Dm Bb F C | Dm Bb Gm A  (duas vezes; na segunda entra a melodia)
  const AC_ = [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55], [50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]];
  const ruidoBuf = ctx.createBuffer(1, sr, sr); { const d = ruidoBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1 }
  function cordas(t, notas, dur, vol) { // pad de cordas: serras desafinadas, filtro suave
    const g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1500; f.Q.value = 0.4;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.5); g.gain.setValueAtTime(vol, t + dur - 0.35); g.gain.linearRampToValueAtTime(0, t + dur + 0.25);
    f.connect(g); saida(g, 0.8);
    for (const m of notas) for (const dt of [-7, 0, 7]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = dt; o.connect(f); o.start(t); o.stop(t + dur + 0.3) }
  }
  function ostinato(t, m, vol) { // colcheia marcada no grave
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'sawtooth'; o2.type = 'sawtooth'; o.frequency.value = hz(m); o2.frequency.value = hz(m + 12); o2.detune.value = 5;
    f.type = 'lowpass'; f.frequency.setValueAtTime(1400, t); f.frequency.exponentialRampToValueAtTime(300, t + 0.25);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + B * 0.48);
    o.connect(f); o2.connect(f); f.connect(g); saida(g, 0.25); o.start(t); o2.start(t); o.stop(t + B * 0.5); o2.stop(t + B * 0.5);
  }
  function tambor(t, forte) { // taiko: seno que despenca + estalo de ruído
    const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(forte ? 130 : 160, t); o.frequency.exponentialRampToValueAtTime(forte ? 42 : 60, t + 0.35);
    g.gain.setValueAtTime(forte ? 1.1 : 0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + (forte ? 0.9 : 0.45)); o.connect(g); saida(g, 0.5); o.start(t); o.stop(t + 1);
    const n = ctx.createBufferSource(), ng = ctx.createGain(), nf = ctx.createBiquadFilter(); n.buffer = ruidoBuf; nf.type = 'lowpass'; nf.frequency.value = 900;
    ng.gain.setValueAtTime(forte ? 0.5 : 0.25, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12); n.connect(nf); nf.connect(ng); saida(ng, 0.4); n.start(t); n.stop(t + 0.15);
  }
  function caixa(t, vol) { const n = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter(); n.buffer = ruidoBuf; f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.8;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16); n.connect(f); f.connect(g); saida(g, 0.5); n.start(t, Math.random() * 0.5); n.stop(t + 0.2) }
  function prato(t, dur) { const n = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter(); n.buffer = ruidoBuf; n.loop = true; f.type = 'highpass'; f.frequency.value = 5000;
    g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(0.28, t + dur); g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.05); n.connect(f); f.connect(g); saida(g, 0.6); n.start(t); n.stop(t + dur + 0.1) }
  function metal(t, m, dur, vol) { // trompas: serra + quadrada, brilho que abre e vibrato
    const g = ctx.createGain(), f = ctx.createBiquadFilter(), lfo = ctx.createOscillator(), lg = ctx.createGain(); f.type = 'lowpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(2600, t + 0.12); f.frequency.linearRampToValueAtTime(1600, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.06); g.gain.setValueAtTime(vol * 0.85, t + dur - 0.08); g.gain.linearRampToValueAtTime(0, t + dur + 0.12);
    lfo.frequency.value = 5.2; lg.gain.value = 0; lg.gain.setValueAtTime(0, t + 0.25); lg.gain.linearRampToValueAtTime(9, t + 0.6); lfo.connect(lg);
    for (const [tp, dt, oit] of [['sawtooth', -4, 0], ['square', 4, 0], ['sawtooth', 0, -12]]) { const o = ctx.createOscillator(); o.type = tp; o.frequency.value = hz(m + oit); o.detune.value = dt; lg.connect(o.detune); o.connect(f); o.start(t); o.stop(t + dur + 0.2) }
    lfo.start(t); lfo.stop(t + dur + 0.2); f.connect(g); saida(g, 0.7);
  }
  // melodia heroica (nota midi, tempo em batidas, duração em batidas), 8 compassos
  const MEL = [[62, 0, 1.5], [65, 1.5, 0.5], [69, 2, 2], [70, 4, 1], [69, 5, 1], [65, 6, 2], [65, 8, 1.5], [67, 9.5, 0.5], [69, 10, 1], [72, 11, 1], [67, 12, 4],
    [69, 16, 1.5], [70, 17.5, 0.5], [72, 18, 2], [74, 20, 1.5], [72, 21.5, 0.5], [70, 22, 2], [70, 24, 1], [69, 25, 1], [67, 26, 2], [69, 28, 3], [64, 31, 0.5], [61, 31.5, 0.5]];
  for (let bar = 0; bar < NB; bar++) {
    const t = bar * BAR, ac = AC_[bar % 8], segunda = bar >= 8;
    cordas(t, [ac[0] + 12, ...ac.map(m => m + 12)], BAR, segunda ? 0.05 : 0.042);
    for (let e = 0; e < 8; e++) ostinato(t + e * B / 2, ac[0] - 12 + (e === 3 || e === 7 ? 7 : 0), e % 2 ? 0.1 : 0.15);
    for (const [bt, f] of [[0, 1], [1.5, 0], [2, 1], [3, 0], [3.5, 0]]) tambor(t + bt * B, f && (bar % 2 === 0 || bt === 2));
    if (segunda || bar >= 4) { caixa(t + B, 0.22); caixa(t + 3 * B, 0.22); if (bar % 4 === 3) for (let k = 0; k < 4; k++) caixa(t + 3 * B + k * B / 4, 0.12 + k * 0.04) }
    if (bar % 8 === 7) prato(t + 2 * B, 2 * B);
  }
  for (const [m, bt, d] of MEL) metal(8 * BAR + bt * B, m, d * B - 0.04, 0.085);
  for (const [m, bt, d] of MEL) if (d >= 2) metal(8 * BAR + bt * B, m - 12, d * B - 0.04, 0.05); // dobra uma oitava abaixo nas notas longas
  return ctx.startRendering();
}
