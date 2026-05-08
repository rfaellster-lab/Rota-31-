/**
 * @file Toast.tsx
 * @description Atom Toast — substitui alert(). 4 níveis (info/success/warn/error).
 *              Acessível (role="status"/"alert"), auto-dismiss, animado, mobile-safe.
 * @story Sprint 1 / S1-01
 * @agent @dev
 * @created 2026-05-08
 */
import { useEffect, useState, type FC } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import type { Toast as ToastType } from '../../stores/useToastStore';

const LEVEL_CONFIG = {
  info: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-900 dark:text-blue-100',
    iconColor: 'text-blue-600 dark:text-blue-400',
    role: 'status' as const,
  },
  success: {
    icon: CheckCircle2,
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-900 dark:text-emerald-100',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    role: 'status' as const,
  },
  warn: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-900 dark:text-amber-100',
    iconColor: 'text-amber-600 dark:text-amber-400',
    role: 'alert' as const,
  },
  error: {
    icon: XCircle,
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800',
    text: 'text-rose-900 dark:text-rose-100',
    iconColor: 'text-rose-600 dark:text-rose-400',
    role: 'alert' as const,
  },
};

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

export const Toast: FC<ToastProps> = ({ toast, onDismiss }) => {
  const cfg = LEVEL_CONFIG[toast.level];
  const Icon = cfg.icon;
  const [exiting, setExiting] = useState(false);

  // Auto-dismiss
  useEffect(() => {
    if (toast.durationMs <= 0) return;
    const t = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(toast.id), 200);
    }, toast.durationMs);
    return () => clearTimeout(t);
  }, [toast.id, toast.durationMs, onDismiss]);

  return (
    <div
      role={cfg.role}
      aria-live={cfg.role === 'alert' ? 'assertive' : 'polite'}
      className={[
        'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm transition-all duration-200',
        cfg.bg,
        cfg.border,
        cfg.text,
        exiting ? 'translate-x-4 opacity-0' : 'translate-x-0 opacity-100',
      ].join(' ')}
    >
      <Icon className={`h-5 w-5 shrink-0 ${cfg.iconColor}`} aria-hidden />
      <div className="flex-1 text-sm">
        {toast.title && <div className="font-medium">{toast.title}</div>}
        <div className={toast.title ? 'opacity-90' : ''}>{toast.message}</div>
        {toast.action && (
          <button
            type="button"
            onClick={toast.action.onClick}
            className="mt-2 text-xs font-medium underline underline-offset-2 hover:opacity-80"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          setExiting(true);
          setTimeout(() => onDismiss(toast.id), 200);
        }}
        aria-label="Fechar notificação"
        className="shrink-0 rounded p-1 opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
};
