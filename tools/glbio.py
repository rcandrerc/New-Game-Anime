import json,struct,numpy as np
CT={5120:np.int8,5121:np.uint8,5122:np.int16,5123:np.uint16,5125:np.uint32,5126:np.float32}
NC={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def load(f):
    b=open(f,'rb').read(); off=12; j=None; bin_=b''
    while off<len(b):
        l,t=struct.unpack('<II',b[off:off+8]); c=b[off+8:off+8+l]
        if t==0x4E4F534A: j=json.loads(c)
        else: bin_=c
        off+=8+l
    return j,bin_
def acc(j,bin_,i):
    a=j['accessors'][i]; bv=j['bufferViews'][a['bufferView']]; dt=np.dtype(CT[a['componentType']]); n=NC[a['type']]
    start=bv.get('byteOffset',0)+a.get('byteOffset',0); stride=bv.get('byteStride',0); cnt=a['count']
    if stride and stride!=dt.itemsize*n:
        raw=np.frombuffer(bin_,dtype=np.uint8,count=stride*(cnt-1)+dt.itemsize*n,offset=start)
        out=np.empty((cnt,n),dt)
        for k in range(cnt): out[k]=np.frombuffer(raw[k*stride:k*stride+dt.itemsize*n].tobytes(),dt)
    else: out=np.frombuffer(bin_,dtype=dt,count=cnt*n,offset=start).reshape(cnt,n).copy()
    if a.get('normalized'):
        out=out.astype(np.float32)/np.iinfo(dt).max
    return out
def qmul(a,b):
    x1,y1,z1,w1=np.moveaxis(a,-1,0); x2,y2,z2,w2=np.moveaxis(b,-1,0)
    return np.stack([w1*x2+x1*w2+y1*z2-z1*y2, w1*y2-x1*z2+y1*w2+z1*x2, w1*z2+x1*y2-y1*x2+z1*w2, w1*w2-x1*x2-y1*y2-z1*z2],-1)
def qinv(q): q=np.array(q,dtype=np.float64); return q*np.array([-1,-1,-1,1])
def qrot(q,v):
    p=np.concatenate([v,np.zeros(v.shape[:-1]+(1,))],-1); return qmul(qmul(q,p),qinv(q))[...,:3]
def world(j):
    N=j['nodes']; par={}
    for i,n in enumerate(N):
        for c in n.get('children',[]): par[c]=i
    W={}
    def get(i):
        if i in W: return W[i]
        n=N[i]; q=np.array(n.get('rotation',[0,0,0,1]),float); t=np.array(n.get('translation',[0,0,0]),float); s=np.array(n.get('scale',[1,1,1]),float)
        if i in par:
            pq,pt,ps=get(par[i]); W[i]=(qmul(pq,q),pt+qrot(pq,t*ps),ps*s)
        else: W[i]=(q,t,s)
        return W[i]
    for i in range(len(N)): get(i)
    return W,par
