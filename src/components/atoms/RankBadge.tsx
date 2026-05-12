/**
 * @file RankBadge.tsx
 * @description Atom RankBadge — chip colorido com nome do rank.
 *              5 ranks: junior / pleno / senior / master / lendario.
 * @story Sprint 2 / XP UI
 * @agent @dev
 * @created 2026-05-12
 */
import type { FC } from 'react';

export type Rank = 'junior' | 'pleno' | 'senior' | 'master' | 'lendario';

interface RankBadgeProps {
  rank: Rank;
  size?: 'sm' | 'md';
  className?: string;
}

const RANK_CONFIG: Record<Rank, { label: string; bg: string; text: string; border: string }> = {
  junior: {
    label: 'Júnior',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
  },
  pleno: {
    label: 'Pleno',
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-300',
  },
  senior: {
    label: 'Sênior',
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
  },
  master: {
    label: 'Master',
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-300',
  },
  lendario: {
    label: 'Lendário',
    bg: 'bg-gradient-to-r from-amber-200 via-orange-200 to-rose-200',
    text: 'text-rose-900',
    border: 'border-amber-400',
  },
};

export const RankBadge: FC<RankBadgeProps> = ({ rank, size = 'md', className = '' }) => {
  const cfg = RANK_CONFIG[rank];
  const sizing = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';
  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold uppercase tracking-wide ${sizing} ${cfg.bg} ${cfg.text} ${cfg.border} ${className}`}
    >
      {cfg.label}
    </span>
  );
};
