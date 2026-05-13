/**
 * @file InsightCard.tsx
 * @description Atom InsightCard — card individual de insight com severity color,
 *              body, e CTA opcional. Botão dismiss no canto.
 * @story Sprint 2 P2 / Insights UI
 * @agent @dev
 * @created 2026-05-12
 */
import type { FC } from 'react';
import { AlertOctagon, AlertTriangle, Info, X, ArrowRight } from 'lucide-react';

export type InsightSeverity = 'info' | 'warning' | 'critical';

export interface InsightCardData {
  id: string;
  type: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  severity: InsightSeverity;
}

interface InsightCardProps {
  insight: InsightCardData;
  onDismiss?: (id: string) => void;
  onCta?: (url: string) => void;
}

const STYLES: Record<InsightSeverity, { bg: string; border: string; iconBg: string; iconColor: string; Icon: typeof Info }> = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    Icon: Info,
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
    Icon: AlertTriangle,
  },
  critical: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-700',
    Icon: AlertOctagon,
  },
};

export const InsightCard: FC<InsightCardProps> = ({ insight, onDismiss, onCta }) => {
  const cfg = STYLES[insight.severity];
  const Icon = cfg.Icon;

  return (
    <div
      className={`relative rounded-xl border ${cfg.border} ${cfg.bg} p-4 transition-shadow hover:shadow-md`}
    >
      <div className="flex items-start gap-3">
        <div className={`shrink-0 rounded-lg ${cfg.iconBg} p-2`}>
          <Icon className={`h-4 w-4 ${cfg.iconColor}`} aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{insight.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{insight.body}</p>
          {insight.ctaLabel && insight.ctaUrl && (
            <button
              type="button"
              onClick={() => onCta?.(insight.ctaUrl!)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-700 underline-offset-2 hover:underline"
            >
              {insight.ctaLabel}
              <ArrowRight className="h-3 w-3" aria-hidden />
            </button>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={() => onDismiss(insight.id)}
            aria-label="Dispensar"
            className="shrink-0 rounded p-1 text-slate-400 hover:bg-white/60 hover:text-slate-700"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
};
