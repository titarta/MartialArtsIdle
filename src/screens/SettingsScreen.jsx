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

const BASE = import.meta.env.BASE_URL;

// Mirrors JourneyBody.jsx REALM_ICONS. Kept local so SettingsScreen
// renders the identity plaque without importing the journey body component.
const REALM_ICONS = {
  'Tempered Body':          `${BASE}ui/realms/tempered_body.png`,
  'Qi Transformation':      `${BASE}ui/realms/qi_transformation.png`,
  'True Element':           `${BASE}ui/realms/true_element.png`,
  'Separation & Reunion':   `${BASE}ui/realms/separation_reunion.png`,
  'Immortal Ascension':     `${BASE}ui/realms/immortal_ascension.png`,
  'Saint':                  `${BASE}ui/realms/saint.png`,
  'Saint King':             `${BASE}ui/realms/saint_king.png`,
  'Origin Returning':       `${BASE}ui/realms/origin_returning.png`,
  'Origin King':            `${BASE}ui/realms/origin_king.png`,
  'Void King':              `${BASE}ui/realms/void_king.png`,
  'Dao Source':             `${BASE}ui/realms/dao_source.png`,
  'Emperor Realm':          `${BASE}ui/realms/emperor_realm.png`,
  'Open Heaven':            `${BASE}ui/realms/open_heaven.png`,
};

const RENDERING_MODES = [
  { mode: 'auto',      label: 'Smooth',    sub: 'bilinear',  icon: '〜' },
  { mode: 'pixelated', label: 'Crisp',     sub: 'pixelated', icon: '▦' },
];

const AUDIO_CHANNELS = [
  { channel: 'master', label: 'Master', volKey: 'masterVol', muteKey: 'masterMuted' },
  { channel: 'bgm',    label: 'Music',  volKey: 'bgmVol',    muteKey: 'bgmMuted'    },
  { channel: 'sfx',    label: 'Effects',volKey: 'sfxVol',    muteKey: 'sfxMuted'    },
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

function ActionRow({ icon, label, sublabel, onClick, disabled }) {
  return (
    <button
      className="stg-action-row"
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

// Compact human duration for the identity plaque ("2.4d", "5h", "12m").
function formatDuration(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return '0m';
  const day = sec / 86400;
  if (day >= 1) return `${day.toFixed(day < 10 ? 1 : 0)}d`;
  const hr = sec / 3600;
  if (hr >= 1) return `${Math.round(hr)}h`;
  const m = Math.round(sec / 60);
  return `${m}m`;
}

/**
 * Settings — Cultivator Tablet (post visual-redesign).
 *
 * Identity Plaque at the top: large Ma Shan Zheng "道" watermark, Cinzel
 * "Settings" headline, current realm icon + name + stage, then three
 * lifetime micro-stats (Lives, Realms Crossed, Time Cultivating). Below
 * the plaque, six grouped cards: Audio, Visual Effects, Rendering Mode,
 * Language, Save Data, Danger Path (quarantined, two-tap commit). All
 * data-touching functionality preserved from the previous bare port.
 *
 * State plumbed as props from App.jsx — realm/lifeIndex/timePlayed are
 * owned by useCultivation / useReincarnationKarma / useStats. Settings
 * doesn't reach into the store from inside the component.
 */
// Per-perk presentation for the Active Perks card. Each row is keyed by
// the shopItem id so we can decide its label + effect string + stack/
// stack-cap badge here, decoupled from shopItems.js copy (which is
// shopper-facing). Ordering is purchase priority for now; if more perks
// land we should split this into its own data file.
const PERK_ROWS = [
  {
    id:    'qol_skip_bt_confirm',
    kind:  'permanent',
    icon:  '⚡',
    name:  'Decisive Heart',
    effect:'Auto-confirms major breakthroughs.',
  },
  {
    id:    'qol_autobuy_cheapest',
    kind:  'permanent',
    icon:  '🤖',
    name:  "Disciple's Diligence",
    effect:'Auto-Buy toggle on the Sect screen.',
  },
  {
    id:    'qol_offline_cap_2h',
    kind:  'stackable',
    icon:  '⏳',
    name:  'Patient Mind',
    // Effect string is templated with the live stack count so the row
    // reads as "+4h offline cap" when 2 are stacked, not just the static
    // shop blurb. maxStack comes from shopItems.js.
    effectForStack: (stack) => `+${stack * 2}h offline qi cap (base 8h → ${8 + stack * 2}h current).`,
    maxStack: 3,
  },
];

function ActivePerks({ shopInventory, autoBuyEnabled }) {
  if (!shopInventory) return null;
  const owned = PERK_ROWS.map(row => {
    if (row.kind === 'permanent') {
      const has = shopInventory.hasQol(row.id);
      return has ? { ...row, owned: true, stack: null } : null;
    }
    if (row.kind === 'stackable') {
      const stack = shopInventory.getStack(row.id);
      return stack > 0 ? { ...row, owned: true, stack } : null;
    }
    return null;
  }).filter(Boolean);

  // Per the spec: if no perks are owned, hide the whole section (don't
  // render a "no perks" empty state). Section label and card together
  // are suppressed by returning null here.
  if (owned.length === 0) return null;

  return (
    <section className="stg-section">
      <div className="stg-section-label stg-cinzel-label stg-label-perk">Active Perks</div>
      <div className="stg-perk-card">
        {owned.map(perk => (
          <div key={perk.id} className="stg-perk-row">
            <span className="stg-perk-icon">{perk.icon}</span>
            <span className="stg-perk-body">
              <span className="stg-perk-name">{perk.name}</span>
              <span className="stg-perk-effect">
                {perk.kind === 'stackable'
                  ? perk.effectForStack(perk.stack)
                  : perk.effect}
              </span>
            </span>
            <span className="stg-perk-state">
              {perk.kind === 'stackable' ? (
                <span className="stg-perk-badge stg-perk-badge-stack">
                  ×{perk.stack}{perk.maxStack ? ` / ${perk.maxStack}` : ''}
                </span>
              ) : (
                <span className="stg-perk-badge">Active</span>
              )}
              {perk.id === 'qol_autobuy_cheapest' && (
                <span className="stg-perk-toggle">
                  {autoBuyEnabled ? 'Enabled' : 'Disabled'}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingsScreen({
  onBack,
  onOpenAbout,
  onOpenBazaar,
  realmName,
  realmStage,
  realmIndex = 0,
  totalRealms = 0,
  lifeIndex = 0,
  timePlayedSec = 0,
  shopInventory = null,
  autoBuyEnabled = false,
}) {
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

  const realmIcon = realmName ? REALM_ICONS[realmName] : null;
  const livesCount = (lifeIndex ?? 0) + 1;
  const stagesCrossed = Math.max(0, realmIndex ?? 0);
  const cultivatingDuration = formatDuration(timePlayedSec);

  return (
    <div className="settings-screen">

      {/* Back chip — sits above the plaque */}
      <button
        className="stg-back-chip"
        onClick={onBack}
        aria-label={t('common.back')}
      >
        <span className="stg-back-arrow">‹</span> {t('common.back')}
      </button>

      {/* IDENTITY PLAQUE */}
      <div className="stg-identity" aria-label="Cultivator Tablet">
        <div className="stg-identity-eyebrow">Cultivator Tablet</div>
        <div className="stg-identity-title">{t('settings.title')}</div>
        {realmName && (
          <div className="stg-identity-realm">
            {realmIcon ? (
              <img
                src={realmIcon}
                alt=""
                className="stg-identity-realm-icon"
                draggable="false"
              />
            ) : (
              <span className="stg-identity-realm-glyph" aria-hidden="true" />
            )}
            <span className="stg-identity-realm-name">{realmName}</span>
            {realmStage && (
              <span className="stg-identity-realm-stage">· {realmStage}</span>
            )}
          </div>
        )}
        <div className="stg-identity-meta">
          <span className="stg-identity-stat">
            <b>{livesCount}</b> Lives
          </span>
          <span className="stg-identity-divider" aria-hidden="true" />
          <span className="stg-identity-stat">
            <b>{stagesCrossed}</b>{totalRealms > 0 ? ` / ${totalRealms - 1}` : ''} Realms
          </span>
          <span className="stg-identity-divider" aria-hidden="true" />
          <span className="stg-identity-stat">
            <b>{cultivatingDuration}</b> Cultivating
          </span>
        </div>
      </div>

      {/* AUDIO */}
      <section className="stg-section">
        <div className="stg-section-label stg-cinzel-label">Audio</div>
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
        <div className="stg-section-label stg-cinzel-label">Visual Effects</div>
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
        <div className="stg-section-label stg-cinzel-label">Rendering Mode</div>
        <OptionGrid
          options={RENDERING_MODES}
          value={graphics.renderingMode}
          onChange={mode => { setGraphics({ ...graphics, renderingMode: mode }); noteSettingTouched('rendering'); }}
        />
      </section>

      {/* Resolution — desktop only */}
      {isDesktop && (
        <section className="stg-section">
          <div className="stg-section-label stg-cinzel-label">Window Resolution</div>
          <OptionGrid
            options={RESOLUTIONS}
            value={resolution}
            onChange={handleResolutionChange}
          />
        </section>
      )}

      {/* Language */}
      <section className="stg-section">
        <div className="stg-section-label stg-cinzel-label">{t('settings.language')}</div>
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
        <div className="stg-section-label stg-cinzel-label">{t('settings.saveData')}</div>

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
          {/* About / Credits — pushed from this section per the audit. The
              row sits at the bottom of Save Data so it stays visually
              tucked under the config block, the standard mobile pattern. */}
          {onOpenAbout && (
            <button
              type="button"
              className="stg-action-row stg-action-row-about"
              onClick={onOpenAbout}
            >
              <span className="stg-action-icon">ℹ</span>
              <span className="stg-action-body">
                <span className="stg-action-label">About this app</span>
                <span className="stg-action-sub">Credits · fonts · licenses</span>
              </span>
              <span className="stg-action-chevron">›</span>
            </button>
          )}
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

      {/* Active Perks — green-tinted list of owned QoL items. Hidden
          entirely when none are owned (no empty state). Sits between
          Save Data and Danger Path per the content-audit recommendation. */}
      <ActivePerks
        shopInventory={shopInventory}
        autoBuyEnabled={autoBuyEnabled}
      />

      {/* Danger Path — quarantined card with two-tap commit */}
      <section className="stg-section stg-section-last">
        <div className="stg-section-label stg-cinzel-label stg-label-danger">Danger Path</div>
        <div className="stg-danger-card">
          {confirmWipe ? (
            <div className="stg-wipe-confirm">
              <span className="stg-wipe-label">{t('settings.areYouSure')}</span>
              <div className="stg-wipe-btns">
                <button className="stg-wipe-yes" onClick={confirmDoWipe}>{t('settings.yesWipe')}</button>
                <button className="stg-wipe-cancel" onClick={() => setConfirmWipe(false)}>{t('common.cancel')}</button>
              </div>
            </div>
          ) : (
            <button
              className="stg-danger-row"
              onClick={() => setConfirmWipe(true)}
            >
              <span className="stg-danger-icon">🗑</span>
              <span className="stg-danger-body">
                <span className="stg-danger-label">{t('settings.wipeSave')}</span>
                <span className="stg-danger-sub">Permanently delete all progress. Requires two taps.</span>
              </span>
              <span className="stg-danger-chev">›</span>
            </button>
          )}
        </div>
      </section>

    </div>
  );
}

export default SettingsScreen;
