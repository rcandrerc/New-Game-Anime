// Aventura 2D (18/11/2026): RPG que se joga sozinho. A heroína anda, luta, pega itens e passa de zona sozinha;
// a força dela vem do nível (S.nv), que só sobe com as tarefas. Feito pra rodar como "descanso de tela":
// fundo escuro, 8 quadros por segundo, e quando o app fica fechado o jogo calcula o que aconteceu (até 12 h).
// Usa do habitos.html: S, salva, hoje, el, aviso, TELA, prendeTela, somLiga, plim. Sprites: aventura/*.png (tools/sprites_aventura.js).
(() => {
  const VER = 4; // sobe quando os sprites mudam (o celular não fica com imagem velha)
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
  const CAJADOS = ['Varinha', 'Cajado de carvalho', 'Cajado de cristal', 'Cajado rúnico', 'Cajado estelar'];
  // Habilidades: as mesmas do Age of Embers (rpg-realista, shared/dados.js, build padrão), em versão simples pro idle.
  // Espada na mão usa as 4 de espada; cajado usa as 4 de magia (gastam mana). Cada uma libera num nível das tarefas.
  const LIBERA = [1, 3, 6, 10];
  const SKILLS = {
    espada: [{ nome: 'Investida', m: 1.9, cd: 3, fx: 'corte', cor: '#9fe8ff' }, { nome: 'Giro da Lâmina', m: 2.4, cd: 4, fx: 'giro', cor: '#cfe9ff' }, { nome: 'Salto Esmagador', m: 1.7, cd: 4, fx: 'chao', cor: '#ffd27a' }, { nome: 'Combo Relâmpago', m: 2.1, cd: 3, fx: 'raio', cor: '#fff27a' }],
    cajado: [{ nome: 'Cometa de Fogo', m: 1.6, cd: 2, mana: 10, fx: 'fogo', cor: '#ff7a2a' }, { nome: 'Raio Celeste', m: 1.8, cd: 4, mana: 25, fx: 'raio', cor: '#bfe3ff' }, { nome: 'Explosão', m: 2.0, cd: 4, mana: 25, fx: 'fogo', cor: '#ff5a1a' }, { nome: 'Chuva de Meteoros', m: 2.3, cd: 5, mana: 30, fx: 'meteoro', cor: '#ffa21a' }],
  };
  const MANA = 100, MANA_TURNO = 8;
  function golpe(H, st, rnd) { // um golpe da heroína: usa a habilidade pronta mais forte (se tiver mana), senão o básico
    for (let i = 0; i < st.cd.length; i++) if (st.cd[i] > 0) st.cd[i]--; st.mana = Math.min(MANA, st.mana + MANA_TURNO);
    let sk = null, k = -1; (H.skills || []).forEach((x, i) => { if (st.cd[i] === 0 && (!x.mana || st.mana >= x.mana) && (!sk || x.m > sk.m)) { sk = x; k = i } });
    if (!sk && H.skills && H.skills.some(x => x.mana) && st.mana < 25 && st.pm > st.pmu) { st.pmu++; st.mana = MANA }
    if (sk) { st.cd[k] = sk.cd; if (sk.mana) st.mana -= sk.mana }
    const c = rnd() < H.crit; return { d: H.atk * (sk ? sk.m : 1) * (c ? 2 : 1), c, sk } }
  const BOLSA_MAX = 30, precoPocao = z => 10 + 4 * z, precoVenda = it => it.z * 5 * (it.r + 1);
  const SLOT = { arma: ['🗡', ['Espada curta', 'Sabre', 'Lâmina de aço', 'Espada rúnica', 'Lâmina estelar']], arm: ['🛡', ['Gibão', 'Cota de malha', 'Armadura leve', 'Armadura rúnica', 'Manto estelar']], amu: ['📿', ['Pingente', 'Amuleto', 'Talismã', 'Colar rúnico', 'Joia estelar']] };

  // ---------------- estado (S.av) e contas ----------------
  function A() { if (!S.av) S.av = { z: 1, maxZ: 1, kills: 0, ouro: 0, forja: 0, eq: {}, t: Date.now(), tot: 0, mortes: 0, auto: 3 }; const a = S.av; if (!a.bolsa) a.bolsa = []; if (a.poc == null) a.poc = 0; if (a.novos == null) a.novos = 0; if (a.pm == null) a.pm = 0; return a }
  const zona = z => ZONAS[(z - 1) % ZONAS.length], rodada = z => Math.floor((z - 1) / ZONAS.length);
  const nomeZ = z => zona(z).nome + (rodada(z) ? ' ' + ['', 'II', 'III', 'IV', 'V', 'VI'][Math.min(5, rodada(z))] : '');
  function heroi() { const a = A(), nv = S.nv || 1, e = a.eq, p = s => (e[s] ? e[s].pct : 0);
    return { atk: (6 + 3 * nv) * (1 + 0.04 * a.forja + p('arma')), hp: Math.round((60 + 15 * nv) * (1 + p('arm'))), crit: 0.08 + p('amu') * 0.5, ouro: 1 + p('amu'), poc: a.poc, pm: a.pm, skills: (SKILLS[!e.arma ? '' : e.arma.tipo === 'cajado' ? 'cajado' : 'espada'] || []).filter((x, i) => nv >= LIBERA[i]) } }
  function monstro(z, chefe, rnd = Math.random) { const m = 2 * z - 1 + (chefe ? 2 : rnd() < 0.5 ? 0 : 1), th = zona(z).mon;
    const tipo = chefe ? th : rnd() < 0.7 ? th : MONS[Math.floor(rnd() * MONS.length)];
    return { tipo, chefe, lv: m, hp: Math.round((18 + 14 * m) * (chefe ? 2.5 : 1)), atk: (3 + 2.6 * m) * (chefe ? 1.25 : 1), ouro: Math.round((2 + m) * (chefe ? 8 : 1)) } }
  function luta(H, M, rnd = Math.random) { // troca de golpes (a heroína bate primeiro): quem ganha e quantas trocas
    // poção: quando a vida cai abaixo de 35%, bebe uma (se tiver) e recupera 60%
    let hp = H.hp, mh = M.hp, n = 0, pu = 0; const tem = H.poc || 0, st = { cd: [0, 0, 0, 0], mana: MANA, pm: H.pm || 0, pmu: 0 }; while (n < 400) { n++; mh -= golpe(H, st, rnd).d; if (mh <= 0) return { ganhou: true, n, hp, pu, pmu: st.pmu }; hp -= M.atk; if (hp < H.hp * 0.35 && hp > 0 && pu < tem) { pu++; hp = Math.min(H.hp, hp + H.hp * 0.6) } if (hp <= 0) return { ganhou: false, n, hp: 0, pu, pmu: st.pmu } } return { ganhou: false, n, hp, pu, pmu: st.pmu }
  }
  function nivelPraChefe(z) { const nv0 = S.nv; let v = nv0; for (; v < nv0 + 60; v++) { S.nv = v; const H = heroi(), M = monstro(z, true, () => 0.5); H.crit = 0; H.poc = 0; H.pm = 0; if (luta(H, M, () => 1).ganhou) break } S.nv = nv0; return v }
  function dropa(z, chefe, rnd = Math.random) { // item novo vai pra bolsa (quem equipa é o André); bolsa cheia: vende sozinho
    if (!chefe && rnd() > 0.06) return null; const a = A(), x = rnd(), r = chefe ? (x < 0.25 ? 2 : 1) : x < 0.04 ? 2 : x < 0.25 ? 1 : 0, slots = Object.keys(SLOT), s = slots[Math.floor(rnd() * 3)];
    const ip = z + (chefe ? 1 : 0), pct = Math.round(ip * 0.045 * RAR[r][1] * 100) / 100, tier = Math.min(4, Math.floor((ip - 1) / 2)), cajado = s === 'arma' && rnd() < 0.5, nome = cajado ? CAJADOS[tier] : SLOT[s][1][tier];
    const it = { id: Date.now().toString(36) + Math.floor(rnd() * 1e6).toString(36), s, nome, r, pct, z: ip }; if (s === 'arma') it.tipo = cajado ? 'cajado' : 'espada';
    if (a.bolsa.length >= BOLSA_MAX) { const v = precoVenda(it); a.ouro += v; return Object.assign({ vendeu: v }, it) }
    a.bolsa.push(it); a.novos++; return Object.assign({ bolsa: true }, it)
  }
  const custoForja = n => Math.round(40 * Math.pow(1.45, n));
  const forjaMax = () => 2 * (S.nv || 1); // a forja vai até 2x o nível: quem manda é a tarefa
  function forja() { const a = A(); if (a.forja >= forjaMax() || a.ouro < custoForja(a.forja)) return false; a.ouro -= custoForja(a.forja); a.forja++; return true } // agora só na loja, pela mão do André
  function venceu(M, res) { // depois de uma luta ganha: ouro, item, chefe e zona
    const a = A(), H = heroi(); a.kills++; a.tot++; a.ouro += Math.round(M.ouro * H.ouro); a.poc = Math.max(0, a.poc - (res && res.pu || 0)); a.pm = Math.max(0, a.pm - (res && res.pmu || 0)); const it = dropa(a.z, M.chefe), fj = 0; let novaZ = false;
    if (M.chefe) { a.maxZ = Math.max(a.maxZ, a.z + 1); a.z++; a.kills = 0; novaZ = true }
    return { it, fj, novaZ };
  }
  function proximo() { const a = A(); return monstro(a.z, a.z === a.maxZ && a.kills >= KILLS_CHEFE) }
  function perdeu(M, res) { const a = A(); a.poc = Math.max(0, a.poc - (res && res.pu || 0)); a.pm = Math.max(0, a.pm - (res && res.pmu || 0)); a.mortes++; if (M.chefe) a.kills = 0; else if (a.z > 1) { a.z--; a.kills = 0 } } // perdeu: volta a treinar (chefe de novo daqui a 10)

  // ---------------- o que aconteceu com o app fechado ----------------
  function simulaFora(seg) {
    const r = { seg, kills: 0, ouro: 0, itens: [], zonas: [], mortes: 0, forja: 0, poc: 0, vendidos: 0 }, a = A(), o0 = a.ouro; let t = 0;
    while (t < seg) { const M = proximo(), L = luta(heroi(), M); t += 4 + L.n * 1.6; if (t > seg) break;
      r.poc += L.pu; r.pm = (r.pm || 0) + (L.pmu || 0); if (L.ganhou) { const v = venceu(M, L); r.kills++; if (v.it && v.it.bolsa) r.itens.push(v.it); if (v.it && v.it.vendeu) r.vendidos++; if (v.novaZ) r.zonas.push(a.z) } else { perdeu(M, L); r.mortes++; t += 20 } }
    r.ouro = a.ouro - o0; return r;
  }
  function atualiza() { const a = A(), agora = Date.now(), seg = Math.min(MAX_FORA, (agora - (a.t || agora)) / 1000); a.t = agora; if (seg < 15) return null; const r = simulaFora(seg); salva(); return r }

  // ---------------- desenho ----------------
  const tela = document.createElement('div'); tela.id = 'aventura'; tela.setAttribute('role', 'dialog'); tela.setAttribute('aria-label', 'Aventura');
  const cv = document.createElement('canvas'), ctx = cv.getContext('2d'), hud = document.createElement('div'), escuro = document.createElement('div');
  hud.className = 'avHud'; escuro.className = 'avEscuro'; tela.append(cv, escuro, hud); document.body.append(tela);
  const IMG = {}, TINT = {}, QUADROS = { anda: 8, ataca: 6, parada: 6, apanha: 4, cai: 6, comemora: 6 }, QM = { anda: 6, ataca: 6, parada: 4, apanha: 4, cai: 6 };
  // a roupa segue a arma (KayKit Adventurers, CC0): sem arma = aventureira, espada = guerreira de armadura, cajado = maga de chapéu
  const ico = it => it.tipo === 'cajado' ? '🪄' : SLOT[it.s][0];
  function tipoArma() { const w = A().eq.arma; return !w ? 'nu' : w.tipo === 'cajado' ? 'cajado' : 'espada' }
  function visual() { return 'kai_' + tipoArma() }
  function img(quem, an) { const k = quem + '_' + an; if (!IMG[k]) { const i = new Image(); i.src = 'aventura/' + k.toLowerCase() + '.png?v=' + VER; IMG[k] = i } return IMG[k] }
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
    const clara = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = v => Math.min(255, Math.round(v + (255 - v) * k)); return 'rgb(' + f(n >> 16) + ',' + f(n >> 8 & 255) + ',' + f(n & 255) + ')' };
    camadas = [ // estilo fofinho: morros redondos, árvores de copa redonda, moitas e florzinhas (tudo desenhado uma vez só)
      { v: 6, c: faixa(x => { x.fillStyle = Z.morro; for (let i = 0; i < 9; i++) { const px = (i + r() * 0.5) / 8 * W * 2, rw = W * (0.16 + r() * 0.12), rh = Hh * (0.14 + r() * 0.12); x.beginPath(); x.ellipse(px, chaoY, rw, rh, 0, Math.PI, 0); x.fill() }
        x.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 5; i++) { const px = r() * W * 2, py = Hh * (0.12 + r() * 0.25), lw = W * (0.06 + r() * 0.06); x.beginPath(); x.ellipse(px, py, lw, lw * 0.28, 0, 0, 7); x.ellipse(px + lw * 0.45, py - lw * 0.12, lw * 0.5, lw * 0.26, 0, 0, 7); x.fill() } }) },
      { v: 16, c: faixa(x => { for (let i = 0; i < 14; i++) { const px = (i + r() * 0.7) / 14 * W * 2, h = Hh * (0.16 + r() * 0.1), rr = h * 0.32;
          x.fillStyle = '#2a1d16'; x.beginPath(); x.roundRect ? x.roundRect(px - rr * 0.14, chaoY - h * 0.45, rr * 0.28, h * 0.45, rr * 0.1) : x.rect(px - rr * 0.14, chaoY - h * 0.45, rr * 0.28, h * 0.45); x.fill();
          x.fillStyle = Z.arv; for (const [dx, dy, k] of [[-0.55, -0.55, 0.7], [0.55, -0.55, 0.7], [0, -0.95, 0.85], [0, -0.5, 0.8]]) { x.beginPath(); x.arc(px + dx * rr, chaoY - h * 0.45 + dy * rr, rr * k, 0, 7); x.fill() }
          x.fillStyle = clara(Z.arv, 0.12); x.beginPath(); x.arc(px - rr * 0.25, chaoY - h * 0.45 - rr * 1.05, rr * 0.35, 0, 7); x.fill() } }) },
      { v: 34, c: faixa(x => { x.fillStyle = Z.chao; x.fillRect(0, chaoY, W * 2, Hh - chaoY); x.fillStyle = Z.chao2; x.fillRect(0, chaoY, W * 2, 3);
          for (let i = 0; i < 16; i++) { const px = r() * W * 2, rr = Hh * (0.02 + r() * 0.02); x.fillStyle = clara(Z.arv, 0.05); x.beginPath(); x.arc(px, chaoY, rr, Math.PI, 0); x.arc(px + rr, chaoY, rr * 0.8, Math.PI, 0); x.fill() }
          const flor = ['#ff9ec7', '#ffe07a', '#c9a7ff', '#ffffff']; for (let i = 0; i < 60; i++) { const px = r() * W * 2, py = chaoY + 8 + r() * (Hh - chaoY - 12); x.fillStyle = Z.chao2; x.fillRect(px, py, 3, 2); if (r() < 0.35) { x.fillStyle = flor[Math.floor(r() * 4)]; x.beginPath(); x.arc(px, py - 2, 2, 0, 7); x.fill() } } }) },
    ];
    zDesenhada = z;
  }
  // ---------------- cena ao vivo ----------------
  const V = { on: false, desc: false, est: 'anda', t: 0, quadro: 0, rolagem: 0, M: null, mx: 0, mhp: 0, H: null, hhp: 0, nums: [], faixa: null, toque: 0, timer: null, troca: 0, vez: 'h' };
  const chaoY = () => Math.round(Hh * 0.8), tamH = () => Hh * 0.33, hx = () => W * 0.3;
  function novoMonstro() { V.M = proximo(); V.mhp = V.M.hp; V.mx = W + tamH() * 0.6; V.est = 'chega'; V.t = 0 }
  function num(txt, x, y, cor) { V.nums.push({ txt, x, y, cor, t: 0 }) }
  function passo() { // 1 passo de 1/8 s
    const dt = 1 / FPS, a = A(); V.t += dt; V.quadro++; a.t = Date.now();
    TELA.ult = Date.now(); // tela acesa enquanto a aventura está aberta
    if (V.est === 'anda') { V.rolagem += dt; V.hhp = Math.min(V.H.hp, V.hhp + V.H.hp * 0.25 * dt); if (V.t > 3) novoMonstro() }
    else if (V.est === 'chega') { V.rolagem += dt; V.mx -= W * 0.28 * dt; if (V.mx <= hx() + tamH() * 0.62) { V.est = 'luta'; V.t = 0; V.vez = 'h'; V.troca = 0; V.st = { cd: [0, 0, 0, 0], mana: V.st ? V.st.mana : MANA, pm: A().pm, pmu: 0 } } }
    else if (V.est === 'luta') {
      V.troca += dt; if (V.troca >= 0.8) { V.troca = 0; const H = V.H, M = V.M;
        if (V.vez === 'h') { V.st.pm = A().pm; const pm0 = V.st.pmu, g = golpe(H, V.st, Math.random), c = g.c, d = Math.round(g.d); if (V.st.pmu > pm0) { A().pm = Math.max(0, A().pm - 1); V.st.pmu = pm0; num('🔷 mana', hx(), chaoY() - tamH() * 1.15, '#8fc8ff') }
          V.mhp -= d; num((c ? '💥' : '') + d, V.mx, chaoY() - tamH() * 0.9, g.sk ? g.sk.cor : c ? '#ffd23a' : '#fff'); if (g.sk) { V.fx = { sk: g.sk, t: 0 }; V.skNome = { txt: g.sk.nome, cor: g.sk.cor, t: 0 } } V.vez = 'm'; V.golpeH = 0.75; V.ferM = 0.5;
          if (V.mhp <= 0) { V.est = 'mmorre'; V.t = 0; const v = venceu(M); num('+' + Math.round(M.ouro * H.ouro) + ' 🪙', V.mx, chaoY() - tamH() * 1.1, '#ffd86b'); try { plim(0, 0.15) } catch (e) {}
            if (v.it) V.faixa = { txt: v.it.bolsa ? '🎒 ' + ico(v.it) + ' ' + v.it.nome + ' (' + RAR[v.it.r][0] + ') foi pra bolsa' : '🎒 Bolsa cheia: ' + v.it.nome + ' vendido', cor: RAR[v.it.r][2], t: 0 };
            if (v.novaZ) { V.faixa = { txt: '👑 Chefe vencido! Zona ' + A().z + ': ' + nomeZ(A().z), cor: '#ffe066', t: 0, longo: true }; V.comemora = 2 } salva() } }
        else { V.hhp -= M.atk; num('-' + Math.round(M.atk), hx(), chaoY() - tamH() * 0.95, '#ff8a8a'); V.vez = 'h'; V.golpeM = 0.75; V.ferH = 0.5;
          if (V.hhp > 0 && V.hhp < H.hp * 0.35 && A().poc > 0) { A().poc--; V.hhp = Math.min(H.hp, V.hhp + H.hp * 0.6); num('🧪 +' + Math.round(H.hp * 0.6), hx(), chaoY() - tamH() * 1.15, '#7dffa0'); salva() }
          if (V.hhp <= 0) { V.est = 'hmorre'; V.t = 0; perdeu(M); salva(); V.faixa = { txt: M.chefe ? '😵 O chefe é forte demais: faça tarefas pra subir de nível' : '😵 Recuou pra zona ' + A().z, cor: '#ff9a8a', t: 0, longo: true } } } } }
    else if (V.est === 'mmorre') { if (V.t > 0.9) { V.M = null; V.H = heroi(); V.est = V.comemora ? 'festa' : 'anda'; V.t = 0 } }
    else if (V.est === 'festa') { if (V.t > 1.6) { V.comemora = 0; V.est = 'anda'; V.t = 0; zDesenhada = 0 } }
    else if (V.est === 'hmorre') { if (V.t > 4) { V.M = null; V.H = heroi(); V.hhp = V.H.hp; V.est = 'anda'; V.t = 0; zDesenhada = 0 } }
    if (V.fx) { V.fx.t += dt; if (V.fx.t > 0.7) V.fx = null } if (V.skNome) { V.skNome.t += dt; if (V.skNome.t > 1.2) V.skNome = null }
    for (const n of V.nums) n.t += dt; V.nums = V.nums.filter(n => n.t < 1.1); if (V.faixa) { V.faixa.t += dt; if (V.faixa.t > (V.faixa.longo ? 4 : 2.2)) V.faixa = null }
    ['golpeH', 'golpeM', 'ferH', 'ferM'].forEach(k => { if (V[k] > 0) V[k] -= dt });
    if (painel.isConnected) V.toque = Date.now(); // com a bolsa aberta não escurece
    if (V.desc && Date.now() - V.toque > 20000) escuro.style.opacity = 0.55; // descanso: escurece sozinho (gasta menos)
    if (Date.now() - V.toque > 6000) hud.classList.add('some');
    desenha(); if (V.quadro % FPS === 0 && !hud.classList.contains('some') && Date.now() - V.toque > 700) desenhaHud();
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
    const vis = visual(); sprite(vis, an, QUADROS[an], i, hx() - (an === 'cai' ? F * 0.3 : 0), y, F, 0, V.ferH > 0.3);
    if (an === 'ataca' && vis === 'kai_cajado' && V.M) { const p = Math.min(1, (0.75 - V.golpeH) / 0.6), ox = hx() + F * 0.25, oy = y - F * 0.45, bx = ox + (V.mx - ox) * p; // bolinha de magia
      ctx.fillStyle = 'rgba(150,255,140,.35)'; ctx.beginPath(); ctx.arc(bx, oy, F * 0.09, 0, 7); ctx.fill(); ctx.fillStyle = '#eaffb0'; ctx.beginPath(); ctx.arc(bx, oy, F * 0.045, 0, 7); ctx.fill() }
    if (V.M) { const M = V.M, k = M.chefe ? 1.4 : 1, rd = rodada(a.z); let am = 'anda', j = q;
      if (V.est === 'luta') { if (V.golpeM > 0) { am = 'ataca'; j = Math.min(5, Math.floor((0.75 - V.golpeM) * 8)) } else if (V.ferM > 0) am = 'apanha'; else am = 'parada' } else if (V.est === 'mmorre') { am = 'cai'; j = Math.min(5, Math.floor(V.t * 7)) }
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(V.mx, y - 2, tamH() * 0.22 * k, tamH() * 0.045, 0, 0, 7); ctx.fill();
      if (V.est === 'mmorre') ctx.globalAlpha = Math.max(0, 1 - V.t * 0.9); sprite(M.tipo, am, QM[am], j, V.mx, y, F * 0.85 * k, rd, V.ferM > 0.3); ctx.globalAlpha = 1;
      if (V.est === 'luta' || V.est === 'chega') { const bw = tamH() * 0.5 * k, bx = V.mx - bw / 2, by = y - F * 0.85 * k * 0.93; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(bx, by, bw, 6); ctx.fillStyle = M.chefe ? '#ff6a3d' : '#e04848'; ctx.fillRect(bx, by, bw * Math.max(0, V.mhp / M.hp), 6);
        ctx.font = 'bold ' + Math.round(Hh * 0.032) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = M.chefe ? '#ffe066' : '#d6dcea'; ctx.fillText((M.chefe ? '👑 ' : '') + NOME_M[M.tipo] + ' nv ' + M.lv, V.mx, by - 5) } }
    if (V.fx && V.M) desenhaFx(V.fx, y, F);
    if (V.skNome) { ctx.globalAlpha = Math.max(0, 1 - V.skNome.t / 1.2); ctx.font = '900 ' + Math.round(Hh * 0.04) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(V.skNome.txt, hx() + 2, y - F * 1.08 + 2); ctx.fillStyle = V.skNome.cor; ctx.fillText(V.skNome.txt, hx(), y - F * 1.08); ctx.globalAlpha = 1 }
    // vida e mana da heroína
    if (V.H && V.H.skills.some(x => x.mana) && V.st) { const bw = tamH() * 0.45, bx = hx() - bw / 2, by = y - F * 0.98 + 7; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(bx, by, bw, 4); ctx.fillStyle = '#5aa8ff'; ctx.fillRect(bx, by, bw * V.st.mana / MANA, 4) }
    if (V.H) { const bw = tamH() * 0.45, bx = hx() - bw / 2, by = y - F * 0.98; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(bx, by, bw, 5); ctx.fillStyle = '#5fd47a'; ctx.fillRect(bx, by, bw * Math.max(0, V.hhp / V.H.hp), 5) }
    ctx.textAlign = 'center'; ctx.font = '900 ' + Math.round(Hh * 0.045) + 'px system-ui';
    for (const n of V.nums) { ctx.globalAlpha = Math.max(0, 1 - n.t); ctx.fillStyle = '#000'; ctx.fillText(n.txt, n.x + 2, n.y - n.t * Hh * 0.08 + 2); ctx.fillStyle = n.cor; ctx.fillText(n.txt, n.x, n.y - n.t * Hh * 0.08) } ctx.globalAlpha = 1;
    if (V.faixa) { const f = V.faixa; ctx.font = '800 ' + Math.round(Hh * 0.042) + 'px system-ui'; const tw = ctx.measureText(f.txt).width + 30; ctx.fillStyle = 'rgba(5,8,18,.78)'; ctx.fillRect(W / 2 - tw / 2, Hh * 0.08, tw, Hh * 0.08); ctx.fillStyle = f.cor; ctx.fillText(f.txt, W / 2, Hh * 0.135) }
    if (V.est === 'hmorre' && V.t > 1) { ctx.font = '700 ' + Math.round(Hh * 0.036) + 'px system-ui'; ctx.fillStyle = '#d6dcea'; ctx.fillText('Descansando…', hx(), chaoY() - tamH() * 1.05) }
  }
  function desenhaFx(f, y, F) { // efeitos simples (canvas): corte, giro, chão, raio, fogo e meteoro
    const p = f.t / 0.7, mx = V.mx, my = y - F * 0.4, c = f.sk.cor; ctx.save(); ctx.globalAlpha = Math.max(0, 1 - p); ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineCap = 'round';
    if (f.sk.fx === 'corte' || f.sk.fx === 'giro') { ctx.lineWidth = F * 0.05; const n = f.sk.fx === 'giro' ? 2 : 1; for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(mx, my, F * (0.32 + i * 0.12), -2.4 + p * 2 + i, -0.6 + p * 2 + i); ctx.stroke() } }
    else if (f.sk.fx === 'chao') { ctx.lineWidth = F * 0.03; ctx.beginPath(); ctx.ellipse(mx, y - 2, F * 0.5 * (0.3 + p), F * 0.08 * (0.3 + p), 0, 0, 7); ctx.stroke() }
    else if (f.sk.fx === 'raio') { ctx.lineWidth = F * 0.025; for (let i = -1; i <= 1; i++) { let x = mx + i * F * 0.12, yy = y - F * 1.3; ctx.beginPath(); ctx.moveTo(x, yy); while (yy < y - F * 0.1) { yy += F * 0.18; x += (Math.random() - 0.5) * F * 0.12; ctx.lineTo(x, yy) } ctx.stroke() } }
    else if (f.sk.fx === 'fogo') { const r0 = F * (0.12 + 0.35 * p); ctx.globalAlpha *= 0.55; ctx.beginPath(); ctx.arc(mx, my, r0, 0, 7); ctx.fill(); ctx.globalAlpha = Math.max(0, 1 - p); ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(mx, my, r0 * 0.45, 0, 7); ctx.fill() }
    else if (f.sk.fx === 'meteoro') { for (let i = 0; i < 4; i++) { const q = Math.min(1, p * 1.6 - i * 0.15); if (q <= 0) continue; const x = mx + (i - 1.5) * F * 0.14 + (1 - q) * F * 0.3, yy = y - F * 1.4 + q * F * 1.3; ctx.beginPath(); ctx.arc(x, yy, F * 0.05, 0, 7); ctx.fill(); ctx.lineWidth = F * 0.02; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + F * 0.12, yy - F * 0.25); ctx.stroke() } }
    ctx.restore() }
  function desenhaHud() { const a = A(), H = heroi(), ch = a.z === a.maxZ; hud.innerHTML = '';
    const top = el('div', 'avTopo'), x = el('button', null, '✕'); x.setAttribute('aria-label', 'Fechar a aventura'); x.onclick = fecha;
    top.append(el('b', null, '🗺 ' + nomeZ(a.z)), el('span', null, '⭐ Nível ' + S.nv + ' (das tarefas)'), el('span', null, '🪙 ' + a.ouro), el('span', null, ch ? '👑 chefe em ' + Math.max(0, KILLS_CHEFE - a.kills) : '↩ treinando'), x); hud.append(top);
    const eq = el('div', 'avEq'); for (const s of ['arma', 'arm', 'amu']) { const it = a.eq[s], d = el('span', null, (it ? ico(it) : SLOT[s][0]) + ' ' + (it ? it.nome + ' +' + Math.round(it.pct * 100) + '%' : '—')); if (it) d.style.color = RAR[it.r][2]; eq.append(d) }
    eq.append(el('span', null, '⚒ Forja ' + a.forja + ' (+' + a.forja * 4 + '%)' + (a.forja >= forjaMax() ? ' · máx. no nível' : '')), el('span', null, '⚔ ' + Math.round(H.atk) + '  ❤ ' + H.hp + '  🧪 ' + a.poc + (a.eq.arma && a.eq.arma.tipo === 'cajado' ? '  🔷 ' + a.pm : ''))); hud.append(eq);
    if (ch && a.kills >= KILLS_CHEFE - 1) { const need = nivelPraChefe(a.z); if (need > S.nv) hud.append(el('div', 'avDica', '💡 O chefe desta zona pede uns nível ' + need + '. Cada tarefa feita deixa a heroína mais forte.')) }
    const op = el('div', 'avOp'), b = el('button', null, (a.auto ? '🌙 Liga sozinho depois de ' + a.auto + ' min parado' : '🌙 Não liga sozinho')); b.onclick = e => { e.stopPropagation(); a.auto = a.auto === 3 ? 10 : a.auto === 10 ? 0 : 3; salva(); desenhaHud() }; const bb = el('button', null, '🎒 Bolsa ' + a.bolsa.length + '/' + BOLSA_MAX + (a.novos ? ' · ' + a.novos + ' novo' + (a.novos > 1 ? 's' : '') : '')); bb.onclick = e => { e.stopPropagation(); abreBolsa('bolsa') };
    const lj = el('button', null, '🏪 Loja'); lj.onclick = e => { e.stopPropagation(); abreBolsa('loja') }; op.append(bb, lj, b); hud.append(op);
  }
  // ---------------- bolsa e loja (a única parte que o André mexe) ----------------
  const painel = el('div', 'avBolsa'); painel.addEventListener('pointerdown', e => { e.stopPropagation(); V.toque = Date.now(); escuro.style.opacity = 0 }); let aba = 'bolsa';
  function abreBolsa(q) { aba = q || aba; if (aba === 'bolsa') A().novos = 0; desenhaBolsa(); tela.append(painel); desenhaHud() }
  function fechaBolsa() { painel.remove(); salva(); desenhaHud() }
  function equipa(it) { const a = A(), i = a.bolsa.indexOf(it); if (i < 0) return; a.bolsa.splice(i, 1); if (a.eq[it.s]) a.bolsa.push(a.eq[it.s]); a.eq[it.s] = it; const hp0 = V.H ? V.H.hp : 0; V.H = heroi(); if (V.H.hp > hp0) V.hhp += V.H.hp - hp0; salva() }
  function vende(it) { const a = A(), i = a.bolsa.indexOf(it); if (i < 0) return; a.bolsa.splice(i, 1); a.ouro += precoVenda(it); salva() }
  function linhaItem(it, eqd) { const a = A(), cur = a.eq[it.s], d = el('div', 'avItem'), dif = eqd ? 0 : Math.round((it.pct - (cur ? cur.pct : 0)) * 100);
    const t = el('span', 'avNome', ico(it) + ' ' + it.nome); t.style.color = RAR[it.r][2];
    const info = el('span', 'avInfo', RAR[it.r][0] + ' · +' + Math.round(it.pct * 100) + '% ' + { arma: 'ataque', arm: 'vida', amu: 'crítico e ouro' }[it.s] + (eqd ? ' · em uso' : dif > 0 ? ' · ▲ ' + dif + '%' : dif < 0 ? ' · ▼ ' + -dif + '%' : ' · igual'));
    if (!eqd && dif > 0) info.style.color = '#7dffa0'; d.append(t, info);
    if (!eqd) { const b1 = el('button', 'avEquipa', 'Equipar'), b2 = el('button', null, 'Vender 🪙' + precoVenda(it)); b1.onclick = () => { equipa(it); desenhaBolsa() }; b2.onclick = () => { vende(it); desenhaBolsa() }; d.append(b1, b2) }
    return d }
  function desenhaBolsa() { const a = A(); painel.innerHTML = '';
    const top = el('div', 'avBTopo'), t1 = el('button', aba === 'bolsa' ? 'on' : null, '🎒 Bolsa ' + a.bolsa.length + '/' + BOLSA_MAX), t2 = el('button', aba === 'loja' ? 'on' : null, '🏪 Loja'), x = el('button', null, '✕');
    t1.onclick = () => abreBolsa('bolsa'); t2.onclick = () => abreBolsa('loja'); x.onclick = fechaBolsa; top.append(t1, t2, el('span', 'avOuro', '🪙 ' + a.ouro), x); painel.append(top);
    const lista = el('div', 'avLista'); painel.append(lista);
    if (aba === 'bolsa') {
      lista.append(el('div', 'avSub', 'Em uso (a roupa segue a arma: espada = guerreira, cajado = maga)'));
      for (const s of ['arma', 'arm', 'amu']) lista.append(a.eq[s] ? linhaItem(a.eq[s], true) : el('div', 'avItem avVazio', SLOT[s][0] + ' nada equipado'));
      const tipo = tipoArma(); lista.append(el('div', 'avSub', 'Habilidades (do Age of Embers) · ' + (tipo === 'nu' ? 'equipe uma arma pra ter habilidades' : tipo === 'cajado' ? 'de magia, gastam mana' : 'de espada')));
      if (tipo !== 'nu') SKILLS[tipo].forEach((x, i) => { const ok = S.nv >= LIBERA[i], d = el('div', 'avItem' + (ok ? '' : ' avVazio')); const t = el('span', 'avNome', (ok ? '✨ ' : '🔒 ') + x.nome); if (ok) t.style.color = x.cor; d.append(t, el('span', 'avInfo', ok ? 'dano x' + x.m + (x.mana ? ' · ' + x.mana + ' de mana' : '') : 'libera no nível ' + LIBERA[i] + ' das tarefas')); lista.append(d) });
      lista.append(el('div', 'avSub', 'Na bolsa'));
      if (!a.bolsa.length) lista.append(el('div', 'avItem avVazio', 'Vazia. Tudo que cair dos monstros vem pra cá.'));
      const ord = a.bolsa.slice().sort((p, q) => (p.s > q.s ? 1 : p.s < q.s ? -1 : 0) || q.pct - p.pct); for (const it of ord) lista.append(linhaItem(it, false));
      const piores = a.bolsa.filter(it => a.eq[it.s] && it.pct <= a.eq[it.s].pct);
      if (piores.length) { const b = el('button', 'avTudo', 'Vender os ' + piores.length + ' piores que o que está em uso (🪙 ' + piores.reduce((t, it) => t + precoVenda(it), 0) + ')'); b.onclick = () => { piores.forEach(vende); desenhaBolsa() }; lista.append(b) }
    } else {
      const loja = (nome, desc, preco, pode, fn) => { const d = el('div', 'avItem'); d.append(el('span', 'avNome', nome), el('span', 'avInfo', desc)); const b = el('button', 'avEquipa', preco == null ? 'No máximo' : 'Comprar 🪙' + preco); b.disabled = !pode; b.onclick = () => { fn(); salva(); desenhaBolsa() }; d.append(b); lista.append(d) };
      const pp = precoPocao(a.z); loja('🧪 Poção de vida', 'Ela bebe sozinha quando a vida cai abaixo de 35% e recupera 60%. Você tem ' + a.poc + '.', pp, a.ouro >= pp, () => { a.ouro -= pp; a.poc++ });
      loja('🔷 Poção de mana', 'Pra maga (cajado): bebe sozinha quando a mana acaba e enche tudo. Você tem ' + a.pm + '.', pp, a.ouro >= pp, () => { a.ouro -= pp; a.pm++ });
      const fm = a.forja >= forjaMax(), cf = custoForja(a.forja); loja('⚒ Forja: +4% de ataque', 'Nível da forja: ' + a.forja + ' de ' + forjaMax() + (fm ? '. Pra subir mais, faça tarefas (o limite é 2x o seu nível).' : '.'), fm ? null : cf, !fm && a.ouro >= cf, () => forja());
    } }
  // ---------------- abrir e fechar ----------------
  function abre(desc) {
    if (V.on) return; V.on = true; V.desc = !!desc; tela.classList.add('on'); tamanho(); const r = atualiza(); V.H = heroi(); V.hhp = V.H.hp; V.est = 'anda'; V.t = 0; V.M = null; V.nums = []; V.faixa = null; V.toque = Date.now(); escuro.style.opacity = 0; hud.classList.remove('some');
    ['kai_nu', 'kai_espada', 'kai_cajado', ...MONS].forEach(q => Object.keys(MONS.includes(q) ? QM : QUADROS).forEach(an => img(q, an)));
    desenhaHud(); if (r && r.kills + r.mortes > 0) mostraFora(r);
    try { prendeTela() } catch (e) {} clearInterval(V.timer); V.timer = setInterval(passo, 1000 / FPS);
  }
  function fecha() { painel.remove(); V.on = false; clearInterval(V.timer); V.timer = null; tela.classList.remove('on'); A().t = Date.now(); salva(); try { desenhaHoje() } catch (e) {} }
  function mostraFora(r) { const h = Math.floor(r.seg / 3600), m = Math.floor(r.seg / 60) % 60, c = el('div', 'avFora');
    c.append(el('b', null, '🌙 Enquanto você estava fora (' + (h ? h + 'h' + String(m).padStart(2, '0') : m + ' min') + ')'),
      el('div', null, '⚔ ' + r.kills + ' monstros  ·  🪙 +' + r.ouro + (r.itens.length ? '  ·  🎒 ' + r.itens.length + ' ite' + (r.itens.length > 1 ? 'ns novos' : 'm novo') + ' na bolsa' : '') + (r.pm ? '  ·  🔷 ' + r.pm + ' de mana' : '') + (r.poc ? '  ·  🧪 ' + r.poc + ' poç' + (r.poc > 1 ? 'ões' : 'ão') + ' usada' + (r.poc > 1 ? 's' : '') : '')));
    if (r.vendidos) c.append(el('div', null, '🎒 A bolsa encheu: ' + r.vendidos + ' ite' + (r.vendidos > 1 ? 'ns foram vendidos' : 'm foi vendido') + ' sozinho' + (r.vendidos > 1 ? 's' : '') + '.'));
    if (r.zonas.length) c.append(el('div', null, '👑 Passou de zona! Agora na ' + nomeZ(A().z)));
    if (r.mortes) c.append(el('div', null, '😵 Perdeu ' + r.mortes + 'x pro chefe. Fazer tarefas deixa ela mais forte.'));
    const ok = el('button', null, 'Beleza'); ok.onclick = e => { e.stopPropagation(); c.remove() }; c.append(ok); tela.append(c); setTimeout(() => c.remove(), 15000) }
  tela.addEventListener('pointerdown', e => { V.toque = Date.now(); escuro.style.opacity = 0; if (hud.classList.contains('some')) { hud.classList.remove('some'); desenhaHud() } }); // não redesenha embaixo do dedo (o botão sumia antes do clique)
  addEventListener('resize', () => { if (V.on) tamanho() });
  document.addEventListener('visibilitychange', () => { if (!V.on) return; if (document.visibilityState === 'visible') { const r = atualiza(); V.H = heroi(); V.hhp = V.H.hp; if (r && r.kills + r.mortes > 0) mostraFora(r); V.timer = V.timer || setInterval(passo, 1000 / FPS) } else { clearInterval(V.timer); V.timer = null; A().t = Date.now(); salva() } });
  window.AV = { abre, fecha, aberta: () => V.on, auto: () => A().auto, atualiza, heroi, monstro, luta, nivelPraChefe, simulaFora, A };
})();
