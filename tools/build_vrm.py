# Monta um .glb leve pro jogo a partir de um VRM do VRoid (CC0) + animações Quaternius UAL (CC0).
# - junta as partes do modelo por material (menos draw calls), tira expressões faciais (morphs) e a miniatura
# - texturas no máximo 1024 px (JPEG quando não tem transparência)
# - ossos renomeados pros nomes que o kk.js usa (hips, spine, chest, head, upperarm.l ...) + handslot.l/.r
# - animações UAL convertidas pro esqueleto do VRM e salvas com os nomes KayKit que o jogo chama
# - opcional: animações do Mixamo (FBX Binary, Without Skin) por cima das UAL, com os nomes de arquivo da tabela MIX abaixo
# Uso: python3 build_vrm.py modelo.vrm UAL1.glb UAL2.glb saida.glb [--mixamo pasta_com_os_fbx]
import sys, os, io, json, struct, numpy as np
from PIL import Image
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from glbio import load, acc, world, qmul, qinv, qrot
from fbxio import load_fbx

VRM, U1, U2, OUT = sys.argv[1:5]
MIXDIR = sys.argv[sys.argv.index('--mixamo') + 1] if '--mixamo' in sys.argv else None
MAXTEX = 1024

j, bn = load(VRM)
V = j['extensions']['VRM']
hb = {h['bone']: h['node'] for h in V['humanoid']['humanBones']}
NAMES = {'hips': 'hips', 'spine': 'spine', 'chest': 'chest0', 'upperChest': 'chest', 'neck': 'neck', 'head': 'head'}
for s, S in (('l', 'left'), ('r', 'right')):
    NAMES.update({S + 'Shoulder': 'shoulder.' + s, S + 'UpperArm': 'upperarm.' + s, S + 'LowerArm': 'lowerarm.' + s, S + 'Hand': 'hand.' + s,
                  S + 'UpperLeg': 'upperleg.' + s, S + 'LowerLeg': 'lowerleg.' + s, S + 'Foot': 'foot.' + s, S + 'Toes': 'toes.' + s})
    for f, F in (('thumb', 'Thumb'), ('index', 'Index'), ('middle', 'Middle'), ('ring', 'Ring'), ('little', 'Little')):
        for k, K in ((1, 'Proximal'), (2, 'Intermediate'), (3, 'Distal')):
            NAMES[S + F + K] = f'{f}{k}.{s}'
# UAL (manequim) -> osso humano
SRC = {'pelvis': 'hips', 'spine_01': 'spine', 'spine_02': 'chest', 'spine_03': 'upperChest', 'neck_01': 'neck', 'Head': 'head'}
for s, S in (('l', 'left'), ('r', 'right')):
    SRC.update({f'clavicle_{s}': S + 'Shoulder', f'upperarm_{s}': S + 'UpperArm', f'lowerarm_{s}': S + 'LowerArm', f'hand_{s}': S + 'Hand',
                f'thigh_{s}': S + 'UpperLeg', f'calf_{s}': S + 'LowerLeg', f'foot_{s}': S + 'Foot', f'ball_{s}': S + 'Toes'})
    for f, F in (('thumb', 'Thumb'), ('index', 'Index'), ('middle', 'Middle'), ('ring', 'Ring'), ('pinky', 'Little')):
        for k, K in ((1, 'Proximal'), (2, 'Intermediate'), (3, 'Distal')):
            SRC[f'{f}_0{k}_{s}'] = S + F + K
# Mixamo -> osso humano (o prefixo "mixamorig:" já sai no fbxio)
SRCM = {'Hips': 'hips', 'Spine': 'spine', 'Spine1': 'chest', 'Spine2': 'upperChest', 'Neck': 'neck', 'Head': 'head'}
for s, S in (('Left', 'left'), ('Right', 'right')):
    SRCM.update({s + 'Shoulder': S + 'Shoulder', s + 'Arm': S + 'UpperArm', s + 'ForeArm': S + 'LowerArm', s + 'Hand': S + 'Hand',
                 s + 'UpLeg': S + 'UpperLeg', s + 'Leg': S + 'LowerLeg', s + 'Foot': S + 'Foot', s + 'ToeBase': S + 'Toes'})
    for f, F in (('Thumb', 'Thumb'), ('Index', 'Index'), ('Middle', 'Middle'), ('Ring', 'Ring'), ('Pinky', 'Little')):
        for k, K in ((1, 'Proximal'), (2, 'Intermediate'), (3, 'Distal')):
            SRCM[f'{s}Hand{f}{k}'] = S + F + K
# arquivo do Mixamo (pasta --mixamo) -> animação do jogo. Pode ser só o nome, ou:
#  (arquivo, início, fim[, segundos])  corta o clipe (fração da duração) e estica/encolhe pro tempo do jogo
#  (arquivo, [(fração da saída, fração do original)...], segundos)  mapa de tempo (escolhe e segura quadros)
MIX = {
    'Running_A': 'corrida', 'Walking_A': 'andar', 'Idle_A': 'parada', 'Fall_Idle': 'queda',
    'Jump_Idle': ('pulo', 0.33, 0.48),                   # só o trecho no ar (o jogo é quem sobe e desce)
    # dash: o jogo inclina o corpo ~70° pra frente e levanta; o impulso + braços esticados do começo do mortal viram voo
    'Dodge_Forward': ('cambalhota', [(0, 0.20), (0.45, 0.30), (1, 0.32)], 0.2),
    # cambalhota (Jump_Full_Short): fica a da UAL, encolhida em bola, que casa com o giro de 360° que o jogo faz
    # (o mortal do Mixamo estica as pernas e fica feio girando)
    # --- animações completas pra vila de teste (o próprio clipe gira/abaixa; o jogo só dá altura e deslocamento) ---
    'Jump_Start': ('pulo_impulso', 0.42, 1.0, 0.4),       # sai do chão (sem o agachamento, o pulo já começa no toque)
    'Jump_Run': ('pulo_correndo', 0.72, 1.0, 0.3),        # saída de pulo correndo
    'Land_A': ('aterrissa_queda', 0.28, 0.85, 0.5),       # aterrissagem normal
    'Land_B': ('aterrissa_pulo', 0.22, 0.62, 0.7),        # aterrissagem de queda alta
    'Flip_Front': ('mortal_frente', 0.33, 0.92, 0.6),     # mortal pra frente encolhido (gira sozinho)
    'Flip_Back': ('mortal_tras', 0.28, 0.67, 0.75),       # mortal pra trás
    'Roll_Quick': ('rolamento', 0.15, 0.95, 0.8),         # dash: rolamento rápido
    'Roll_Dive': ('mergulho', 0.2, 0.85, 1.0),            # dash: mergulho com rolamento
    'Roll_Sprint': ('arrancada_rola', 0.0, 1.0, 0.85),    # dash: arrancada com rolamento
}
NOY = {'Jump_Idle', 'Jump_Full_Short', 'Jump_Start', 'Jump_Run', 'Flip_Front', 'Flip_Back'}                   # quadril sem subir/descer: a altura do pulo é do jogo
PING = {'Jump_Idle'}                                     # em loop vai e volta (sem salto de pose quando recomeça)
NOPITCH = {'Jump_Full_Short', 'Dodge_Forward'}           # o jogo já gira/inclina o corpo: tira o giro do quadril (fica só a pose)
# animação do jogo (nome KayKit) <- clipe UAL
CLIPS = {
    'Idle_A': 'Idle_Loop', 'Walking_A': 'Walk_Loop', 'Running_A': 'Sprint_Loop', 'Jump_Idle': 'Jump_Loop', 'Jump_Full_Short': 'NinjaJump_Idle_Loop',
    'Death_A': 'Death01', 'Hit_A': 'Hit_Chest', 'Dodge_Forward': ('Sword_Dash', 0.2, 0.72), 'Melee_1H_Attack_Slice_Diagonal': 'Sword_Attack',
    'Melee_2H_Attack_Spin': 'Sword_Regular_Combo', 'Melee_Block': 'Sword_Block', 'Ranged_Magic_Shoot': 'Spell_Simple_Shoot',
    'Ranged_Magic_Spellcasting': 'Spell_Simple_Idle_Loop', 'Ranged_Magic_Spellcasting_Long': 'Spell_Simple_Idle_Loop',
    'Ranged_Magic_Summon': 'Spell_Simple_Shoot', 'Ranged_Magic_Raise': 'Spell_Simple_Enter', 'Interact': 'Interact', 'PickUp': 'Farm_Harvest',
    'Chopping': 'TreeChopping_Loop', 'Pickaxing': 'TreeChopping_Loop', 'Sit_Chair_Idle': 'Sitting_Idle_Loop', 'Sit_Floor_Idle': 'Sitting_Idle_Loop',
}

# ---------------- saída ----------------
out = {'asset': {'version': '2.0', 'generator': 'quimera build_vrm'}, 'scene': 0, 'scenes': [{'nodes': []}], 'nodes': [], 'meshes': [], 'skins': [],
       'materials': [], 'textures': [], 'images': [], 'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}],
       'accessors': [], 'bufferViews': [], 'buffers': [], 'animations': []}
blob = bytearray()
def put(data, target=None):
    global blob
    while len(blob) % 4: blob.append(0)
    o = len(blob); blob += data; bv = {'buffer': 0, 'byteOffset': o, 'byteLength': len(data)}
    if target: bv['target'] = target
    out['bufferViews'].append(bv); return len(out['bufferViews']) - 1
def addacc(arr, typ, ctype, target=None, minmax=False):
    arr = np.ascontiguousarray(arr); bv = put(arr.tobytes(), target)
    a = {'bufferView': bv, 'componentType': ctype, 'count': int(arr.shape[0]), 'type': typ}
    if minmax: a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
    out['accessors'].append(a); return len(out['accessors']) - 1

# nós (mesma ordem/índices), com nomes novos nos ossos humanos
rename = {hb[k]: v for k, v in NAMES.items() if k in hb}
for i, n in enumerate(j['nodes']):
    m = {k: n[k] for k in ('translation', 'rotation', 'scale', 'children', 'skin', 'mesh') if k in n}
    m['name'] = rename.get(i, f'n{i}')
    out['nodes'].append(m)
# encaixe de ferramenta nas mãos (no espaço do VRM, que olha pra -Z; o jogo vira o modelo 180°)
Wj, parj = world(j)
for s, side in (('r', 1), ('l', -1)):
    h = hb['rightHand' if s == 'r' else 'leftHand']
    out['nodes'].append({'name': 'handslot.' + s, 'translation': [0.075 * side, -0.025, 0.0], 'rotation': [-0.7071068, 0, 0, 0.7071068]})
    out['nodes'][h].setdefault('children', []).append(len(out['nodes']) - 1)
out['scenes'][0]['nodes'] = list(j['scenes'][j.get('scene', 0)]['nodes'])
for sk in j['skins']:
    ib = acc(j, bn, sk['inverseBindMatrices']).astype(np.float32)
    out['skins'].append({'joints': sk['joints'], 'inverseBindMatrices': addacc(ib, 'MAT4', 5126)} | ({'skeleton': sk['skeleton']} if 'skeleton' in sk else {}))

# ---------------- texturas ----------------
used_img = {}
def tex(ti, opaque):
    src = j['textures'][ti]['source']
    key = (src, opaque)
    if key in used_img: return used_img[key]
    im = j['images'][src]; bv = j['bufferViews'][im['bufferView']]
    img = Image.open(io.BytesIO(bn[bv.get('byteOffset', 0): bv.get('byteOffset', 0) + bv['byteLength']]))
    img.load()
    if max(img.size) > MAXTEX: img = img.resize((min(MAXTEX, img.size[0]), min(MAXTEX, img.size[1])), Image.LANCZOS)
    alpha = img.mode in ('RGBA', 'LA', 'P') and img.convert('RGBA').getchannel('A').getextrema()[0] < 250
    buf = io.BytesIO()
    if opaque or not alpha: img.convert('RGB').save(buf, 'JPEG', quality=86); mt = 'image/jpeg'
    else: img.convert('RGBA').save(buf, 'PNG', optimize=True); mt = 'image/png'
    out['images'].append({'bufferView': put(buf.getvalue()), 'mimeType': mt, 'name': im.get('name', '')})
    out['textures'].append({'source': len(out['images']) - 1, 'sampler': 0})
    used_img[key] = len(out['textures']) - 1; return used_img[key]
for m in j['materials']:
    nm = {'name': m['name'], 'pbrMetallicRoughness': {'metallicFactor': 0, 'roughnessFactor': 1}, 'extensions': {'KHR_materials_unlit': {}}}
    pb = m.get('pbrMetallicRoughness', {})
    if 'baseColorFactor' in pb: nm['pbrMetallicRoughness']['baseColorFactor'] = pb['baseColorFactor']
    if 'baseColorTexture' in pb: nm['pbrMetallicRoughness']['baseColorTexture'] = {'index': tex(pb['baseColorTexture']['index'], m.get('alphaMode', 'OPAQUE') == 'OPAQUE')}
    for k in ('alphaMode', 'alphaCutoff', 'doubleSided'):
        if k in m: nm[k] = m[k]
    out['materials'].append(nm)
out['extensionsUsed'] = ['KHR_materials_unlit']

# ---------------- malhas: junta primitivas do mesmo material, sem morphs ----------------
cache = {}
for me in j['meshes']:
    groups = {}
    for p in me['primitives']: groups.setdefault(p.get('material', -1), []).append(p)
    prims = []
    for mat, ps in groups.items():
        cols = {k: [] for k in ('POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0')}; idx = []; base = 0
        for p in ps:
            A = p['attributes']
            n = j['accessors'][A['POSITION']]['count']
            ii = acc(j, bn, p['indices']).reshape(-1).astype(np.uint32) if 'indices' in p else np.arange(n, dtype=np.uint32)
            used, remap = np.unique(ii, return_inverse=True)   # só os vértices que esta parte usa
            for k in cols:
                if k in A:
                    a = cache.get(A[k])
                    if a is None: a = cache[A[k]] = acc(j, bn, A[k]).astype(np.uint16 if k == 'JOINTS_0' else np.float32)
                    cols[k].append(a[used])
            idx.append(remap.astype(np.uint32) + base); base += len(used)
        attrs = {}
        for k, L in cols.items():
            if not L: continue
            arr = np.concatenate(L)
            attrs[k] = addacc(arr, {1: 'SCALAR', 2: 'VEC2', 3: 'VEC3', 4: 'VEC4'}[arr.shape[1]], 5123 if k == 'JOINTS_0' else 5126, 34962, k == 'POSITION')
        ii = np.concatenate(idx); big = base > 65535
        pr = {'attributes': attrs, 'indices': addacc(ii.astype(np.uint32 if big else np.uint16).reshape(-1, 1), 'SCALAR', 5125 if big else 5123, 34963)}
        if mat >= 0: pr['material'] = mat
        prims.append(pr)
    out['meshes'].append({'name': me.get('name', ''), 'primitives': prims})

# ---------------- animações ----------------
tgt = {hb[k]: k for k in hb}                         # nó do VRM -> nome humano
hum2node = {k: v for k, v in hb.items()}
HIPS_T = np.array(Wj[hb['hips']][1])
RY = np.array([0, 1, 0, 0.0])
STRIDE = {}
def stride(sj, sb, SW, spar, sidx, tracks, chain=('pelvis', 'thigh_l', 'calf_l', 'foot_l')):
    # posição do pé esquerdo (relativa ao quadril) em cada quadro, por cinemática direta; passada ~ 2x o vaivém do pé
    t0 = tracks.get((sidx[chain[3]], 'rotation')) or tracks.get((sidx[chain[1]], 'rotation'))
    times = t0[0]; zs = []
    for k in range(len(times)):
        q = np.array([0, 0, 0, 1.0]); p = np.zeros(3)
        for nm in chain[1:]:
            i = sidx[nm]; n = sj['nodes'][i]
            tr = tracks.get((i, 'rotation')); lq = tr[1][min(k, len(tr[1]) - 1)].astype(float) if tr else np.array(n.get('rotation', [0, 0, 0, 1.0]))
            p = p + qrot(q, np.array(n.get('translation', [0, 0, 0.0]))); q = qmul(q, lq)
        pq = SW[sidx[chain[0]]][0]; zs.append(qrot(pq, p)[2])
    zs = np.array(zs); return float(2 * (zs.max() - zs.min()))                        # UAL olha pra +Z, o VRM pra -Z
def conj(q): return qmul(qmul(RY, q), qinv(RY))
SOURCES = [(load(U1), SRC, CLIPS, 'pelvis'), (load(U2), SRC, CLIPS, 'pelvis')]
if MIXDIR:
    for game, f in MIX.items():
        cut = None
        if isinstance(f, tuple): f, *cut = f
        p = os.path.join(MIXDIR, f + '.fbx')
        if not os.path.exists(p): print('sem', p, '(fica a UAL)'); continue
        SOURCES.append((load_fbx(p, f), SRCM, {game: (f, *cut) if cut else f}, 'Hips'))
        CLIPS.pop(game, None)                            # o Mixamo substitui a UAL desse movimento
for (sj, sb), SRCX, CL, PEL in SOURCES:
    SW, spar = world(sj); sidx = {n['name']: i for i, n in enumerate(sj['nodes'])}
    pel = sidx[PEL]; k_h = HIPS_T[1] / SW[pel][1][1]
    chain = ('pelvis', 'thigh_l', 'calf_l', 'foot_l') if PEL == 'pelvis' else ('Hips', 'LeftUpLeg', 'LeftLeg', 'LeftFoot')
    for game, clip in CL.items():
        if CL is CLIPS and game not in CLIPS: continue
        cut = None; dur = None; tmap = None
        if isinstance(clip, tuple) and isinstance(clip[1], list): clip, tmap, dur = clip
        elif isinstance(clip, tuple): clip, a0, a1, *dur = clip; cut = (a0, a1); dur = dur[0] if dur else None
        an = next((a for a in sj['animations'] if a['name'] == clip), None)
        if an is None: continue
        chans = []; samps = []
        tracks = {}
        for c in an['channels']:
            nd = c['target']['node']; s = an['samplers'][c['sampler']]
            tracks[(nd, c['target']['path'])] = (acc(sj, sb, s['input']).reshape(-1), acc(sj, sb, s['output']))
        if tmap:                                         # reamostra a 30 FPS seguindo o mapa de tempo
            T = max(t.max() for t, _ in tracks.values()); n = max(2, int(round(dur * 30)) + 1); to = np.linspace(0, 1, n)
            src = np.interp(to, [a for a, _ in tmap], [b for _, b in tmap]) * T
            for key, (t, v) in list(tracks.items()):
                v = v.astype(np.float64); k = np.clip(np.searchsorted(t, src) - 1, 0, len(t) - 2); f = ((src - t[k]) / np.maximum(t[k + 1] - t[k], 1e-9))[:, None]
                a, b = v[k], v[k + 1]
                if key[1] == 'rotation': b = np.where((a * b).sum(1, keepdims=True) < 0, -b, b)
                w = a * (1 - f) + b * f
                if key[1] == 'rotation': w /= np.linalg.norm(w, axis=1, keepdims=True)
                tracks[key] = (to * dur, w)
            dur = None
        if cut:
            T = max(t.max() for t, _ in tracks.values())
            for key, (t, v) in list(tracks.items()):
                m = (t >= cut[0] * T - 1e-4) & (t <= cut[1] * T + 1e-4); tracks[key] = (t[m] - cut[0] * T, v[m])
            if dur:
                L = max(t.max() for t, _ in tracks.values())
                for key, (t, v) in list(tracks.items()): tracks[key] = (t * (dur / L), v)
        if game in NOPITCH and PEL == 'Hips' and (pel, 'rotation') in tracks:
            t, q = tracks[(pel, 'rotation')]; q = q.astype(np.float64)
            tw = np.stack([q[:, 0], 0 * q[:, 0], 0 * q[:, 0], q[:, 3]], 1); tw /= np.linalg.norm(tw, axis=1, keepdims=True)  # giro em volta do eixo lateral (X)
            tracks[(pel, 'rotation')] = (t, qmul(qinv(tw), q))
        if game in PING and PEL == 'Hips':
            for key, (t, v) in list(tracks.items()): tracks[key] = (np.concatenate([t, 2 * t[-1] - t[-2::-1]]), np.concatenate([v, v[-2::-1]]))
        if game in ('Running_A', 'Walking_A'): STRIDE[game] = stride(sj, sb, SW, spar, sidx, tracks, chain) * k_h
        for sname, hum in SRCX.items():
            if hum not in hum2node or sname not in sidx: continue
            si = sidx[sname]; tr = tracks.get((si, 'rotation'))
            if tr is None: continue
            t, q = tr
            Rs = SW[si][0]; Rsp = SW[spar[si]][0] if si in spar else np.array([0, 0, 0, 1.0])
            ql = qmul(qmul(Rsp[None], q.astype(np.float64)), qinv(Rs)[None])
            ql = conj(ql); ql /= np.linalg.norm(ql, axis=1, keepdims=True)
            for i in range(1, len(ql)):                  # mesmo hemisfério (interpolação sem giro)
                if np.dot(ql[i], ql[i - 1]) < 0: ql[i] = -ql[i]
            samps.append({'input': addacc(t.astype(np.float32).reshape(-1, 1), 'SCALAR', 5126, None, True), 'output': addacc(ql.astype(np.float32), 'VEC4', 5126), 'interpolation': 'LINEAR'})
            chans.append({'sampler': len(samps) - 1, 'target': {'node': hum2node[hum], 'path': 'rotation'}})
        tr = tracks.get((pel, 'translation'))
        if tr is not None:
            t, p = tr; pq, pt, ps = SW[spar[pel]] if pel in spar else (np.array([0, 0, 0, 1.0]), np.zeros(3), np.ones(3))
            w = pt[None] + qrot(np.repeat(pq[None], len(p), 0), p.astype(np.float64) * ps)
            d = (w - SW[pel][1][None]) * k_h
            d = np.stack([0 * d[:, 0], (0 if game in NOY and PEL == 'Hips' else 1) * d[:, 1], 0 * d[:, 2]], 1)  # quadril não anda pra frente/lado: quem move é o jogo
            loc = np.array(j['nodes'][hb['hips']].get('translation', [0, 0, 0]))[None] + d
            samps.append({'input': addacc(t.astype(np.float32).reshape(-1, 1), 'SCALAR', 5126, None, True), 'output': addacc(loc.astype(np.float32), 'VEC3', 5126), 'interpolation': 'LINEAR'})
            chans.append({'sampler': len(samps) - 1, 'target': {'node': hb['hips'], 'path': 'translation'}})
        out['animations'].append({'name': game, 'channels': chans, 'samplers': samps})

sa = V.get('secondaryAnimation', {})
nm_out = lambda i: out['nodes'][i]['name']
spring = {'groups': [], 'colliders': []}
for c in sa.get('colliderGroups', []):
    spring['colliders'].append({'node': nm_out(c['node']), 's': [[x['offset']['x'], x['offset']['y'], -x['offset']['z'], x['radius']] for x in c['colliders']]})
for g in sa.get('boneGroups', []):
    spring['groups'].append({'stiff': g['stiffiness'], 'grav': g['gravityPower'], 'gdir': [g['gravityDir']['x'], g['gravityDir']['y'], g['gravityDir']['z']],
                             'drag': g['dragForce'], 'hit': g['hitRadius'], 'roots': [nm_out(i) for i in g['bones']], 'col': g.get('colliderGroups', [])})
out['extras'] = {'spring': spring, 'stride': STRIDE}
while len(blob) % 4: blob.append(0)
out['buffers'] = [{'byteLength': len(blob)}]
js = json.dumps(out, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
with open(OUT, 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)))
    f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
    f.write(struct.pack('<II', len(blob), 0x004E4942)); f.write(blob)
print('ok', OUT, round((28 + len(js) + len(blob)) / 1e6, 2), 'MB', 'anims', len(out['animations']), 'prims', sum(len(m['primitives']) for m in out['meshes']))
