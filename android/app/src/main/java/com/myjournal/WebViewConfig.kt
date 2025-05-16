package com.myjournal

import android.webkit.WebView

object WebViewConfig {
    fun configure(webView: WebView) {
        webView.settings.apply {
            savePassword = false
            saveFormData = false
        }
    }
}