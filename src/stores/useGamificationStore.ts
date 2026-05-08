/**
 * @file useGamificationStore.ts
 * @description XP/Level/Streak/Badges — server-authoritative.
 *              Cliente NUNCA calcula XP. Recebe via response do approve/deny.
 *              Optimistic events ficam em queue até reconciliar com server.
 * @story Sprint 1 / A3 (consumido em Sprint 2)
 * @agent @dev
 * @created 2026-05-08
 */
import { create } from 'zustand';

export type Rank = 'junior' | 'pleno' | 'senior' | 'master' | 'lendario';

export interface Badge {
  id: string;
  unlockedAt: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface OptimisticEvent {
  id: string;
  amount: number;
  reason: string;
  ts: number;
}

interface GamificationStore {
  totalXP: number;
  level: number;
  rank: Rank;
  streakDays: number;
  longestStreak: number;
  badges: Badge[];
  multiplier: number;
  optimisticEvents: OptimisticEvent[];
  loaded: boolean;

  // Mutations server-driven
  hydrate: (s: Partial<Omit<GamificationStore, 'optimisticEvents' | 'hydrate' | 'pushOptimistic' | 'reconcile' | 'reset'>>) => void;
  reconcile: (serverXp: { totalXP: number; level: number; rank: Rank }) => void;

  // Optimistic
  pushOptimistic: (e: Omit<OptimisticEvent, 'id' | 'ts'>) => string;
  removeOptimistic: (id: string) => void;

  reset: () => void;
}

const INITIAL = {
  totalXP: 0,
  level: 1,
  rank: 'junior' as Rank,
  streakDays: 0,
  longestStreak: 0,
  badges: [] as Badge[],
  multiplier: 1,
  optimisticEvents: [] as OptimisticEvent[],
  loaded: false,
};

export const useGamificationStore = create<GamificationStore>((set) => ({
  ...INITIAL,

  hydrate: (data) => set({ ...data, loaded: true }),

  reconcile: (server) =>
    set({
      totalXP: server.totalXP,
      level: server.level,
      rank: server.rank,
      optimisticEvents: [], // server é a fonte da verdade
    }),

  pushOptimistic: (e) => {
    const id = `opt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    set((s) => ({
      optimisticEvents: [...s.optimisticEvents, { ...e, id, ts: Date.now() }],
      totalXP: s.totalXP + e.amount, // mostra ganho instantâneo
    }));
    return id;
  },

  removeOptimistic: (id) =>
    set((s) => {
      const e = s.optimisticEvents.find((x) => x.id === id);
      if (!e) return s;
      return {
        optimisticEvents: s.optimisticEvents.filter((x) => x.id !== id),
        totalXP: s.totalXP - e.amount, // rollback se erro
      };
    }),

  reset: () => set(INITIAL),
}));
