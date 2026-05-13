/**
 * @file useBadgeUnlockStore.ts
 * @description Fila de unlocks pra exibir BadgeUnlockToast.
 *              Disparado pelo InvoiceContext quando approve response traz newAchievements.
 * @story Sprint 2 P2 / Badge unlock state
 * @agent @dev
 * @created 2026-05-12
 */
import { create } from 'zustand';
import type { UnlockedBadge } from '../components/atoms/BadgeUnlockToast';

interface BadgeUnlockStore {
  queue: UnlockedBadge[];
  push: (badges: UnlockedBadge[]) => void;
  dismiss: (id: string) => void;
}

export const useBadgeUnlockStore = create<BadgeUnlockStore>((set) => ({
  queue: [],
  push: (badges) => set((s) => ({ queue: [...s.queue, ...badges].slice(0, 5) })),
  dismiss: (id) => set((s) => ({ queue: s.queue.filter((b) => b.id !== id) })),
}));
