import { useEffect } from 'react';

const AUTO_DISMISS_MS = 4000;

function Toast({ toast, onDismiss, onNavigate }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  function handleClick() {
    onNavigate(toast.targetScreen, toast.targetParam ?? null);
    onDismiss(toast.id);
  }

  return (
    <div className="toast" onClick={handleClick} role="button" tabIndex={0}>
      <span className="toast-message">{toast.message}</span>
      <span className="toast-cta">Go →</span>
    </div>
  );
}

function ToastStack({ toasts, onDismiss, onNavigate }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-stack">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

export default ToastStack;
