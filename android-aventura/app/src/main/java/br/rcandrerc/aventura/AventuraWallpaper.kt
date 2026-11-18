package br.rcandrerc.aventura

import android.graphics.*
import android.os.Handler
import android.os.Looper
import android.service.wallpaper.WallpaperService
import android.view.SurfaceHolder
import kotlin.random.Random

// Papel de parede animado (teste): a mesma cena da Aventura do app de hábitos, desenhada com Canvas.
// Econômico: 8 quadros por segundo, só enquanto aparece na tela; fundo pré-desenhado numa imagem só; resto preto.
class AventuraWallpaper : WallpaperService() {
    override fun onCreateEngine(): Engine = Motor()

    inner class Motor : Engine() {
        private val h = Handler(Looper.getMainLooper())
        private var visivel = false
        private var W = 0; private var H = 0
        private var fundo: Bitmap? = null; private var arvores: Bitmap? = null
        private val p = Paint(Paint.ANTI_ALIAS_FLAG).apply { isFilterBitmap = true }
        private val img = HashMap<String, Bitmap>()
        private var quadro = 0; private var rolagem = 0f
        private var est = "corre"; private var t = 0f; private var mx = 0f; private var mhp = 0; private var mmax = 0
        private var golpeH = 0f; private var golpeM = 0f; private var vez = 0; private var kills = 0
        private var monstro = "mushroomking"
        private val passo = object : Runnable { override fun run() { tick(); desenha(); if (visivel) h.postDelayed(this, 125) } }

        private fun bmp(n: String): Bitmap? = img[n] ?: try { assets.open("$n.png").use { BitmapFactory.decodeStream(it) }.also { img[n] = it } } catch (e: Exception) { null }

        override fun onVisibilityChanged(v: Boolean) { visivel = v; h.removeCallbacks(passo); if (v) h.post(passo) }
        override fun onSurfaceChanged(s: SurfaceHolder, f: Int, w: Int, hh: Int) { W = w; H = hh; montaFundo(); desenha() }
        override fun onSurfaceDestroyed(s: SurfaceHolder) { visivel = false; h.removeCallbacks(passo) }
        override fun onDestroy() { h.removeCallbacks(passo); super.onDestroy() }

        // a cena fica numa faixa: chão em 80% da altura; acima vai sumindo até o preto
        private fun chao() = H * 0.80f
        private fun tam() = H * 0.075f
        private fun hx() = W * 0.3f

        private fun montaFundo() {
            if (W == 0) return
            val f = Bitmap.createBitmap(W, H, Bitmap.Config.RGB_565); val c = Canvas(f); val r = Random(7)
            c.drawColor(Color.BLACK)
            val topo = H * 0.55f
            p.shader = LinearGradient(0f, topo, 0f, chao(), Color.BLACK, Color.rgb(10, 18, 40), Shader.TileMode.CLAMP); c.drawRect(0f, topo, W.toFloat(), chao(), p); p.shader = null
            p.color = Color.WHITE
            repeat(40) { val y = topo + r.nextFloat() * (chao() - topo) * 0.7f; p.alpha = (40 + 120 * (y - topo) / (chao() - topo)).toInt(); c.drawCircle(r.nextFloat() * W, y, 1.5f, p) }
            p.alpha = 255; p.color = Color.rgb(10, 22, 14); c.drawRect(0f, chao(), W.toFloat(), H * 0.86f, p)
            p.shader = LinearGradient(0f, H * 0.86f, 0f, H * 0.92f, Color.rgb(10, 22, 14), Color.BLACK, Shader.TileMode.CLAMP); c.drawRect(0f, H * 0.86f, W.toFloat(), H * 0.92f, p); p.shader = null
            p.color = Color.rgb(20, 40, 24); repeat(120) { val x = r.nextFloat() * W; c.drawLine(x, chao() + 2, x + r.nextFloat() * 6 - 3, chao() - 4 - r.nextFloat() * 10, p) }
            fundo = f
            // árvores fofinhas numa tira 2x a largura, que rola devagar
            val a = Bitmap.createBitmap(W * 2, H, Bitmap.Config.ARGB_8888); val ca = Canvas(a)
            repeat(14) { i ->
                val px = (i + r.nextFloat() * 0.7f) / 14f * W * 2; val th = H * (0.05f + r.nextFloat() * 0.035f); val rr = th * 0.3f; val base = chao() - th * 0.42f
                p.color = Color.rgb(24, 17, 12); ca.drawRect(px - rr * 0.12f, base, px + rr * 0.12f, chao(), p)
                for ((cor, dy) in listOf(Color.rgb(8, 22, 14) to rr * 0.12f, Color.rgb(12, 32, 20) to 0f)) { p.color = cor
                    for ((dx, yy, k) in listOf(Triple(-0.6f, -0.35f, 0.68f), Triple(0.6f, -0.35f, 0.68f), Triple(0f, -0.9f, 0.85f), Triple(0f, -0.35f, 0.8f), Triple(-0.35f, -1.3f, 0.55f), Triple(0.4f, -1.25f, 0.5f))) ca.drawCircle(px + dx * rr, base + yy * rr + dy, rr * k, p) }
            }
            arvores = a
        }

        private fun novoMonstro() { monstro = if (Random.nextFloat() < 0.6f) "mushroomking" else "orc"; mmax = 40; mhp = mmax; mx = W + tam(); est = "chega"; t = 0f }

        private fun tick() {
            val dt = 0.125f; t += dt; quadro++
            when (est) {
                "corre" -> { rolagem += dt * 1.8f; if (t > 1.5f) novoMonstro() }
                "chega" -> { rolagem += dt * 1.8f; mx -= W * 0.35f * dt; if (mx <= hx() + tam() * 0.7f) { est = "luta"; t = 0f } }
                "luta" -> if (t >= 0.8f) { t = 0f
                    if (vez == 0) { golpeH = 0.75f; mhp -= 12 + Random.nextInt(8); if (mhp <= 0) { est = "morre"; kills++ } } else golpeM = 0.75f
                    vez = 1 - vez }
                "morre" -> if (t > 0.9f) { est = "corre"; t = 0f; vez = 0 }
            }
            if (golpeH > 0) golpeH -= dt; if (golpeM > 0) golpeM -= dt
        }

        private fun sprite(c: Canvas, nome: String, n: Int, i: Int, x: Float, y: Float, alt: Float, espelho: Boolean = false) {
            val b = bmp(nome) ?: return; val fw = b.width / n; val src = Rect((i % n) * fw, 0, (i % n) * fw + fw, b.height)
            val s = alt / b.height; val dst = RectF(x - fw * s / 2, y - b.height * s, x + fw * s / 2, y)
            c.drawBitmap(b, src, dst, p)
        }

        private fun desenha() {
            val hold = surfaceHolder; val c = try { hold.lockCanvas() } catch (e: Exception) { null } ?: return
            try {
                val f = fundo; if (f == null) { c.drawColor(Color.BLACK); return }
                c.drawBitmap(f, 0f, 0f, null)
                arvores?.let { val off = ((rolagem * 40f * (W / 400f)) % (W * 2)); c.drawBitmap(it, -off, 0f, null); if (off > W) c.drawBitmap(it, W * 2 - off, 0f, null) }
                val y = chao() + H * 0.01f; val F = tam() / 0.85f
                p.color = Color.argb(90, 0, 0, 0); c.drawOval(hx() - F * 0.2f, y - 6, hx() + F * 0.2f, y + 4, p); p.color = Color.WHITE
                if (est == "corre" || est == "chega") sprite(c, "kai_espada_corre", 8, quadro, hx(), y, F)
                else if (golpeH > 0) sprite(c, "kai_espada_ataca", 6, ((0.75f - golpeH) * 8).toInt().coerceIn(0, 5), hx(), y, F)
                else sprite(c, "kai_espada_parada", 6, quadro, hx(), y, F)
                if (est != "corre") {
                    val nomeM = when { est == "morre" -> "_cai"; est == "chega" -> "_anda"; golpeM > 0 -> "_ataca"; golpeH > 0.4f -> "_apanha"; else -> "_anda" }
                    val nq = if (nomeM == "_apanha") 4 else 6; val iq = if (est == "morre") (t * 7).toInt().coerceIn(0, 5) else if (golpeM > 0) ((0.75f - golpeM) * 8).toInt().coerceIn(0, 5) else quadro
                    if (est == "morre") p.alpha = ((1 - t) * 255).toInt().coerceIn(0, 255)
                    sprite(c, monstro + nomeM, nq, iq, mx, y, F * 0.85f); p.alpha = 255
                    if (est == "luta") { val bw = F * 0.5f; p.color = Color.argb(150, 0, 0, 0); c.drawRect(mx - bw / 2, y - F * 0.85f, mx + bw / 2, y - F * 0.85f + 5, p); p.color = Color.rgb(224, 72, 72); c.drawRect(mx - bw / 2, y - F * 0.85f, mx - bw / 2 + bw * mhp / mmax, y - F * 0.85f + 5, p); p.color = Color.WHITE }
                }
                p.textSize = H * 0.016f; p.color = Color.argb(160, 230, 235, 245); c.drawText("⚔ $kills", W * 0.05f, H * 0.89f, p); p.color = Color.WHITE
            } finally { hold.unlockCanvasAndPost(c) }
        }
    }
}
