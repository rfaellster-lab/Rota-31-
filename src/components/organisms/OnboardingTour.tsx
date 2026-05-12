/**
 * @file OnboardingTour.tsx
 * @description Tour de onboarding para apresentar as features novas do Sprint 1
 *              (toasts, freshness, quick filters, atalhos, bulk approve).
 *              Só dispara na primeira visita pós-Sprint 1. Talita pode dispensar.
 *              Tom: profissional, sem infantilizar (regra do tom Talita).
 * @story Sprint 1 / S1-09
 * @agent @dev
 * @created 2026-05-12
 */
import { useEffect, useState, type FC } from 'react';
import { Joyride, STATUS, type Step } from 'react-joyride';
import { useFeatureFlags } from '../../stores/useFeatureFlags';

// react-joyride 3.x types não exportam mais props comuns como showProgress.
// Cast pra any pra contornar — funciona em runtime.
const JoyrideAny = Joyride as unknown as FC<Record<string, unknown>>;

type JoyrideStatus = (typeof STATUS)[keyof typeof STATUS];

const TOUR_VERSION = 'sprint-1-2026-05';
const STORAGE_KEY = `rota31:onboarding:${TOUR_VERSION}`;

const STEPS: Step[] = [
  {
    target: 'body',
    placement: 'center',
    title: 'Bem-vinda à versão nova',
    content:
      'Algumas coisas mudaram pra agilizar o seu dia. Vou mostrar o essencial em 30 segundos.',
  },
  {
    target: '[data-tour="quick-filters"]',
    title: 'Filtros rápidos',
    content:
      'Clique nos chips coloridos pra filtrar a lista por status. Os números mostram quantas notas estão em cada categoria — atualiza em tempo real.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="freshness"]',
    title: 'Quando foi a última atualização',
    content:
      'Aqui você vê se os dados estão fresquinhos. Verde = atualizado agora, vermelho = passou muito tempo. Clique no ícone pra forçar refresh.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="search"]',
    title: 'Atalhos de teclado',
    content:
      'Aperte / pra focar a busca. J/K pra navegar a lista. A pra aprovar, N pra negar. Shift+? mostra todos.',
    placement: 'bottom',
  },
  {
    target: 'body',
    placement: 'center',
    title: 'Pronto!',
    content:
      'Se algo travar ou aparecer um banner vermelho no topo, me avisa. Pode fechar e voltar ao trabalho.',
  },
];

export const OnboardingTour: FC = () => {
  const [run, setRun] = useState(false);
  const tourFlagEnabled = useFeatureFlags((s) => s.flags.ONBOARDING_TOUR_ENABLED);

  useEffect(() => {
    if (!tourFlagEnabled) return; // controle por feature flag
    if (typeof window === 'undefined') return;
    const dismissed = localStorage.getItem(STORAGE_KEY) === 'done';
    if (dismissed) return;
    // Pequeno delay pra DOM estabilizar (selectors precisam estar mounted)
    const t = setTimeout(() => setRun(true), 800);
    return () => clearTimeout(t);
  }, [tourFlagEnabled]);

  const handleCallback = (data: { status: JoyrideStatus }) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      try {
        localStorage.setItem(STORAGE_KEY, 'done');
      } catch {}
      setRun(false);
    }
  };

  if (!run) return null;

  return (
    <JoyrideAny
      steps={STEPS}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleCallback}
      locale={{
        back: 'Voltar',
        close: 'Fechar',
        last: 'Concluir',
        next: 'Próximo',
        skip: 'Pular',
      }}
      styles={{
        tooltip: {
          fontSize: 14,
          borderRadius: 12,
        },
        tooltipTitle: {
          fontSize: 16,
          fontWeight: 600,
        },
      }}
    />
  );
};
