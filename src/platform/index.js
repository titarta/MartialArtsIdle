import { Capacitor } from '@capacitor/core';

/**
 * Runtime platform detection.
 *
 * isNative / isAndroid / isIOS — true when running inside a Capacitor WebView.
 * isWeb                        — true in browser and PWA.
 * isSteam                      — true when built with `--mode steam` (Electron/Tauri wrapper).
 *
 * Use this to gate platform-specific features (e.g. AdMob is native-only).
 *
 * @example
 * import { Platform } from '../platform';
 * if (Platform.isNative) { ... }
 */
const _nativePlatform = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'
const _buildTarget    = import.meta.env.MODE;    // 'native' | 'steam' | 'browser' | 'development' | 'production'

export const Platform = {
  isNative:  Capacitor.isNativePlatform(),
  isAndroid: _nativePlatform === 'android',
  isIOS:     _nativePlatform === 'ios',
  isWeb:     _nativePlatform === 'web',
  isSteam:   _buildTarget === 'steam',
};
