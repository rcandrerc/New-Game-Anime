package br.rcandrerc.aventura

import android.graphics.*
import org.json.JSONObject
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

// A cena da Aventura, separada do papel de parede (assim dá pra testar desenhando em imagem).
// modo 0 = em pé; 1 = deitado (topo do celular pra esquerda); 2 = deitado pro outro lado.
// O "estado" vem do jogo de hábitos (nível, zona, arma, skills escolhidas): a heroína aqui é a mesma de lá.
class Cena(private val abrir: (String) -> Bitmap?) {
    private class Zona(val nome: String, val ceu0: Int, val ceu1: Int, val arv: Int, val chao: Int, val chao2: Int, val mon: String)
    private class Sk(val nome: String, val nv: Int, val fx: String, val cor: Int)

    companion object {
        private fun c(h: String) = Color.parseColor(h)
        // mesmas zonas do js/aventura.js
        private val ZONAS = listOf(
            Zona("Campina", c("#05081a"), c("#16234a"), c("#0f2a1d"), c("#183222"), c("#25492e"), "mushroomking"),
            Zona("Bosque", c("#04130e"), c("#0f2c22"), c("#0a2016"), c("#16321d"), c("#22502a"), "orc"),
            Zona("Montanha Gelada", c("#060f24"), c("#22355a"), c("#1c2e4c"), c("#7f95b0"), c("#a9bdd4"), "yeti"),
            Zona("Pântano", c("#0d0918"), c("#231834"), c("#17241a"), c("#232b1d"), c("#34402a"), "orc"),
            Zona("Terra do Fogo", c("#140404"), c("#350c08"), c("#160806"), c("#31160f"), c("#4d2012"), "demon"))
        private val MONS = listOf("mushroomking", "orc", "yeti", "demon")
        // mesmas habilidades do js/aventura.js (Age of Embers)
        private val SKILLS = mapOf(
            "espada" to listOf(Sk("Investida", 1, "corte", c("#9fe8ff")), Sk("Giro da Lâmina", 3, "giro", c("#cfe9ff")), Sk("Salto Esmagador", 6, "chao", c("#ffd27a")), Sk("Combo Relâmpago", 10, "raio", c("#fff27a")),
                Sk("Corte Aéreo", 14, "corte", c("#7fe3ff")), Sk("Fenda de Fogo", 18, "chao", c("#ff7a3a")), Sk("Fúria", 24, "giro", c("#ff9ab0"))),
            "cajado" to listOf(Sk("Cometa de Fogo", 1, "fogo", c("#ff7a2a")), Sk("Raio Celeste", 3, "raio", c("#bfe3ff")), Sk("Explosão", 6, "fogo", c("#ff5a1a")), Sk("Chuva de Meteoros", 10, "meteoro", c("#ffa21a")),
                Sk("Lança de Gelo", 13, "corte", c("#7fd0ff")), Sk("Onda Arcana", 16, "chao", c("#a8c8ff")), Sk("Rajada de Cometas", 19, "meteoro", c("#ffb04a")),
                Sk("Círculo de Chamas", 22, "chao", c("#ff6a2a")), Sk("Vórtice", 26, "giro", c("#c49aff"))))
        private fun esc(cor: Int, k: Float) = Color.rgb((Color.red(cor) * k).toInt(), (Color.green(cor) * k).toInt(), (Color.blue(cor) * k).toInt())
    }

    private var RW = 0; private var RH = 0; var modo = 0; private set
    private var W = 0; private var H = 0; private var U = 0f
    private var fundo: Bitmap? = null; private var arvores: Bitmap? = null
    private val p = Paint(Paint.ANTI_ALIAS_FLAG).apply { isFilterBitmap = true }
    private val txt = Paint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.CENTER; typeface = Typeface.DEFAULT_BOLD }
    private val img = HashMap<String, Bitmap>()
    private val rnd = Random(System.nanoTime())

    // estado vindo do jogo
    private var nv = 1; private var z = 1; private var arma = "espada"; private var build: List<String>? = null; private var novos = 0
    private var kills = 0; private var ouro = 0; private var estadoTxt = ""
    private var zonaFundo = -1

    private var quadro = 0; private var rolagem = 0f
    private var est = "corre"; private var t = 0f; private var mx = 0f; private var mhp = 0; private var mmax = 0
    private var golpeH = 0f; private var golpeM = 0f; private var ferH = 0f; private var ferM = 0f; private var vez = 0
    private var ataques = 0; private var monstro = "mushroomking"
    private var fx: Sk? = null; private var fxT = 0f; private val FX_DUR = 0.7f
    private var magia = 0f // bolinha de magia do cajado indo até o monstro

    private class Part(var x: Float, var y: Float, var vx: Float, var vy: Float, var vida: Float, val cor: Int, val moeda: Boolean, val r: Float)
    private class Num(var x: Float, var y: Float, var vida: Float, val s: String, val cor: Int, val g: Float)
    private val parts = ArrayList<Part>(); private val nums = ArrayList<Num>()

    fun ocupado() = parts.isNotEmpty() || nums.isNotEmpty() || est == "luta" || fxT > 0

    fun estado(json: String?) {
        if (json == null || json == estadoTxt) return
        try { val o = JSONObject(json)
            nv = o.optInt("nv", 1); z = o.optInt("z", 1).coerceAtLeast(1); arma = o.optString("arma", "espada"); novos = o.optInt("novos", 0)
            if (o.optInt("kills", 0) > kills || estadoTxt.isEmpty()) kills = o.optInt("kills", 0)
            if (estadoTxt.isEmpty() || o.optInt("ouro", 0) != ouro) ouro = o.optInt("ouro", 0)
            val b = o.optJSONObject("build")?.optJSONArray(arma); build = b?.let { a -> (0 until a.length()).map { a.getString(it) } }
            estadoTxt = json
            if (zIdx() != zonaFundo) montaFundo()
        } catch (e: Exception) {}
    }

    fun tamanho(rw: Int, rh: Int, m: Int) {
        if (rw == RW && rh == RH && m == modo && fundo != null) return
        RW = rw; RH = rh; modo = m
        val deitar = m != 0 && rw < rh
        W = if (deitar) rh else rw; H = if (deitar) rw else rh; U = maxOf(W, H).toFloat()
        montaFundo()
        if (est == "chega") mx = W + tam()
    }

    private fun zIdx() = (z - 1) % ZONAS.size
    private fun zona() = ZONAS[zIdx()]
    private fun chao() = H * 0.80f
    private fun tam() = U * 0.075f
    private fun hx() = W * 0.3f
    private fun bmp(n: String): Bitmap? = img[n] ?: abrir(n)?.also { img[n] = it }
    private fun skillsAtivas(): List<Sk> { val todas = (SKILLS[arma] ?: return emptyList()).filter { nv >= it.nv }; val b = build ?: return todas.take(5); return todas.filter { it.nome in b }.take(5) }

    private fun montaFundo() {
        if (W == 0) return
        zonaFundo = zIdx(); val zn = zona(); val lum = (Color.red(zn.chao) * 0.3f + Color.green(zn.chao) * 0.59f + Color.blue(zn.chao) * 0.11f) / 255f; val k = minOf(0.55f, 0.12f / lum.coerceAtLeast(0.01f)) // chão claro (neve) escurece mais: tela AMOLED
        val f = Bitmap.createBitmap(W, H, Bitmap.Config.RGB_565); val c = Canvas(f); val r = Random(7)
        c.drawColor(Color.BLACK)
        val topo = H * 0.55f; val larga = W / minOf(W, H).toFloat()
        p.shader = LinearGradient(0f, topo, 0f, chao(), intArrayOf(Color.BLACK, esc(zn.ceu0, 1f), esc(zn.ceu1, 0.8f)), floatArrayOf(0f, 0.35f, 1f), Shader.TileMode.CLAMP); c.drawRect(0f, topo, W.toFloat(), chao(), p); p.shader = null
        p.color = Color.WHITE
        repeat((40 * larga).toInt().coerceAtMost(90)) { val y = topo + r.nextFloat() * (chao() - topo) * 0.7f; p.alpha = (40 + 120 * (y - topo) / (chao() - topo)).toInt(); c.drawCircle(r.nextFloat() * W, y, 1.5f, p) }
        // lua pequena
        p.alpha = 255; p.color = Color.rgb(60, 66, 80); c.drawCircle(W * 0.82f, topo + (chao() - topo) * 0.35f, U * 0.012f, p)
        p.color = Color.rgb(36, 40, 52); c.drawCircle(W * 0.82f + U * 0.005f, topo + (chao() - topo) * 0.35f - U * 0.003f, U * 0.01f, p)
        p.color = esc(zn.chao, k); c.drawRect(0f, chao(), W.toFloat(), H * 0.86f, p)
        p.shader = LinearGradient(0f, H * 0.86f, 0f, H * 0.92f, esc(zn.chao, k), Color.BLACK, Shader.TileMode.CLAMP); c.drawRect(0f, H * 0.86f, W.toFloat(), H * 0.92f, p); p.shader = null
        p.color = esc(zn.chao2, k); p.strokeWidth = 1.5f; repeat((120 * larga).toInt()) { val x = r.nextFloat() * W; c.drawLine(x, chao() + 2, x + r.nextFloat() * 6 - 3, chao() - 4 - r.nextFloat() * 10, p) }
        // florzinhas
        repeat((10 * larga).toInt()) { val x = r.nextFloat() * W; val y = chao() + r.nextFloat() * H * 0.04f; p.color = listOf(Color.rgb(120, 70, 90), Color.rgb(110, 100, 60), Color.rgb(80, 90, 130))[it % 3]; c.drawCircle(x, y, 2.5f, p) }
        p.strokeWidth = 0f
        fundo?.recycle(); fundo = f
        // árvores fofinhas numa tira 2x a largura, que rola devagar
        val a = Bitmap.createBitmap(W * 2, H, Bitmap.Config.ARGB_8888); val ca = Canvas(a)
        val n = (14 * larga).toInt().coerceIn(14, 30); val tons = listOf(esc(zn.arv, 0.7f), esc(zn.arv, 1f), esc(zn.arv, 1.35f))
        repeat(n) { i ->
            val px = (i + r.nextFloat() * 0.7f) / n * W * 2; val th = U * (0.05f + r.nextFloat() * 0.035f); val rr = th * 0.3f; val base = chao() - th * 0.42f
            p.color = Color.rgb(24, 17, 12); ca.drawRect(px - rr * 0.12f, base, px + rr * 0.12f, chao(), p)
            for ((j, cor) in tons.withIndex()) { p.color = cor; val dy = (1 - j) * rr * 0.12f; val enc = 1f - j * 0.18f
                for ((dx, yy, kk) in listOf(Triple(-0.6f, -0.35f, 0.68f), Triple(0.6f, -0.35f, 0.68f), Triple(0f, -0.9f, 0.85f), Triple(0f, -0.35f, 0.8f), Triple(-0.35f, -1.3f, 0.55f), Triple(0.4f, -1.25f, 0.5f)))
                    ca.drawCircle(px + dx * rr * enc - j * rr * 0.08f, base + yy * rr + dy - j * rr * 0.1f, rr * kk * enc, p) }
        }
        arvores?.recycle(); arvores = a
    }

    private fun novoMonstro() { val zm = zona().mon; monstro = if (rnd.nextFloat() < 0.7f) zm else MONS[rnd.nextInt(MONS.size)]; mmax = 40; mhp = mmax; mx = W + tam(); est = "chega"; t = 0f }

    private fun faiscas(x: Float, y: Float, n: Int, cor: Int, forca: Float = 1f) { val F = tam(); repeat(n) {
        val a = rnd.nextFloat() * 6.28f; val v = F * (0.8f + rnd.nextFloat() * 1.4f) * forca
        parts.add(Part(x, y, cos(a) * v, sin(a) * v - F * 0.6f, 0.35f + rnd.nextFloat() * 0.25f, cor, false, F * 0.022f)) } }

    fun tick(dt: Float) {
        t += dt; quadro++
        val y = chao() + H * 0.01f; val F = tam() / 0.85f
        when (est) {
            "corre" -> { rolagem += dt * 1.8f; if (t > 1.5f) novoMonstro() }
            "chega" -> { rolagem += dt * 1.8f; mx -= W * 0.35f * dt; if (mx <= hx() + tam() * (if (arma == "cajado") 1.6f else 0.7f)) { est = "luta"; t = 0f } }
            "luta" -> if (t >= 0.8f) { t = 0f
                if (vez == 0) {
                    golpeH = 0.75f; ataques++
                    val sks = skillsAtivas(); val sk = if (sks.isNotEmpty() && ataques % 3 == 0) sks[(ataques / 3) % sks.size] else null
                    val dano = if (sk != null) 18 + rnd.nextInt(10) else 9 + rnd.nextInt(7)
                    if (sk != null) { fx = sk; fxT = FX_DUR; nums.add(Num(hx(), y - F * 1.25f, 1.1f, sk.nome, sk.cor, 0.7f)) }
                    if (arma == "cajado") magia = 0.45f
                    mhp -= dano; ferM = 0.4f
                    nums.add(Num(mx, y - F * 0.95f, 0.9f, dano.toString(), if (sk != null) Color.rgb(255, 160, 60) else Color.rgb(255, 236, 140), if (sk != null) 1.35f else 1f))
                    faiscas(mx - F * 0.15f, y - F * 0.45f, if (sk != null) 10 else 5, sk?.cor ?: Color.rgb(255, 240, 190), if (sk != null) 1.3f else 1f)
                    if (mhp <= 0) { est = "morre"; kills++; val g = 2 + 2 * z + rnd.nextInt(3); ouro += g
                        repeat(4) { parts.add(Part(mx, y - F * 0.4f, (rnd.nextFloat() - 0.5f) * F * 2.2f, -F * (2.2f + rnd.nextFloat()), 1.1f, Color.rgb(255, 205, 60), true, F * 0.04f)) }
                        nums.add(Num(mx, y - F * 1.15f, 1.1f, "+$g", Color.rgb(255, 210, 80), 0.9f)) }
                } else { golpeM = 0.75f; ferH = 0.4f
                    nums.add(Num(hx(), y - F * 0.95f, 0.8f, (3 + rnd.nextInt(5)).toString(), Color.rgb(255, 110, 110), 0.85f))
                    faiscas(hx() + F * 0.1f, y - F * 0.5f, 3, Color.rgb(255, 120, 110)) }
                vez = 1 - vez }
            "morre" -> if (t > 1.0f) { est = "comemora"; t = 0f; vez = 0 }
            "comemora" -> if (t > 0.75f) { est = "corre"; t = 0f }
        }
        golpeH -= dt; golpeM -= dt; ferH -= dt; ferM -= dt; fxT -= dt; magia -= dt
        val gr = F * 6f
        val pi = parts.iterator(); while (pi.hasNext()) { val q = pi.next(); q.vida -= dt; q.vy += gr * dt * (if (q.moeda) 1f else 0.5f); q.x += q.vx * dt; q.y += q.vy * dt
            if (q.moeda && q.y > y) { q.y = y; q.vy = -q.vy * 0.35f; q.vx *= 0.5f }; if (q.vida <= 0) pi.remove() }
        val ni = nums.iterator(); while (ni.hasNext()) { val q = ni.next(); q.vida -= dt; q.y -= F * 0.5f * dt; if (q.vida <= 0) ni.remove() }
    }

    private fun sprite(c: Canvas, nome: String, i: Int, x: Float, y: Float, alt: Float) {
        val b = bmp(nome) ?: return; val n = (b.width / b.height).coerceAtLeast(1); val fw = b.width / n; val k = i.mod(n)
        val src = Rect(k * fw, 0, k * fw + fw, b.height)
        val s = alt / b.height; c.drawBitmap(b, src, RectF(x - fw * s / 2, y - b.height * s, x + fw * s / 2, y), p)
    }

    private fun alfa(cor: Int, a: Float) = Color.argb((a.coerceIn(0f, 1f) * 255).toInt(), Color.red(cor), Color.green(cor), Color.blue(cor))

    // efeitos das habilidades (simples, poucas formas, só enquanto acontecem)
    private fun desenhaFx(c: Canvas, y: Float, F: Float) {
        val sk = fx ?: return; if (fxT <= 0) return
        val k = 1 - fxT / FX_DUR; val fade = 1 - k
        p.style = Paint.Style.STROKE; p.strokeCap = Paint.Cap.ROUND
        when (sk.fx) {
            "giro" -> { val cx = hx() + F * 0.15f; val cy = y - F * 0.42f; val r = F * (0.35f + 0.25f * k)
                p.strokeWidth = F * 0.07f; p.color = alfa(sk.cor, 0.85f * fade + 0.15f); c.drawArc(cx - r, cy - r * 0.55f, cx + r, cy + r * 0.55f, -160f + 360f * k, 220f, false, p)
                p.strokeWidth = F * 0.025f; p.color = alfa(Color.WHITE, fade); c.drawArc(cx - r, cy - r * 0.55f, cx + r, cy + r * 0.55f, -160f + 360f * k, 220f, false, p) }
            "corte" -> { val x0 = mx - F * 0.45f; val x1 = mx + F * 0.25f; val yy = y - F * (0.75f - 0.1f * k)
                p.strokeWidth = F * 0.06f * fade + 1; p.color = alfa(sk.cor, fade); c.drawLine(x0, yy, x1, yy + F * 0.4f, p)
                p.strokeWidth = F * 0.02f; p.color = alfa(Color.WHITE, fade); c.drawLine(x0, yy, x1, yy + F * 0.4f, p) }
            "chao" -> { val r = F * (0.2f + 1.2f * k)
                p.strokeWidth = F * 0.05f * fade + 1; p.color = alfa(sk.cor, fade); c.drawArc(mx - r, y - r * 0.18f, mx + r, y + r * 0.18f, 180f, 180f, false, p)
                p.style = Paint.Style.FILL; p.color = alfa(sk.cor, 0.25f * fade); c.drawOval(mx - r, y - r * 0.18f, mx + r, y + r * 0.18f, p) }
            "raio" -> { val top = y - F * 2.2f; p.strokeWidth = F * 0.045f * fade + 1; p.color = alfa(sk.cor, fade)
                val path = Path(); path.moveTo(mx + F * 0.1f, top); var yy = top; var xx = mx + F * 0.1f; val rr = Random(ataques)
                while (yy < y - F * 0.3f) { yy += F * 0.3f; xx = mx + (rr.nextFloat() - 0.5f) * F * 0.35f; path.lineTo(xx, yy) }
                c.drawPath(path, p); p.strokeWidth = F * 0.015f; p.color = alfa(Color.WHITE, fade); c.drawPath(path, p)
                if (k < 0.3f) { p.style = Paint.Style.FILL; p.color = alfa(sk.cor, 0.18f * (1 - k / 0.3f)); c.drawCircle(mx, y - F * 0.5f, F * 0.9f, p) } }
            "fogo", "meteoro" -> { p.style = Paint.Style.FILL
                val n = if (sk.fx == "meteoro") 3 else 1
                for (i in 0 until n) { val kk = (k * 1.4f - i * 0.2f).coerceIn(0f, 1f); if (kk <= 0f) continue
                    val sx = if (sk.fx == "meteoro") mx + F * (0.6f + i * 0.3f) else hx() + F * 0.3f; val sy = if (sk.fx == "meteoro") y - F * 2.2f else y - F * 0.5f
                    val bx = sx + (mx - F * 0.1f * i - sx) * kk; val by = sy + (y - F * 0.4f - sy) * kk
                    if (kk < 1f) { p.color = alfa(sk.cor, 0.35f); c.drawCircle(bx, by, F * 0.13f, p); p.color = alfa(Color.rgb(255, 240, 180), 0.9f); c.drawCircle(bx, by, F * 0.06f, p) }
                    else { p.color = alfa(sk.cor, 0.5f * fade); c.drawCircle(mx, y - F * 0.4f, F * (0.25f + 0.4f * k), p) } } }
        }
        p.style = Paint.Style.FILL; p.color = Color.WHITE
    }

    fun desenha(c: Canvas) {
        val f = fundo ?: run { c.drawColor(Color.BLACK); return }
        c.save()
        if (W != RW) { if (modo == 1) { c.translate(RW.toFloat(), 0f); c.rotate(90f) } else { c.translate(0f, RH.toFloat()); c.rotate(-90f) } }
        c.drawBitmap(f, 0f, 0f, null)
        arvores?.let { val off = ((rolagem * 40f * (U / 400f) * 0.45f) % (W * 2)); c.drawBitmap(it, -off, 0f, null); if (off > W) c.drawBitmap(it, W * 2 - off, 0f, null) }
        val y = chao() + H * 0.01f; val F = tam() / 0.85f
        p.color = Color.argb(90, 0, 0, 0); c.drawOval(hx() - F * 0.2f, y - 6, hx() + F * 0.2f, y + 4, p); p.color = Color.WHITE

        // monstro
        if (est == "chega" || est == "luta" || est == "morre") {
            val (an, iq) = when {
                est == "morre" -> "_cai" to (t * 7).toInt().coerceIn(0, 5)
                est == "chega" -> "_anda" to quadro
                golpeM > 0 -> "_ataca" to ((0.75f - golpeM) * 8).toInt().coerceIn(0, 5)
                ferM > 0 -> "_apanha" to ((0.4f - ferM) * 10).toInt().coerceIn(0, 3)
                else -> "_parada" to quadro
            }
            val treme = if (ferM > 0.2f) (if (quadro % 2 == 0) 1 else -1) * F * 0.03f else 0f
            p.color = Color.argb(70, 0, 0, 0); c.drawOval(mx - F * 0.2f, y - 6, mx + F * 0.2f, y + 4, p); p.color = Color.WHITE
            if (est == "morre") p.alpha = ((1.2f - t) * 255).toInt().coerceIn(0, 255)
            sprite(c, monstro + an, iq, mx + treme, y, F * 0.85f); p.alpha = 255
            if (est == "luta") { val bw = F * 0.5f; val by = y - F * 0.9f; p.color = Color.argb(150, 0, 0, 0); c.drawRect(mx - bw / 2, by, mx + bw / 2, by + F * 0.03f, p); p.color = Color.rgb(224, 72, 72); c.drawRect(mx - bw / 2, by, mx - bw / 2 + bw * mhp.coerceAtLeast(0) / mmax, by + F * 0.03f, p); p.color = Color.WHITE }
        }

        // heroína (a roupa segue a arma, igual ao jogo)
        val vis = "kai_$arma"
        when {
            est == "corre" || est == "chega" -> sprite(c, vis + "_corre", quadro, hx(), y, F)
            est == "comemora" -> sprite(c, vis + "_comemora", (t * 8).toInt().coerceIn(0, 5), hx(), y, F)
            golpeH > 0 -> sprite(c, vis + "_ataca", ((0.75f - golpeH) * 8).toInt().coerceIn(0, 5), hx() + (if (fxT > 0 && arma != "cajado") F * 0.08f else 0f), y, F)
            ferH > 0 -> sprite(c, vis + "_apanha", ((0.4f - ferH) * 10).toInt().coerceIn(0, 3), hx(), y, F)
            else -> sprite(c, vis + "_parada", quadro, hx(), y, F)
        }
        if (magia > 0 && arma == "cajado") { val k = 1 - magia / 0.45f; val ox = hx() + F * 0.25f; val oy = y - F * 0.45f; val bx = ox + (mx - ox) * k
            p.color = Color.argb(90, 150, 255, 140); c.drawCircle(bx, oy, F * 0.09f, p); p.color = Color.rgb(234, 255, 176); c.drawCircle(bx, oy, F * 0.045f, p); p.color = Color.WHITE }

        desenhaFx(c, y, F)

        for (q in parts) {
            val a = (q.vida / 0.4f).coerceAtMost(1f)
            if (q.moeda) { p.color = alfa(q.cor, a); c.drawCircle(q.x, q.y, q.r, p); p.color = alfa(Color.rgb(255, 245, 170), a); c.drawCircle(q.x - q.r * 0.3f, q.y - q.r * 0.3f, q.r * 0.35f, p) }
            else { p.color = alfa(q.cor, a); c.drawCircle(q.x, q.y, q.r, p) }
        }
        p.color = Color.WHITE
        for (q in nums) {
            val a = (q.vida / 0.4f).coerceAtMost(1f)
            txt.textSize = F * 0.2f * q.g
            txt.style = Paint.Style.STROKE; txt.strokeWidth = F * 0.025f; txt.color = alfa(Color.BLACK, a); c.drawText(q.s, q.x, q.y, txt)
            txt.style = Paint.Style.FILL; txt.color = alfa(q.cor, a); c.drawText(q.s, q.x, q.y, txt)
        }

        p.textSize = U * 0.016f; p.color = Color.argb(160, 230, 235, 245)
        val info = "Nv $nv · ${zona().nome}   ⚔ $kills   ● $ouro" + (if (novos > 0) "   🎒 $novos" else "")
        c.drawText(info, W * (if (W > H) 0.08f else 0.05f), H * 0.89f, p); p.color = Color.WHITE
        c.restore()
    }
}
