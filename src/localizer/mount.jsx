import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Localizer from './Localizer.jsx';

/**
 * Mount the localizer panel into the app's root element. Called from main.jsx
 * when `?locale=1` is present AND LOCALIZER_ENABLED is true.
 *
 * The game's <App/> is NOT mounted — the localizer is its own isolated React
 * root with no game hooks, no save-loop side effects.
 */
export function mountLocalizer(rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <Localizer />
    </StrictMode>
  );
}
