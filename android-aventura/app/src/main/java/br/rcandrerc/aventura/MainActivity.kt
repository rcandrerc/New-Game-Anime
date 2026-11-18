package br.rcandrerc.aventura

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ContentValues
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.view.View
import android.webkit.*
import java.io.File
import androidx.credentials.*
import androidx.credentials.exceptions.*
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential

// O app: o jogo de hábitos inteiro (o mesmo do site) dentro do app, com uma ponte pro papel de parede.
// O jogo manda o estado da heroína pelo Nativo.estado(); o papel de parede lê daqui (SharedPreferences "aventura").
class MainActivity : Activity() {
    companion object { const val SITE = "https://rcandrerc.github.io/New-Game-Anime/"; const val URL = SITE + "habitos.html"; const val WEB_CLIENT = "87888091200-qjjplhjue9iml6onoq41o81961738dk6.apps.googleusercontent.com" }
    private lateinit var web: WebView
    private var escolha: ValueCallback<Array<Uri>>? = null
    private var abrirAventura = false
    private var carregou = false

    inner class Ponte {
        @JavascriptInterface fun estado(json: String) { getSharedPreferences("aventura", MODE_PRIVATE).edit().putString("estado", json).apply() }
        @JavascriptInterface fun config() { runOnUiThread { startActivity(Intent(this@MainActivity, ConfigActivity::class.java)) } }
        @JavascriptInterface fun salvaArquivo(nome: String, conteudo: String): Boolean = try {
            if (Build.VERSION.SDK_INT >= 29) {
                val v = ContentValues().apply { put(MediaStore.Downloads.DISPLAY_NAME, nome); put(MediaStore.Downloads.MIME_TYPE, "application/json"); put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS) }
                val u = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v)!!
                contentResolver.openOutputStream(u)!!.use { it.write(conteudo.toByteArray()) }
            } else File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), nome).writeText(conteudo)
            true
        } catch (e: Exception) { false }
        @JavascriptInterface fun versao(): String = BuildConfig.VERSION_NAME
        // login com Google: o WebView não pode fazer (o Google bloqueia), então o app faz e entrega o token pro jogo (js/nuvem.js → window.nuvemToken)
        @JavascriptInterface fun loginGoogle() { runOnUiThread { entraGoogle() } }
        @JavascriptInterface fun loginChrome() { runOnUiThread { try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(SITE + "login.html"))) } catch (e: Exception) { devolveToken(null, "Não consegui abrir o Chrome.") } } }
        @JavascriptInterface fun sairGoogle() { runOnUiThread { try { CredentialManager.create(this@MainActivity).clearCredentialStateAsync(ClearCredentialStateRequest(), null, mainExecutor, object : CredentialManagerCallback<Void?, ClearCredentialException> { override fun onResult(r: Void?) {}; override fun onError(e: ClearCredentialException) {} }) } catch (e: Throwable) {} } }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        window.statusBarColor = Color.BLACK; window.navigationBarColor = Color.BLACK
        web = WebView(this)
        web.setBackgroundColor(Color.BLACK)
        with(web.settings) { javaScriptEnabled = true; domStorageEnabled = true; databaseEnabled = true; mediaPlaybackRequiresUserGesture = false; allowFileAccess = false; cacheMode = WebSettings.LOAD_DEFAULT }
        web.addJavascriptInterface(Ponte(), "Nativo")
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(v: WebView, r: WebResourceRequest): Boolean {
                val u = r.url.toString()
                if (u.startsWith("intent:")) { try { startActivity(Intent.parseUri(u, Intent.URI_INTENT_SCHEME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (e: Exception) {}; return true }
                if (r.url.host != Uri.parse(URL).host && r.url.host != "localhost") { try { startActivity(Intent(Intent.ACTION_VIEW, r.url)) } catch (e: Exception) {}; return true }
                return false
            }
            override fun onPageFinished(v: WebView, url: String) { carregou = true; v.evaluateJavascript("window.paraNativo&&paraNativo()", null); tokPend?.let { tokPend = null; devolveToken(it, null) }; if (abrirAventura) abreAventura() }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(m: ConsoleMessage): Boolean { android.util.Log.i("AventuraJS", "${m.messageLevel()} ${m.message()} @${m.lineNumber()}"); return true }
            override fun onShowFileChooser(v: WebView, cb: ValueCallback<Array<Uri>>, p: FileChooserParams): Boolean {
                escolha?.onReceiveValue(null); escolha = cb
                return try { startActivityForResult(p.createIntent(), 7); true } catch (e: Exception) { escolha = null; false }
            }
        }
        web.overScrollMode = View.OVER_SCROLL_NEVER
        setContentView(web)
        abrirAventura = intent?.getBooleanExtra("aventura", false) == true
        try { TelaService.inicia(this) } catch (e: Exception) {}
        pegaLogin(intent)
        if (b == null) Atualiza.confere(this)
        if (b != null) web.restoreState(b) else web.loadUrl(intent?.getStringExtra("url")?.takeIf { it.startsWith("http://localhost") } ?: (if (BuildConfig.DEBUG) "http://localhost:8000/habitos.html" else URL))
    }

    private fun devolveToken(tok: String?, msg: String?) {
        val q = { v: String? -> if (v == null) "null" else org.json.JSONObject.quote(v) }
        web.evaluateJavascript("window.nuvemToken&&nuvemToken(${q(tok)},${q(msg)})", null)
    }
    private fun entraGoogle(soContas: Boolean = false) {
        // "Entrar com o Google" (sempre mostra a escolha de conta; o GetGoogleIdOption ficava parado em alguns Xiaomi)
        val op = GetSignInWithGoogleOption.Builder(WEB_CLIENT).build()
        val req = GetCredentialRequest.Builder().addCredentialOption(op).build()
        try {
            CredentialManager.create(this).getCredentialAsync(this, req, null, mainExecutor, object : CredentialManagerCallback<GetCredentialResponse, GetCredentialException> {
                override fun onResult(r: GetCredentialResponse) {
                    val c = r.credential
                    if (c is CustomCredential && c.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) devolveToken(GoogleIdTokenCredential.createFrom(c.data).idToken, null)
                    else devolveToken(null, "Resposta inesperada do Google.")
                }
                override fun onError(e: GetCredentialException) {
                    android.util.Log.w("AventuraJS", "login google: ${e.type} ${e.message}")
                    devolveToken(null, if (e is GetCredentialCancellationException) "Login cancelado." else if (e is NoCredentialException) "Nenhuma conta Google neste celular." else "Login falhou: ${e.message}")
                }
            })
        } catch (e: Throwable) { devolveToken(null, "Login falhou: ${e.message}") }
    }

    private fun abreAventura() { abrirAventura = false
        // o jogo pode ainda estar montando: tenta por até 15 s
        web.evaluateJavascript("(function f(n){if(window.AV&&document.readyState==='complete'){if(!AV.aberta())AV.abre(false);console.log('aventura aberta pelo papel de parede')}else if(n<60)setTimeout(function(){f(n+1)},250)})(0)", null) }

    private var tokPend: String? = null
    private fun pegaLogin(i: Intent?): Boolean { val d = i?.data ?: return false; if (d.scheme != "aventura" || d.host != "login") return false
        val t = d.getQueryParameter("t") ?: return true; if (carregou) devolveToken(t, null) else tokPend = t; return true }
    override fun onNewIntent(i: Intent) { super.onNewIntent(i); if (pegaLogin(i)) return; if (i.getBooleanExtra("aventura", false)) { if (carregou) abreAventura() else abrirAventura = true } }

    override fun onActivityResult(req: Int, res: Int, data: Intent?) {
        if (req == 7) { escolha?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data)); escolha = null } else super.onActivityResult(req, res, data)
    }

    override fun onSaveInstanceState(o: Bundle) { super.onSaveInstanceState(o); web.saveState(o) }
    override fun onPause() { super.onPause(); web.evaluateJavascript("window.paraNativo&&paraNativo()", null); web.onPause() }
    override fun onResume() { super.onResume(); web.onResume() }

    @Deprecated("back") override fun onBackPressed() {
        // o jogo fecha os painéis com o voltar? se não tiver histórico, só manda o app pro fundo (não fecha a página)
        // voltar: fecha a bolsa ou a Aventura primeiro; só manda o app pro fundo se já estiver na tela Hoje
        web.evaluateJavascript("(function(){var p=document.querySelector('#aventura .avBolsa');if(p){var x=p.querySelector('.avBTopo .avTab:last-child');if(x){x.click();return 1}}if(window.AV&&AV.aberta()){AV.fecha();return 1}return 0})()") { r ->
            if (r != "1") { if (web.canGoBack()) web.goBack() else moveTaskToBack(true) } }
    }
}
