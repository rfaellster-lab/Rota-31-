/**
 * @file useUiStore.ts
 * @description UI state global (sidebar, density, theme). Light, sem persistência.
 * @story Sprint 1 / A3
 * @agent @dev
 * @created 2026-05-08
 */
import { create } from 'zustand';

export type Density = 'compact' | 'comfortable';
export type Theme = 'light' | 'dark' | 'system';

interface UiStore {
  sidebarCollapsed: boolean;
  density: Density;
  theme: Theme;

  toggleSidebar: () => void;
  setDensity: (d: Density) => void;
  setTheme: (t: Theme) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  sidebarCollapsed: false,
  density: 'comfortable',
  theme: 'system',

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setDensity: (density) => set({ density }),
  setTheme: (theme) => set({ theme }),
}));
