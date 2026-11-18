package br.rcandrerc.aventura

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.widget.Toast
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

// App "casca": o jogo vem do site (sempre atualizado). Só a parte nativa (papel de parede, tela de bloqueio, login) precisa de APK novo,
// e aí o app avisa sozinho ao abrir: confere app/versao.json no site e, se tiver versão nova, baixa e abre o instalador (1 toque).
object Atualiza {
    private const val INFO = MainActivity.SITE + "app/versao.json"
    private var jaPerguntou = false

    fun confere(a: Activity) {
        if (jaPerguntou || BuildConfig.DEBUG) return
        Thread {
            try {
                val o = JSONObject(baixaTexto("$INFO?t=${System.currentTimeMillis()}"))
                val code = o.optInt("code", 0)
                if (code <= BuildConfig.VERSION_CODE) return@Thread
                jaPerguntou = true
                val nome = o.optString("nome", code.toString()); val apk = o.getString("apk"); val novidade = o.optString("novidade", "")
                a.runOnUiThread {
                    if (a.isFinishing) return@runOnUiThread
                    AlertDialog.Builder(a).setTitle("Atualização do app ($nome)")
                        .setMessage((if (novidade.isNotEmpty()) "$novidade\n\n" else "") + "Baixar e instalar agora? O jogo e o progresso continuam.")
                        .setPositiveButton("Atualizar") { _, _ -> baixaEInstala(a, apk) }
                        .setNegativeButton("Depois", null).show()
                }
            } catch (e: Exception) { android.util.Log.i("AventuraJS", "atualiza: ${e.message}") }
        }.start()
    }

    private fun baixaTexto(u: String): String { val c = URL(u).openConnection() as HttpURLConnection; c.connectTimeout = 8000; c.readTimeout = 8000; c.useCaches = false
        return c.inputStream.bufferedReader().use { it.readText() } }

    private fun baixaEInstala(a: Activity, apk: String) {
        Toast.makeText(a, "Baixando a atualização…", Toast.LENGTH_LONG).show()
        Thread {
            try {
                val pasta = File(a.cacheDir, "apk").apply { mkdirs() }; val f = File(pasta, "aventura.apk")
                val c = URL("$apk?t=${System.currentTimeMillis()}").openConnection() as HttpURLConnection; c.connectTimeout = 10000; c.readTimeout = 30000
                c.inputStream.use { i -> f.outputStream().use { o -> i.copyTo(o) } }
                val uri = FileProvider.getUriForFile(a, "br.rcandrerc.aventura.arquivos", f)
                a.runOnUiThread {
                    a.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK))
                }
            } catch (e: Exception) { a.runOnUiThread { Toast.makeText(a, "Não consegui baixar: ${e.message}", Toast.LENGTH_LONG).show() } }
        }.start()
    }
}
