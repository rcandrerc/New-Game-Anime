// Gera aventura/*.png (folhas de sprites da Aventura 2D) a partir dos .glb do jogo.
// Uso: na pasta do repositório, rode `python3 -m http.server 8000` e depois `node tools/sprites_aventura.js`.
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage(); p.on('console', m => console.log('[pág]', m.text())); p.on('pageerror', e => console.log('[erro]', e.message));
  await p.goto('http://localhost:8000/tools/sprites_aventura.html');
  const R = await p.evaluate(() => gera());
  const dir = path.join(__dirname, '..', 'aventura'); fs.mkdirSync(dir, { recursive: true });
  for (const [quem, anims] of Object.entries(R)) for (const [an, url] of Object.entries(anims)) {
    fs.writeFileSync(path.join(dir, quem.toLowerCase() + '_' + an + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log('ok', Object.keys(R)); await b.close();
})();
