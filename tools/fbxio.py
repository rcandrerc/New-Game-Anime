# Lê o esqueleto e a animação de um FBX binário (ex.: Mixamo "Without Skin") e devolve no mesmo formato do glbio.load
# (json glTF + bloco binário), pra o build_vrm.py tratar igual aos .glb da Quaternius.
# - só nós (ossos) e uma animação (rotação e posição de cada osso), sem malha
# - unidades convertidas pra metro, rotação Euler do FBX convertida pra quaternion (com PreRotation/PostRotation)
# - curvas reamostradas na taxa do arquivo (30 FPS no Mixamo)
import struct, zlib, numpy as np
import sys; sys.path.insert(0, __file__.rsplit('/', 1)[0])
from glbio import qmul, qinv

TICKS = 46186158000.0  # unidades de tempo do FBX por segundo

def _parse(b):
    assert b[:20] == b'Kaydara FBX Binary  ', 'não é FBX binário (exporte em FBX Binary)'
    ver = struct.unpack('<I', b[23:27])[0]; wide = ver >= 7500
    hdr = '<QQQB' if wide else '<IIIB'; hl = struct.calcsize(hdr)
    def arr(off, fmt, sz):
        n, enc, cl = struct.unpack('<III', b[off:off + 12]); raw = b[off + 12: off + 12 + cl]
        if enc: raw = zlib.decompress(raw)
        return np.frombuffer(raw, dtype=fmt, count=n).copy(), off + 12 + cl
    def node(off):
        end, np_, pl, nl = struct.unpack(hdr, b[off:off + hl])
        if end == 0: return None, off + hl
        name = b[off + hl: off + hl + nl].decode('latin1'); p = off + hl + nl; props = []
        for _ in range(np_):
            t = chr(b[p]); p += 1
            if t == 'Y': props.append(struct.unpack('<h', b[p:p + 2])[0]); p += 2
            elif t == 'C': props.append(bool(b[p])); p += 1
            elif t == 'I': props.append(struct.unpack('<i', b[p:p + 4])[0]); p += 4
            elif t == 'F': props.append(struct.unpack('<f', b[p:p + 4])[0]); p += 4
            elif t == 'D': props.append(struct.unpack('<d', b[p:p + 8])[0]); p += 8
            elif t == 'L': props.append(struct.unpack('<q', b[p:p + 8])[0]); p += 8
            elif t in 'fdlib':
                a, p = arr(p, {'f': '<f4', 'd': '<f8', 'l': '<i8', 'i': '<i4', 'b': 'u1'}[t], 0); props.append(a)
            elif t in 'SR':
                n = struct.unpack('<I', b[p:p + 4])[0]; s = b[p + 4: p + 4 + n]; p += 4 + n
                props.append(s.decode('utf-8', 'replace') if t == 'S' else s)
            else: raise ValueError('tipo de propriedade FBX desconhecido ' + t)
        kids = []
        while p < end:
            k, p = node(p)
            if k is None: break
            kids.append(k)
        return {'name': name, 'props': props, 'kids': kids}, end
    top = []; off = 27
    while off < len(b) - hl:
        n, off = node(off)
        if n is None: break
        top.append(n)
    return top

def _kid(n, name): return next((k for k in n['kids'] if k['name'] == name), None)
def _p70(n):
    P = _kid(n, 'Properties70'); out = {}
    for p in (P['kids'] if P else []):
        if p['name'] == 'P': out[p['props'][0]] = p['props'][4:]
    return out

def _euler(deg, order):
    # FBX: eEulerXYZ = gira em X, depois Y, depois Z (R = Rz·Ry·Rx), e assim por diante
    r = np.radians(np.asarray(deg, float)); h = r / 2; c, s = np.cos(h), np.sin(h); z = np.zeros_like(h[..., 0])
    ax = {'X': np.stack([s[..., 0], z, z, c[..., 0]], -1), 'Y': np.stack([z, s[..., 1], z, c[..., 1]], -1), 'Z': np.stack([z, z, s[..., 2], c[..., 2]], -1)}
    seq = ['XYZ', 'XZY', 'YZX', 'YXZ', 'ZXY', 'ZYX'][order]
    q = ax[seq[0]]
    for a in seq[1:]: q = qmul(ax[a], q)
    return q

def load_fbx(path, name=None):
    top = _parse(open(path, 'rb').read())
    name = name or path.rsplit('/', 1)[-1].rsplit('.', 1)[0]
    gsn = _kid({'kids': top}, 'GlobalSettings'); gs = _p70(gsn) if gsn else {}
    unit = float(gs.get('UnitScaleFactor', [1.0])[0]) / 100.0   # cm -> m
    assert int(gs.get('UpAxis', [1])[0]) == 1, 'FBX com eixo pra cima diferente de Y (o Mixamo usa Y)'
    objs = _kid({'kids': top}, 'Objects'); conns = _kid({'kids': top}, 'Connections')
    models, cnodes, curves = {}, {}, {}
    for o in objs['kids']:
        oid = o['props'][0]
        if o['name'] == 'Model':
            nm = o['props'][1].split('\x00')[0]; P = _p70(o)
            models[oid] = {'name': nm.split(':')[-1], 'T': np.array(P.get('Lcl Translation', [0, 0, 0]), float),
                           'R': np.array(P.get('Lcl Rotation', [0, 0, 0]), float), 'S': np.array(P.get('Lcl Scaling', [1, 1, 1]), float),
                           'pre': np.array(P.get('PreRotation', [0, 0, 0]), float), 'post': np.array(P.get('PostRotation', [0, 0, 0]), float),
                           'ord': int(P.get('RotationOrder', [0])[0]) if 'RotationOrder' in P else 0}
        elif o['name'] == 'AnimationCurveNode':
            P = _p70(o); cnodes[oid] = {'def': [P.get(k, [0.0])[0] for k in ('d|X', 'd|Y', 'd|Z')], 'ch': {}, 'tgt': None}
        elif o['name'] == 'AnimationCurve':
            curves[oid] = (_kid(o, 'KeyTime')['props'][0].astype(np.float64) / TICKS, _kid(o, 'KeyValueFloat')['props'][0].astype(np.float64))
    parent = {}
    for c in conns['kids']:
        pr = c['props']; kind, a, b = pr[0], pr[1], pr[2]
        if kind == 'OO' and a in models and b in models: parent[a] = b
        elif kind == 'OP' and a in curves and b in cnodes: cnodes[b]['ch']['XYZ'.index(pr[3][-1])] = curves[a]
        elif kind == 'OP' and a in cnodes and b in models: cnodes[a]['tgt'] = (b, pr[3])
    ids = list(models); idx = {m: i for i, m in enumerate(ids)}
    # tempo: grade fixa na taxa das chaves (30 FPS no Mixamo)
    allt = [t for cn in cnodes.values() for t, _ in cn['ch'].values()]
    t0 = min(t.min() for t in allt); t1 = max(t.max() for t in allt)
    dts = [np.median(np.diff(t)) for t in allt if len(t) > 2]; dt = float(np.median(dts)) if dts else 1 / 30
    fps = round(1 / dt); times = np.round(np.arange(0, (t1 - t0) * fps + 0.5) ) / fps
    def sample(cn):
        out = np.zeros((len(times), 3))
        for k in range(3):
            if k in cn['ch']: t, v = cn['ch'][k]; out[:, k] = np.interp(times + t0, t, v)
            else: out[:, k] = cn['def'][k]
        return out
    nodes = []; tracks = {}
    for m in ids:
        M = models[m]
        qpre = _euler(M['pre'][None], 0)[0]; qpost = _euler(M['post'][None], 0)[0]
        q = qmul(qmul(qpre, _euler(M['R'][None], M['ord'])[0]), qinv(qpost))
        nodes.append({'name': M['name'], 'translation': (M['T'] * unit).tolist(), 'rotation': (q / np.linalg.norm(q)).tolist(), 'scale': M['S'].tolist()})
    for m, p in parent.items(): nodes[idx[p]].setdefault('children', []).append(idx[m])
    roots = [idx[m] for m in ids if m not in parent]
    for cn in cnodes.values():
        if not cn['tgt'] or not cn['ch']: continue
        m, prop = cn['tgt']; M = models[m]; v = sample(cn); i = idx[m]
        if prop == 'Lcl Rotation':
            qpre = _euler(M['pre'][None], 0); qpost = _euler(M['post'][None], 0)
            q = qmul(qmul(np.repeat(qpre, len(v), 0), _euler(v, M['ord'])), np.repeat(qinv(qpost[0])[None], len(v), 0))
            tracks[(i, 'rotation')] = (times, q / np.linalg.norm(q, axis=1, keepdims=True))
        elif prop == 'Lcl Translation': tracks[(i, 'translation')] = (times, v * unit)
    # monta em glTF (mesmo formato do glbio.load)
    j = {'asset': {'version': '2.0'}, 'nodes': nodes, 'scenes': [{'nodes': roots}], 'scene': 0, 'accessors': [], 'bufferViews': [], 'animations': []}
    blob = bytearray()
    def put(a, typ):
        a = np.ascontiguousarray(a, np.float32); o = len(blob); blob.extend(a.tobytes())
        j['bufferViews'].append({'buffer': 0, 'byteOffset': o, 'byteLength': a.nbytes})
        j['accessors'].append({'bufferView': len(j['bufferViews']) - 1, 'componentType': 5126, 'count': int(a.shape[0]), 'type': typ})
        return len(j['accessors']) - 1
    ti = put(times.reshape(-1, 1), 'SCALAR'); ch = []; sm = []
    for (i, pth), (t, v) in tracks.items():
        sm.append({'input': ti, 'output': put(v, 'VEC4' if pth == 'rotation' else 'VEC3'), 'interpolation': 'LINEAR'})
        ch.append({'sampler': len(sm) - 1, 'target': {'node': i, 'path': pth}})
    j['animations'].append({'name': name, 'channels': ch, 'samplers': sm})
    return j, bytes(blob)

if __name__ == '__main__':   # python3 fbxio.py arquivo.fbx -> resumo
    import sys
    j, b = load_fbx(sys.argv[1]); a = j['animations'][0]
    print(len(j['nodes']), 'ossos:', ' '.join(n['name'] for n in j['nodes'][:8]), '...')
    print('canais', len(a['channels']), 'quadros', j['accessors'][0]['count'])
