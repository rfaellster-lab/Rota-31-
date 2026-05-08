/**
 * @file EmptyState.tsx
 * @description Empty state com personalidade — mostra ícone, título, descrição e CTA.
 *              Tom: profissional + leve toque humano (não infantil).
 *              Variantes pré-definidas pra Talita: noPending, noResults, noHistory, error.
 * @story Sprint 1 / S1-08
 * @agent @dev
 * @created 2026-05-08
 */
import type { FC, ReactNode } from 'react';
import { Inbox, SearchX, History as HistoryIcon, AlertOctagon, CheckCircle2, type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: 'default' | 'success' | 'error';
  className?: string;
}

const VARIANT_STYLES = {
  default: {
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    iconColor: 'text-slate-400 dark:text-slate-500',
  },
  success: {
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    iconColor: 'text-emerald-500 dark:text-emerald-400',
  },
  error: {
    iconBg: 'bg-rose-50 dark:bg-rose-950/40',
    iconColor: 'text-rose-500 dark:text-rose-400',
  },
};

export const EmptyState: FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  variant = 'default',
  className = '',
}) => {
  const styles = VARIANT_STYLES[variant];
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
      <div className={`mb-4 rounded-full p-4 ${styles.iconBg}`}>
        <Icon className={`h-8 w-8 ${styles.iconColor}`} aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

// Empty states pré-definidos (tom Talita: profissional, prestativo, sem infantilizar)
export const EmptyStatePresets = {
  noPendingApprovals: () => ({
    icon: CheckCircle2 as LucideIcon,
    title: 'Tudo aprovado por aqui',
    description: 'Nenhuma nota pendente no momento. Bom trabalho!',
    variant: 'success' as const,
  }),
  noSearchResults: (term?: string) => ({
    icon: SearchX as LucideIcon,
    title: 'Nada encontrado',
    description: term
      ? `Não achamos nenhum resultado para "${term}". Tente uma busca diferente.`
      : 'Tente ajustar os filtros pra encontrar o que procura.',
  }),
  noHistory: () => ({
    icon: HistoryIcon as LucideIcon,
    title: 'Histórico vazio neste período',
    description: 'Mude o intervalo de datas no topo pra ver outras notas.',
  }),
  errorLoading: (retryAction?: ReactNode) => ({
    icon: AlertOctagon as LucideIcon,
    title: 'Não conseguimos carregar agora',
    description: 'Pode ser instabilidade temporária. Tente atualizar.',
    variant: 'error' as const,
    action: retryAction,
  }),
};
