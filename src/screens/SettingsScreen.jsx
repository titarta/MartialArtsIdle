// @refresh reset
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { exportSave, importSave, wipeSave } from '../systems/save';
import { setLanguage, SUPPORTED_LANGUAGES } from '../i18n';
import { loadGraphics, applyGraphics, saveGraphics } from '../systems/graphics';
import useAudio from '../audio/useAudio';
import { trackSettingChanged } from '../analytics';
import { recordStat } from '../systems/statsRecorder';
import { noteSettingTouched } from '../systems/settingsTouched';
import {
  RESOLUTIONS,
  getResolution,
  saveResolution,
  applyResolution,
  isResolutionSelectorAvailable,
} from '../systems/desktopResolution';

const RENDERING_MODES = [
  { mode: 'auto',      label: 'Smooth',    sub: 'bilinear',  icon: '〜' },
  { mode: 'pixelated', label: 'Crisp',     sub: 'pixelated', icon: '▦' },
];

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="stg-segment">
      {options.map(o => (
        <button
          key={o.value}
          className={`stg-segment-btn${value === o.value ? ' stg-segment-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function OptionGrid({ options, value, onChange }) {
  return (
    <div className="stg-option-grid">
      {options.map(o => (
        <button
          key={o.mode}
          className={`stg-option-card${value === o.mode ? ' stg-option-active' : ''}`}
          onClick={() => onChange(o.mode)}
        >
          {o.icon && <span className="stg-option-icon">{o.icon}</span>}
          <span className="stg-option-label">{o.label}</span>
          <span className="stg-option-sub">{o.sub}</span>
        </button>
      ))}
    </div>
  );
}

function ActionRow({ icon, label, sublabel, onClick, danger, disabled }) {
  return (
    <button
      className={`stg-action-row${danger ? ' stg-action-danger' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="stg-action-icon">{icon}</span>
      <span className="stg-action-body">
        <span className="stg-action-label">{label}</span>
        {sublabel && <span className="stg-action-sub">{sublabel}</span>}
      </span>
      <span className="stg-action-chevron">›</span>
    </button>
  );
}

const AUDIO_CHANNELS = [
  { channel: 'master', label: 'Master', volKey: 'masterVol', muteKey: 'masterMuted' },
  { channel: 'bgm',    label: 'Music',  volKey: 'bgmVol',    muteKey: 'bgmMuted'    },
  { channel: 'sfx',    label: 'Effects',volKey: 'sfxVol',    muteKey: 'sfxMuted'    },
];

/**
 * Settings — full screen (post nav-audit). Lives in src/screens/ and routes via
 * navigate('settings'). The TopBar ⚙ entry pushes a real screen now instead of
 * a modal overlay; sections (Audio / Visuals / Rendering / Language / Save Data /
 * Danger Zone) all render full-bleed inside the standard .screen-container chrome.
 *
 * Visual treatment mirrors _design/nav-audit-mockups/settings-screen.html —
 * lacquer panel sections with a sticky-feeling header and a discrete back chip.
 */
function SettingsScreen({ onBack }) {
  const { t, i18n } = useTranslation('ui');
  const audio = useAudio();

  // Local slider state — separate from audio.settings so the slider doesn't
  // snap back while dragging (controlled inputs fight with async state updates).
  const [sliderVols, setSliderVols] = useState(() => ({
    master: audio.settings.masterVol,
    bgm:    audio.settings.bgmVol,
    sfx:    audio.settings.sfxVol,
  }));

  const [showImport,  setShowImport]  = useState(false);
  const [importText,  setImportText]  = useState('');
  const [message,     setMessage]     = useState(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  // Show the resolution selector on any desktop runtime: Steam (Electron),
  // Google Play Games for PC, or a desktop browser. See platform.js.
  const isDesktop = isResolutionSelectorAvailable();
  const [resolution, setResolutionState] = useState(getResolution);

  const handleResolutionChange = (mode) => {
    saveResolution(mode);
    setResolutionState(mode);
    applyResolution(mode);
    try { trackSettingChanged('resolution', mode); } catch {}
  };

  const [graphics, setGraphicsState] = useState(loadGraphics);
  const setGraphics = (next) => {
    setGraphicsState(next);
    saveGraphics(next);
    applyGraphics(next);
    try { trackSettingChanged('graphics', next?.preset ?? next?.quality ?? 'custom'); } catch {}
  };

  const flash = (text, isError) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExport = () => {
    const encoded = exportSave();
    if (!encoded) { flash(t('settings.noSaveFound'), true); return; }
    navigator.clipboard.writeText(encoded).then(
      () => flash(t('settings.copiedToClipboard'), false),
      () => { setImportText(encoded); setShowImport(true); flash(t('settings.copyManually'), false); }
    );
  };

  const handleImport = () => {
    if (!importText.trim()) { flash(t('settings.pasteSaveFirst'), true); return; }
    const result = importSave(importText);
    if (result.ok) {
      flash(t('settings.saveImported'), false);
      setTimeout(() => window.location.reload(), 1000);
    } else {
      flash(result.error, true);
    }
  };

  const confirmDoWipe = () => {
    setConfirmWipe(false);
    wipeSave();
    window.location.reload();
  };

  return (
    <div className="settings-screen">

      {/* Screen header — back chip + title block */}
      <div className="stg-screen-head">
        <button
          className="stg-back-chip"
          onClick={onBack}
          aria-label={t('common.back')}
        >
          <span className="stg-back-arrow">‹</span> {t('common.back')}
        </button>
        <div className="stg-screen-title-block">
          <div className="stg-screen-title">
            <span className="stg-title-icon" aria-hidden="true">⚙</span>
            {t('settings.title')}
          </div>
          <div className="stg-screen-sub">Audio · Visuals · Save Data</div>
        </div>
      </div>

      {/* Audio */}
      <section className="stg-section">
        <div className="stg-section-label">Audio</div>
        <div className="stg-panel">
          {AUDIO_CHANNELS.map(({ channel, label, muteKey }) => {
            const muted    = audio.settings[muteKey];
            const localVol = sliderVols[channel];
            return (
              <div key={channel} className="stg-audio-row">
                <span className="stg-audio-label">{label}</span>
                <input
                  type="range"
                  className={`stg-audio-slider${muted ? ' stg-audio-slider-muted' : ''}`}
                  min="0" max="1" step="0.01"
                  value={localVol}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setSliderVols(prev => ({ ...prev, [channel]: val }));
                  }}
                  onMouseUp={e  => { audio.setVolume(channel, parseFloat(e.target.value)); noteSettingTouched('audio_vol'); }}
                  onTouchEnd={e => { audio.setVolume(channel, parseFloat(e.target.value)); noteSettingTouched('audio_vol'); }}
                  disabled={muted}
                  aria-label={`${label} volume`}
                />
                <span className="stg-audio-pct">{muted ? '—' : `${Math.round(localVol * 100)}%`}</span>
                <button
                  className={`stg-audio-mute${muted ? ' stg-audio-muted' : ''}`}
                  onClick={() => {
                    audio.setMuted(channel, !muted);
                    try { recordStat('audioToggles', 1); } catch {}
                    noteSettingTouched('audio_mute');
                  }}
                  aria-label={muted ? `Unmute ${label}` : `Mute ${label}`}
                >
                  {muted ? '🔇' : '🔊'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Visual effects */}
      <section className="stg-section">
        <div className="stg-section-label">Visual Effects</div>
        <div className="stg-panel">
          <div className="stg-row">
            <div className="stg-row-info">
              <span className="stg-row-title">Particles &amp; Animations</span>
            </div>
            <SegmentedControl
              options={[{ value: true, label: 'On' }, { value: false, label: 'Off' }]}
              value={graphics.vfxEnabled}
              onChange={v => { setGraphics({ ...graphics, vfxEnabled: v }); noteSettingTouched('particles'); }}
            />
          </div>
        </div>
      </section>

      {/* Rendering mode */}
      <section className="stg-section">
        <div className="stg-section-label">Rendering Mode</div>
        <OptionGrid
          options={RENDERING_MODES}
          value={graphics.renderingMode}
          onChange={mode => { setGraphics({ ...graphics, renderingMode: mode }); noteSettingTouched('rendering'); }}
        />
      </section>

      {/* Resolution — desktop only */}
      {isDesktop && (
        <section className="stg-section">
          <div className="stg-section-label">Window Resolution</div>
          <OptionGrid
            options={RESOLUTIONS}
            value={resolution}
            onChange={handleResolutionChange}
          />
        </section>
      )}

      {/* Language */}
      <section className="stg-section">
        <div className="stg-section-label">{t('settings.language')}</div>
        <div className="stg-panel">
          <div className="stg-lang-row">
            {SUPPORTED_LANGUAGES.map(lang => (
              <button
                key={lang.code}
                className={`stg-lang-btn${i18n.language === lang.code ? ' stg-lang-active' : ''}`}
                onClick={() => { setLanguage(lang.code); try { trackSettingChanged('language', lang.code); } catch {} noteSettingTouched('language'); }}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Save data */}
      <section className="stg-section">
        <div className="stg-section-label">{t('settings.saveData')}</div>

        {message && (
          <div className={`stg-flash ${message.isError ? 'stg-flash-error' : 'stg-flash-ok'}`}>
            {message.text}
          </div>
        )}

        <div className="stg-action-list">
          <ActionRow
            icon="📤"
            label={t('settings.exportSave')}
            sublabel="Copy save code to clipboard"
            onClick={handleExport}
          />
          <ActionRow
            icon="📥"
            label={t('settings.importSave')}
            sublabel="Paste a save code to restore"
            onClick={() => setShowImport(v => !v)}
          />
        </div>

        {showImport && (
          <div className="stg-import-area">
            <textarea
              className="stg-import-input"
              placeholder={t('settings.pastePlaceholder')}
              value={importText}
              onChange={e => setImportText(e.target.value)}
              rows={3}
            />
            <button className="stg-import-btn" onClick={handleImport}>
              {t('settings.loadSave')}
            </button>
          </div>
        )}
      </section>

      {/* Danger zone */}
      <section className="stg-section stg-section-last">
        <div className="stg-section-label stg-label-danger">Danger Zone</div>
        <div className="stg-action-list">
          {confirmWipe ? (
            <div className="stg-wipe-confirm">
              <span className="stg-wipe-label">{t('settings.areYouSure')}</span>
              <div className="stg-wipe-btns">
                <button className="stg-wipe-yes" onClick={confirmDoWipe}>{t('settings.yesWipe')}</button>
                <button className="stg-wipe-cancel" onClick={() => setConfirmWipe(false)}>{t('common.cancel')}</button>
              </div>
            </div>
          ) : (
            <ActionRow
              icon="🗑"
              label={t('settings.wipeSave')}
              sublabel="Permanently delete all progress"
              onClick={() => setConfirmWipe(true)}
              danger
            />
          )}
        </div>
      </section>

    </div>
  );
}

export default SettingsScreen;
