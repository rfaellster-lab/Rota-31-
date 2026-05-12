/**
 * @file XPBar.tsx
 * @description Atom XPBar — barra de progresso pra XP do nível atual.
 *              Mostra current / next, animação smooth via CSS transition.
 *              Respeita prefers-reduced-motion.
 * @story Sprint 2 / XP UI
 * @agent @dev
 * @created 2026-05-12
 */
import type { FC } from 'react';

interface XPBarProps {
  current: number; // XP atual dentro do level (não totalXP)
  total: number; // XP necessário pra próximo level
  level: number;
  className?: string;
  /** Variante de cor por rank */
  rankColor?: 'junior' | 'pleno' | 'senior' | 'master' | 'lendario';
}

const RANK_COLORS = {
  junior: 'from-slate-400 to-slate-500',
  pleno: 'from-blue-400 to-blue-600',
  senior: 'from-emerald-400 to-emerald-600',
  master: 'from-purple-500 to-purple-700',
  lendario: 'from-amber-400 via-orange-500 to-rose-500',
};

export const XPBar: FC<XPBarProps> = ({ current, total, level, className = '', rankColor = 'junior' }) => {
  const pct = Math.max(0, Math.min(100, (current / Math.max(1, total)) * 100));
  const gradient = RANK_COLORS[rankColor];

  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-slate-500 dark:text-slate-400">
        <span className="uppercase tracking-wide">Lv. {level}</span>
        <span>{current.toLocaleString('pt-BR')} / {total.toLocaleString('pt-BR')} XP</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progresso de nível: ${Math.round(pct)}%`}
          className={`h-full bg-gradient-to-r ${gradient} transition-all duration-500 ease-out motion-reduce:transition-none`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
