/**
 * @file routes/executive.ts
 * @description Routes /api/executive/* — KPIs gerenciais (admin only).
 *              6 widgets pro Jader/Raphael (master-plan/04-comercial-jader-raphael.md):
 *              1. Volume diário/semanal
 *              2. Tempo médio aprovação
 *              3. Top clientes por volume
 *              4. Distribuição de status
 *              5. Erros + taxa de rejeição
 *              6. Trend (últimas 4 semanas)
 *
 * @story Sprint 2 P2 / Executive Dashboard backend
 * @agent @dev
 * @created 2026-05-12
 */
import { Router, Request, Response, NextFunction } from 'express';

export interface AuthedRequest extends Request {
  authUser?: { uid: string; email?: string; name?: string; role?: string };
}

const wrap = (fn: any) => (req: any, res: any, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.authUser?.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores' });
  }
  next();
}

/**
 * Recebe acesso a getAllInvoices() injetado pra evitar import circular com index.ts.
 */
export function createExecutiveRouter(opts: {
  fetchAllInvoices: () => Promise<Array<any>>;
}): Router {
  const router = Router();

  router.get('/kpis', requireAdmin as any, wrap(async (_req: AuthedRequest, res: Response) => {
    const invoices = await opts.fetchAllInvoices();

    const now = Date.now();
    const ms24h = 24 * 3600 * 1000;
    const ms7d = 7 * ms24h;
    const ms30d = 30 * ms24h;

    const last24h = invoices.filter((i) => i.detectadoEm && now - Date.parse(i.detectadoEm) < ms24h);
    const last7d = invoices.filter((i) => i.detectadoEm && now - Date.parse(i.detectadoEm) < ms7d);
    const last30d = invoices.filter((i) => i.detectadoEm && now - Date.parse(i.detectadoEm) < ms30d);

    // Widget 1: Volume
    const volume = {
      last24h: last24h.length,
      last7d: last7d.length,
      last30d: last30d.length,
      total: invoices.length,
    };

    // Widget 2: Tempo médio aprovação
    const aprovadas = invoices.filter(
      (i) => (i.status === 'aprovada' || i.status === 'emitida') && i.detectadoEm && i.aprovadoEm,
    );
    let avgApprovalMin = 0;
    if (aprovadas.length > 0) {
      const tempos = aprovadas.map(
        (i) => (Date.parse(i.aprovadoEm) - Date.parse(i.detectadoEm)) / 1000 / 60,
      );
      avgApprovalMin = Math.round(tempos.reduce((s, t) => s + t, 0) / tempos.length);
    }

    // Widget 3: Top clientes (top 10) — agrupado por nomeRemetente OU pagador
    const byCliente = new Map<string, { count: number; valorFrete: number }>();
    for (const inv of invoices) {
      const key = inv.nomeRemetente || inv.nomeDestinatario || 'Desconhecido';
      const cur = byCliente.get(key) || { count: 0, valorFrete: 0 };
      cur.count++;
      cur.valorFrete += inv.valorFrete || 0;
      byCliente.set(key, cur);
    }
    const topClientes = Array.from(byCliente.entries())
      .map(([nome, v]) => ({ nome, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Widget 4: Distribuição de status
    const statusDist: Record<string, number> = {};
    for (const inv of invoices) {
      statusDist[inv.status] = (statusDist[inv.status] || 0) + 1;
    }

    // Widget 5: Taxa de rejeição (negadas + canceladas / total decididas)
    const decididas = invoices.filter((i) =>
      ['aprovada', 'emitida', 'negada', 'cancelada', 'denegada', 'erro'].includes(i.status),
    );
    const rejeitadas = invoices.filter((i) => ['negada', 'cancelada', 'denegada', 'erro'].includes(i.status));
    const rejeitionRate =
      decididas.length > 0 ? (rejeitadas.length / decididas.length) * 100 : 0;

    // Widget 6: Trend semanas (últimas 4)
    const weekBuckets: Array<{ week: string; count: number }> = [];
    for (let w = 0; w < 4; w++) {
      const start = now - (w + 1) * 7 * ms24h;
      const end = now - w * 7 * ms24h;
      const inWeek = invoices.filter(
        (i) => i.detectadoEm && Date.parse(i.detectadoEm) >= start && Date.parse(i.detectadoEm) < end,
      );
      weekBuckets.unshift({
        week: `Semana -${w}`,
        count: inWeek.length,
      });
    }

    res.json({
      ts: new Date().toISOString(),
      volume,
      avgApprovalMin,
      topClientes,
      statusDist,
      rejeitionRate: Number(rejeitionRate.toFixed(2)),
      trendWeeks: weekBuckets,
    });
  }));

  return router;
}
