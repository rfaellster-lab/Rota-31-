/**
 * @file Confetti.tsx
 * @description Atom Confetti — micro-animação de partículas caindo no level up.
 *              CSS-only, sem libs externas. Respeita prefers-reduced-motion.
 * @story Sprint 3 P3 / Confetti
 * @agent @dev
 * @created 2026-05-13
 */
import { useEffect, useMemo, useState, type FC } from 'react';

interface ConfettiProps {
  /** Quantidade de partículas (default 30) */
  count?: number;
  /** Duração total em ms (default 3000) */
  durationMs?: number;
  onComplete?: () => void;
}

const COLORS = ['#F26522', '#FBBF24', '#10B981', '#3B82F6', '#A855F7', '#EC4899'];

interface Particle {
  id: number;
  x: number;
  delay: number;
  duration: number;
  color: string;
  rotation: number;
}

export const Confetti: FC<ConfettiProps> = ({ count = 30, durationMs = 3000, onComplete }) => {
  const [active, setActive] = useState(true);

  const particles: Particle[] = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 500,
      duration: 1500 + Math.random() * 1500,
      color: COLORS[i % COLORS.length],
      rotation: Math.random() * 360,
    }));
  }, [count]);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setActive(false);
      onComplete?.();
      return;
    }
    const t = setTimeout(() => {
      setActive(false);
      onComplete?.();
    }, durationMs);
    return () => clearTimeout(t);
  }, [durationMs, onComplete]);

  if (!active) return null;

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[300] overflow-hidden"
      >
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute block h-2 w-2"
            style={{
              left: `${p.x}%`,
              top: '-2vh',
              backgroundColor: p.color,
              transform: `rotate(${p.rotation}deg)`,
              animation: `confettiFall ${p.duration}ms ease-in ${p.delay}ms forwards`,
            }}
          />
        ))}
      </div>
    </>
  );
};
