package br.rcandrerc.aventura

import android.app.*
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONArray

// Alarme das tarefas com horário (pedido do André, 19/11/2026): o jogo manda a lista dos próximos dias (Nativo.alarmes);
// o app deixa marcado só o próximo no AlarmManager. Na hora, a notificação toca sem parar (FLAG_INSISTENT, som de alarme)
// até ele abrir o app e tocar em Parar.
object Alarme {
    const val CANAL = "alarme_tarefas"; const val ID = 77
    private fun pref(c: Context) = c.getSharedPreferences("aventura", Context.MODE_PRIVATE)

    fun guarda(c: Context, json: String) { pref(c).edit().putString("alarmes", json).apply(); proximo(c) }

    fun proximo(c: Context) {
        val am = c.getSystemService(AlarmManager::class.java); val pi = piAlarme(c)
        val L = try { JSONArray(pref(c).getString("alarmes", "[]")) } catch (e: Exception) { JSONArray() }
        val agora = System.currentTimeMillis(); var em = Long.MAX_VALUE
        for (i in 0 until L.length()) { val x = L.optJSONObject(i) ?: continue; val t = x.optLong("em"); if (t > agora + 1000 && t < em) em = t }
        am.cancel(pi); if (em == Long.MAX_VALUE) return
        val podeExato = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()
        try {
            if (podeExato) am.setAlarmClock(AlarmManager.AlarmClockInfo(em, PendingIntent.getActivity(c, 2, Intent(c, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)), pi)
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, em, pi)
        } catch (e: SecurityException) { am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, em, pi) }
    }

    private fun piAlarme(c: Context) = PendingIntent.getBroadcast(c, 1, Intent(c, AlarmeReceiver::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)

    // o que toca agora: tudo da lista com horário até 2 min atrás
    fun deAgora(c: Context): String {
        val L = try { JSONArray(pref(c).getString("alarmes", "[]")) } catch (e: Exception) { JSONArray() }
        val agora = System.currentTimeMillis(); val nomes = mutableListOf<String>(); var hora = ""
        for (i in 0 until L.length()) { val x = L.optJSONObject(i) ?: continue; val t = x.optLong("em"); if (t in (agora - 120000)..(agora + 1000)) { nomes.add(x.optString("t")); hora = x.optString("h") } }
        return (if (hora.isNotEmpty()) "$hora · " else "") + (if (nomes.isEmpty()) "Hora da tarefa" else nomes.joinToString(" · "))
    }

    fun toca(c: Context) {
        val nm = c.getSystemService(NotificationManager::class.java); val som = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM) ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        if (nm.getNotificationChannel(CANAL) == null) nm.createNotificationChannel(NotificationChannel(CANAL, "Alarme das tarefas", NotificationManager.IMPORTANCE_HIGH).apply {
            setSound(som, AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
            enableVibration(true); vibrationPattern = longArrayOf(0, 800, 500, 800); lockscreenVisibility = Notification.VISIBILITY_PUBLIC; setBypassDnd(true) })
        val txt = deAgora(c)
        val abre = PendingIntent.getActivity(c, 3, Intent(c, AlarmeActivity::class.java).putExtra("t", txt).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val n = Notification.Builder(c, CANAL).setSmallIcon(R.drawable.icone).setContentTitle("⏰ Tarefa agora").setContentText(txt).setStyle(Notification.BigTextStyle().bigText(txt))
            .setCategory(Notification.CATEGORY_ALARM).setOngoing(true).setAutoCancel(false).setContentIntent(abre).setFullScreenIntent(abre, true).setVisibility(Notification.VISIBILITY_PUBLIC).build()
        n.flags = n.flags or Notification.FLAG_INSISTENT // repete o som até parar
        try { nm.notify(ID, n) } catch (e: SecurityException) {}
    }

    fun para(c: Context) { c.getSystemService(NotificationManager::class.java).cancel(ID) }
}

class AlarmeReceiver : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) { Alarme.toca(c); Alarme.proximo(c) }
}

// tela do alarme: aparece por cima do bloqueio; Parar desliga o som
class AlarmeActivity : Activity() {
    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true) } else window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        val d = resources.displayMetrics.density
        val col = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; setBackgroundColor(0xFF0B1020.toInt()); setPadding((24 * d).toInt(), 0, (24 * d).toInt(), 0) }
        val tit = TextView(this).apply { text = "⏰"; textSize = 64f; gravity = Gravity.CENTER }
        val txt = TextView(this).apply { text = intent.getStringExtra("t") ?: Alarme.deAgora(this@AlarmeActivity); textSize = 26f; setTextColor(0xFFFFFFFF.toInt()); gravity = Gravity.CENTER; setPadding(0, (16 * d).toInt(), 0, (32 * d).toInt()) }
        val parar = Button(this).apply { text = "Parar"; textSize = 24f; setOnClickListener { Alarme.para(this@AlarmeActivity); finish() } }
        val abrir = Button(this).apply { text = "Parar e abrir o jogo"; textSize = 18f; setOnClickListener { Alarme.para(this@AlarmeActivity); startActivity(Intent(this@AlarmeActivity, MainActivity::class.java)); finish() } }
        col.addView(tit); col.addView(txt); col.addView(parar, LinearLayout.LayoutParams(-1, (72 * d).toInt())); col.addView(abrir, LinearLayout.LayoutParams(-1, (60 * d).toInt()).apply { topMargin = (12 * d).toInt() })
        setContentView(col)
    }
    override fun onNewIntent(i: Intent) { super.onNewIntent(i); setIntent(i) }
}
