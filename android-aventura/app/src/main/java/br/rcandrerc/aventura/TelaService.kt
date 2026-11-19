package br.rcandrerc.aventura

import android.app.*
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

// Fica escutando a tela acender (só isso: não desenha nada, quase não gasta). Ao acender com o celular bloqueado,
// abre a BloqueioActivity por cima do bloqueio. Precisa de uma notificação fixa (regra do Android).
class TelaService : Service() {
    companion object {
        const val CANAL = "aventura_bloqueio"
        fun ligado(c: Context) = c.getSharedPreferences("aventura", Context.MODE_PRIVATE).getBoolean("bloqueio", false)
        fun inicia(c: Context) { if (ligado(c)) c.startForegroundService(Intent(c, TelaService::class.java)) }
    }
    private val acendeu = object : BroadcastReceiver() { override fun onReceive(c: Context, i: Intent) {
        val km = c.getSystemService(KeyguardManager::class.java)
        if (km.isKeyguardLocked) try { c.startActivity(Intent(c, BloqueioActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_ANIMATION or Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS)) } catch (e: Exception) {}
    } }

    override fun onCreate() {
        super.onCreate()
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CANAL, "Aventura na tela de bloqueio", NotificationManager.IMPORTANCE_MIN).apply { setShowBadge(false) })
        val abre = PendingIntent.getActivity(this, 0, Intent(this, ConfigActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        val n = Notification.Builder(this, CANAL).setSmallIcon(R.drawable.icone).setContentTitle("Aventura").setContentText("Aparece quando a tela acende").setContentIntent(abre).setOngoing(true).build()
        if (Build.VERSION.SDK_INT >= 34) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE) else startForeground(1, n)
        registerReceiver(acendeu, IntentFilter(Intent.ACTION_SCREEN_ON))
    }
    override fun onStartCommand(i: Intent?, f: Int, id: Int): Int { if (!ligado(this)) { stopSelf() }; return START_STICKY }
    override fun onDestroy() { try { unregisterReceiver(acendeu) } catch (e: Exception) {}; super.onDestroy() }
    override fun onBind(i: Intent?): IBinder? = null
}

// Celular ligou de novo: volta a escutar (se estiver ligado nas opções)
class LigouReceiver : BroadcastReceiver() { override fun onReceive(c: Context, i: Intent) { try { Alarme.proximo(c) } catch (e: Exception) {}; try { TelaService.inicia(c) } catch (e: Exception) {} } }
