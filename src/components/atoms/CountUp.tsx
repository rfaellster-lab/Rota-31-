/**
 * @file CountUp.tsx
 * @description Atom CountUp — anima número de A para B em ~600ms.
 *              Respeita prefers-reduced-motion (snap direto).
 * @story Sprint 2 / XP UI
 * @agent @dev
 * @created 2026-05-12
 */
import { useEffect, useRef, useState, type FC } from 'react';

interface CountUpProps {
  /** Valor alvo */
  value: number;
  /** Duração da animação em ms (default 600) */
  durationMs?: number;
  /** Formatar (default: pt-BR sem decimais) */
  format?: (v: number) => string;
  className?: string;
}

const defaultFormat = (v: number) => new Intl.NumberFormat('pt-BR').format(Math.round(v));

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const CountUp: FC<CountUpProps> = ({ value, durationMs = 600, format = defaultFormat, className = '' }) => {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (to - from) * eased;
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
        setDisplay(to);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs]);

  return <span className={className}>{format(display)}</span>;
};
