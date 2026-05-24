/* global __MAI_VERSION__ */
import { useTranslation } from 'react-i18next';

// Build-time injected version (vite.config.js → define.__MAI_VERSION__).
// Wrapped in a runtime check so this file doesn't crash in environments
// where the define isn't present (e.g. a Jest run without the same defines).
const APP_VERSION = (typeof __MAI_VERSION__ !== 'undefined') ? __MAI_VERSION__ : 'dev';

const TEAM = [
  { glyph: 'M', name: 'Miguel',  role: 'Producer · Monetization · Deployment' },
  { glyph: 'A', name: 'Alex',    role: 'Lead Designer · Gameplay Systems' },
  { glyph: 'C', name: 'Claude',  role: 'Pair-programmer · UI Audit · Typography' },
];

const FONTS = [
  { name: 'Cinzel',         credit: 'Natanael Gama',       lic: 'OFL' },
  { name: 'Ma Shan Zheng',  credit: 'Google Fonts',        lic: 'OFL' },
  { name: 'System sans',    credit: 'native fallback',     lic: null  },
];

const OSS = [
  { name: 'React',     credit: 'Meta',                              lic: 'MIT' },
  { name: 'Vite',      credit: 'Evan You & contributors',           lic: 'MIT' },
  { name: 'Capacitor', credit: 'Ionic',                             lic: 'MIT' },
  { name: 'i18next',   credit: 'Jan Mühlemann & contributors',      lic: 'MIT' },
  { name: 'Pixel art', credit: 'PixelLab API',                      lic: 'licensed' },
];

const LINKS = [
  { icon: '✉', label: 'Contact support', sub: 'theninjatoa@gmail.com', href: 'mailto:theninjatoa@gmail.com' },
  // Placeholder external links — wire to real URLs when they exist.
  { icon: '🔒', label: 'Privacy policy',   sub: 'opens in browser', href: null },
  { icon: '§',  label: 'Terms of service', sub: 'opens in browser', href: null },
];

/**
 * About — credits & licenses screen.
 *
 * Reached via Settings → Save Data → "About this app" row. A dedicated
 * screen (not a modal) per the content-audit recommendation: credits
 * are a destination, not a state, so the standard mobile pattern is a
 * row that pushes to its own surface.
 *
 * Layout mirrors _design/content-audit/mockups/about-screen.html:
 *   hero (calligraphy watermark, name, version pill)
 *   team grid
 *   fonts + licenses
 *   open-source acknowledgments
 *   external links (contact, privacy, terms)
 *   red vermillion stamp footer
 *
 * Lacquer aesthetic with Cinzel headers and system sans body. Version
 * uses tabular-nums so the digits don't shift on tick. Back chip
 * returns to Settings (the only entry point today).
 */
function AboutScreen({ onBack }) {
  const { t } = useTranslation('ui');

  const openLink = (href) => {
    if (!href) return;
    try { window.open(href, '_blank', 'noopener,noreferrer'); } catch {}
  };

  return (
    <div className="settings-screen about-screen">
      <button
        className="stg-back-chip"
        onClick={onBack}
        aria-label={t('common.back')}
      >
        <span className="stg-back-arrow">‹</span> {t('common.back')}
      </button>

      {/* Hero — calligraphy 道 watermark, name, version pill */}
      <div className="abt-hero">
        <div className="abt-hero-eyebrow">About this app</div>
        <div className="abt-hero-title">Martial Arts Idle</div>
        <div className="abt-hero-tagline">修行无止境</div>
        <div className="abt-hero-version">v{APP_VERSION}</div>
      </div>

      {/* Team / contributors */}
      <section className="stg-section">
        <div className="stg-section-label stg-cinzel-label">Cultivators</div>
        <div className="stg-panel abt-team-card">
          {TEAM.map(person => (
            <div key={person.name} className="abt-team-row">
              <span className="abt-team-glyph" aria-hidden="true">{person.glyph}</span>
              <span className="abt-team-body">
                <div className="abt-team-name">{person.name}</div>
                <div className="abt-team-role">{person.role}</div>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Type — bundled fonts + licenses */}
      <section className="stg-section">
        <div className="stg-section-label stg-cinzel-label">Type</div>
        <div className="stg-panel">
          {FONTS.map(f => (
            <div key={f.name} className="abt-kv-row">
              <span className="abt-kv-key">{f.name}</span>
              <span className="abt-kv-val">
                {f.credit}
                {f.lic && <span className="abt-kv-lic">{f.lic}</span>}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Open-source acknowledgments */}
      <section className="stg-section">
        <div className="stg-section-label stg-cinzel-label">Open Source</div>
        <div className="stg-panel">
          {OSS.map(o => (
            <div key={o.name} className="abt-kv-row">
              <span className="abt-kv-key">{o.name}</span>
              <span className="abt-kv-val">
                {o.credit}
                {o.lic && <span className="abt-kv-lic">{o.lic}</span>}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* External links — contact, privacy, terms */}
      <section className="stg-section">
        <div className="stg-section-label stg-cinzel-label">Links</div>
        <div className="stg-action-list">
          {LINKS.map(link => (
            <button
              key={link.label}
              type="button"
              className="stg-action-row abt-link-row"
              onClick={() => openLink(link.href)}
              disabled={!link.href}
            >
              <span className="stg-action-icon">{link.icon}</span>
              <span className="stg-action-body">
                <span className="stg-action-label">{link.label}</span>
                <span className="stg-action-sub">{link.sub}</span>
              </span>
              <span className="stg-action-chevron">›</span>
            </button>
          ))}
        </div>
      </section>

      {/* Vermillion stamp footer */}
      <div className="abt-stamp">
        <div className="abt-stamp-mark" aria-hidden="true">印</div>
        <div className="abt-stamp-line">Built with patience · Claude Code</div>
      </div>
    </div>
  );
}

export default AboutScreen;
