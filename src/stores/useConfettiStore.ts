/**
 * @file useConfettiStore.ts
 * @description Flag global pra disparar confetti uma vez (level up, achievement legendary).
 *              Self-clearing: trigger() ativa por 3s, depois reseta.
 * @story Sprint 3 P3 / Confetti control
 * @agent @dev
 * @created 2026-05-13
 */
import { create } from 'zustand';

interface ConfettiStore {
  active: boolean;
  trigger: (durationMs?: number) => void;
  stop: () => void;
}

export const useConfettiStore = create<ConfettiStore>((set) => ({
  active: false,
  trigger: (durationMs = 3000) => {
    set({ active: true });
    setTimeout(() => set({ active: false }), durationMs);
  },
  stop: () => set({ active: false }),
}));
