/**
 * @file Relatorios.tsx
 * @description KPIs + gráficos isolados da área operacional (Dashboard)
 * @created 2026-04-29
 */

import { useInvoices } from '../store/InvoiceContext';
import { DashboardCharts } from '../components/DashboardCharts';
import { DateRangePicker } from '../components/DateRangePicker';
import { parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { formatMoney } from '../utils/formatters';

export default function Relatorios() {
  const { invoices, globalDateRange, setGlobalDateRange } = useInvoices();

  const periodInvoices = invoices.filter((inv) => {
    if (!globalDateRange.from && !globalDateRange.to) return true;
    const invDate = parseISO(inv.detectadoEm);
    if (globalDateRange.from && globalDateRange.to) {
      return isWithinInterval(invDate, {
        start: startOfDay(globalDateRange.from),
        end: endOfDay(globalDateRange.to),
      });
    }
    if (globalDateRange.from) return invDate >= startOfDay(globalDateRange.from);
    if (globalDateRange.to) return invDate <= endOfDay(globalDateRange.to);
    return true;
  });

  const pending = periodInvoices.filter(i => i.status === 'pendente');
  const approved = periodInvoices.filter(i => i.status === 'aprovada');
  const denied = periodInvoices.filter(i => i.status === 'negada');
  const emitted = periodInvoices.filter(i => i.status === 'emitida');
  const errors = periodInvoices.filter(i => i.status === 'erro');

  const approvedValue = approved.reduce((s, i) => s + i.valorNota, 0);
  const emittedValue = emitted.reduce((s, i) => s + i.valorNota, 0);
  const totalFrete = emitted.reduce((s, i) => s + i.valorFrete, 0);

  const Card = ({ title, value, sub, color = 'slate' }: any) => (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 min-h-[110px]`}>
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{title}</span>
      <div className="flex flex-col gap-1 mt-2">
        <span className={`text-3xl font-black text-${color === 'orange' ? '[#F26522]' : color === 'red' ? 'red-600' : 'slate-800'}`}>{value}</span>
        {sub && <span className="text-[10px] font-medium text-slate-500">{sub}</span>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-24 md:pb-0 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios e Métricas</h1>
          <p className="text-sm text-gray-500 mt-1">Visão consolidada do período selecionado</p>
        </div>
        <DateRangePicker value={globalDateRange} onChange={setGlobalDateRange} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card title="Pendentes" value={pending.length} sub="Aguardando" color="orange" />
        <Card title="Aprovadas" value={approved.length} sub={formatMoney(approvedValue)} />
        <Card title="Negadas" value={denied.length} />
        <Card title="Emitidas" value={emitted.length} sub={formatMoney(emittedValue)} />
        <div className="bg-red-50 rounded-2xl p-5 shadow-sm border border-red-100 min-h-[110px]">
          <span className="text-[11px] font-bold text-red-400 uppercase tracking-widest">Com Erro</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-red-600">{errors.length}</span>
            {errors.length > 0 && <span className="text-[10px] text-red-700 font-bold">ATENÇÃO</span>}
          </div>
        </div>
      </div>

      {/* Frete total emitido */}
      {emitted.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-6 shadow-sm border border-emerald-100">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">Frete total emitido no período</p>
          <p className="text-4xl font-black text-emerald-800">{formatMoney(totalFrete)}</p>
          <p className="text-xs text-slate-500 mt-1">{emitted.length} CT-e(s) emitido(s)</p>
        </div>
      )}

      {/* Gráficos */}
      <DashboardCharts invoices={periodInvoices} />
    </div>
  );
}
