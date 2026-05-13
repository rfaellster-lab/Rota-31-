/**
 * @file GamificationFX.tsx
 * @description Organism wrapper que monta efeitos visuais de gamificação:
 *              - Confetti (controlado pelo useConfettiStore)
 *              - ComboChip (controlado pelo useComboStore)
 *              Não renderiza nada se XP_ENABLED off.
 *
 * @story Sprint 3 P3 / FX wrappers
 * @agent @dev
 * @created 2026-05-13
 */
import type { FC } from 'react';
import { Confetti } from '../atoms/Confetti';
import { ComboChip } from '../atoms/ComboChip';
import { useConfettiStore } from '../../stores/useConfettiStore';
import { useFeatureFlags } from '../../stores/useFeatureFlags';

export const GamificationFX: FC = () => {
  const xpEnabled = useFeatureFlags((s) => s.flags.XP_ENABLED);
  const confettiActive = useConfettiStore((s) => s.active);
  const stop = useConfettiStore((s) => s.stop);

  if (!xpEnabled) return null;

  return (
    <>
      <ComboChip />
      {confettiActive && <Confetti onComplete={stop} />}
    </>
  );
};
