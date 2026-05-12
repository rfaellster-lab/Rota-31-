/**
 * @file KeyboardShortcutsHelp.tsx
 * @description Modal de help dos atalhos (abre com '?' ou Shift+/, fecha com Esc).
 *              Mostra lista de atalhos disponíveis no contexto atual.
 * @story Sprint 1 / S1-03
 * @agent @dev
 * @created 2026-05-12
 */
import type { FC } from 'react';
import { X } from 'lucide-react';
import { Kbd } from '../atoms/Kbd';

export interface ShortcutDoc {
  keys: string[]; // ex: ['Ctrl', 'K']
  description: string;
}

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
  shortcuts: ShortcutDoc[];
}

export const KeyboardShortcutsHelp: FC<KeyboardShortcutsHelpProps> = ({
  open,
  onClose,
  shortcuts,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kbd-help-title"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="kbd-help-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Atalhos de teclado
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <ul className="space-y-2 text-sm">
          {shortcuts.map((s, idx) => (
            <li key={idx} className="flex items-center justify-between gap-3">
              <span className="text-slate-700 dark:text-slate-300">{s.description}</span>
              <span className="flex shrink-0 items-center gap-1">
                {s.keys.map((k, i) => (
                  <span key={i} className="inline-flex items-center gap-1">
                    {i > 0 && <span className="text-xs text-slate-400">+</span>}
                    <Kbd>{k}</Kbd>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs text-slate-400">
          Pressione <Kbd>Esc</Kbd> ou clique fora para fechar.
        </p>
      </div>
    </div>
  );
};
