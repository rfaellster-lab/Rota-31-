/**
 * @file BadgeUnlockContainer.tsx
 * @description Organism que renderiza a fila de BadgeUnlockToast no canto inferior esquerdo.
 *              Posicionado oposto ao GamificationDock (que fica bottom-right).
 * @story Sprint 2 P2 / Badge unlocks UI
 * @agent @dev
 * @created 2026-05-12
 */
import type { FC } from 'react';
import { BadgeUnlockToast } from '../atoms/BadgeUnlockToast';
import { useBadgeUnlockStore } from '../../stores/useBadgeUnlockStore';

export const BadgeUnlockContainer: FC = () => {
  const queue = useBadgeUnlockStore((s) => s.queue);
  const dismiss = useBadgeUnlockStore((s) => s.dismiss);

  if (queue.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-4 z-[120] flex flex-col gap-2"
    >
      {queue.map((b) => (
        <BadgeUnlockToast key={b.id} badge={b} onDismiss={() => dismiss(b.id)} />
      ))}
    </div>
  );
};
