import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export type ToastType = 'error' | 'success' | 'warning';

export type ToastState = {
  visible: boolean;
  message: string;
  type: ToastType;
  duration: number;
  /** Monotonically increasing id so the Toast component can detect new toasts
   *  even when the same message is shown twice in a row. */
  id: number;
};

type ToastContextType = {
  toastState: ToastState;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: () => void;
};

const INITIAL_STATE: ToastState = {
  visible: false,
  message: '',
  type: 'error',
  duration: 4000,
  id: 0,
};

// ── Context ────────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toastState, setToastState] = useState<ToastState>(INITIAL_STATE);
  const idRef = useRef(0);

  const showToast = useCallback(
    (message: string, type: ToastType = 'error', duration: number = 4000) => {
      idRef.current += 1;
      setToastState({
        visible: true,
        message,
        type,
        duration,
        id: idRef.current,
      });
    },
    [],
  );

  const hideToast = useCallback(() => {
    setToastState((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ toastState, showToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
