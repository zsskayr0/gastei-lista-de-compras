package com.gastei.app

import android.os.Bundle
import android.view.View
import androidx.activity.enableEdgeToEdge
import androidx.core.graphics.Insets
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)

    // Older WebViews don't expose system bars through CSS safe-area-inset-*.
    // Inset the whole WebView container so every screen and fixed overlay is safe.
    val content = findViewById<View>(android.R.id.content)
    val initialLeft = content.paddingLeft
    val initialTop = content.paddingTop
    val initialRight = content.paddingRight
    val initialBottom = content.paddingBottom
    ViewCompat.setOnApplyWindowInsetsListener(content) { view, windowInsets ->
      val types = WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
      val safe = windowInsets.getInsets(types)
      view.setPadding(
        initialLeft + safe.left,
        initialTop + safe.top,
        initialRight + safe.right,
        initialBottom + safe.bottom,
      )

      // These areas are handled natively; newer WebViews must not add them again.
      // Preserve other insets (especially the keyboard) and their update events.
      WindowInsetsCompat.Builder(windowInsets)
        .setInsets(types, Insets.NONE)
        .build()
    }
    ViewCompat.requestApplyInsets(content)
  }
}
