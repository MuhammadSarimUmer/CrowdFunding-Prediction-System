import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastVariant, string> = {
  success: 'check_circle',
  error: 'error',
  info: 'info',
};

const STYLES: Record<ToastVariant, string> = {
  success: 'border-brand/20 bg-white text-house',
  error: 'border-danger/20 bg-white text-danger',
  info: 'border-outline/20 bg-white text-house',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, number>>(new Map());

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setItems((current) => [...current.slice(-3), { id, message, variant }]);
      const timer = window.setTimeout(() => dismiss(id), 4500);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
    },
    [],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (message: string) => toast(message, 'success'),
      error: (message: string) => toast(message, 'error'),
      info: (message: string) => toast(message, 'info'),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2"
        aria-live="polite"
        aria-atomic="true"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-card border px-4 py-3 shadow-lift animate-fade-up ${STYLES[item.variant]}`}
            role={item.variant === 'error' ? 'alert' : 'status'}
          >
            <span
              className={`material-symbols-outlined mt-0.5 text-[20px] ${
                item.variant === 'success' ? 'text-brand' : item.variant === 'error' ? 'text-danger' : 'text-outline'
              }`}
              aria-hidden="true"
            >
              {ICONS[item.variant]}
            </span>
            <p className="flex-1 text-body-sm font-medium">{item.message}</p>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="rounded-full p-1 text-muted transition hover:bg-surface-container hover:text-ink"
              aria-label="Dismiss notification"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                close
              </span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
