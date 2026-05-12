/**
 * @file QuickFilterBar.tsx
 * @description Quick filter chips horizontais — atalhos pra filtros frequentes.
 *              Cada chip aplica um preset combinado de (statusFilter, pagadorFilter, searchTerm).
 *              Mostra contagem do que cada chip retornaria.
 * @story Sprint 1 / S1-05
 * @agent @dev
 * @created 2026-05-12
 */
import type { FC } from 'react';
import { Clock, AlertTriangle, CheckCircle2, XCircle, Layers } from 'lucide-react';

export interface QuickFilterPreset {
  id: string;
  label: string;
  count: number;
  icon?: typeof Clock;
  color?: 'orange' | 'amber' | 'emerald' | 'rose' | 'slate';
  active?: boolean;
}

export interface QuickFilterBarProps {
  filters: QuickFilterPreset[];
  onSelect: (id: string) => void;
  className?: string;
}

const COLOR_CLASSES = {
  orange: {
    active: 'bg-orange-500 text-white border-orange-500',
    inactive: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
    badge: 'bg-orange-200 text-orange-900',
    badgeActive: 'bg-white/25',
  },
  amber: {
    active: 'bg-amber-500 text-white border-amber-500',
    inactive: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    badge: 'bg-amber-200 text-amber-900',
    badgeActive: 'bg-white/25',
  },
  emerald: {
    active: 'bg-emerald-500 text-white border-emerald-500',
    inactive: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    badge: 'bg-emerald-200 text-emerald-900',
    badgeActive: 'bg-white/25',
  },
  rose: {
    active: 'bg-rose-500 text-white border-rose-500',
    inactive: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
    badge: 'bg-rose-200 text-rose-900',
    badgeActive: 'bg-white/25',
  },
  slate: {
    active: 'bg-slate-700 text-white border-slate-700',
    inactive: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
    badge: 'bg-slate-200 text-slate-900',
    badgeActive: 'bg-white/25',
  },
};

export const QuickFilterBar: FC<QuickFilterBarProps> = ({ filters, onSelect, className = '' }) => {
  return (
    <div
      role="toolbar"
      aria-label="Filtros rápidos"
      className={`flex flex-wrap items-center gap-2 ${className}`}
    >
      {filters.map((f) => {
        const colors = COLOR_CLASSES[f.color || 'slate'];
        const Icon = f.icon;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onSelect(f.id)}
            aria-pressed={!!f.active}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              f.active ? colors.active : colors.inactive
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
            <span>{f.label}</span>
            <span
              className={`ml-1 inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                f.active ? colors.badgeActive : colors.badge
              }`}
            >
              {f.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// Re-export icons pra Dashboard usar
export { Clock, AlertTriangle, CheckCircle2, XCircle, Layers };
