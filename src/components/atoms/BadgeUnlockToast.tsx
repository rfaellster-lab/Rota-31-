/**
 * @file BadgeUnlockToast.tsx
 * @description Atom especial — toast custom de "achievement desbloqueado".
 *              Diferente do Toast genérico: gradiente por rarity, ícone trophy,
 *              animação de entrada (scale + fade).
 *              Chamado via useBadgeUnlocks() helper.
 * @story Sprint 2 P2 / BadgeUnlock UI
 * @agent @dev
 * @created 2026-05-12
 */
import { useEffect, useState, type FC } from 'react';
import { Trophy, Sparkles, X } from 'lucide-react';

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface UnlockedBadge {
  id: string;
  label: string;
  description: string;
  rarity: BadgeRarity;
}

interface BadgeUnlockToastProps {
  badge: UnlockedBadge;
  onDismiss: () => void;
}

const RARITY_STYLES: Record<BadgeRarity, { gradient: string; border: string; iconBg: string; glow: string }> = {
  common: {
    gradient: 'from-slate-50 to-slate-100',
    border: 'border-slate-300',
    iconBg: 'bg-slate-200',
    glow: '',
  },
  rare: {
    gradient: 'from-blue-50 to-blue-100',
    border: 'border-blue-300',
    iconBg: 'bg-blue-200',
    glow: 'shadow-blue-200',
  },
  epic: {
    gradient: 'from-purple-50 to-fuchsia-100',
    border: 'border-purple-300',
    iconBg: 'bg-purple-200',
    glow: 'shadow-purple-200',
  },
  legendary: {
    gradient: 'from-amber-50 via-orange-100 to-rose-100',
    border: 'border-amber-400',
    iconBg: 'bg-gradient-to-br from-amber-300 to-orange-400',
    glow: 'shadow-amber-300',
  },
};

export const BadgeUnlockToast: FC<BadgeUnlockToastProps> = ({ badge, onDismiss }) => {
  const cfg = RARITY_STYLES[badge.rarity];
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    const t = setTimeout(() => onDismiss(), 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      role="alert"
      className={[
        'pointer-events-auto relative flex w-full max-w-sm items-start gap-3 rounded-xl border-2 bg-gradient-to-br px-4 py-3 shadow-lg transition-all duration-300',
        cfg.gradient,
        cfg.border,
        cfg.glow,
        mounted ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0',
      ].join(' ')}
    >
      <div className={`shrink-0 rounded-full ${cfg.iconBg} p-2 ring-2 ring-white motion-reduce:animate-none`}>
        <Trophy className="h-5 w-5 text-slate-700" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <Sparkles className="h-3 w-3" aria-hidden />
          Conquista — {badge.rarity}
        </div>
        <div className="mt-0.5 text-sm font-bold text-slate-900">{badge.label}</div>
        <div className="text-xs text-slate-700">{badge.description}</div>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fechar"
        className="shrink-0 rounded p-0.5 text-slate-500 hover:bg-black/5 hover:text-slate-900"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
};
