/**
 * @file ComboChip.tsx
 * @description Atom ComboChip — mostra "Combo Nx" durante streak ativo
 *              (count >= 3 + lastTs dentro de 60s). Some sozinho após expirar.
 *              Posicionado fixed top-right, abaixo do FreshnessIndicator.
 * @story Sprint 3 P3 / Combo visual
 * @agent @dev
 * @created 2026-05-13
 */
import { useEffect, useState, type FC } from 'react';
import { Zap } from 'lucide-react';
import { useComboStore } from '../../lib/useComboTracker';
import { useComboCleanup } from '../../lib/useComboTracker';

const VISIBLE_THRESHOLD = 3;
const COMBO_WINDOW_MS = 60_000;

export const ComboChip: FC = () => {
  useComboCleanup();
  const count = useComboStore((s) => s.count);
  const lastTs = useComboStore((s) => s.lastTs);
  const [remainingPct, setRemainingPct] = useState(100);

  useEffect(() => {
    if (count < VISIBLE_THRESHOLD || lastTs === 0) return;
    const tick = () => {
      const elapsed = Date.now() - lastTs;
      const pct = Math.max(0, 1 - elapsed / COMBO_WINDOW_MS) * 100;
      setRemainingPct(pct);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [count, lastTs]);

  if (count < VISIBLE_THRESHOLD) return null;

  const colorClass =
    count >= 50 ? 'from-amber-400 via-rose-500 to-purple-600' :
    count >= 20 ? 'from-purple-500 to-pink-500' :
    count >= 10 ? 'from-orange-500 to-rose-500' :
    count >= 5 ? 'from-amber-400 to-orange-500' :
    'from-yellow-400 to-amber-500';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-20 right-4 z-40 hidden sm:block"
    >
      <div className={`inline-flex flex-col items-center rounded-full bg-gradient-to-r ${colorClass} px-3 py-1.5 shadow-lg`}>
        <div className="flex items-center gap-1.5 text-white">
          <Zap className="h-4 w-4 animate-pulse motion-reduce:animate-none" aria-hidden fill="white" />
          <span className="text-sm font-bold tabular-nums">Combo {count}x</span>
        </div>
        <div className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-white/30">
          <div
            className="h-full bg-white transition-all duration-500 motion-reduce:transition-none"
            style={{ width: `${remainingPct}%` }}
          />
        </div>
      </div>
    </div>
  );
};
