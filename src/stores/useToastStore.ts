/**
 * @file useToastStore.ts
 * @description Sistema de toasts (substitui alert()). API: useToast().success(msg).
 *              Auto-dismiss após 4s (configurável). Max 5 simultâneos.
 * @story Sprint 1 / S1-01
 * @agent @dev
 * @created 2026-05-08
 */
import { create } from 'zustand';

export type ToastLevel = 'info' | 'success' | 'warn' | 'error';

export interface Toast {
  id: string;
  level: ToastLevel;
  title?: string;
  message: string;
  durationMs: number;
  action?: { label: string; onClick: () => void };
}

interface ToastStore {
  items: Toast[];
  push: (t: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const MAX_TOASTS = 5;

export const useToastStore = create<ToastStore>((set) => ({
  items: [],

  push: (t) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const item: Toast = { ...t, id };
    set((s) => ({
      items: [item, ...s.items].slice(0, MAX_TOASTS),
    }));
    return id;
  },

  dismiss: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

  clear: () => set({ items: [] }),
}));

// Hook ergonômico — uso: const toast = useToast(); toast.success('Salvo!')
export function useToast() {
  const push = useToastStore((s) => s.push);
  const dismiss = useToastStore((s) => s.dismiss);

  return {
    info: (message: string, opts?: Partial<Toast>) =>
      push({ level: 'info', message, durationMs: 4000, ...opts }),
    success: (message: string, opts?: Partial<Toast>) =>
      push({ level: 'success', message, durationMs: 4000, ...opts }),
    warn: (message: string, opts?: Partial<Toast>) =>
      push({ level: 'warn', message, durationMs: 5000, ...opts }),
    error: (message: string, opts?: Partial<Toast>) =>
      push({ level: 'error', message, durationMs: 6000, ...opts }),
    dismiss,
  };
}
