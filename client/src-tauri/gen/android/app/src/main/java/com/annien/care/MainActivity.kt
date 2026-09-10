package com.annien.care

import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.Manifest
import androidx.activity.enableEdgeToEdge
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : TauriActivity() {
  companion object {
    init {
      try {
        System.loadLibrary("c++_shared")
      } catch (e: Throwable) {
        // Ignored if statically linked
      }
    }
    private const val PERMISSION_REQUEST_CODE = 1001
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    requestPermissionsAndStartService()
  }

  /**
   * Bấm Back = ẩn app ra background thay vì tắt hẳn.
   */
  @Deprecated("Use OnBackPressedCallback")
  override fun onBackPressed() {
    moveTaskToBack(true)
  }

  private fun requestPermissionsAndStartService() {
    val permissionsNeeded = mutableListOf<String>()

    // Microphone permission
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
        != PackageManager.PERMISSION_GRANTED) {
      permissionsNeeded.add(Manifest.permission.RECORD_AUDIO)
    }

    // Android 13+ (API 33): POST_NOTIFICATIONS for foreground service notification
    if (Build.VERSION.SDK_INT >= 33) {
      if (ContextCompat.checkSelfPermission(this, "android.permission.POST_NOTIFICATIONS")
          != PackageManager.PERMISSION_GRANTED) {
        permissionsNeeded.add("android.permission.POST_NOTIFICATIONS")
      }
    }

    if (permissionsNeeded.isNotEmpty()) {
      ActivityCompat.requestPermissions(
        this,
        permissionsNeeded.toTypedArray(),
        PERMISSION_REQUEST_CODE
      )
    } else {
      startVoiceListenerService()
    }
  }

  override fun onRequestPermissionsResult(
    requestCode: Int,
    permissions: Array<out String>,
    grantResults: IntArray
  ) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)
    if (requestCode == PERMISSION_REQUEST_CODE) {
      // Start service regardless - it will work with whatever permissions were granted
      startVoiceListenerService()
    }
  }

  private fun startVoiceListenerService() {
    try {
      val serviceIntent = Intent(this, VoiceListenerService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        startForegroundService(serviceIntent)
      } else {
        startService(serviceIntent)
      }
    } catch (e: Exception) {
      // Don't crash if foreground service can't be started
      e.printStackTrace()
    }
  }
}
