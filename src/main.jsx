import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'

// Inline gate: Vite replaces import.meta.env.MODE and import.meta.env.DEV
// with string/boolean literals at build time, so this whole expression folds
// to `false` in every ship build (browser / native / steam / demo). Rollup
// then drops the unreachable dynamic imports and the entire dev-tool subtrees
// are tree-shaken out of the ship bundle.
//
// Must match the constants exported by src/designer/enabled.js and
// src/localizer/enabled.js.
const DESIGNER_ENABLED =
  import.meta.env.MODE === 'designer' ||
  (import.meta.env.DEV && import.meta.env.MODE !== 'native')

const LOCALIZER_ENABLED =
  import.meta.env.MODE === 'localizer' ||
  (import.meta.env.DEV && import.meta.env.MODE !== 'native')

document.addEventListener('contextmenu', e => {
  if (e.target.tagName === 'IMG') e.preventDefault();
});

/* ─── PWA auto-reload when service worker updates ────────────────────────
   iOS standalone PWA (added to home screen) caches aggressively. With
   vite-plugin-pwa configured as { registerType: 'autoUpdate',
   skipWaiting: true, clientsClaim: true }, a new SW activates as soon
   as it downloads - BUT the currently-rendered page is still showing
   the OLD HTML/CSS/JS from before the update. Without an explicit
   page reload, the user sees stale assets until they manually quit
   the PWA and relaunch.

   This listener detects when a new SW takes control of the page
   ('controllerchange' event) and triggers a soft reload so the new
   assets load. Safe for an idle game: all state lives in localStorage,
   so a reload loses zero progress. The `reloading` guard prevents
   reload loops on browsers where multiple controllerchange events
   fire during the SW activation handshake. */
if ('serviceWorker' in navigator) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}

const rootEl = document.getElementById('root')

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(e, info) { console.error('[ErrorBoundary]', e, info); }
  render() {
    if (this.state.error) {
      return <div style={{color:'red',padding:20,fontSize:14}}>
        <b>Render error:</b><br/>{String(this.state.error)}
      </div>;
    }
    return this.props.children;
  }
}

function mountApp() {
  import('./App.jsx')
    .then(({ default: App }) => {
      createRoot(rootEl).render(
        <StrictMode>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </StrictMode>
      )
    })
    .catch(e => {
      console.error('[mountApp] dynamic import failed:', e);
      rootEl.innerHTML = `<div style="color:red;padding:20px;font-size:14px"><b>Failed to load App:</b><br>${e}</div>`;
    });
}

const params = new URLSearchParams(window.location.search)

if (DESIGNER_ENABLED && params.has('designer')) {
  import('./designer/mount.jsx').then(({ mountDesigner }) => {
    mountDesigner(rootEl)
  })
} else if (LOCALIZER_ENABLED && params.has('locale')) {
  import('./localizer/mount.jsx').then(({ mountLocalizer }) => {
    mountLocalizer(rootEl)
  })
} else if (import.meta.env.DEV && params.has('particleEdit')) {
  // Dev-only: Qi particle path editor — access via /?particleEdit in dev server.
  // Tree-shaken out of every ship build because the condition is a build-time constant.
  import('./components/QiParticleEditor.jsx').then(({ default: QiParticleEditor }) => {
    createRoot(rootEl).render(
      <StrictMode><QiParticleEditor /></StrictMode>
    )
  })
} else {
  mountApp()
}
