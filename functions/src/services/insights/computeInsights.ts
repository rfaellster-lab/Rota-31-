/**
 * @file computeInsights.ts
 * @description Engine de insights "Você está perdendo R$ X".
 *              Recebe lista de invoices, retorna insights ranqueados por severidade.
 *              Função pura — não causa side-effects.
 *
 *              4 métricas iniciais (master-plan/01-architecture-plan.md §1.3):
 *              1. frete_perdido_fob_sem_regra  — NFs FOB sem regra → fallback genérico
 *              2. tempo_medio_aprovacao        — tempo médio entre detecção e aprovação
 *              3. nfs_negadas_sem_motivo       — negadas com motivo genérico/curto
 *              4. comparativo_periodo          — comparativo de NFs vs período anterior
 *
 * @story Sprint 2 P2 / Insights
 * @agent @dev
 * @created 2026-05-12
 */

export type InsightSeverity = 'info' | 'warning' | 'critical';
export type InsightAudience = 'admin' | 'operator' | 'all';

export interface InsightLite {
  type: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  severity: InsightSeverity;
  audience: InsightAudience;
  delta?: number; // delta percentual ou absoluto
  metric?: number; // valor da métrica
  metadata?: Record<string, unknown>;
}

export interface InvoiceMin {
  status: string;
  detectadoEm?: string; // ISO
  aprovadoEm?: string; // ISO
  valorFrete?: number;
  erroMsg?: string | null;
  // Indica se é FOB (pagador = destinatario)
  pagador?: string; // 'remetente' | 'destinatario'
  // Regra aplicada (pode ser DEFAULT ou específica)
  tipoRegra?: string;
}

const BRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

/**
 * Computa insights a partir de um snapshot de invoices.
 * Retorna lista ordenada por severidade desc, depois delta desc.
 */
export function computeInsights(
  invoices: InvoiceMin[],
  prevPeriodCount?: number,
): InsightLite[] {
  const out: InsightLite[] = [];

  // 1) Frete perdido FOB sem regra específica
  const fobSemRegra = invoices.filter(
    (i) => i.pagador === 'destinatario' && i.tipoRegra === 'DEFAULT' && i.status !== 'negada' && i.status !== 'cancelada',
  );
  if (fobSemRegra.length > 0) {
    const totalFrete = fobSemRegra.reduce((s, i) => s + (i.valorFrete || 0), 0);
    // Estimativa de perda: 5-15% do frete por usar fallback genérico (não precificado)
    const lossEstimate = Math.round(totalFrete * 0.1);
    out.push({
      type: 'frete_perdido_fob_sem_regra',
      title: `${fobSemRegra.length} ${fobSemRegra.length === 1 ? 'nota FOB' : 'notas FOB'} usando regra padrão`,
      body: `Valor de frete total: ${BRL(totalFrete)}. Estimativa de perda por não ter regra específica: ~${BRL(lossEstimate)} (10%). Cadastre regras dos pagadores frequentes em /configuracao.`,
      severity: lossEstimate > 500 ? 'critical' : lossEstimate > 100 ? 'warning' : 'info',
      audience: 'admin',
      metric: lossEstimate,
      metadata: { count: fobSemRegra.length, totalFrete },
      ctaLabel: 'Cadastrar regras',
      ctaUrl: '/configuracao',
    });
  }

  // 2) Tempo médio de aprovação
  const aprovadas = invoices.filter(
    (i) => (i.status === 'aprovada' || i.status === 'emitida') && i.detectadoEm && i.aprovadoEm,
  );
  if (aprovadas.length >= 5) {
    const tempos = aprovadas.map(
      (i) => (new Date(i.aprovadoEm!).getTime() - new Date(i.detectadoEm!).getTime()) / 1000,
    );
    const avgSec = tempos.reduce((s, t) => s + t, 0) / tempos.length;
    const avgMin = avgSec / 60;
    if (avgMin > 60) {
      out.push({
        type: 'tempo_medio_aprovacao',
        title: `Tempo médio de aprovação: ${avgMin.toFixed(0)} min`,
        body: `Notas estão demorando ${avgMin.toFixed(0)} minutos em média até serem decididas. Meta: < 30 min. Atalhos de teclado (A/N/J/K) ajudam — aperte Shift+? pra ver.`,
        severity: avgMin > 180 ? 'critical' : avgMin > 90 ? 'warning' : 'info',
        audience: 'all',
        metric: avgMin,
        metadata: { sample: aprovadas.length },
      });
    }
  }

  // 3) NFs negadas com motivo curto/genérico
  const negadasComCurto = invoices.filter(
    (i) =>
      i.status === 'negada' &&
      (!i.erroMsg || i.erroMsg.trim().length < 10),
  );
  if (negadasComCurto.length > 0) {
    out.push({
      type: 'nfs_negadas_sem_motivo',
      title: `${negadasComCurto.length} ${negadasComCurto.length === 1 ? 'negação' : 'negações'} sem motivo claro`,
      body: `Notas negadas sem motivo descritivo dificultam auditoria. Mínimo recomendado: 10 caracteres descrevendo a razão.`,
      severity: 'warning',
      audience: 'admin',
      metric: negadasComCurto.length,
      metadata: { count: negadasComCurto.length },
    });
  }

  // 4) Comparativo período
  if (prevPeriodCount !== undefined && prevPeriodCount > 0) {
    const delta = ((invoices.length - prevPeriodCount) / prevPeriodCount) * 100;
    if (Math.abs(delta) >= 20) {
      const subiu = delta > 0;
      out.push({
        type: 'comparativo_periodo',
        title: `Volume ${subiu ? '↑' : '↓'} ${Math.abs(delta).toFixed(0)}% vs período anterior`,
        body: `${invoices.length} notas neste período vs ${prevPeriodCount} no anterior. ${subiu ? 'Crescimento — atenção à capacidade.' : 'Queda — investigar causa.'}`,
        severity: Math.abs(delta) >= 50 ? 'warning' : 'info',
        audience: 'admin',
        delta,
        metric: invoices.length,
        metadata: { prev: prevPeriodCount, current: invoices.length },
      });
    }
  }

  // Ordenar por severity desc, depois delta desc
  const sevOrder: Record<InsightSeverity, number> = { critical: 3, warning: 2, info: 1 };
  out.sort((a, b) => {
    const s = sevOrder[b.severity] - sevOrder[a.severity];
    if (s !== 0) return s;
    return (b.delta || b.metric || 0) - (a.delta || a.metric || 0);
  });

  return out;
}
