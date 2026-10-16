// TESTE: personagem VRoid (Sendagaya Shino, CC0) com animações Quaternius UAL (CC0, movimento captado de gente de verdade).
// O arquivo kk/shino.glb já vem pronto (tools/vrm/build_vrm.py): texturas menores, partes juntadas, ossos com os nomes
// que o kk.js usa, animações convertidas pro esqueleto dela com os nomes KayKit que o jogo chama,
// e os dados de física do cabelo/saia (spring bones do VRM) nos extras.
(function () {
  const _c = new THREE.Vector3(), _gv = new THREE.Vector3(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _s = new THREE.Vector3(), _m = new THREE.Matrix4();
  const san = n => THREE.PropertyBinding.sanitizeNodeName(n);

  // ---- física do cabelo, da franja, da saia e do busto (mesma conta do SpringBone do VRM 0.x) ----
  function springInit(model, data) {
    const by = {}; model.traverse(o => { by[o.name] = o });
    const cols = data.colliders.map(c => ({ node: by[san(c.node)], s: c.s }));
    const J = [];
    for (const g of data.groups) {
      const cg = g.col.map(i => cols[i]).filter(c => c && c.node);
      const add = (b) => {
        const kids = b.children.filter(c => c.isBone);
        const ch = kids[0], axis = new THREE.Vector3(), len = ch ? ch.position.length() : 0.07;
        if (ch && len > 1e-5) axis.copy(ch.position).normalize(); else axis.copy(b.position).normalize();
        J.push({ b, rest: b.quaternion.clone(), axis, len, g, cg, tail: null, prev: null });
        for (const c of kids) add(c);
      };
      for (const r of g.roots) { const b = by[san(r)]; if (b) add(b) }
    }
    return J;
  }
  function springTick(J, dt) {
    for (const j of J) {
      const b = j.b, p = b.parent;
      b.quaternion.copy(j.rest); b.updateMatrix(); b.matrixWorld.multiplyMatrices(p.matrixWorld, b.matrix);
      const pos = _v.setFromMatrixPosition(b.matrixWorld);
      p.matrixWorld.decompose(_v3, _q, _s); const sc = _s.x, L = j.len * sc;
      _q.multiply(j.rest); // rotação de repouso do osso no mundo
      const dir = _v2.copy(j.axis).applyQuaternion(_q);
      if (!j.tail || j.tail.distanceTo(pos) > L * 4 + 1) { j.tail = pos.clone().addScaledVector(dir, L); j.prev = j.tail.clone() } // começo ou teleporte
      const g = j.g, nx = _v3.copy(j.tail).sub(j.prev).multiplyScalar(1 - g.drag).add(j.tail)
        .addScaledVector(dir, g.stiff * dt * sc).add(_gv.set(g.gdir[0], g.gdir[1], g.gdir[2]).multiplyScalar(g.grav * dt * sc));
      nx.sub(pos).setLength(L).add(pos);
      for (const c of j.cg) { // não atravessa cabeça, corpo, braços e pernas
        const m = c.node.matrixWorld;
        for (const s of c.s) {
          const cen = _c.set(s[0], s[1], s[2]).applyMatrix4(m), r = (s[3] + g.hit) * sc, d = nx.distanceTo(cen);
          if (d < r && d > 1e-6) { nx.sub(cen).setLength(r).add(cen); nx.sub(pos).setLength(L).add(pos) }
        }
      }
      j.prev.copy(j.tail); j.tail.copy(nx);
      // gira o osso pra apontar pra ponta nova
      const to = _v2.copy(nx).sub(pos).applyQuaternion(_q2.copy(_q).invert()).normalize();
      b.quaternion.copy(j.rest).multiply(_q2.setFromUnitVectors(j.axis, to));
      b.updateMatrix(); b.matrixWorld.multiplyMatrices(p.matrixWorld, b.matrix);
    }
  }

  window.VRMC = {
    url: 'shino.glb', k: 1.1, // um pouco mais alta que a maga fofa
    prep(gl) {
      const wrap = new THREE.Group(); gl.scene.rotation.y = Math.PI; wrap.add(gl.scene); // o VRM olha pra -Z; o jogo espera +Z
      gl.scene.traverse(o => {
        if (!o.isMesh) return; const m = o.material;
        // material sem luz (MToon) -> material com luz, pra pegar o sombreado anime, a sombra e a noite do jogo
        const n = new THREE.MeshStandardMaterial({ map: m.map, color: m.color, roughness: 1, metalness: 0, skinning: true,
          alphaTest: m.alphaTest, transparent: m.transparent, depthWrite: m.depthWrite, side: m.side });
        if (m.map) { n.emissiveMap = m.map; n.emissive = new THREE.Color(0.09, 0.085, 0.085) } // um pouco de luz própria: anime não fica escuro demais na sombra
        n.name = m.name; n.userData.side = m.side; o.material = n; m.dispose();
      });
      const ex = (gl.parser && gl.parser.json && gl.parser.json.extras) || {};
      wrap.userData.vrm = { model: gl.scene, spring: ex.spring, stride: ex.stride || {}, root: ex.root || {} };
      return { gl: { scene: wrap }, an: { animations: gl.animations } };
    },
    fix(R, run = 4.6, walk = 2.2) { // velocidades (por segundo, em unidades do mundo) em que a passada toca no ritmo 1
      const root = R.root;
      root.traverse(o => { if (o.isMesh && o.material.userData.side != null) { o.material.side = o.material.userData.side; if (o.material.transparent) o.castShadow = false } });
      // passada casada com a velocidade do jogo: corrida a 4,6 e caminhada a 2,2 por segundo tocam no ritmo 1
      const V = root.userData.vrm; if (!V) return; root.updateMatrixWorld(true); V.model.getWorldScale(_s); const ws = _s.x;
      const act = R.act || {};
      for (const [name, base] of [['Running_A', run], ['Walking_A', walk]]) {
        const D = V.stride[name], clip = (act[name] && act[name].getClip()) || null; if (!D || !clip) continue;
        const f = (D * ws / base) / clip.duration;
        for (const t of clip.tracks) for (let i = 0; i < t.times.length; i++) t.times[i] *= f;
        clip.duration *= f;
      }
    },
    tick(R, dt) {
      const V = R.root.userData.vrm; if (!V || !V.spring || !R.root.visible) return;
      if (!V.J) V.J = springInit(V.model, V.spring);
      springTick(V.J, Math.min(1 / 20, Math.max(1 / 120, dt)));
    }
  };
})();
