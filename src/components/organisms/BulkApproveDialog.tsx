/**
 * @file BulkApproveDialog.tsx
 * @description Modal de confirmação pra bulk approve inteligente.
 *              Mostra: total, valor total, quantas têm alerta, opção de
 *              excluir alertas automaticamente. Confirma antes de disparar.
 * @story Sprint 1 / S1-06
 * @agent @dev
 * @created 2026-05-12
 */
import { useMemo, useState, type FC } from 'react';
import { AlertTriangle, CheckCircle2, X, Loader2 } from 'lucide-react';
import type { Invoice } from '../../types';
import { Kbd } from '../atoms/Kbd';

interface BulkApproveDialogProps {
  open: boolean;
  invoices: Invoice[]; // todas selecionadas
  onClose: () => void;
  onConfirm: (idsToApprove: string[]) => Promise<void>;
}

function formatMoney(v: number | undefined | null): string {
  if (!v && v !== 0) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export const BulkApproveDialog: FC<BulkApproveDialogProps> = ({
  open,
  invoices,
  onClose,
  onConfirm,
}) => {
  const [excludeAlerted, setExcludeAlerted] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Particionar: com alerta vs sem alerta
  const { withAlert, withoutAlert, totalValue, totalToApprove } = useMemo(() => {
    const withAlert: Invoice[] = [];
    const withoutAlert: Invoice[] = [];
    let totalValue = 0;
    for (const inv of invoices) {
      const hasAlert =
        !!inv.temAlerta || (inv.motivosAlerta && inv.motivosAlerta.length > 0);
      if (hasAlert) withAlert.push(inv);
      else withoutAlert.push(inv);
      totalValue += inv.valorFrete || 0;
    }
    const totalToApprove = excludeAlerted ? withoutAlert.length : invoices.length;
    return { withAlert, withoutAlert, totalValue, totalToApprove };
  }, [invoices, excludeAlerted]);

  if (!open) return null;

  const handleConfirm = async () => {
    setProcessing(true);
    try {
      const ids = excludeAlerted
        ? withoutAlert.map((i) => i.id)
        : invoices.map((i) => i.id);
      await onConfirm(ids);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-approve-title"
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={processing ? undefined : onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-100 p-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
            </div>
            <div>
              <h2 id="bulk-approve-title" className="text-base font-semibold text-slate-900">
                Aprovar {totalToApprove} {totalToApprove === 1 ? 'nota' : 'notas'} em lote
              </h2>
              <p className="text-xs text-slate-500">
                Confirme antes de disparar a operação. Não pode ser desfeito.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            aria-label="Fechar"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3 px-6 py-4">
          {/* Resumo */}
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Selecionadas</div>
              <div className="font-semibold text-slate-900">{invoices.length} notas</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Valor de frete total</div>
              <div className="font-semibold text-slate-900">{formatMoney(totalValue)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Sem alerta</div>
              <div className="font-semibold text-emerald-700">{withoutAlert.length} OK</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Com alerta</div>
              <div className="font-semibold text-amber-700">
                {withAlert.length} {withAlert.length === 1 ? 'precisa atenção' : 'precisam atenção'}
              </div>
            </div>
          </div>

          {/* Alertas detalhes (top 3) */}
          {withAlert.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                {withAlert.length} {withAlert.length === 1 ? 'nota tem' : 'notas têm'} alertas
              </div>
              <ul className="mt-2 space-y-1 text-xs text-amber-800">
                {withAlert.slice(0, 3).map((inv) => (
                  <li key={inv.id} className="truncate">
                    NF {inv.numero || inv.id} — {inv.motivosAlerta?.[0] || 'alerta genérico'}
                  </li>
                ))}
                {withAlert.length > 3 && (
                  <li className="italic">+ {withAlert.length - 3} {withAlert.length - 3 === 1 ? 'outra' : 'outras'}</li>
                )}
              </ul>

              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={excludeAlerted}
                  onChange={(e) => setExcludeAlerted(e.target.checked)}
                  className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-amber-900">
                  Pular as {withAlert.length} com alerta (recomendado — revisar manualmente)
                </span>
              </label>
            </div>
          )}

          {/* Aviso de quantidade alta */}
          {totalToApprove > 50 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              💡 Você vai aprovar <strong>{totalToApprove} notas de uma vez</strong>. A operação pode levar alguns segundos.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <span className="mr-auto text-xs text-slate-400">
            <Kbd>Esc</Kbd> cancela
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={processing || totalToApprove === 0}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Aprovando…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Aprovar {totalToApprove} {totalToApprove === 1 ? 'nota' : 'notas'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
