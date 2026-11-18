package br.rcandrerc.aventura

import android.content.Intent
import android.graphics.BitmapFactory
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.service.wallpaper.WallpaperService
import android.view.MotionEvent
import android.view.SurfaceHolder

// Papel de parede animado: desenha a Cena só enquanto aparece na tela.
// Econômico: 8 quadros por segundo correndo; 12 só durante a luta (efeitos); parado quando a tela apaga.
class AventuraWallpaper : WallpaperService() {
    override fun onCreateEngine(): Engine = Motor()

    inner class Motor : Engine() {
        private val h = Handler(Looper.getMainLooper())
        private var visivel = false
        private var RW = 0; private var RH = 0
        private var ultToque = 0L
        private val cena = Cena { n -> try { assets.open("$n.png").use { BitmapFactory.decodeStream(it) } } catch (e: Exception) { null } }
        private val passo = object : Runnable { override fun run() {
            val ms = if (cena.ocupado()) 83L else 125L
            cena.tick(ms / 1000f); desenha(); if (visivel) h.postDelayed(this, ms) } }

        private fun pref() = getSharedPreferences("aventura", MODE_PRIVATE)
        private fun ajusta() { val p = pref(); cena.estado(p.getString("estado", null)); if (RW > 0) cena.tamanho(RW, RH, p.getInt("modo", 0)) }

        override fun onCreate(s: SurfaceHolder) { super.onCreate(s); setTouchEventsEnabled(!isPreview) }
        override fun onVisibilityChanged(v: Boolean) { visivel = v; h.removeCallbacks(passo); if (v) { ajusta(); h.post(passo) } }
        override fun onSurfaceChanged(s: SurfaceHolder, f: Int, w: Int, hh: Int) { RW = w; RH = hh; ajusta(); desenha() }
        override fun onSurfaceDestroyed(s: SurfaceHolder) { visivel = false; h.removeCallbacks(passo) }
        override fun onDestroy() { h.removeCallbacks(passo); super.onDestroy() }

        // dois toques rápidos no fundo (fora dos ícones) abrem a aventura no app
        override fun onCommand(acao: String?, x: Int, y: Int, z: Int, extras: android.os.Bundle?, resultado: Boolean): android.os.Bundle? {
            if (acao == WallpaperManagerCompat.TOQUE) {
                val agora = SystemClock.uptimeMillis()
                if (agora - ultToque < (if (BuildConfig.DEBUG) 1500 else 500)) { ultToque = 0; abreJogo() } else ultToque = agora
            }
            return null
        }

        private fun abreJogo() = try {  startActivity(Intent(this@AventuraWallpaper, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK).putExtra("aventura", true)) } catch (e: Exception) {}

        private fun desenha() {
            val hold = surfaceHolder; val c = try { hold.lockCanvas() } catch (e: Exception) { null } ?: return
            try { cena.desenha(c) } finally { hold.unlockCanvasAndPost(c) }
        }
    }
}

object WallpaperManagerCompat { const val TOQUE = "android.wallpaper.tap" }
