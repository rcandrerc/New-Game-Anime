// ---------------- conta Google e nuvem (Firebase, projeto habitos-andre) — 18/11/2026 ----------------
// O jogo continua salvando no aparelho (localStorage) e, com login, manda uma cópia pra conta: habitos/{uid} (o jogo inteiro) e habitos/{uid}/fotos/{data} (fotos do peso).
// Cada aparelho guarda em CHAVE_N qual versão da conta ele tem: se a conta mudou em outro aparelho, este carrega a da conta; se não, manda a dele.
// Esses valores não são senha: quem protege os dados são as regras do Firestore (cada conta só lê e grava o próprio documento).
// No APK (WebView) o Google não deixa o login por pop-up: o app faz o login nativo e devolve o token em window.nuvemToken.
(function () {
  const CFG = { apiKey: 'AIzaSyDWjglPs1UX1zqLiB3U8b9Gxdq3G80V4Ns', authDomain: 'habitos-andre.firebaseapp.com', projectId: 'habitos-andre', storageBucket: 'habitos-andre.firebasestorage.app', messagingSenderId: '87888091200', appId: '1:87888091200:web:168175f0cefe696bbee7a5' };
  const FB_V = '10.14.1', CHAVE_N = 'nga-habitos-nuvem', CHAVE_F = 'nga-habitos-fotos-nuvem';
  const N = { on: false, user: null, pronta: false, timer: 0, enviando: false, ult: 0, erro: '', sujo: false, entrando: false };
  const le = (k, p) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || p } catch (e) { return p } };
  const grava = (k, o) => { try { localStorage.setItem(k, JSON.stringify(o)) } catch (e) {} };
  const doc = () => firebase.firestore().collection('habitos').doc(N.user.uid);
  const js = m => new Promise((ok, falha) => { const e = document.createElement('script'); e.src = 'https://www.gstatic.com/firebasejs/' + FB_V + '/firebase-' + m + '-compat.js'; e.onload = ok; e.onerror = falha; document.head.append(e) });
  const muda = () => { try { window.contaMudou && contaMudou() } catch (e) {} };
  async function inicia() {
    try { await js('app'); await Promise.all([js('auth'), js('firestore')]) } catch (e) { N.erro = 'Sem internet: o jogo está salvando só no aparelho.'; muda(); setTimeout(inicia, 60000); return }
    firebase.initializeApp(CFG); N.on = true;
    firebase.auth().onAuthStateChanged(u => { N.user = u; N.pronta = false; N.erro = ''; N.entrando = false; if (u) confere(); muda() });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { if (N.timer) envia() } else if (N.pronta) confere() }); // saiu: manda já; voltou: vê se mexeram em outro aparelho
    muda();
  }
  async function baixaFotos() { try { const q = await doc().collection('fotos').get(); const env = {}; for (const f of q.docs) { await fotoPoe(f.id, f.data().u).catch(() => {}); env[f.id] = 1 } grava(CHAVE_F, { uid: N.user.uid, f: env }) } catch (e) {} }
  async function confere() {
    const u = N.user; let snap; if (N.enviando || !u) return;
    try { snap = await doc().get({ source: 'server' }) } catch (e) { N.erro = 'Não deu pra falar com a nuvem agora. O jogo segue salvando no aparelho.'; muda(); setTimeout(() => { if (N.user === u && !N.pronta) confere() }, 30000); return }
    if (N.user !== u || N.enviando) return;
    const loc = le(CHAVE_N, {}), d = snap.exists ? snap.data() : null;
    const usaDaConta = async () => { clearTimeout(N.timer); N.timer = 0; N.erro = ''; N.carregando = true; muda(); localStorage.setItem(CHAVE, d.dados); grava(CHAVE_N, { uid: u.uid, base: d.em }); await baixaFotos(); location.reload() };
    if (d && loc.uid === u.uid && loc.base !== d.em) { usaDaConta(); return } // a conta foi salva em outro aparelho depois da última vez que este falou com ela
    if (d && loc.uid !== u.uid) { // primeira vez desta conta neste aparelho e a conta já tem jogo
      let c = {}; try { c = JSON.parse(d.dados) } catch (e) {}
      const resumo = 'nível ' + (c.nv || 1) + ', ' + ((c.hab || []).length + (c.diar || []).length + (c.afz || []).length) + ' tarefas';
      if (confirm('Sua conta já tem um jogo salvo (' + resumo + ').\n\nOK: abrir o jogo da conta neste aparelho.\nCancelar: ficar com o jogo deste aparelho.')) { usaDaConta(); return }
      if (!confirm('Trocar o jogo da conta (' + resumo + ') pelo jogo deste aparelho? O da conta some.')) { sai(); return }
    }
    N.pronta = true; N.ult = d ? d.em : 0; muda();
    if (!d || loc.uid !== u.uid || N.sujo) envia(); else enviaFotos(); // conta nova leva o jogo deste aparelho; senão manda o que mudou enquanto não estava conectado
  }
  function mudou() { N.sujo = true; if (!N.pronta) return; clearTimeout(N.timer); N.timer = setTimeout(envia, 3000) }
  async function enviaFotos() { // fotos do peso: só as que ainda não foram (cada uma num documento, ~15 KB)
    if (!N.pronta || typeof fotoTodas !== 'function') return; const u = N.user, reg = le(CHAVE_F, {}); const env = reg.uid === u.uid ? reg.f || {} : {};
    const todas = await fotoTodas(); let mudou = false;
    for (const [k, url] of Object.entries(todas)) { if (env[k] || !url) continue; try { await doc().collection('fotos').doc(k).set({ u: url }); env[k] = 1; mudou = true } catch (e) { break } }
    if (mudou) grava(CHAVE_F, { uid: u.uid, f: env });
  }
  function envia() {
    clearTimeout(N.timer); N.timer = 0; if (!N.pronta || !N.user) return;
    const u = N.user, em = Date.now(); N.sujo = false; N.enviando = true; muda();
    doc().set({ dados: JSON.stringify(S), em, nv: S.nv || 1 }).then(() => { grava(CHAVE_N, { uid: u.uid, base: em }); N.ult = em; N.erro = ''; enviaFotos() }, e => { N.sujo = true; N.erro = 'Não deu pra salvar na nuvem (' + ((e && e.code) || 'erro') + '). Tento de novo na próxima mudança.' })
      .finally(() => { N.enviando = false; muda() });
  }
  const ERROS = { 'auth/popup-closed-by-user': 'Login cancelado.', 'auth/cancelled-popup-request': 'Login cancelado.', 'auth/network-request-failed': 'Sem internet.', 'auth/unauthorized-domain': 'Este site não está liberado no Firebase.', 'auth/popup-blocked': 'O navegador bloqueou a janela de login.' };
  const erro = e => { N.entrando = false; N.erro = ERROS[e && e.code] || ('Não deu certo: ' + ((e && (e.code || e.message)) || e)); muda() };
  function entra() {
    if (!N.on) return; N.erro = ''; N.entrando = true; muda();
    if (window.Nativo && Nativo.loginGoogle) { Nativo.loginGoogle(); return } // APK: login nativo, volta em nuvemToken
    const pv = new firebase.auth.GoogleAuthProvider(); pv.setCustomParameters({ prompt: 'select_account' });
    firebase.auth().signInWithPopup(pv).catch(e => { if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) firebase.auth().signInWithRedirect(pv).catch(erro); else erro(e) });
  }
  window.nuvemToken = (tok, msg) => { if (!tok) { erro({ message: msg || 'Login cancelado.' }); return } firebase.auth().signInWithCredential(firebase.auth.GoogleAuthProvider.credential(tok)).catch(erro) };
  function sai() { if (N.timer) envia(); if (window.Nativo && Nativo.sairGoogle) try { Nativo.sairGoogle() } catch (e) {} firebase.auth().signOut() }
  window.NUVEM = { N, inicia, entra, sai, mudou, envia, confere };
})();
