// Gera aventura/kai_*.png e aventura/maga_*.png (heroínas estilo KayKit, CC0) para a Aventura 2D.
// Uso: copie para tmp_kk/ os Characters (Rogue.glb, Mage.glb), Assets (sword_1handed.*, knight_texture.png) e as animações
// Rig_Medium_*.glb do KayKit (New-Game-Anime-fontes/pacotes_cc0); rode `python3 -m http.server 8000` e `node tools/sprites_kaykit.js`.
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage(); p.on('pageerror', e => console.log('[erro]', e.message));
  await p.goto('http://localhost:8000/tools/sprites_kaykit.html');
  const dir = path.join(__dirname, '..', 'aventura');
  for (const [q, a, nome] of [['Rogue', 'sword_1handed', 'kai'], ['Mage', 'sword_1handed', 'maga']]) {
    const R = await p.evaluate(([q, a]) => gera(q, a), [q, a]);
    for (const [an, url] of Object.entries(R.heroi)) fs.writeFileSync(path.join(dir, nome + '_' + an + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  }
  await b.close(); console.log('ok');
})();
