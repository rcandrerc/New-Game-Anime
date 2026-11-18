package br.rcandrerc.aventura

import android.app.Activity
import android.app.WallpaperManager
import android.content.ComponentName
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

// Opções do papel de parede: em pé ou deitado, e o botão pra aplicar.
class ConfigActivity : Activity() {
    private val modos = listOf("Em pé", "Deitado (topo pra esquerda)", "Deitado (topo pra direita)")
    private val botoes = ArrayList<Button>()

    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        val pref = getSharedPreferences("aventura", MODE_PRIVATE)
        val l = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; setPadding(48, 48, 48, 48); setBackgroundColor(Color.BLACK) }
        fun texto(s: String, tam: Float, cor: Int = Color.WHITE) = l.addView(TextView(this).apply { text = s; setTextColor(cor); textSize = tam; gravity = Gravity.CENTER })
        texto("Papel de parede da Aventura", 20f)
        texto("\nA heroína do jogo corre e luta no fundo da tela inicial. Ela usa a mesma arma, roupa e zona do seu jogo. Dois toques rápidos no fundo abrem a aventura.\n", 15f, Color.LTGRAY)
        texto("Como você segura o celular?", 16f)
        modos.forEachIndexed { i, nome ->
            val bt = Button(this).apply { isAllCaps = false; text = nome; setOnClickListener { pref.edit().putInt("modo", i).apply(); marca(i) } }
            botoes.add(bt); l.addView(bt)
        }
        texto("\nSe a cena ficar de cabeça pra baixo, escolha o outro lado.\n", 14f, Color.LTGRAY)
        l.addView(Button(this).apply {
            isAllCaps = false; text = "Usar como papel de parede"
            setOnClickListener {
                val i = Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER)
                i.putExtra(WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT, ComponentName(this@ConfigActivity, AventuraWallpaper::class.java))
                try { startActivity(i) } catch (e: Exception) { startActivity(Intent(WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER)) }
            }
        })
        l.addView(Button(this).apply { isAllCaps = false; text = "Voltar pro jogo"; setOnClickListener { finish() } })
        setContentView(ScrollView(this).apply { setBackgroundColor(Color.BLACK); isFillViewport = true; addView(l) })
        marca(pref.getInt("modo", 0))
    }

    private fun marca(i: Int) = botoes.forEachIndexed { k, bt -> bt.text = (if (k == i) "✓ " else "") + modos[k] }
}
