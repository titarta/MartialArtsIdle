package com.martialartsidle.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Let the background music start on launch. The Android WebView defaults
        // to requiring a user gesture before any audio can play; turning that off
        // lets the AudioContext resume immediately (see AudioManager.unlock()).
        this.bridge.getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
    }
}
