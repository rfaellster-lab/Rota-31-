/**
 * @file src/services/api.ts
 * @description Cliente HTTP do painel — todas chamadas passam pelo proxy /api
 *              Envia Firebase ID Token + API key estática (defesa em camadas)
 * @updated 2026-04-29
 */

import { Invoice } from '../types';
import { auth } from '../lib/firebase';

const API_KEY = (import.meta as any).env?.VITE_API_KEY || '';
// Em dev: '/api' (proxied pelo Vite). Em prod: URL absoluta da Cloud Function.
const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  };
  // Anexa Firebase ID Token se houver usuário logado
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (e) {
      console.warn('Não foi possível obter ID Token:', e);
    }
  }
  return headers;
}

async function request<T = any>(method: string, path: string, body?: any): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) {
    const err: any = new Error(json?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json as T;
}

// ── Invoices ─────────────────────────────────────────────────
export interface InvoicesResponse {
  count: number;
  invoices: Invoice[];
}

export interface AppNotification {
  id: string;
  level: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  source: 'panel' | 'sheets' | 'bsoft' | 'n8n';
  targetPath?: string | null;
  createdAt?: string | null;
  read?: boolean;
}

export interface Promotion {
  id: string;
  active: boolean;
  placement: 'sidebar' | 'config' | 'notifications' | 'login';
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  priority: number;
}

export const api = {
  health: () => request<any>('GET', '/health'),

  // Sprint 1 / A4
  getFeatureFlags: () => request<{ flags: Record<string, boolean>; ts: number }>('GET', '/feature-flags'),

  getInvoices: () => request<InvoicesResponse>('GET', '/invoices'),
  getInvoice: (chave: string) => request<Invoice>('GET', `/invoices/${encodeURIComponent(chave)}`),

  approve: (chave: string, opts: { user?: string; execId?: string; valorFreteOverride?: number; motivoOverride?: string } = {}) =>
    request<{ ok: boolean; dryRun?: boolean }>('POST', `/invoices/${encodeURIComponent(chave)}/approve`, opts),

  deny: (chave: string, opts: { user?: string; execId?: string; motivo?: string } = {}) =>
    request<{ ok: boolean; dryRun?: boolean }>('POST', `/invoices/${encodeURIComponent(chave)}/deny`, opts),

  cancelInvoice: (chave: string, opts: { motivo: string; user?: string }) =>
    request<{ ok: boolean; dryRun?: boolean; aviso?: string }>('POST', `/invoices/${encodeURIComponent(chave)}/cancel`, opts),

  // ── Notas internas + snooze (persistentes em Firestore) ────
  listInvoiceNotes: (chave: string) =>
    request<{ count: number; notes: Array<{ id: string; text: string; user: string; date: string }> }>(
      'GET', `/invoices/${encodeURIComponent(chave)}/notes`
    ),

  addInvoiceNote: (chave: string, text: string) =>
    request<{ ok: boolean; id?: string }>('POST', `/invoices/${encodeURIComponent(chave)}/note`, { text }),

  setInvoiceSnooze: (chave: string, until: string | null) =>
    request<{ ok: boolean }>('PATCH', `/invoices/${encodeURIComponent(chave)}/snooze`, { until }),

  // ── Rules ──────────────────────────────────────────────────
  getRules: () => request<{ count: number; rules: any[] }>('GET', '/rules'),

  addRule: (rule: {
    tipoBusca: string;
    valorBusca?: string;
    nomeCliente: string;
    valorMinimo: string | number;
    porcentagem: string | number;
    observacoes?: string;
  }) => request<any>('POST', '/rules', rule),

  updateRule: (row: number, rule: any) =>
    request<any>('PATCH', `/rules/${row}`, rule),

  deleteRule: (row: number) =>
    request<any>('DELETE', `/rules/${row}`),

  getNotifications: () =>
    request<{ count: number; notifications: AppNotification[] }>('GET', '/notifications'),

  markNotificationRead: (id: string) =>
    request<{ ok: boolean }>('PATCH', `/notifications/${encodeURIComponent(id)}/read`),

  getPromotions: (placement?: Promotion['placement']) =>
    request<{ count: number; promotions: Promotion[] }>('GET', `/promotions${placement ? `?placement=${encodeURIComponent(placement)}` : ''}`),
};

export default api;
