package br.rcandrerc.aventura

import android.graphics.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

// Desenha a cena em imagens pra conferir (em pé, deitado, cada arma e zona), sem precisar de celular.
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34])
class CenaTest {
    private val pasta = File("src/main/assets")
    private val saida = File("build/previa").apply { deleteRecursively(); mkdirs() }

    private fun roda(nome: String, modo: Int, estado: String, quadros: Int, tiros: Set<Int>) {
        val cena = Cena { n -> File(pasta, "$n.png").takeIf { it.exists() }?.let { BitmapFactory.decodeFile(it.path) } }
        cena.estado(estado); cena.tamanho(1220, 2712, modo)
        val t0 = System.nanoTime(); var desenhou = 0; var tempo = 0L
        for (i in 0..quadros) { cena.tick(0.083f)
            if (i in tiros) { val b = Bitmap.createBitmap(1220, 2712, Bitmap.Config.ARGB_8888); val a = System.nanoTime(); cena.desenha(Canvas(b)); tempo += System.nanoTime() - a; desenhou++
                File(saida, "${nome}_$i.png").outputStream().use { b.compress(Bitmap.CompressFormat.PNG, 100, it) } } }
        println("$nome: ${quadros + 1} ticks em ${(System.nanoTime() - t0) / 1_000_000} ms; desenho médio ${tempo / desenhou.coerceAtLeast(1) / 1000} us")
    }

    @Test fun desenha() {
        val tiros = (20..200 step 4).toSet()
        roda("espada", 0, """{"nv":12,"z":1,"kills":5,"ouro":40,"arma":"espada","build":null,"novos":2}""", 200, tiros)
        roda("cajado", 0, """{"nv":20,"z":5,"kills":50,"ouro":400,"arma":"cajado","build":{"cajado":["Raio Celeste","Chuva de Meteoros","Onda Arcana"]}}""", 200, tiros)
        roda("nu", 0, """{"nv":1,"z":3,"arma":"nu"}""", 120, setOf(40, 60))
        roda("morte", 0, """{"nv":1,"z":5,"arma":"nu","h":[9,75]}""", 360, (40..360 step 20).toSet())
        roda("deitado1", 1, """{"nv":6,"z":2,"arma":"espada"}""", 120, setOf(60, 90))
        roda("deitado2", 2, """{"nv":6,"z":4,"arma":"cajado"}""", 120, setOf(60, 90))
    }
}
