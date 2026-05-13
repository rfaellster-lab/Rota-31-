/**
 * @file StreakIndicator.tsx
 * @description Atom StreakIndicator — chama flame + dias + status.
 *              States: cold (0-2d gray), warm (3-6d orange), hot (7+d red+pulse).
 *              Aviso "em risco" se streak ativo mas > 18h sem ação (visual hint).
 *
 * @story Sprint 3 P2 / Streak visual
 * @agent @dev
 * @created 2026-05-13
 */
import type { FC } from 'react';
import { Flame } from 'lucide-react';

interface StreakIndicatorProps {
  days: number;
  /** Última ação em ISO (opcional) — usada pra mostrar aviso de risco */
  lastActionAt?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: { icon: 'h-3 w-3', text: 'text-xs', container: 'gap-1' },
  md: { icon: 'h-4 w-4', text: 'text-sm', container: 'gap-1.5' },
  lg: { icon: 'h-5 w-5', text: 'text-base font-bold', container: 'gap-2' },
};

function temperature(days: number): {
  level: 'cold' | 'warm' | 'hot' | 'inferno';
  iconColor: string;
  bg: string;
  text: string;
} {
  if (days === 0) {
    return { level: 'cold', iconColor: 'text-slate-300', bg: 'bg-slate-50', text: 'text-slate-400' };
  }
  if (days < 3) {
    return { level: 'cold', iconColor: 'text-slate-500', bg: 'bg-slate-100', text: 'text-slate-700' };
  }
  if (days < 7) {
    return { level: 'warm', iconColor: 'text-orange-500', bg: 'bg-orange-50', text: 'text-orange-700' };
  }
  if (days < 30) {
    return { level: 'hot', iconColor: 'text-rose-500', bg: 'bg-rose-50', text: 'text-rose-700' };
  }
  return { level: 'inferno', iconColor: 'text-amber-500', bg: 'bg-gradient-to-r from-amber-50 to-rose-50', text: 'text-rose-900' };
}

export const StreakIndicator: FC<StreakIndicatorProps> = ({ days, lastActionAt, className = '', size = 'md' }) => {
  const t = temperature(days);
  const sz = SIZE_CLASSES[size];
  // Risco: streak ativo (>= 1) + última ação > 18h atrás (sinal de loss aversion)
  let atRisk = false;
  if (days >= 1 && lastActionAt) {
    const hoursSince = (Date.now() - new Date(lastActionAt).getTime()) / 3600_000;
    atRisk = hoursSince >= 18 && hoursSince < 30;
  }

  return (
    <span
      role="status"
      aria-label={`Streak ${days} dias${atRisk ? ' (em risco)' : ''}`}
      className={`inline-flex items-center rounded-full px-2 py-0.5 ${sz.container} ${t.bg} ${atRisk ? 'animate-pulse motion-reduce:animate-none' : ''} ${className}`}
    >
      <Flame className={`${sz.icon} ${t.iconColor} ${t.level === 'hot' || t.level === 'inferno' ? 'animate-pulse motion-reduce:animate-none' : ''}`} aria-hidden />
      <span className={`${sz.text} ${t.text}`}>
        {days}d
        {atRisk && <span className="ml-1 text-[10px] opacity-70">!</span>}
      </span>
    </span>
  );
};
