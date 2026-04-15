import { StrictMode } from 'react'
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

const rootEl = document.getElementById('root')

function mountApp() {
  import('./App.jsx').then(({ default: App }) => {
    createRoot(rootEl).render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  })
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
} else {
  mountApp()
}
