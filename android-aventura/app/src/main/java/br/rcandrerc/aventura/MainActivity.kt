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
import android.widget.TextView

// Tela simples: explica o teste e abre a escolha do papel de parede animado.
class MainActivity : Activity() {
    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        val l = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; setPadding(48, 48, 48, 48); setBackgroundColor(Color.BLACK) }
        l.addView(TextView(this).apply {
            text = "Aventura (teste)\n\nToque no botão, escolha \"Aventura\" e depois aplique na TELA DE BLOQUEIO (ou nas duas telas).\n\nDepois bloqueie o celular e veja se a heroína aparece correndo."
            setTextColor(Color.WHITE); textSize = 17f; gravity = Gravity.CENTER
        })
        l.addView(Button(this).apply {
            text = "Usar como papel de parede"
            setOnClickListener {
                val i = Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER)
                i.putExtra(WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT, ComponentName(this@MainActivity, AventuraWallpaper::class.java))
                try { startActivity(i) } catch (e: Exception) { startActivity(Intent(WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER)) }
            }
        })
        setContentView(l)
    }
}
