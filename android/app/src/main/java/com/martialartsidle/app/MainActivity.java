package com.martialartsidle.app;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Let the background music start on launch. The Android WebView defaults
        // to requiring a user gesture before any audio can play; turning that off
        // lets the AudioContext resume immediately (see AudioManager.unlock()).
        this.bridge.getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);

        // Immersive fullscreen. targetSdk 36 (Android 16) forces edge-to-edge, so
        // the WebView draws behind the system bars; on 3-button navigation the
        // opaque bar collides with the game's own bottom nav. Hiding the system
        // bars hands the game the whole screen. They reappear on an edge swipe
        // then auto-hide (sticky), so navigation stays reachable.
        enableImmersiveMode();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        // Re-hide the bars whenever the activity regains focus: after a rewarded
        // ad, a system dialog, the recents screen, or a transient swipe-reveal.
        if (hasFocus) {
            enableImmersiveMode();
        }
    }

    private void enableImmersiveMode() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.hide(WindowInsetsCompat.Type.systemBars());
            controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }
    }
}
