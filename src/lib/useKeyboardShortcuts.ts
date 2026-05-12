/**
 * @file useKeyboardShortcuts.ts
 * @description Hook genérico pra registrar atalhos de teclado.
 *              Respeita campos de input (não dispara se usuário está digitando).
 *              Suporta combos (Ctrl+K, etc) e teclas simples (A, N, /, Esc).
 * @story Sprint 1 / S1-03
 * @agent @dev
 * @created 2026-05-12
 */
import { useEffect } from 'react';

export interface Shortcut {
  /** Tecla principal ('a', 'n', 'Escape', 'ArrowDown', '/', etc) — case-insensitive pra letras */
  key: string;
  /** Modifiers obrigatórios (default: nenhum) */
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  /** Callback quando match */
  handler: (e: KeyboardEvent) => void;
  /** Se true, dispara MESMO quando usuário está digitando em input/textarea (default: false) */
  allowInInput?: boolean;
  /** Se true, ignora atalho (útil pra desabilitar temporariamente). Default false */
  disabled?: boolean;
  /** Descrição pra documentação/help overlay */
  description?: string;
}

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isTypingInForm(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (TYPING_TAGS.has(target.tagName)) return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const typing = isTypingInForm(e.target);
      for (const s of shortcuts) {
        if (s.disabled) continue;
        if (typing && !s.allowInInput) continue;

        // Normalize key comparison (case-insensitive pra letras)
        const matchKey =
          s.key.length === 1
            ? s.key.toLowerCase() === e.key.toLowerCase()
            : s.key === e.key;
        if (!matchKey) continue;

        // Modifiers — undefined = "não importa", true = obrigatório, false = NÃO pode ter
        if (s.ctrl !== undefined && s.ctrl !== (e.ctrlKey || e.metaKey)) continue;
        if (s.shift !== undefined && s.shift !== e.shiftKey) continue;
        if (s.alt !== undefined && s.alt !== e.altKey) continue;
        if (s.meta !== undefined && s.meta !== e.metaKey) continue;

        s.handler(e);
        break; // primeiro match wins
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
