// Aventura 2D (18/11/2026): RPG que se joga sozinho. A heroína anda, luta, pega itens e passa de zona sozinha;
// a força dela vem do nível (S.nv), que só sobe com as tarefas. Feito pra rodar como "descanso de tela":
// fundo escuro, 8 quadros por segundo, e quando o app fica fechado o jogo calcula o que aconteceu (até 12 h).
// Usa do habitos.html: S, salva, hoje, el, aviso, TELA, prendeTela, somLiga, plim. Sprites: aventura/*.png (tools/sprites_aventura.js).
(() => {
  const FPS = 8, MAX_FORA = 12 * 3600, KILLS_CHEFE = 10;
  const ZONAS = [
    { nome: 'Campina', ceu: ['#05081a', '#16234a'], morro: '#121d36', arv: '#0f2a1d', chao: '#183222', chao2: '#25492e', mon: 'MushroomKing' },
    { nome: 'Bosque', ceu: ['#04130e', '#0f2c22'], morro: '#0c241c', arv: '#0a2016', chao: '#16321d', chao2: '#22502a', mon: 'Orc' },
    { nome: 'Montanha Gelada', ceu: ['#060f24', '#22355a'], morro: '#2e4266', arv: '#1c2e4c', chao: '#7f95b0', chao2: '#a9bdd4', mon: 'Yeti' },
    { nome: 'Pântano', ceu: ['#0d0918', '#231834'], morro: '#1d1630', arv: '#17241a', chao: '#232b1d', chao2: '#34402a', mon: 'Orc' },
    { nome: 'Terra do Fogo', ceu: ['#140404', '#350c08'], morro: '#240a08', arv: '#160806', chao: '#31160f', chao2: '#4d2012', mon: 'Demon' },
  ];
  const MONS = ['MushroomKing', 'Orc', 'Yeti', 'Demon'], NOME_M = { MushroomKing: 'Cogumelo', Orc: 'Orc', Yeti: 'Yeti', Demon: 'Diabrete' };
  const RAR = [['comum', 1, '#c9d2e0'], ['raro', 1.4, '#6fb8ff'], ['épico', 2, '#c98bff']];
  const SLOT = { arma: ['🗡', ['Espada curta', 'Sabre', 'Lâmina de aço', 'Espada rúnica', 'Lâmina estelar']], arm: ['🛡', ['Gibão', 'Cota de malha', 'Armadura leve', 'Armadura rúnica', 'Manto estelar']], amu: ['📿', ['Pingente', 'Amuleto', 'Talismã', 'Colar rúnico', 'Joia estelar']] };

  // ---------------- estado (S.av) e contas ----------------
  function A() { if (!S.av) S.av = { z: 1, maxZ: 1, kills: 0, ouro: 0, forja: 0, eq: {}, t: Date.now(), tot: 0, mortes: 0, auto: 3 }; return S.av }
  const zona = z => ZONAS[(z - 1) % ZONAS.length], rodada = z => Math.floor((z - 1) / ZONAS.length);
  const nomeZ = z => zona(z).nome + (rodada(z) ? ' ' + ['', 'II', 'III', 'IV', 'V', 'VI'][Math.min(5, rodada(z))] : '');
  function heroi() { const a = A(), nv = S.nv || 1, e = a.eq, p = s => (e[s] ? e[s].pct : 0);
    return { atk: (6 + 3 * nv) * (1 + 0.04 * a.forja + p('arma')), hp: Math.round((60 + 15 * nv) * (1 + p('arm'))), crit: 0.08 + p('amu') * 0.5, ouro: 1 + p('amu') } }
  function monstro(z, chefe, rnd = Math.random) { const m = 2 * z - 1 + (chefe ? 2 : rnd() < 0.5 ? 0 : 1), th = zona(z).mon;
    const tipo = chefe ? th : rnd() < 0.7 ? th : MONS[Math.floor(rnd() * MONS.length)];
    return { tipo, chefe, lv: m, hp: Math.round((18 + 14 * m) * (chefe ? 2.5 : 1)), atk: (3 + 2.6 * m) * (chefe ? 1.25 : 1), ouro: Math.round((2 + m) * (chefe ? 8 : 1)) } }
  function luta(H, M, rnd = Math.random) { // troca de golpes (a heroína bate primeiro): quem ganha e quantas trocas
    let hp = H.hp, mh = M.hp, n = 0; while (n < 400) { n++; mh -= H.atk * (rnd() < H.crit ? 2 : 1); if (mh <= 0) return { ganhou: true, n, hp }; hp -= M.atk; if (hp <= 0) return { ganhou: false, n, hp: 0 } } return { ganhou: false, n, hp }
  }
  function nivelPraChefe(z) { const nv0 = S.nv; let v = nv0; for (; v < nv0 + 60; v++) { S.nv = v; const H = heroi(), M = monstro(z, true, () => 0.5); H.crit = 0; if (luta(H, M, () => 1).ganhou) break } S.nv = nv0; return v }
  function dropa(z, chefe, rnd = Math.random) { // item novo: equipa se for melhor; se não, vira ouro
    if (!chefe && rnd() > 0.06) return null; const a = A(), x = rnd(), r = chefe ? (x < 0.25 ? 2 : 1) : x < 0.04 ? 2 : x < 0.25 ? 1 : 0, slots = Object.keys(SLOT), s = slots[Math.floor(rnd() * 3)];
    const ip = z + (chefe ? 1 : 0), pct = Math.round(ip * 0.045 * RAR[r][1] * 100) / 100, nome = SLOT[s][1][Math.min(4, Math.floor((ip - 1) / 2))];
    const it = { s, nome, r, pct, z: ip }, cur = a.eq[s];
    if (!cur || pct > cur.pct) { a.eq[s] = it; return Object.assign({ equipou: true }, it) } a.ouro += ip * 5; return Object.assign({ vendeu: ip * 5 }, it)
  }
  const custoForja = n => Math.round(40 * Math.pow(1.45, n));
  function forja() { const a = A(); let n = 0; while (a.forja < 2 * (S.nv || 1) && a.ouro >= custoForja(a.forja)) { a.ouro -= custoForja(a.forja); a.forja++; n++ } return n } // a forja vai até 2x o nível: quem manda é a tarefa
  function venceu(M, res) { // depois de uma luta ganha: ouro, item, chefe e zona
    const a = A(), H = heroi(); a.kills++; a.tot++; a.ouro += Math.round(M.ouro * H.ouro); const it = dropa(a.z, M.chefe), fj = forja(); let novaZ = false;
    if (M.chefe) { a.maxZ = Math.max(a.maxZ, a.z + 1); a.z++; a.kills = 0; novaZ = true }
    return { it, fj, novaZ };
  }
  function proximo() { const a = A(); return monstro(a.z, a.z === a.maxZ && a.kills >= KILLS_CHEFE) }
  function perdeu(M) { const a = A(); a.mortes++; if (M.chefe) a.kills = 0; else if (a.z > 1) { a.z--; a.kills = 0 } } // perdeu: volta a treinar (chefe de novo daqui a 10)

  // ---------------- o que aconteceu com o app fechado ----------------
  function simulaFora(seg) {
    const r = { seg, kills: 0, ouro: 0, itens: [], zonas: [], mortes: 0, forja: 0 }, a = A(), o0 = a.ouro; let t = 0;
    while (t < seg) { const M = proximo(), L = luta(heroi(), M); t += 4 + L.n * 1.6; if (t > seg) break;
      if (L.ganhou) { const v = venceu(M, L); r.kills++; if (v.it && v.it.equipou) r.itens.push(v.it); r.forja += v.fj; if (v.novaZ) r.zonas.push(a.z) } else { perdeu(M); r.mortes++; t += 20 } }
    r.ouro = a.ouro - o0; return r;
  }
  function atualiza() { const a = A(), agora = Date.now(), seg = Math.min(MAX_FORA, (agora - (a.t || agora)) / 1000); a.t = agora; if (seg < 15) return null; const r = simulaFora(seg); salva(); return r }

  // ---------------- desenho ----------------
  const tela = document.createElement('div'); tela.id = 'aventura'; tela.setAttribute('role', 'dialog'); tela.setAttribute('aria-label', 'Aventura');
  const cv = document.createElement('canvas'), ctx = cv.getContext('2d'), hud = document.createElement('div'), escuro = document.createElement('div');
  hud.className = 'avHud'; escuro.className = 'avEscuro'; tela.append(cv, escuro, hud); document.body.append(tela);
  const IMG = {}, TINT = {}, QUADROS = { anda: 8, ataca: 6, parada: 6, apanha: 4, cai: 6, comemora: 6 }, QM = { anda: 6, ataca: 6, parada: 4, apanha: 4, cai: 6 };
  const VISUAIS = [['heroi', 'Hana'], ['kai', 'Ruiva fofinha'], ['maga', 'Maguinha']]; // kai e maga: KayKit Adventurers (Rogue e Mage), CC0
  function visual() { const v = A().vis; return VISUAIS.some(x => x[0] === v) ? v : 'heroi' }
  function img(quem, an) { const k = quem + '_' + an; if (!IMG[k]) { const i = new Image(); i.src = 'aventura/' + k.toLowerCase() + '.png'; IMG[k] = i } return IMG[k] }
  function tingida(quem, an, rd) { if (!rd) return img(quem, an); const k = quem + an + rd; if (TINT[k]) return TINT[k]; const i = img(quem, an); if (!i.complete || !i.naturalWidth) return i;
    const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; const x = c.getContext('2d'); x.filter = 'hue-rotate(' + (rd * 75) + 'deg) saturate(1.2)'; x.drawImage(i, 0, 0); TINT[k] = c; return c }
  let W = 0, Hh = 0, fundo = null, camadas = null, zDesenhada = 0;
  function tamanho() { const r = tela.getBoundingClientRect(), k = Math.min(1.5, devicePixelRatio || 1); W = Math.round(r.width * k); Hh = Math.round(r.height * k); cv.width = W; cv.height = Hh; zDesenhada = 0 }
  function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 } }
  function montaFundo(z) { // céu (fixo) e 3 faixas que rolam: morros, árvores e chão (cada uma desenhada uma vez numa tela de 2x a largura)
    const Z = zona(z), r = rng(z * 97 + 13), chaoY = Math.round(Hh * 0.8);
    fundo = document.createElement('canvas'); fundo.width = W; fundo.height = Hh; let x = fundo.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, chaoY); g.addColorStop(0, Z.ceu[0]); g.addColorStop(1, Z.ceu[1]); x.fillStyle = g; x.fillRect(0, 0, W, Hh);
    for (let i = 0; i < 70; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.25 + r() * 0.6) + ')'; const s = r() < 0.15 ? 2 : 1; x.fillRect(r() * W | 0, r() * chaoY * 0.7 | 0, s, s) }
    x.fillStyle = 'rgba(255,244,214,.85)'; x.beginPath(); x.arc(W * 0.82, Hh * 0.17, Hh * 0.06, 0, 7); x.fill(); x.fillStyle = Z.ceu[0]; x.beginPath(); x.arc(W * 0.82 + Hh * 0.025, Hh * 0.155, Hh * 0.055, 0, 7); x.fill();
    const faixa = (desenha) => { const c = document.createElement('canvas'); c.width = W * 2; c.height = Hh; desenha(c.getContext('2d')); return c };
    camadas = [
      { v: 6, c: faixa(x => { x.fillStyle = Z.morro; x.beginPath(); x.moveTo(0, chaoY); for (let i = 0; i <= 16; i++) { const px = i / 16 * W * 2; x.lineTo(px, chaoY - Hh * (0.18 + 0.16 * Math.abs(Math.sin(i * 1.7 + z)))) } x.lineTo(W * 2, chaoY); x.fill() }) },
      { v: 16, c: faixa(x => { x.fillStyle = Z.arv; for (let i = 0; i < 18; i++) { const px = (i + r() * 0.6) / 18 * W * 2, h = Hh * (0.14 + r() * 0.12), lg = h * 0.45; x.fillRect(px - 2, chaoY - h * 0.35, 4, h * 0.35); x.beginPath(); x.moveTo(px - lg, chaoY - h * 0.3); x.lineTo(px, chaoY - h); x.lineTo(px + lg, chaoY - h * 0.3); x.fill() } }) },
      { v: 34, c: faixa(x => { x.fillStyle = Z.chao; x.fillRect(0, chaoY, W * 2, Hh - chaoY); x.fillStyle = Z.chao2; x.fillRect(0, chaoY, W * 2, 3); for (let i = 0; i < 90; i++) { const px = r() * W * 2, py = chaoY + 6 + r() * (Hh - chaoY - 8); x.fillRect(px, py, 2 + r() * 5, 2) } }) },
    ];
    zDesenhada = z;
  }
  // ---------------- cena ao vivo ----------------
  const V = { on: false, desc: false, est: 'anda', t: 0, quadro: 0, rolagem: 0, M: null, mx: 0, mhp: 0, H: null, hhp: 0, nums: [], faixa: null, toque: 0, timer: null, troca: 0, vez: 'h' };
  const chaoY = () => Math.round(Hh * 0.8), tamH = () => Hh * 0.46, hx = () => W * 0.3;
  function novoMonstro() { V.M = proximo(); V.mhp = V.M.hp; V.mx = W + tamH() * 0.6; V.est = 'chega'; V.t = 0 }
  function num(txt, x, y, cor) { V.nums.push({ txt, x, y, cor, t: 0 }) }
  function passo() { // 1 passo de 1/8 s
    const dt = 1 / FPS, a = A(); V.t += dt; V.quadro++; a.t = Date.now();
    TELA.ult = Date.now(); // tela acesa enquanto a aventura está aberta
    if (V.est === 'anda') { V.rolagem += dt; V.hhp = Math.min(V.H.hp, V.hhp + V.H.hp * 0.25 * dt); if (V.t > 3) novoMonstro() }
    else if (V.est === 'chega') { V.rolagem += dt; V.mx -= W * 0.28 * dt; if (V.mx <= hx() + tamH() * 0.62) { V.est = 'luta'; V.t = 0; V.vez = 'h'; V.troca = 0 } }
    else if (V.est === 'luta') {
      V.troca += dt; if (V.troca >= 0.8) { V.troca = 0; const H = V.H, M = V.M;
        if (V.vez === 'h') { const c = Math.random() < H.crit, d = Math.round(H.atk * (c ? 2 : 1)); V.mhp -= d; num((c ? '💥' : '') + d, V.mx, chaoY() - tamH() * 0.9, c ? '#ffd23a' : '#fff'); V.vez = 'm'; V.golpeH = 0.75; V.ferM = 0.5;
          if (V.mhp <= 0) { V.est = 'mmorre'; V.t = 0; const v = venceu(M); num('+' + Math.round(M.ouro * H.ouro) + ' 🪙', V.mx, chaoY() - tamH() * 1.1, '#ffd86b'); try { plim(0, 0.15) } catch (e) {}
            if (v.it) V.faixa = { txt: v.it.equipou ? SLOT[v.it.s][0] + ' ' + v.it.nome + ' (' + RAR[v.it.r][0] + ')' : '🪙 ' + v.it.nome + ' vendido', cor: RAR[v.it.r][2], t: 0 };
            if (v.fj) V.faixa = { txt: '⚒ Espada na forja: +' + A().forja, cor: '#ffd86b', t: 0 };
            if (v.novaZ) { V.faixa = { txt: '👑 Chefe vencido! Zona ' + A().z + ': ' + nomeZ(A().z), cor: '#ffe066', t: 0, longo: true }; V.comemora = 2 } salva() } }
        else { V.hhp -= M.atk; num('-' + Math.round(M.atk), hx(), chaoY() - tamH() * 0.95, '#ff8a8a'); V.vez = 'h'; V.golpeM = 0.75; V.ferH = 0.5;
          if (V.hhp <= 0) { V.est = 'hmorre'; V.t = 0; perdeu(M); salva(); V.faixa = { txt: M.chefe ? '😵 O chefe é forte demais: faça tarefas pra subir de nível' : '😵 Recuou pra zona ' + A().z, cor: '#ff9a8a', t: 0, longo: true } } } } }
    else if (V.est === 'mmorre') { if (V.t > 0.9) { V.M = null; V.H = heroi(); V.est = V.comemora ? 'festa' : 'anda'; V.t = 0 } }
    else if (V.est === 'festa') { if (V.t > 1.6) { V.comemora = 0; V.est = 'anda'; V.t = 0; zDesenhada = 0 } }
    else if (V.est === 'hmorre') { if (V.t > 4) { V.M = null; V.H = heroi(); V.hhp = V.H.hp; V.est = 'anda'; V.t = 0; zDesenhada = 0 } }
    for (const n of V.nums) n.t += dt; V.nums = V.nums.filter(n => n.t < 1.1); if (V.faixa) { V.faixa.t += dt; if (V.faixa.t > (V.faixa.longo ? 4 : 2.2)) V.faixa = null }
    ['golpeH', 'golpeM', 'ferH', 'ferM'].forEach(k => { if (V[k] > 0) V[k] -= dt });
    if (V.desc && Date.now() - V.toque > 20000) escuro.style.opacity = 0.55; // descanso: escurece sozinho (gasta menos)
    if (Date.now() - V.toque > 6000) hud.classList.add('some');
    desenha(); if (V.quadro % FPS === 0 && !hud.classList.contains('some')) desenhaHud();
  }
  function sprite(quem, an, n, i, x, y, alt, rd, flash) { const im = tingida(quem, an, rd); if (!im || !(im.naturalWidth || im.width)) return; const fw = (im.naturalWidth || im.width) / n, fh = im.naturalHeight || im.height, s = alt / fh;
    ctx.drawImage(im, (i % n) * fw, 0, fw, fh, x - fw * s / 2, y - fh * s, fw * s, fh * s); if (flash) { ctx.globalAlpha = 0.35; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(im, (i % n) * fw, 0, fw, fh, x - fw * s / 2, y - fh * s, fw * s, fh * s); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over' } }
  function desenha() {
    const a = A(); if (zDesenhada !== a.z || !fundo) montaFundo(a.z); ctx.drawImage(fundo, 0, 0);
    for (const L of camadas) { const off = Math.round(V.rolagem * L.v * (W / 400)) % (W * 2); ctx.drawImage(L.c, -off, 0); if (off > W) ctx.drawImage(L.c, W * 2 - off, 0) }
    const y = chaoY() + Hh * 0.03, F = tamH() / 0.85, q = V.quadro;
    let an = 'parada', i = q; if (V.est === 'anda' || V.est === 'chega') an = 'anda'; else if (V.est === 'hmorre') { an = 'cai'; i = Math.min(5, Math.floor(V.t * 6)) } else if (V.est === 'festa') an = 'comemora'; else if (V.golpeH > 0) { an = 'ataca'; i = Math.min(5, Math.floor((0.75 - V.golpeH) * 8)) } else if (V.ferH > 0) an = 'apanha';
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(hx(), y - 2, tamH() * 0.2, tamH() * 0.04, 0, 0, 7); ctx.fill();
    const vis = visual(); sprite(vis, an, QUADROS[an], i, hx() - (vis !== 'heroi' && an === 'cai' ? F * 0.3 : 0), y, F, 0, V.ferH > 0.3);
    if (V.M) { const M = V.M, k = M.chefe ? 1.4 : 1, rd = rodada(a.z); let am = 'anda', j = q;
      if (V.est === 'luta') { if (V.golpeM > 0) { am = 'ataca'; j = Math.min(5, Math.floor((0.75 - V.golpeM) * 8)) } else if (V.ferM > 0) am = 'apanha'; else am = 'parada' } else if (V.est === 'mmorre') { am = 'cai'; j = Math.min(5, Math.floor(V.t * 7)) }
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(V.mx, y - 2, tamH() * 0.22 * k, tamH() * 0.045, 0, 0, 7); ctx.fill();
      if (V.est === 'mmorre') ctx.globalAlpha = Math.max(0, 1 - V.t * 0.9); sprite(M.tipo, am, QM[am], j, V.mx, y, F * 0.85 * k, rd, V.ferM > 0.3); ctx.globalAlpha = 1;
      if (V.est === 'luta' || V.est === 'chega') { const bw = tamH() * 0.5 * k, bx = V.mx - bw / 2, by = y - F * 0.85 * k * 0.93; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(bx, by, bw, 6); ctx.fillStyle = M.chefe ? '#ff6a3d' : '#e04848'; ctx.fillRect(bx, by, bw * Math.max(0, V.mhp / M.hp), 6);
        ctx.font = 'bold ' + Math.round(Hh * 0.032) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = M.chefe ? '#ffe066' : '#d6dcea'; ctx.fillText((M.chefe ? '👑 ' : '') + NOME_M[M.tipo] + ' nv ' + M.lv, V.mx, by - 5) } }
    // vida da heroína
    if (V.H) { const bw = tamH() * 0.45, bx = hx() - bw / 2, by = y - F * 0.98; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(bx, by, bw, 5); ctx.fillStyle = '#5fd47a'; ctx.fillRect(bx, by, bw * Math.max(0, V.hhp / V.H.hp), 5) }
    ctx.textAlign = 'center'; ctx.font = '900 ' + Math.round(Hh * 0.045) + 'px system-ui';
    for (const n of V.nums) { ctx.globalAlpha = Math.max(0, 1 - n.t); ctx.fillStyle = '#000'; ctx.fillText(n.txt, n.x + 2, n.y - n.t * Hh * 0.08 + 2); ctx.fillStyle = n.cor; ctx.fillText(n.txt, n.x, n.y - n.t * Hh * 0.08) } ctx.globalAlpha = 1;
    if (V.faixa) { const f = V.faixa; ctx.font = '800 ' + Math.round(Hh * 0.042) + 'px system-ui'; const tw = ctx.measureText(f.txt).width + 30; ctx.fillStyle = 'rgba(5,8,18,.78)'; ctx.fillRect(W / 2 - tw / 2, Hh * 0.08, tw, Hh * 0.08); ctx.fillStyle = f.cor; ctx.fillText(f.txt, W / 2, Hh * 0.135) }
    if (V.est === 'hmorre' && V.t > 1) { ctx.font = '700 ' + Math.round(Hh * 0.036) + 'px system-ui'; ctx.fillStyle = '#d6dcea'; ctx.fillText('Descansando…', hx(), chaoY() - tamH() * 1.05) }
  }
  function desenhaHud() { const a = A(), H = heroi(), ch = a.z === a.maxZ; hud.innerHTML = '';
    const top = el('div', 'avTopo'), x = el('button', null, '✕'); x.setAttribute('aria-label', 'Fechar a aventura'); x.onclick = fecha;
    top.append(el('b', null, '🗺 ' + nomeZ(a.z)), el('span', null, '⭐ Nível ' + S.nv + ' (das tarefas)'), el('span', null, '🪙 ' + a.ouro), el('span', null, ch ? '👑 chefe em ' + Math.max(0, KILLS_CHEFE - a.kills) : '↩ treinando'), x); hud.append(top);
    const eq = el('div', 'avEq'); for (const s of ['arma', 'arm', 'amu']) { const it = a.eq[s], d = el('span', null, SLOT[s][0] + ' ' + (it ? it.nome + ' +' + Math.round(it.pct * 100) + '%' : '—')); if (it) d.style.color = RAR[it.r][2]; eq.append(d) }
    eq.append(el('span', null, '⚒ Forja ' + a.forja + ' (+' + a.forja * 4 + '%)' + (a.forja >= 2 * S.nv ? ' · máx. no nível' : '')), el('span', null, '⚔ ' + Math.round(H.atk) + '  ❤ ' + H.hp)); hud.append(eq);
    if (ch && a.kills >= KILLS_CHEFE - 1) { const need = nivelPraChefe(a.z); if (need > S.nv) hud.append(el('div', 'avDica', '💡 O chefe desta zona pede uns nível ' + need + '. Cada tarefa feita deixa a heroína mais forte.')) }
    const op = el('div', 'avOp'), b = el('button', null, (a.auto ? '🌙 Liga sozinho depois de ' + a.auto + ' min parado' : '🌙 Não liga sozinho')); b.onclick = e => { e.stopPropagation(); a.auto = a.auto === 3 ? 10 : a.auto === 10 ? 0 : 3; salva(); desenhaHud() }; const vb = el('button', null, '👤 ' + VISUAIS.find(x => x[0] === visual())[1]); vb.onclick = e => { e.stopPropagation(); const i = VISUAIS.findIndex(x => x[0] === visual()); A().vis = VISUAIS[(i + 1) % VISUAIS.length][0]; salva(); Object.keys(QUADROS).forEach(an => img(visual(), an)); desenhaHud() }; op.append(vb, b); hud.append(op);
  }
  // ---------------- abrir e fechar ----------------
  function abre(desc) {
    if (V.on) return; V.on = true; V.desc = !!desc; tela.classList.add('on'); tamanho(); const r = atualiza(); V.H = heroi(); V.hhp = V.H.hp; V.est = 'anda'; V.t = 0; V.M = null; V.nums = []; V.faixa = null; V.toque = Date.now(); escuro.style.opacity = 0; hud.classList.remove('some');
    [visual(), ...MONS].forEach(q => Object.keys(MONS.includes(q) ? QM : QUADROS).forEach(an => img(q, an)));
    desenhaHud(); if (r && r.kills + r.mortes > 0) mostraFora(r);
    try { prendeTela() } catch (e) {} clearInterval(V.timer); V.timer = setInterval(passo, 1000 / FPS);
  }
  function fecha() { V.on = false; clearInterval(V.timer); V.timer = null; tela.classList.remove('on'); A().t = Date.now(); salva(); try { desenhaHoje() } catch (e) {} }
  function mostraFora(r) { const h = Math.floor(r.seg / 3600), m = Math.floor(r.seg / 60) % 60, c = el('div', 'avFora');
    c.append(el('b', null, '🌙 Enquanto você estava fora (' + (h ? h + 'h' + String(m).padStart(2, '0') : m + ' min') + ')'),
      el('div', null, '⚔ ' + r.kills + ' monstros  ·  🪙 +' + r.ouro + (r.itens.length ? '  ·  🎁 ' + r.itens.length + ' equipamento' + (r.itens.length > 1 ? 's' : '') : '') + (r.forja ? '  ·  ⚒ forja +' + r.forja : '')));
    if (r.zonas.length) c.append(el('div', null, '👑 Passou de zona! Agora na ' + nomeZ(A().z)));
    if (r.mortes) c.append(el('div', null, '😵 Perdeu ' + r.mortes + 'x pro chefe. Fazer tarefas deixa ela mais forte.'));
    const ok = el('button', null, 'Beleza'); ok.onclick = e => { e.stopPropagation(); c.remove() }; c.append(ok); tela.append(c); setTimeout(() => c.remove(), 15000) }
  tela.addEventListener('pointerdown', () => { V.toque = Date.now(); escuro.style.opacity = 0; hud.classList.remove('some'); desenhaHud() });
  addEventListener('resize', () => { if (V.on) tamanho() });
  document.addEventListener('visibilitychange', () => { if (!V.on) return; if (document.visibilityState === 'visible') { const r = atualiza(); V.H = heroi(); V.hhp = V.H.hp; if (r && r.kills + r.mortes > 0) mostraFora(r); V.timer = V.timer || setInterval(passo, 1000 / FPS) } else { clearInterval(V.timer); V.timer = null; A().t = Date.now(); salva() } });
  window.AV = { abre, fecha, aberta: () => V.on, auto: () => A().auto, atualiza, heroi, monstro, luta, nivelPraChefe, simulaFora, A };
})();
