/**
 * @file useComboTracker.ts
 * @description Hook que detecta combo de aprovações consecutivas (em 60s).
 *              Dispara visual toast quando combo >= 3.
 *              Tom Talita: motivacional, sem ser infantil.
 *
 *              Combos:
 *              - 3x em 60s     → "Combo 3x"
 *              - 5x em 60s     → "Em alta! Combo 5x"
 *              - 10x em 60s    → "Ritmo insano! Combo 10x"
 *              Reseta após 60s sem nova aprovação.
 *
 * @story Sprint 3 P2 / Combo visual
 * @agent @dev
 * @created 2026-05-13
 */
import { create } from 'zustand';
import { useEffect } from 'react';
import { useToast } from '../stores/useToastStore';

const COMBO_WINDOW_MS = 60_000;

interface ComboStore {
  count: number;
  lastTs: number;
  comboMilestonesShown: Set<number>;
  bump: () => number;
  reset: () => void;
}

export const useComboStore = create<ComboStore>((set) => ({
  count: 0,
  lastTs: 0,
  comboMilestonesShown: new Set(),
  bump: () => {
    let newCount = 0;
    set((s) => {
      const now = Date.now();
      const expired = now - s.lastTs > COMBO_WINDOW_MS;
      newCount = expired ? 1 : s.count + 1;
      return {
        count: newCount,
        lastTs: now,
        comboMilestonesShown: expired ? new Set<number>() : s.comboMilestonesShown,
      };
    });
    return newCount;
  },
  reset: () => set({ count: 0, lastTs: 0, comboMilestonesShown: new Set() }),
}));

/**
 * Helper pra disparar visual de combo. Chamado pelo InvoiceContext após approve.
 */
export function notifyComboBump(toastFn: ReturnType<typeof useToast>): void {
  const newCount = useComboStore.getState().bump();
  const shown = useComboStore.getState().comboMilestonesShown;

  // Milestones que disparam visual: 3, 5, 10, 20, 50
  const milestones = [3, 5, 10, 20, 50];
  for (const m of milestones) {
    if (newCount === m && !shown.has(m)) {
      shown.add(m);
      const label =
        m === 3 ? 'Combo 3x' :
        m === 5 ? 'Em alta! Combo 5x' :
        m === 10 ? 'Ritmo insano! Combo 10x' :
        m === 20 ? 'Beast mode! Combo 20x' :
        'Lenda viva! Combo 50x';
      toastFn.success(label, { title: '⚡ Sequência', durationMs: 3000 });
      break;
    }
  }
}

/**
 * Hook que dá reset automático após COMBO_WINDOW_MS de inatividade.
 * Pra usar como cleanup no Dashboard.
 */
export function useComboCleanup(): void {
  const lastTs = useComboStore((s) => s.lastTs);
  const reset = useComboStore((s) => s.reset);

  useEffect(() => {
    if (lastTs === 0) return;
    const remaining = COMBO_WINDOW_MS - (Date.now() - lastTs);
    if (remaining <= 0) {
      reset();
      return;
    }
    const id = setTimeout(reset, remaining + 100);
    return () => clearTimeout(id);
  }, [lastTs, reset]);
}
