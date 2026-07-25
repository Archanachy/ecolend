// Promise-based confirmation dialog (v2). Replaces window.confirm entirely:
// non-blocking, themeable, keyboard-accessible (Esc cancels, focus moves into
// the dialog) and consistent with the rest of the design system.
//
// Usage:  const confirm = useConfirm();
//         if (!(await confirm({ title, message, confirmLabel, danger }))) return;
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);
  const confirmBtnRef = useRef(null);

  const confirm = useCallback((options) => {
    const opts = typeof options === 'string' ? { message: options } : options || {};
    // If a dialog is somehow already open, settle its promise as "cancelled"
    // before replacing the resolver — otherwise that caller's await never
    // resolves and the calling code hangs forever.
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
    setDialog({
      title: opts.title || 'Are you sure?',
      message: opts.message || '',
      confirmLabel: opts.confirmLabel || 'Confirm',
      cancelLabel: opts.cancelLabel || 'Cancel',
      danger: Boolean(opts.danger),
    });
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = useCallback((result) => {
    setDialog(null);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  // Esc cancels; focus the primary action when the dialog opens.
  useEffect(() => {
    if (!dialog) return undefined;
    confirmBtnRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') settle(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dialog, settle]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && settle(false)}
          role="presentation"
        >
          <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
            <h2 id="confirm-title">{dialog.title}</h2>
            {dialog.message && <p>{dialog.message}</p>}
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => settle(false)}>
                {dialog.cancelLabel}
              </button>
              <button
                type="button"
                ref={confirmBtnRef}
                className={dialog.danger ? 'btn-danger' : ''}
                onClick={() => settle(true)}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}
