/**
 * @file Kbd.tsx
 * @description Atom Kbd — renderiza uma tecla com estilo de teclado (ex: <kbd>A</kbd>).
 * @story Sprint 1 / S1-03
 * @agent @dev
 * @created 2026-05-12
 */
import type { FC, ReactNode } from 'react';

interface KbdProps {
  children: ReactNode;
  className?: string;
}

export const Kbd: FC<KbdProps> = ({ children, className = '' }) => (
  <kbd
    className={`inline-flex min-w-[1.5rem] items-center justify-center rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 ${className}`}
  >
    {children}
  </kbd>
);
