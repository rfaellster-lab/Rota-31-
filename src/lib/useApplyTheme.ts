/**
 * @file useApplyTheme.ts
 * @description Hook que aplica theme do useUiStore na html element.
 *              Themes: light / dark / system (segue prefers-color-scheme).
 *              Persiste em localStorage.
 *
 * @story Sprint 3 P4 / Dark mode
 * @agent @dev
 * @created 2026-05-13
 */
import { useEffect } from 'react';
import { useUiStore, type Theme } from '../stores/useUiStore';

const STORAGE_KEY = 'rota31:theme';

function detectSystemDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyHtmlClass(isDark: boolean): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
}

/**
 * Hook único — montar no App raiz uma vez. Aplica theme + escuta mudanças
 * do system theme se modo 'system'.
 */
export function useApplyTheme(): void {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  // Hydrate inicial do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        if (saved !== theme) setTheme(saved);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply + persist
  useEffect(() => {
    let isDark = theme === 'dark';
    if (theme === 'system') {
      isDark = detectSystemDark();
    }
    applyHtmlClass(isDark);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  // Escuta mudança do system theme se modo 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => applyHtmlClass(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);
}
