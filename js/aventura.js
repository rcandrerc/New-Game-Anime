// Aventura 2D (18/11/2026): RPG que se joga sozinho. A heroína anda, luta, pega itens e passa de zona sozinha;
// a força dela vem do nível (S.nv), que só sobe com as tarefas. Feito pra rodar como "descanso de tela":
// fundo escuro, 8 quadros por segundo, e quando o app fica fechado o jogo calcula o que aconteceu (até 12 h).
// Usa do habitos.html: S, salva, hoje, el, aviso, TELA, prendeTela, somLiga, plim. Sprites: aventura/*.png (tools/sprites_aventura.js).
(() => {
  const VER = 8; const EM = 1.8; // a cena ocupa só a metade de baixo da tela (o resto é preto puro): textos e bonecos compensam // sobe quando os sprites mudam (o celular não fica com imagem velha)
  const DESCANSO_MAX = Infinity; // o André quer ela rodando enquanto não mexe (a tela já fica bem escura no descanso)
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
  const SKILLS = { // nv = nível das tarefas que libera
    espada: [{ nome: 'Investida', nv: 1, m: 1.9, cd: 3, fx: 'corte', cor: '#9fe8ff' }, { nome: 'Giro da Lâmina', nv: 3, m: 2.4, cd: 4, fx: 'giro', cor: '#cfe9ff' }, { nome: 'Salto Esmagador', nv: 6, m: 1.7, cd: 4, fx: 'chao', cor: '#ffd27a' }, { nome: 'Combo Relâmpago', nv: 10, m: 2.1, cd: 3, fx: 'raio', cor: '#fff27a' },
      { nome: 'Corte Aéreo', nv: 14, m: 1.6, cd: 2, fx: 'corte', cor: '#7fe3ff' }, { nome: 'Fenda de Fogo', nv: 18, m: 2.2, cd: 4, fx: 'chao', cor: '#ff7a3a' }, { nome: 'Fúria', nv: 24, m: 2.6, cd: 5, fx: 'giro', cor: '#ff9ab0' }],
    cajado: [{ nome: 'Cometa de Fogo', nv: 1, m: 1.6, cd: 2, mana: 10, fx: 'fogo', cor: '#ff7a2a' }, { nome: 'Raio Celeste', nv: 3, m: 1.8, cd: 4, mana: 25, fx: 'raio', cor: '#bfe3ff' }, { nome: 'Explosão', nv: 6, m: 2.0, cd: 4, mana: 25, fx: 'fogo', cor: '#ff5a1a' }, { nome: 'Chuva de Meteoros', nv: 10, m: 2.3, cd: 5, mana: 30, fx: 'meteoro', cor: '#ffa21a' },
      { nome: 'Lança de Gelo', nv: 13, m: 1.7, cd: 3, mana: 15, fx: 'corte', cor: '#7fd0ff' }, { nome: 'Onda Arcana', nv: 16, m: 1.6, cd: 4, mana: 25, fx: 'chao', cor: '#a8c8ff' }, { nome: 'Rajada de Cometas', nv: 19, m: 2.2, cd: 4, mana: 25, fx: 'meteoro', cor: '#ffb04a' },
      { nome: 'Círculo de Chamas', nv: 22, m: 2.4, cd: 5, mana: 30, fx: 'chao', cor: '#ff6a2a' }, { nome: 'Vórtice', nv: 26, m: 2.0, cd: 5, mana: 30, fx: 'giro', cor: '#c49aff' }],
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
    return { atk: (6 + 3 * nv) * (1 + 0.04 * a.forja + p('arma')), hp: Math.round((60 + 15 * nv) * (1 + p('arm'))), crit: 0.08 + p('amu') * 0.5, ouro: 1 + p('amu'), poc: a.poc, pm: a.pm, skills: ativas(!e.arma ? 'nu' : e.arma.tipo === 'cajado' ? 'cajado' : 'espada') } }
  const BARRA = 5; // como a barra do Age of Embers: 5 habilidades em uso por arma (o André escolhe na bolsa)
  function ativas(tipo) { const nv = S.nv || 1, todas = (SKILLS[tipo] || []).filter(x => nv >= x.nv), b = (A().build || {})[tipo]; if (!b) return todas.slice(0, BARRA); return todas.filter(x => b.includes(x.nome)).slice(0, BARRA) }
  function monstro(z, chefe, rnd = Math.random) { const m = 2 * z - 1 + (chefe ? 2 : rnd() < 0.5 ? 0 : 1), th = zona(z).mon;
    const tipo = chefe ? th : rnd() < 0.7 ? th : MONS[Math.floor(rnd() * MONS.length)];
    return { tipo, chefe, lv: m, hp: Math.round((18 + 14 * m) * (chefe ? 2.5 : 1)), atk: (3 + 2.6 * m) * (chefe ? 1.25 : 1), ouro: Math.round((2 + m) * (chefe ? 8 : 1)) } }
  function luta(H, M, rnd = Math.random) { // troca de golpes (a heroína bate primeiro): quem ganha e quantas trocas
    // poção: quando a vida cai abaixo de 35%, bebe uma (se tiver) e recupera 60%
    let hp = H.hp, mh = M.hp, n = 0, pu = 0; const tem = H.poc || 0, st = { cd: [0, 0, 0, 0, 0, 0, 0, 0, 0], mana: MANA, pm: H.pm || 0, pmu: 0 }; while (n < 400) { n++; mh -= golpe(H, st, rnd).d; if (mh <= 0) return { ganhou: true, n, hp, pu, pmu: st.pmu }; hp -= M.atk; if (hp < H.hp * 0.35 && hp > 0 && pu < tem) { pu++; hp = Math.min(H.hp, hp + H.hp * 0.6) } if (hp <= 0) return { ganhou: false, n, hp: 0, pu, pmu: st.pmu } } return { ganhou: false, n, hp, pu, pmu: st.pmu }
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
  const atalho = document.createElement('div'); atalho.className = 'avAtalho'; // bolsa e loja sempre à mão (não somem com o resto)
  hud.className = 'avHud'; escuro.className = 'avEscuro'; tela.append(cv, escuro, hud, atalho); document.body.append(tela);
  const IMG = {}, TINT = {}, QUADROS = { anda: 8, corre: 8, ataca: 6, parada: 6, apanha: 4, cai: 6, comemora: 6 }, QM = { anda: 6, ataca: 6, parada: 4, apanha: 4, cai: 6 };
  // a roupa segue a arma (KayKit Adventurers, CC0): sem arma = aventureira, espada = guerreira de armadura, cajado = maga de chapéu
  const ico = it => it.tipo === 'cajado' ? '🪄' : SLOT[it.s][0];
  function tipoArma() { const w = A().eq.arma; return !w ? 'nu' : w.tipo === 'cajado' ? 'cajado' : 'espada' }
  function visual() { return 'kai_' + tipoArma() }
  function img(quem, an) { const k = quem + '_' + an; if (!IMG[k]) { const i = new Image(); i.src = 'aventura/' + k.toLowerCase() + '.png?v=' + VER; IMG[k] = i } return IMG[k] }
  function tingida(quem, an, rd) { if (!rd) return img(quem, an); const k = quem + an + rd; if (TINT[k]) return TINT[k]; const i = img(quem, an); if (!i.complete || !i.naturalWidth) return i;
    const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; const x = c.getContext('2d'); x.filter = 'hue-rotate(' + (rd * 75) + 'deg) saturate(1.2)'; x.drawImage(i, 0, 0); TINT[k] = c; return c }
  let W = 0, Hh = 0, fundo = null, camadas = null, zDesenhada = 0;
  function tamanho() { const r = cv.getBoundingClientRect(), k = Math.min(1.5, devicePixelRatio || 1); W = Math.round(r.width * k); Hh = Math.round(r.height * k); cv.width = W; cv.height = Hh; zDesenhada = 0 }
  function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 } }
  function montaFundo(z) { // céu (fixo) e 3 faixas que rolam: morros, árvores e chão (cada uma desenhada uma vez numa tela de 2x a largura)
    const Z0 = zona(z), r = rng(z * 97 + 13), chaoY = Math.round(Hh * 0.8), esc = h => { const n = parseInt(h.slice(1), 16), f = v => Math.round(v * 0.55); return '#' + [n >> 16, n >> 8 & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join('') };
    const Z = { ceu: [esc(Z0.ceu[0]), esc(Z0.ceu[1])], morro: esc(Z0.morro), arv: esc(Z0.arv), chao: esc(Z0.chao), chao2: esc(Z0.chao2) }; // tema escuro: tela OLED gasta menos com preto
    fundo = document.createElement('canvas'); fundo.width = W; fundo.height = Hh; let x = fundo.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, chaoY); g.addColorStop(0, '#000'); g.addColorStop(0.35, Z.ceu[0]); g.addColorStop(1, Z.ceu[1]); x.fillStyle = g; x.fillRect(0, 0, W, Hh);
    for (let i = 0; i < 70; i++) { const sy = chaoY * (0.15 + r() * 0.6); x.fillStyle = 'rgba(255,255,255,' + ((0.15 + r() * 0.5) * sy / chaoY) + ')'; const s = r() < 0.15 ? 2 : 1; x.fillRect(r() * W | 0, sy | 0, s, s) }
    x.fillStyle = 'rgba(255,244,214,.85)'; x.beginPath(); x.arc(W * 0.82, Hh * 0.3, Hh * 0.06, 0, 7); x.fill(); x.fillStyle = Z.ceu[0]; x.beginPath(); x.arc(W * 0.82 + Hh * 0.025, Hh * 0.285, Hh * 0.055, 0, 7); x.fill();
    const faixa = (desenha) => { const c = document.createElement('canvas'); c.width = W * 2; c.height = Hh; desenha(c.getContext('2d')); return c };
    const clara = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = v => Math.min(255, Math.round(v + (255 - v) * k)); return 'rgb(' + f(n >> 16) + ',' + f(n >> 8 & 255) + ',' + f(n & 255) + ')' };
    camadas = [ // estilo fofinho: morros redondos, árvores de copa redonda, moitas e florzinhas (tudo desenhado uma vez só)
      { v: 6, c: faixa(x => { x.fillStyle = Z.morro; for (let i = 0; i < 9; i++) { const px = (i + r() * 0.5) / 8 * W * 2, rw = W * (0.16 + r() * 0.12), rh = Hh * (0.14 + r() * 0.12); x.beginPath(); x.ellipse(px, chaoY, rw, rh, 0, Math.PI, 0); x.fill() }
        x.fillStyle = 'rgba(255,255,255,.02)'; for (let i = 0; i < 0; i++) { const px = r() * W * 2, py = Hh * (0.12 + r() * 0.25), lw = W * (0.06 + r() * 0.06); x.beginPath(); x.ellipse(px, py, lw, lw * 0.28, 0, 0, 7); x.ellipse(px + lw * 0.45, py - lw * 0.12, lw * 0.5, lw * 0.26, 0, 0, 7); x.fill() } }) },
      { v: 16, c: faixa(x => { const esc2 = (h, k) => { const n = parseInt(h.slice(1), 16), f = v => Math.round(v * k); return 'rgb(' + f(n >> 16) + ',' + f(n >> 8 & 255) + ',' + f(n & 255) + ')' };
        for (let i = 0; i < 16; i++) { const px = (i + r() * 0.7) / 16 * W * 2, h = Hh * (0.2 + r() * 0.14), rr = h * 0.3, base = chaoY - h * 0.42, pinho = r() < 0.3; // árvores fofinhas: copa em 3 tons (sombra, cor, brilho)
          x.fillStyle = '#21170f'; x.beginPath(); x.moveTo(px - rr * 0.16, chaoY); x.lineTo(px - rr * 0.1, base); x.lineTo(px + rr * 0.1, base); x.lineTo(px + rr * 0.16, chaoY); x.fill();
          if (pinho) { for (const [k, cor] of [[0, esc2(Z.arv, 0.8)], [1, Z.arv], [2, clara(Z.arv, 0.08)]]) { const yb = base + rr * 0.6 - k * rr * 0.75, lw = rr * (1.15 - k * 0.25); x.fillStyle = cor; x.beginPath(); x.moveTo(px - lw, yb); x.quadraticCurveTo(px, yb - rr * 1.9, px + lw, yb); x.quadraticCurveTo(px, yb + rr * 0.25, px - lw, yb); x.fill() } continue }
          const bolas = [[-0.6, -0.35, 0.68], [0.6, -0.35, 0.68], [0, -0.9, 0.85], [0, -0.35, 0.8], [-0.35, -1.3, 0.55], [0.4, -1.25, 0.5]];
          x.fillStyle = esc2(Z.arv, 0.7); for (const [dx, dy, k] of bolas) { x.beginPath(); x.arc(px + dx * rr, base + dy * rr + rr * 0.12, rr * k, 0, 7); x.fill() }
          x.fillStyle = Z.arv; for (const [dx, dy, k] of bolas) { x.beginPath(); x.arc(px + dx * rr, base + dy * rr, rr * k * 0.92, 0, 7); x.fill() }
          x.fillStyle = clara(Z.arv, 0.1); for (const [dx, dy, k] of bolas.slice(2)) { x.beginPath(); x.arc(px + dx * rr - rr * 0.18, base + dy * rr - rr * 0.2, rr * k * 0.42, 0, 7); x.fill() } } }) },
      { v: 34, c: faixa(x => { x.fillStyle = Z.chao; x.fillRect(0, chaoY, W * 2, Hh - chaoY); x.fillStyle = Z.chao2; x.fillRect(0, chaoY, W * 2, 3);
          x.strokeStyle = Z.chao2; x.lineWidth = 1.5; x.beginPath(); for (let gx = 0; gx < W * 2; gx += 3 + r() * 4) { const gh = 3 + r() * Hh * 0.025; x.moveTo(gx, chaoY + 2); x.quadraticCurveTo(gx + 1, chaoY - gh * 0.5, gx + (r() - 0.5) * 4, chaoY - gh) } x.stroke(); // capim na beira
          for (let i = 0; i < 16; i++) { const px = r() * W * 2, rr = Hh * (0.02 + r() * 0.02); x.fillStyle = clara(Z.arv, 0.05); x.beginPath(); x.arc(px, chaoY, rr, Math.PI, 0); x.arc(px + rr, chaoY, rr * 0.8, Math.PI, 0); x.fill() }
          const flor = ['#ff9ec7', '#ffe07a', '#c9a7ff', '#ffffff']; for (let i = 0; i < 60; i++) { const px = r() * W * 2, py = chaoY + 8 + r() * (Hh - chaoY - 12); x.fillStyle = Z.chao2; x.fillRect(px, py, 3, 2); if (r() < 0.35) { x.fillStyle = flor[Math.floor(r() * 4)]; x.beginPath(); x.arc(px, py - 2, 2, 0, 7); x.fill() } } }) },
    ];
    zDesenhada = z;
  }
  // ---------------- cena ao vivo ----------------
  const V = { on: false, desc: false, est: 'anda', t: 0, quadro: 0, rolagem: 0, M: null, mx: 0, mhp: 0, H: null, hhp: 0, nums: [], faixa: null, toque: 0, timer: null, troca: 0, vez: 'h' };
  const chaoY = () => Math.round(Hh * 0.8), tamH = () => Hh * 0.13 * EM, hx = () => W * 0.3;
  function novoMonstro() { V.M = proximo(); V.mhp = V.M.hp; V.mx = W + tamH() * 0.6; V.est = 'chega'; V.t = 0 }
  function num(txt, x, y, cor) { V.nums.push({ txt, x, y, cor, t: 0 }) }
  function passo() { // 1 passo de 1/8 s
    const dt = 1 / FPS, a = A(); V.t += dt; V.quadro++; a.t = Date.now();
    TELA.ult = Date.now(); // tela acesa enquanto a aventura está aberta
    if (V.est === 'anda') { V.rolagem += dt * 1.8; V.hhp = Math.min(V.H.hp, V.hhp + V.H.hp * 0.25 * dt); if (V.t > 2) novoMonstro() }
    else if (V.est === 'chega') { V.rolagem += dt * 1.8; V.mx -= W * 0.45 * dt; if (V.mx <= hx() + tamH() * 0.62) { V.est = 'luta'; V.t = 0; V.vez = 'h'; V.troca = 0; V.st = { cd: [0, 0, 0, 0, 0, 0, 0, 0, 0], mana: V.st ? V.st.mana : MANA, pm: A().pm, pmu: 0 } } }
    else if (V.est === 'luta') {
      V.troca += dt; if (V.troca >= 0.8) { V.troca = 0; const H = V.H, M = V.M;
        if (V.vez === 'h') { V.st.pm = A().pm; const pm0 = V.st.pmu, g = golpe(H, V.st, Math.random), c = g.c, d = Math.round(g.d); if (V.st.pmu > pm0) { A().pm = Math.max(0, A().pm - 1); V.st.pmu = pm0; num('🔷 mana', hx(), chaoY() - tamH() * 1.15, '#8fc8ff') }
          V.mhp -= d; num((c ? '💥' : '') + d, V.mx, chaoY() - tamH() * 0.9, g.sk ? g.sk.cor : c ? '#ffd23a' : '#fff'); if (g.sk) comecaFx(g.sk); V.vez = 'm'; V.golpeH = 0.75; V.ferM = 0.5;
          if (V.mhp <= 0) { V.est = 'mmorre'; V.t = 0; const v = venceu(M); num('+' + Math.round(M.ouro * H.ouro) + ' 🪙', V.mx, chaoY() - tamH() * 1.1, '#ffd86b'); try { plim(0, 0.15) } catch (e) {}
            if (v.it) V.faixa = { txt: v.it.bolsa ? '🎒 ' + ico(v.it) + ' ' + v.it.nome + ' (' + RAR[v.it.r][0] + ') foi pra bolsa' : '🎒 Bolsa cheia: ' + v.it.nome + ' vendido', cor: RAR[v.it.r][2], t: 0 }; desenhaHud();
            if (v.novaZ) { V.faixa = { txt: '👑 Chefe vencido! Zona ' + A().z + ': ' + nomeZ(A().z), cor: '#ffe066', t: 0, longo: true }; V.comemora = 2 } salva() } }
        else { V.hhp -= M.atk; num('-' + Math.round(M.atk), hx(), chaoY() - tamH() * 0.95, '#ff8a8a'); V.vez = 'h'; V.golpeM = 0.75; V.ferH = 0.5;
          if (V.hhp > 0 && V.hhp < H.hp * 0.35 && A().poc > 0) { A().poc--; V.hhp = Math.min(H.hp, V.hhp + H.hp * 0.6); num('🧪 +' + Math.round(H.hp * 0.6), hx(), chaoY() - tamH() * 1.15, '#7dffa0'); salva() }
          if (V.hhp <= 0) { V.est = 'hmorre'; V.t = 0; perdeu(M); salva(); V.faixa = { txt: M.chefe ? '😵 O chefe é forte demais: faça tarefas pra subir de nível' : '😵 Recuou pra zona ' + A().z, cor: '#ff9a8a', t: 0, longo: true } } } } }
    else if (V.est === 'mmorre') { if (V.t > 0.9) { V.M = null; V.H = heroi(); V.est = V.comemora ? 'festa' : 'anda'; V.t = 0 } }
    else if (V.est === 'festa') { if (V.t > 1.6) { V.comemora = 0; V.est = 'anda'; V.t = 0; zDesenhada = 0 } }
    else if (V.est === 'hmorre') { if (V.t > 4) { V.M = null; V.H = heroi(); V.hhp = V.H.hp; V.est = 'anda'; V.t = 0; zDesenhada = 0 } }
    if (V.skNome) { V.skNome.t += dt; if (V.skNome.t > 1.2) V.skNome = null }
    for (const n of V.nums) n.t += dt; V.nums = V.nums.filter(n => n.t < 1.1); if (V.faixa) { V.faixa.t += dt; if (V.faixa.t > (V.faixa.longo ? 4 : 2.2)) V.faixa = null }
    ['golpeH', 'golpeM', 'ferH', 'ferM'].forEach(k => { if (V[k] > 0) V[k] -= dt });
    if (painel.isConnected) V.toque = Date.now(); // com a bolsa aberta não escurece
    const dorme = V.desc && Date.now() - V.toque > 20000; if (dorme) escuro.style.opacity = 0.6; // descanso: escurece sozinho (gasta menos)
    if (dorme && Date.now() - V.toque > DESCANSO_MAX) { fecha(); return } // depois de um tempo, solta a tela pro celular apagar (o jogo continua contando com o app fechado)
    if (Date.now() - V.toque > 6000) hud.classList.add('some');
    if (!dorme || V.quadro % 2 === 0) desenha(); // escurecida: desenha 4 vezes por segundo em vez de 8
    if (V.quadro % FPS === 0 && !hud.classList.contains('some') && Date.now() - V.toque > 700) desenhaHud();
  }
  function sprite(quem, an, n, i, x, y, alt, rd, flash) { const im = tingida(quem, an, rd); if (!im || !(im.naturalWidth || im.width)) return; const fw = (im.naturalWidth || im.width) / n, fh = im.naturalHeight || im.height, s = alt / fh;
    ctx.drawImage(im, (i % n) * fw, 0, fw, fh, x - fw * s / 2, y - fh * s, fw * s, fh * s); if (flash) { ctx.globalAlpha = 0.35; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(im, (i % n) * fw, 0, fw, fh, x - fw * s / 2, y - fh * s, fw * s, fh * s); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over' } }
  function desenha() {
    if (!W || !Hh) { tamanho(); if (!W || !Hh) return } // a tela ainda sem tamanho (app abrindo): espera
    const a = A(); if (zDesenhada !== a.z || !fundo) montaFundo(a.z); ctx.drawImage(fundo, 0, 0);
    const tr = V.treme > 0 ? V.treme * Hh * 0.02 : 0; ctx.save(); if (tr) ctx.translate((Math.random() - 0.5) * tr, (Math.random() - 0.5) * tr);
    for (const L of camadas) { const off = Math.round(V.rolagem * L.v * (W / 400)) % (W * 2); ctx.drawImage(L.c, -off, 0); if (off > W) ctx.drawImage(L.c, W * 2 - off, 0) }
    const y = chaoY() + Hh * 0.03, F = tamH() / 0.85, q = V.quadro;
    let an = 'parada', i = q; if (V.est === 'anda' || V.est === 'chega') an = 'corre'; else if (V.est === 'hmorre') { an = 'cai'; i = Math.min(5, Math.floor(V.t * 6)) } else if (V.est === 'festa') an = 'comemora'; else if (V.golpeH > 0) { an = 'ataca'; i = Math.min(5, Math.floor((0.75 - V.golpeH) * 8)) } else if (V.ferH > 0) an = 'apanha';
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(hx(), y - 2, tamH() * 0.2, tamH() * 0.04, 0, 0, 7); ctx.fill();
    const vis = visual(); sprite(vis, an, QUADROS[an], i, hx() - (an === 'cai' ? F * 0.3 : 0) + (V.dash || 0) * F * 0.5, y, F, 0, V.ferH > 0.3);
    if (an === 'ataca' && vis === 'kai_cajado' && V.M) { const p = Math.min(1, (0.75 - V.golpeH) / 0.6), ox = hx() + F * 0.25, oy = y - F * 0.45, bx = ox + (V.mx - ox) * p; // bolinha de magia
      ctx.fillStyle = 'rgba(150,255,140,.35)'; ctx.beginPath(); ctx.arc(bx, oy, F * 0.09, 0, 7); ctx.fill(); ctx.fillStyle = '#eaffb0'; ctx.beginPath(); ctx.arc(bx, oy, F * 0.045, 0, 7); ctx.fill() }
    if (V.M) { const M = V.M, k = M.chefe ? 1.4 : 1, rd = rodada(a.z); let am = 'anda', j = q;
      if (V.est === 'luta') { if (V.golpeM > 0) { am = 'ataca'; j = Math.min(5, Math.floor((0.75 - V.golpeM) * 8)) } else if (V.ferM > 0) am = 'apanha'; else am = 'parada' } else if (V.est === 'mmorre') { am = 'cai'; j = Math.min(5, Math.floor(V.t * 7)) }
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(V.mx, y - 2, tamH() * 0.22 * k, tamH() * 0.045, 0, 0, 7); ctx.fill();
      if (V.est === 'mmorre') ctx.globalAlpha = Math.max(0, 1 - V.t * 0.9); sprite(M.tipo, am, QM[am], j, V.mx, y, F * 0.85 * k, rd, V.ferM > 0.3); ctx.globalAlpha = 1;
      if (V.est === 'luta' || V.est === 'chega') { const bw = tamH() * 0.5 * k, bx = V.mx - bw / 2, by = y - F * 0.85 * k * 0.93; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(bx, by, bw, 6); ctx.fillStyle = M.chefe ? '#ff6a3d' : '#e04848'; ctx.fillRect(bx, by, bw * Math.max(0, V.mhp / M.hp), 6);
        ctx.font = 'bold ' + Math.round(Hh * 0.032 * EM) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = M.chefe ? '#ffe066' : '#d6dcea'; ctx.fillText((M.chefe ? '👑 ' : '') + NOME_M[M.tipo] + ' nv ' + M.lv, V.mx, by - 5) } }
    if (V.fx) desenhaFx(V.fx, y, F); desenhaParts(); ctx.restore(); if (V.flash > 0) { ctx.fillStyle = 'rgba(255,255,240,' + V.flash * 0.35 + ')'; ctx.fillRect(0, 0, W, Hh) }
    if (V.H && V.H.skills.length) desenhaBarra();
    if (V.skNome) { ctx.globalAlpha = Math.max(0, 1 - V.skNome.t / 1.2); ctx.font = '900 ' + Math.round(Hh * 0.04 * EM) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(V.skNome.txt, hx() + 2, y - F * 1.08 + 2); ctx.fillStyle = V.skNome.cor; ctx.fillText(V.skNome.txt, hx(), y - F * 1.08); ctx.globalAlpha = 1 }
    // vida e mana da heroína
    if (V.H && V.H.skills.some(x => x.mana) && V.st) { const bw = tamH() * 0.45, bx = hx() - bw / 2, by = y - F * 0.98 + 7; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(bx, by, bw, 4); ctx.fillStyle = '#5aa8ff'; ctx.fillRect(bx, by, bw * V.st.mana / MANA, 4) }
    if (V.H) { const bw = tamH() * 0.45, bx = hx() - bw / 2, by = y - F * 0.98; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(bx, by, bw, 5); ctx.fillStyle = '#5fd47a'; ctx.fillRect(bx, by, bw * Math.max(0, V.hhp / V.H.hp), 5) }
    ctx.textAlign = 'center'; ctx.font = '900 ' + Math.round(Hh * 0.045 * EM) + 'px system-ui';
    for (const n of V.nums) { ctx.globalAlpha = Math.max(0, 1 - n.t); ctx.fillStyle = '#000'; ctx.fillText(n.txt, n.x + 2, n.y - n.t * Hh * 0.08 + 2); ctx.fillStyle = n.cor; ctx.fillText(n.txt, n.x, n.y - n.t * Hh * 0.08) } ctx.globalAlpha = 1;
    if (V.faixa) { const f = V.faixa; ctx.font = '800 ' + Math.round(Hh * 0.042 * EM) + 'px system-ui'; const tw = ctx.measureText(f.txt).width + 30; ctx.fillStyle = 'rgba(5,8,18,.78)'; ctx.fillRect(W / 2 - tw / 2, Hh * 0.08, tw, Hh * 0.08); ctx.fillStyle = f.cor; ctx.fillText(f.txt, W / 2, Hh * 0.135) }
    if (V.est === 'hmorre' && V.t > 1) { ctx.font = '700 ' + Math.round(Hh * 0.036 * EM) + 'px system-ui'; ctx.fillStyle = '#d6dcea'; ctx.fillText('Descansando…', hx(), chaoY() - tamH() * 1.05) }
  }
  // ---- efeitos das habilidades: partículas com brilho (modo 'lighter'), clarão e tremida; enquanto tem efeito, anima a ~24 quadros/s
  const PARTS = [];
  function solta(n, x, y, cor, vel, vida, tam, sobe) { for (let i = 0; i < n && PARTS.length < 90; i++) { const ang = Math.random() * 6.283, v = vel * (0.4 + Math.random() * 0.8); PARTS.push({ x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - (sobe || 0), t: 0, vida: vida * (0.6 + Math.random() * 0.6), cor, tam: tam * (0.6 + Math.random() * 0.7) }) } }
  function comecaFx(sk) { const F = tamH() / 0.85, y = chaoY() + Hh * 0.03, my = y - F * 0.4, mx = V.mx;
    V.fx = { sk, t: 0, dur: sk.fx === 'meteoro' ? 1.1 : 0.85 }; V.skNome = { txt: sk.nome, cor: sk.cor, t: 0 };
    if (sk.fx === 'corte') { V.dash = 1; solta(16, mx, my, sk.cor, F * 3, 0.5, F * 0.035) }
    else if (sk.fx === 'giro') { solta(24, mx, my, sk.cor, F * 3.5, 0.6, F * 0.03); V.treme = 0.5 }
    else if (sk.fx === 'chao') { solta(22, mx, y - 4, '#c8a070', F * 2.2, 0.7, F * 0.04, F * 2.5); solta(10, mx, y - 4, sk.cor, F * 2.5, 0.5, F * 0.035, F * 1.5); V.treme = 1 }
    else if (sk.fx === 'raio') { V.flash = 1; solta(18, mx, y - F * 0.2, sk.cor, F * 2.5, 0.5, F * 0.03, F); V.treme = 0.6 }
    else if (sk.fx === 'fogo') { V.treme = 0.4 }
    else if (sk.fx === 'meteoro') { V.treme = 0.3 }
    if (!V.anima) { V.anima = true; let t0 = performance.now(), ult = 0; const loop = t => { if (!V.on || (!V.fx && !PARTS.length)) { V.anima = false; return } if (t - ult >= 40) { const dt = Math.min(0.08, (t - t0) / 1000); t0 = t; ult = t; tickFx(dt); desenha() } requestAnimationFrame(loop) }; requestAnimationFrame(loop) } }
  function tickFx(dt) { const F = tamH() / 0.85, y = chaoY() + Hh * 0.03, f = V.fx;
    if (f) { const t0 = f.t; f.t += dt; const mx = V.mx, my = y - F * 0.4;
      if (f.sk.fx === 'fogo' && t0 < 0.3 && f.t >= 0.3) { solta(26, mx, my, f.sk.cor, F * 3, 0.6, F * 0.045, F * 0.8); solta(10, mx, my, '#ffe9a0', F * 2, 0.4, F * 0.04); V.treme = 0.8 }
      if (f.sk.fx === 'meteoro') for (let i = 0; i < 4; i++) { const tb = 0.25 + i * 0.15; if (t0 < tb && f.t >= tb) { solta(10, mx + (i - 1.5) * F * 0.14, y - 6, f.sk.cor, F * 2, 0.45, F * 0.04, F * 1.2); V.treme = 0.6 } }
      if (f.t > f.dur) V.fx = null }
    for (const q of PARTS) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += F * 4 * dt; q.vx *= 0.92 } for (let i = PARTS.length - 1; i >= 0; i--) if (PARTS[i].t > PARTS[i].vida || PARTS[i].y > y + 4) PARTS.splice(i, 1);
    if (V.dash > 0) V.dash = Math.max(0, V.dash - dt * 2.5); if (V.treme > 0) V.treme = Math.max(0, V.treme - dt * 3); if (V.flash > 0) V.flash = Math.max(0, V.flash - dt * 4); if (V.skNome) V.skNome.t += 0 }
  function desenhaParts() { if (!PARTS.length) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const q of PARTS) { const a = 1 - q.t / q.vida; ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = q.cor; ctx.beginPath(); ctx.arc(q.x, q.y, q.tam * (0.5 + a * 0.5), 0, 7); ctx.fill() } ctx.restore() }
  function brilho(x, y, r, cor, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,255,240,' + a + ')'); g.addColorStop(0.35, cor); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill() }
  function desenhaFx(f, y, F) {
    const p = Math.min(1, f.t / f.dur), mx = V.mx, my = y - F * 0.4, c = f.sk.cor, hxx = hx() + F * 0.2; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = c; ctx.lineCap = 'round';
    const lam = (r0, a0, a1, w) => { ctx.globalAlpha = Math.max(0, 1 - p) * 0.5; ctx.lineWidth = w * 2.2; ctx.beginPath(); ctx.arc(mx, my, r0, a0, a1); ctx.stroke(); ctx.globalAlpha = Math.max(0, 1 - p); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = w * 0.6; ctx.beginPath(); ctx.arc(mx, my, r0, a0, a1); ctx.stroke(); ctx.strokeStyle = c };
    if (f.sk.fx === 'corte') { lam(F * 0.4, -2.2 + p * 1.5, -0.4 + p * 1.5, F * 0.06); brilho(mx, my, F * 0.35 * (1 - p), c, 0.6 * (1 - p)) }
    else if (f.sk.fx === 'giro') { for (let i = 0; i < 2; i++) lam(F * (0.34 + i * 0.12), p * 9 + i * 3, p * 9 + i * 3 + 2.4, F * 0.05); brilho(mx, my, F * 0.5, c, 0.35 * (1 - p)) }
    else if (f.sk.fx === 'chao') { ctx.globalAlpha = 1 - p; ctx.lineWidth = F * 0.05 * (1 - p) + 1; ctx.beginPath(); ctx.ellipse(mx, y - 2, F * 0.9 * p + 4, F * 0.14 * p + 2, 0, 0, 7); ctx.stroke(); brilho(mx, y - 4, F * 0.45, c, 0.5 * (1 - p)) }
    else if (f.sk.fx === 'raio') { for (let i = -1; i <= 1; i++) { let x = mx + i * F * 0.14, yy = y - F * 1.6; const pts = [[x, yy]]; while (yy < y - F * 0.05) { yy += F * 0.16; x += (Math.random() - 0.5) * F * 0.16; pts.push([x, yy]) }
        for (const [w, cor, al] of [[F * 0.07, c, 0.45], [F * 0.022, '#ffffff', 1]]) { ctx.globalAlpha = Math.max(0, 1 - p * 1.4) * al; ctx.strokeStyle = cor; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([a, b], k) => k ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.stroke() } } brilho(mx, y - F * 0.1, F * 0.5, c, 0.5 * (1 - p)) }
    else if (f.sk.fx === 'fogo') { if (f.t < 0.3) { const q = f.t / 0.3, bx = hxx + (mx - hxx) * q; brilho(bx, my, F * 0.2, c, 0.9); solta(1, bx, my, c, F * 0.4, 0.3, F * 0.03) } else { const q = (f.t - 0.3) / (f.dur - 0.3); brilho(mx, my, F * (0.25 + 0.5 * q), c, 0.9 * (1 - q)) } }
    else if (f.sk.fx === 'meteoro') { for (let i = 0; i < 4; i++) { const tb = 0.25 + i * 0.15, q = (f.t - (tb - 0.25)) / 0.25; const x = mx + (i - 1.5) * F * 0.14; if (q > 0 && q < 1) { const sx = x + (1 - q) * F * 0.5, sy = y - F * 1.6 + q * F * 1.55; ctx.globalAlpha = 0.6; ctx.lineWidth = F * 0.05; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + F * 0.25, sy - F * 0.45); ctx.stroke(); brilho(sx, sy, F * 0.12, c, 1) } else if (q >= 1 && q < 2.2) brilho(x, y - 6, F * 0.3, c, Math.max(0, 0.8 * (1 - (q - 1) / 1.2))) } }
    ctx.restore() }
  function desenhaBarra() { // barra das 5 habilidades com a recarga, embaixo no meio
    const sk = V.H.skills, r0 = Math.round(Hh * 0.035 * EM), gap = r0 * 2.6, x0 = W / 2 - (sk.length - 1) * gap / 2, y0 = Hh - r0 * 3.1; ctx.save();
    sk.forEach((x, i) => { const cx = x0 + i * gap, cd = V.st ? V.st.cd[i] || 0 : 0, sem = x.mana && V.st && V.st.mana < x.mana;
      ctx.globalAlpha = 0.85; ctx.fillStyle = 'rgba(8,10,20,.8)'; ctx.beginPath(); ctx.arc(cx, y0, r0, 0, 7); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = cd || sem ? 'rgba(255,255,255,.2)' : x.cor; ctx.stroke();
      ctx.globalAlpha = cd || sem ? 0.4 : 1; ctx.fillStyle = '#fff'; ctx.font = Math.round(r0 * 1.05) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(icoSk(x), cx, y0 + 1); ctx.globalAlpha = 0.85;
      if (cd) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.moveTo(cx, y0); ctx.arc(cx, y0, r0, -1.57, -1.57 + 6.283 * cd / x.cd); ctx.fill() } });
    ctx.restore(); ctx.textBaseline = 'alphabetic' }
  function desenhaHud() { const a = A(), H = heroi(), ch = a.z === a.maxZ; hud.innerHTML = '';
    const top = el('div', 'avTopo'), x = el('button', null, '✕'); x.setAttribute('aria-label', 'Fechar a aventura'); x.onclick = fecha;
    top.append(el('b', null, '🗺 ' + nomeZ(a.z)), el('span', null, '⭐ ' + S.nv), el('span', null, '🪙 ' + a.ouro), el('span', null, ch ? '👑 ' + Math.max(0, KILLS_CHEFE - a.kills) : '↩'), x); hud.append(top);
    const eq = el('div', 'avEq'); for (const s of ['arma', 'arm', 'amu']) { const it = a.eq[s], d = el('span', null, (it ? ico(it) : SLOT[s][0]) + ' ' + (it ? '+' + Math.round(it.pct * 100) + '%' : '—')); if (it) d.style.color = RAR[it.r][2]; eq.append(d) }
    eq.append(el('span', null, '⚒️ ' + a.forja + '/' + forjaMax()), el('span', null, '⚔ ' + Math.round(H.atk) + '  ❤ ' + H.hp + '  🧪 ' + a.poc + (a.eq.arma && a.eq.arma.tipo === 'cajado' ? '  🔷 ' + a.pm : ''))); hud.append(eq);
    if (ch && a.kills >= KILLS_CHEFE - 1) { const need = nivelPraChefe(a.z); if (need > S.nv) hud.append(el('div', 'avDica', '👑 ⭐' + need + '  ·  ✅ ➜ ⭐')) }
    atalho.innerHTML = ''; const ab = el('button', 'avGrande', '🎒' + (a.novos ? '<i>' + a.novos + '</i>' : '')); ab.innerHTML = '🎒' + (a.novos ? '<i>' + a.novos + '</i>' : ''); ab.setAttribute('aria-label', 'Bolsa'); ab.onclick = e => { e.stopPropagation(); abreBolsa('bolsa') };
    const al = el('button', 'avGrande', '🏪'); al.setAttribute('aria-label', 'Loja'); al.onclick = e => { e.stopPropagation(); abreBolsa('loja') }; const as = el('button', 'avGrande', '✨'); as.setAttribute('aria-label', 'Habilidades'); as.onclick = e => { e.stopPropagation(); abreBolsa('skills') }; atalho.append(ab, as, al);
    const op = el('div', 'avOp'), b = el('button', null, (a.auto ? '🌙 ' + a.auto + ' min' : '🌙 ✕')); b.onclick = e => { e.stopPropagation(); a.auto = a.auto === 3 ? 10 : a.auto === 10 ? 0 : 3; salva(); desenhaHud() }; const bb = el('button', null, '🎒 Bolsa ' + a.bolsa.length + '/' + BOLSA_MAX + (a.novos ? ' · ' + a.novos + ' novo' + (a.novos > 1 ? 's' : '') : '')); bb.onclick = e => { e.stopPropagation(); abreBolsa('bolsa') };
    const lj = el('button', null, '🏪 Loja'); lj.onclick = e => { e.stopPropagation(); abreBolsa('loja') }; op.append(b); hud.append(op);
  }
  // ---------------- bolsa e loja (a única parte que o André mexe) ----------------
  const painel = el('div', 'avBolsa'); painel.addEventListener('pointerdown', e => { e.stopPropagation(); V.toque = Date.now(); escuro.style.opacity = 0 }); let aba = 'bolsa';
  function abreBolsa(q) { aba = q || aba; if (aba === 'bolsa') A().novos = 0; desenhaBolsa(); tela.append(painel); desenhaHud() }
  function fechaBolsa() { painel.remove(); salva(); desenhaHud() }
  function equipa(it) { const a = A(), i = a.bolsa.indexOf(it); if (i < 0) return; a.bolsa.splice(i, 1); if (a.eq[it.s]) a.bolsa.push(a.eq[it.s]); a.eq[it.s] = it; const hp0 = V.H ? V.H.hp : 0; V.H = heroi(); if (V.H.hp > hp0) V.hhp += V.H.hp - hp0; salva() }
  function vende(it) { const a = A(), i = a.bolsa.indexOf(it); if (i < 0) return; a.bolsa.splice(i, 1); a.ouro += precoVenda(it); salva() }
  // Bolsa, habilidades e loja só com símbolos (pedido do André: nada de lista de texto)
  const ST = { arma: '⚔️', arm: '❤️', amu: '🍀' }, SKI = { corte: '🗡️', giro: '🌀', chao: '💥', raio: '⚡', fogo: '🔥', meteoro: '☄️' };
  const icoSk = x => ({ 'Investida': '💨', 'Lança de Gelo': '❄️', 'Onda Arcana': '🔮', 'Fúria': '😤', 'Vórtice': '🌪️', 'Fenda de Fogo': '🌋', 'Círculo de Chamas': '🔥' })[x.nome] || SKI[x.fx] || '✨';
  let sel = null, dica = '';
  function slotItem(it, eqd) { const a = A(), cur = a.eq[it.s], b = el('button', 'avSlot r' + it.r + (sel === it ? ' sel' : ''));
    b.append(el('span', 'avIc', ico(it)), el('span', 'avPct', '+' + Math.round(it.pct * 100) + '%'));
    if (!eqd && (!cur || it.pct > cur.pct)) b.append(el('span', 'avMelhor', '▲'));
    b.onclick = () => { sel = sel === it ? null : it; desenhaBolsa() }; return b }
  function detalhe(it) { const a = A(), eqd = a.eq[it.s] === it, cur = a.eq[it.s], d = el('div', 'avDet'), dif = Math.round((it.pct - (cur ? cur.pct : 0)) * 100);
    const g = el('span', 'avDetIc r' + it.r, ico(it)); d.append(g, el('span', 'avDetSt', ST[it.s] + ' +' + Math.round(it.pct * 100) + '%'));
    if (!eqd) { const c = el('span', 'avDetDif', dif > 0 ? '▲' + dif + '%' : dif < 0 ? '▼' + -dif + '%' : '='); c.style.color = dif > 0 ? '#7dffa0' : dif < 0 ? '#ff8a8a' : '#9aa6bd'; d.append(c);
      const e = el('button', 'avBig avEquipa', '✔'); e.title = 'Equipar'; e.onclick = () => { equipa(it); sel = null; desenhaBolsa() };
      const v = el('button', 'avBig', '🪙' + precoVenda(it)); v.title = 'Vender'; v.onclick = () => { vende(it); sel = null; desenhaBolsa() }; d.append(e, v) }
    else d.append(el('span', 'avDetSt', '✔'));
    return d }
  function desenhaBolsa() { const a = A(); painel.innerHTML = ''; const tipo = tipoArma();
    if (sel && !a.bolsa.includes(sel) && !Object.values(a.eq).includes(sel)) sel = null;
    const top = el('div', 'avBTopo'), tab = (q, txt) => { const b = el('button', 'avTab' + (aba === q ? ' on' : ''), txt); b.onclick = () => { sel = null; dica = ''; abreBolsa(q) }; return b }, x = el('button', 'avTab', '✕');
    x.onclick = fechaBolsa; top.append(tab('bolsa', '🎒 ' + a.bolsa.length + '/' + BOLSA_MAX), tab('skills', '✨ ' + (tipo === 'nu' ? 0 : ativas(tipo).length) + '/' + BARRA), tab('loja', '🏪'), el('span', 'avOuro', '🪙 ' + a.ouro), x); painel.append(top);
    const corpo = el('div', 'avCorpo'); painel.append(corpo);
    if (aba === 'bolsa') {
      const eq = el('div', 'avEqB'); for (const s of ['arma', 'arm', 'amu']) eq.append(a.eq[s] ? slotItem(a.eq[s], true) : el('div', 'avSlot vazio', SLOT[s][0])); eq.firstChild.classList.add('emUso');
      const gr = el('div', 'avGrade'), ord = a.bolsa.slice().sort((p, q) => (p.s > q.s ? 1 : p.s < q.s ? -1 : 0) || q.pct - p.pct);
      ord.forEach(it => gr.append(slotItem(it, false))); for (let i = ord.length; i < BOLSA_MAX; i++) gr.append(el('div', 'avSlot vazio'));
      const linha = el('div', 'avBag'); linha.append(eq, gr); corpo.append(linha);
      const piores = a.bolsa.filter(it => a.eq[it.s] && it.pct <= a.eq[it.s].pct);
      const rod = el('div', 'avRod'); if (sel) rod.append(detalhe(sel));
      else if (piores.length) { const b = el('button', 'avBig', '🧹 ×' + piores.length + '  🪙' + piores.reduce((t, it) => t + precoVenda(it), 0)); b.title = 'Vender tudo que é pior que o que está em uso'; b.onclick = () => { piores.forEach(vende); desenhaBolsa() }; rod.append(b) }
      corpo.append(rod);
    } else if (aba === 'skills') {
      if (tipo === 'nu') { corpo.append(el('div', 'avVazioG', '🗡️ / 🪄  ➜  ✨')); return }
      const em = ativas(tipo), barra = el('div', 'avBarraSk');
      for (let i = 0; i < BARRA; i++) { const x = em[i], c = el('span', 'avSkC' + (x ? '' : ' vazio'), x ? icoSk(x) : ''); if (x) c.style.borderColor = x.cor; barra.append(c) }
      const gr = el('div', 'avSkGrade');
      SKILLS[tipo].forEach(x => { const ok = S.nv >= x.nv, usa = em.includes(x), b = el('button', 'avSk' + (usa ? ' on' : '') + (ok ? '' : ' preso'));
        b.append(el('span', 'avSkIc', ok ? icoSk(x) : '🔒')); if (!ok) b.append(el('span', 'avSkNv', '⭐' + x.nv)); else if (x.mana) b.append(el('span', 'avSkNv', '🔷' + x.mana));
        b.style.borderColor = ok ? x.cor : '#333a4a'; if (usa) b.style.boxShadow = '0 0 10px ' + x.cor;
        b.onclick = () => { dica = (ok ? icoSk(x) + ' ' + x.nome + '  ·  💥×' + x.m : '🔒 ⭐' + x.nv); if (ok && (usa || em.length < BARRA)) { a.build = a.build || {}; const cur = em.map(z => z.nome); a.build[tipo] = usa ? cur.filter(n => n !== x.nome) : cur.concat(x.nome); V.H = heroi(); salva() } desenhaBolsa() };
        gr.append(b) });
      corpo.append(barra, gr, el('div', 'avDicaSk', dica));
    } else {
      const gr = el('div', 'avLojaG'), tile = (ic, qtd, preco, pode, fn, nome) => { const b = el('button', 'avTile'); b.title = nome; b.disabled = !pode;
        b.append(el('span', 'avTileIc', ic), el('span', 'avTileQ', qtd), el('span', 'avTileP', preco == null ? '✔' : '🪙' + preco)); b.onclick = () => { fn(); salva(); desenhaBolsa() }; gr.append(b) };
      const pp = precoPocao(a.z), fm = a.forja >= forjaMax(), cf = custoForja(a.forja);
      tile('🧪', '×' + a.poc, pp, a.ouro >= pp, () => { a.ouro -= pp; a.poc++ }, 'Poção de vida');
      tile('🔷', '×' + a.pm, pp, a.ouro >= pp, () => { a.ouro -= pp; a.pm++ }, 'Poção de mana');
      tile('⚒️', a.forja + '/' + forjaMax(), fm ? null : cf, !fm && a.ouro >= cf, () => forja(), 'Forja: +4% de ataque');
      corpo.append(gr);
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
