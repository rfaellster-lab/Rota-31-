/**
 * @file scheduled/computeInsights.ts
 * @description Cloud Function agendada — roda a cada 6h.
 *              Lê invoices do Sheets, computa insights, persiste em insights/.
 *              Frontend lê via GET /api/insights.
 *
 * @story Sprint 2 P2 / Insights scheduler
 * @agent @dev
 * @created 2026-05-12
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { setGlobalOptions } from 'firebase-functions/v2';
import admin from 'firebase-admin';
import { GoogleAuth } from 'google-auth-library';
import { computeInsights, type InvoiceMin } from '../services/insights/computeInsights.js';
import { persistInsights } from '../services/insights/persistInsights.js';
import { adaptToInvoice } from '../adapter.js';

setGlobalOptions({ region: 'southamerica-east1', maxInstances: 1 });

// Inicializa Firebase Admin se ainda não inicializado (compartilhamento com index.ts)
try {
  admin.app();
} catch {
  admin.initializeApp();
}

const SHEET_ID = process.env.SHEET_ID || '';
const TAB_PENDENTES = process.env.SHEET_TAB_PENDENTES || 'APROVACOES_PENDENTES';

const googleAuth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function sheetsRead(range: string): Promise<any[][]> {
  const client = await googleAuth.getClient();
  const token = (await client.getAccessToken()).token;
  if (!token) throw new Error('Falha ao obter token Google');
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) throw new Error(`Sheets read ${r.status}: ${await r.text()}`);
  const j = (await r.json()) as { values?: any[][] };
  return j.values || [];
}

/**
 * Roda a cada 6h. Schedule format: cron Unix (Cloud Scheduler).
 *   "0 *\/6 * * *" — minuto 0, a cada 6 horas, BRT
 */
export const computeInsightsScheduled = onSchedule(
  {
    schedule: '0 */6 * * *',
    timeZone: 'America/Sao_Paulo',
    region: 'southamerica-east1',
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async (_event) => {
    if (!SHEET_ID) {
      console.warn('[computeInsights] SHEET_ID não configurado — skipping');
      return;
    }

    try {
      console.log('[computeInsights] iniciando lote');
      const rows = await sheetsRead(`${TAB_PENDENTES}!A2:AI5000`);
      console.log(`[computeInsights] leu ${rows.length} linhas`);

      // Adapta pra InvoiceMin (subset do Invoice)
      const invoices: InvoiceMin[] = [];
      for (let i = 0; i < rows.length; i++) {
        const inv = adaptToInvoice(rows[i], i + 2);
        if (!inv) continue;
        invoices.push({
          status: inv.status,
          detectadoEm: inv.detectadoEm,
          aprovadoEm: inv.aprovadoEm || undefined,
          valorFrete: inv.valorFrete,
          erroMsg: inv.erroMsg,
          pagador: (inv as any).pagador,
          tipoRegra: (inv as any).tipoRegra,
        });
      }

      // Calcula período anterior (mesmo tamanho — last 30d vs prev 30d)
      const now = Date.now();
      const ms30d = 30 * 24 * 3600 * 1000;
      const current30d = invoices.filter(
        (i) => i.detectadoEm && now - Date.parse(i.detectadoEm) < ms30d,
      );
      const prev30d = invoices.filter((i) => {
        if (!i.detectadoEm) return false;
        const t = Date.parse(i.detectadoEm);
        return now - t >= ms30d && now - t < 2 * ms30d;
      });

      const insights = computeInsights(current30d, prev30d.length);
      console.log(`[computeInsights] gerou ${insights.length} insights`);

      const persisted = await persistInsights(insights);
      console.log(`[computeInsights] persistiu ${persisted.written} insights`);
    } catch (err) {
      console.error('[computeInsights] erro:', err);
      throw err; // re-throw pra Cloud Scheduler marcar como falha
    }
  },
);
