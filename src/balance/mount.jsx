import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import BalanceDashboard from './BalanceDashboard.jsx';

/**
 * Mount the Balance Dashboard into the app's root element. Called from main.jsx
 * when `?balance` is present AND DESIGNER_ENABLED is true (dev / designer build).
 *
 * Like the designer, the game's <App/> is NOT mounted in this branch — the
 * dashboard is its own React root with no game hooks and no save-loop side
 * effects, so balancing never touches the player's localStorage save.
 */
export function mountBalance(rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <BalanceDashboard />
    </StrictMode>
  );
}
