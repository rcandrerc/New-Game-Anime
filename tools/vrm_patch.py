# coloca a personagem VRoid na pasta teste/ (rodar depois do tools/teste.py)
# Uso: python3 tools/vrm/vrm_patch.py caminho/do/shino.glb
import shutil, sys, os
T = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(T, '..', '..', 'teste') + '/'
GLB = sys.argv[1] if len(sys.argv) > 1 else os.path.join(T, 'shino.glb')
def rep(s,a,b):
    assert s.count(a)==1,(a,s.count(a)); return s.replace(a,b)
shutil.copy(os.path.join(T, 'vrm_char.js'), R+'kk/vrm_char.js'); shutil.copy(GLB, R+'kk/shino.glb')
for f in ['index.html','en.html']:
    s=open(R+f,encoding='utf-8').read()
    s=rep(s,'<script src="kk/kk.js"></script>','<script src="kk/vrm_char.js"></script><script src="kk/kk.js"></script>')
    s=rep(s,"KKB.init(Ji,Ke,()=>Bh,'fusao')","KKB.init(Ji,Ke,()=>Bh,window.VRMC?'bruxa':'fusao')")
    open(R+f,'w',encoding='utf-8').write(s)
s=open(R+'kk/kk.js',encoding='utf-8').read()
s=rep(s,"Promise.all([load('Mage.glb'), load('anims.glb'), load('staff.gltf')]).then(([mg, an, st]) => {","Promise.all([load('Mage.glb'), load('anims.glb'), load('staff.gltf'), window.VRMC ? load(VRMC.url) : null]).then(([mg, an, st, vr]) => {")
s=rep(s,"S.rigs.girl = makeRig(mg, an, S.staff, null, par);","if (vr) { const A = VRMC.prep(vr); S.rigs.girl = makeRig(A.gl, A.an, S.staff, null, par); S.rigs.girl.root.scale.multiplyScalar(VRMC.k); VRMC.fix(S.rigs.girl) } else S.rigs.girl = makeRig(mg, an, S.staff, null, par);")
s=rep(s,"const X = window.PX && PX._X, boy = !!(X && X.boy);","const X = window.PX && PX._X, boy = !window.VRMC && !!(X && X.boy);")
s=rep(s,"frame(S, R, Ji, B, X, window.PX, dt, now, { fusao: S.mode === 'fusao', fish: fi, fishF: fi && window.mgFishF, laid: SWA, row: window.mgRowP });","frame(S, R, Ji, B, X, window.PX, dt, now, { fusao: S.mode === 'fusao', fish: fi, fishF: fi && window.mgFishF, laid: SWA, row: window.mgRowP }); if (window.VRMC) try { VRMC.tick(R, dt) } catch (e) { console.warn('vrm física', e) }")
# queda: descendo usa a pose de queda do Mixamo (quem não tem essa animação continua com a do pulo)
s=rep(s,"if ((B.jz || 0) > 0.08) return ['Jump_Idle'];","if ((B.jz || 0) > 0.08) return (B.jv || 0) < -2.5 ? ['Fall_Idle'] : ['Jump_Idle'];")
s=rep(s,"    const a = R.act[name]; if (!a) return;","    if (!R.act[name] && name === 'Fall_Idle') name = 'Jump_Idle';\n    const a = R.act[name]; if (!a) return;")
open(R+'kk/kk.js','w',encoding='utf-8').write(s);print('shino ok')
