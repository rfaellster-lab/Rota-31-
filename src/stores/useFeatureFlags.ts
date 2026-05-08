/**
 * @file useFeatureFlags.ts
 * @description Feature flags do servidor. Cache 5min + fallback seguro (tudo false).
 * @story Sprint 1 / A3 (consumido por A4)
 * @agent @dev
 * @created 2026-05-08
 */
import { create } from 'zustand';

export interface FeatureFlags {
  XP_ENABLED: boolean;
  INSIGHTS_ENABLED: boolean;
  EXECUTIVE_DASHBOARD_ENABLED: boolean;
  STORE_ENABLED: boolean;
  ONBOARDING_TOUR_ENABLED: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  XP_ENABLED: false,
  INSIGHTS_ENABLED: false,
  EXECUTIVE_DASHBOARD_ENABLED: false,
  STORE_ENABLED: false,
  ONBOARDING_TOUR_ENABLED: false,
};

interface FlagsStore {
  flags: FeatureFlags;
  loaded: boolean;
  fetchedAt: number | null;
  setFlags: (flags: Partial<FeatureFlags>) => void;
  setLoaded: (v: boolean) => void;
  isFresh: () => boolean; // < 5 min
}

const TTL_MS = 5 * 60 * 1000;

export const useFeatureFlags = create<FlagsStore>((set, get) => ({
  flags: DEFAULT_FLAGS,
  loaded: false,
  fetchedAt: null,

  setFlags: (partial) =>
    set((s) => ({
      flags: { ...s.flags, ...partial },
      loaded: true,
      fetchedAt: Date.now(),
    })),

  setLoaded: (loaded) => set({ loaded }),

  isFresh: () => {
    const t = get().fetchedAt;
    return t !== null && Date.now() - t < TTL_MS;
  },
}));
