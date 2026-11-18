package br.rcandrerc.aventura

import android.app.Activity
import android.app.KeyguardManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager

// A Aventura por cima da tela de bloqueio (o Xiaomi não deixa papel de parede de outro app lá).
// Abre quando a tela acende (TelaService); um toque fecha e mostra o bloqueio normal; desbloqueou, fecha sozinha.
class BloqueioActivity : Activity() {
    private val h = Handler(Looper.getMainLooper())
    private lateinit var cena: Cena
    private lateinit var tela: View
    private var rodando = false
    private val passo = object : Runnable { override fun run() {
        val ms = if (cena.ocupado()) 50L else 66L // 20 passos/s na luta, 15 andando (liso sem gastar muita bateria)
        cena.tick(ms / 1000f); tela.invalidate(); if (rodando) h.postDelayed(this, ms) } }
    private val desbloqueou = object : BroadcastReceiver() { override fun onReceive(c: Context, i: Intent) { finish() } }

    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        setShowWhenLocked(true); setTurnScreenOn(false)
        window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS)
        @Suppress("DEPRECATION") window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        cena = Cena { n -> try { assets.open("$n.png").use { BitmapFactory.decodeStream(it) } } catch (e: Exception) { null } }
        tela = object : View(this) {
            override fun onSizeChanged(w: Int, hh: Int, ow: Int, oh: Int) { cena.tamanho(w, hh, 0) }
            override fun onDraw(c: Canvas) { cena.desenha(c) }
            override fun onTouchEvent(e: MotionEvent): Boolean { if (e.action == MotionEvent.ACTION_UP) fecha(); return true }
        }
        tela.setBackgroundColor(android.graphics.Color.BLACK)
        setContentView(tela)
        registerReceiver(desbloqueou, IntentFilter(Intent.ACTION_USER_PRESENT))
    }

    private fun fecha() {
        // um toque: some e deixa o bloqueio normal (digital, senha) na frente
        val km = getSystemService(KeyguardManager::class.java)
        if (km.isKeyguardLocked) km.requestDismissKeyguard(this, null)
        finish()
    }

    override fun onResume() { super.onResume(); cena.estado(getSharedPreferences("aventura", MODE_PRIVATE).getString("estado", null)); rodando = true; h.removeCallbacks(passo); h.post(passo) }
    override fun onPause() { super.onPause(); rodando = false; h.removeCallbacks(passo) }
    override fun onStop() { super.onStop(); finish() } // tela apagou ou saiu: fecha (a próxima vez abre de novo)
    override fun onDestroy() { try { unregisterReceiver(desbloqueou) } catch (e: Exception) {}; super.onDestroy() }
}
