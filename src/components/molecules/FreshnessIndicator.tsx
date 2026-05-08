/**
 * @file FreshnessIndicator.tsx
 * @description Mostra "atualizado há Xs/min/h" de forma humana, atualiza sozinho.
 *              Verde se < 60s, amarelo se < 5min, vermelho se > 5min (stale).
 *              Tem botão "atualizar agora" opcional.
 * @story Sprint 1 / S1-04
 * @agent @dev
 * @created 2026-05-08
 */
import { useEffect, useState, type FC } from 'react';
import { RefreshCw } from 'lucide-react';

interface FreshnessIndicatorProps {
  /** Timestamp ms do último refresh */
  lastUpdated: number | null;
  /** Callback quando usuário clica "atualizar agora" */
  onRefresh?: () => void;
  /** Esconde o botão refresh */
  hideRefresh?: boolean;
  /** Loading state do refresh */
  refreshing?: boolean;
  className?: string;
}

function humanize(diffSec: number): string {
  if (diffSec < 5) return 'agora mesmo';
  if (diffSec < 60) return `há ${Math.floor(diffSec)}s`;
  if (diffSec < 3600) return `há ${Math.floor(diffSec / 60)}min`;
  if (diffSec < 86400) return `há ${Math.floor(diffSec / 3600)}h`;
  return `há ${Math.floor(diffSec / 86400)}d`;
}

function freshnessColor(diffSec: number): string {
  if (diffSec < 60) return 'text-emerald-600 dark:text-emerald-400';
  if (diffSec < 300) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

export const FreshnessIndicator: FC<FreshnessIndicatorProps> = ({
  lastUpdated,
  onRefresh,
  hideRefresh = false,
  refreshing = false,
  className = '',
}) => {
  const [, tick] = useState(0);

  // re-render a cada 10s pra atualizar texto humanizado
  useEffect(() => {
    if (lastUpdated === null) return;
    const id = setInterval(() => tick((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  if (lastUpdated === null) {
    return (
      <span className={`text-xs text-slate-400 ${className}`}>
        ainda não atualizado
      </span>
    );
  }

  const diffSec = (Date.now() - lastUpdated) / 1000;
  const text = humanize(diffSec);
  const color = freshnessColor(diffSec);

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs ${className}`}>
      <span className={`size-2 rounded-full ${diffSec < 60 ? 'bg-emerald-500' : diffSec < 300 ? 'bg-amber-500' : 'bg-rose-500'}`} aria-hidden />
      <span className={color}>atualizado {text}</span>
      {!hideRefresh && onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Atualizar agora"
          className="ml-1 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
        </button>
      )}
    </div>
  );
};
