// Gera aventura/kai_<arma>_*.png (a heroína KayKit, CC0, sem arma, com espada e com cajado) para a Aventura 2D.
// Uso: copie para tmp_kk/ os Characters (Rogue.glb, Knight.glb, Mage.glb), Assets (sword_1handed.*, staff.*, *_texture.png) e as animações
// Rig_Medium_*.glb do KayKit (New-Game-Anime-fontes/pacotes_cc0); rode `python3 -m http.server 8000` e `node tools/sprites_kaykit.js`.
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage(); p.on('pageerror', e => console.log('[erro]', e.message));
  await p.goto('http://localhost:8000/tools/sprites_kaykit.html');
  const dir = path.join(__dirname, '..', 'aventura');
  // a roupa segue a arma: sem arma = aventureira (Rogue, soco), espada = guerreira (Knight), cajado = maga (Mage, magia)
  for (const [q, a, nome, g] of [['Rogue', '', 'kai_nu', 'Melee_Unarmed_Attack_Punch_A'], ['Knight', 'sword_1handed', 'kai_espada', 'Melee_1H_Attack_Slice_Diagonal'], ['Mage', 'staff', 'kai_cajado', 'Ranged_Magic_Shoot']]) {
    const R = await p.evaluate(([q, a, g]) => gera(q, a, g), [q, a, g]);
    for (const [an, url] of Object.entries(R.heroi)) fs.writeFileSync(path.join(dir, nome + '_' + an + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  }
  await b.close(); console.log('ok');
})();
