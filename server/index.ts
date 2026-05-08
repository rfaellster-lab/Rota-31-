/**
 * @file server/index.ts
 * @description Backend proxy do Painel Rota 31
 *              - Lê APROVACOES_PENDENTES do Google Sheets
 *              - Adapta DADOS_JSON → Invoice
 *              - Proxy para webhooks n8n (approve/deny)
 *              - CRUD de regras na planilha CADASTRO_CLIENTES
 * @created 2026-04-29
 */

import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname_ = path.dirname(fileURLToPath(import.meta.url));
// Carrega .env.local (preferencial) e .env (fallback)
dotenvConfig({ path: path.resolve(__dirname_, '..', '.env.local') });
dotenvConfig({ path: path.resolve(__dirname_, '..', '.env') });

import express, { Request, Response, NextFunction } from 'express';
import { GoogleAuth } from 'google-auth-library';
import admin from 'firebase-admin';
import { adaptToInvoice } from './adapter.js';
import { checkBsoftHealth } from './services/bsoft.js';
import {
  getFirestoreHealth,
  listNotifications,
  listPromotions,
  markNotificationRead,
  syncUserProfile,
  writeAuditEvent,
} from './services/firestore.js';

// ─── Config ──────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3001;
const API_KEY = process.env.API_KEY || '';
const SHEET_ID = process.env.SHEET_ID!;
const TAB_PENDENTES = process.env.SHEET_TAB_PENDENTES || 'APROVACOES_PENDENTES';
const TAB_REGRAS = process.env.SHEET_TAB_REGRAS || 'CADASTRO_CLIENTES';
const N8N_BASE_URL = process.env.N8N_BASE_URL!;
const N8N_API_KEY = process.env.N8N_API_KEY!;
const N8N_WEBHOOK_DECISAO = process.env.N8N_WEBHOOK_DECISAO!;
const N8N_WF_PRINCIPAL = process.env.N8N_WF_PRINCIPAL!;
const N8N_WF_AVISOS = process.env.N8N_WF_AVISOS!;
const BSOFT_BASE_URL = process.env.BSOFT_BASE_URL!;
const DRY_RUN = process.env.DRY_RUN === 'true';
const CORS_ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (!SHEET_ID || !N8N_API_KEY) {
  console.error('❌ Variáveis obrigatórias faltando: SHEET_ID, N8N_API_KEY');
  process.exit(1);
}

// ─── Firebase Admin (validação de ID Token) ──────────────────
// Modo "lite": usa apenas projectId — o Admin SDK consegue validar tokens
// usando as chaves públicas do Google sem precisar do service account JSON.
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'rota-31---backend';
let firebaseAdminEnabled = false;
try {
  const firebaseCredentials = process.env.FIREBASE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
      projectId: FIREBASE_PROJECT_ID,
    });
  } else if (firebaseCredentials) {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseCredentials),
      projectId: FIREBASE_PROJECT_ID,
    });
  } else {
    admin.initializeApp({ projectId: FIREBASE_PROJECT_ID });
  }
  firebaseAdminEnabled = true;
  console.log(`🔐 Firebase Admin inicializado | projectId=${FIREBASE_PROJECT_ID}`);
} catch (e: any) {
  console.warn('⚠️  Firebase Admin não pôde ser inicializado:', e.message);
}

interface AuthedRequest extends Request {
  authUser?: { uid: string; email?: string; name?: string; role?: 'admin' | 'operator' };
}

const SUPER_ADMIN_EMAILS = ['thor4tech@gmail.com'];

interface AuthedUser { uid: string; email?: string; name?: string; role?: 'admin' | 'operator'; }

async function verifyFirebaseToken(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.header('authorization') || req.header('Authorization') || '';
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    if (process.env.AUTH_REQUIRED === 'false') return next();
    return res.status(401).json({ error: 'Bearer token ausente' });
  }
  if (!firebaseAdminEnabled) return next();

  try {
    const decoded = await admin.auth().verifyIdToken(m[1]);
    let role: 'admin' | 'operator' = decoded.role === 'admin' || decoded.admin === true ? 'admin' : 'operator';
    // Auto-promove super admin (thor4tech@gmail.com) na primeira request
    if (decoded.email && SUPER_ADMIN_EMAILS.includes(decoded.email.toLowerCase()) && role !== 'admin') {
      try {
        await admin.auth().setCustomUserClaims(decoded.uid, { role: 'admin', admin: true });
        role = 'admin';
        console.log(`👑 Super admin promovido: ${decoded.email}`);
      } catch (e) { console.warn('Falha ao promover admin:', e); }
    }
    (req as AuthedRequest).authUser = { uid: decoded.uid, email: decoded.email, name: decoded.name, role };
    next();
  } catch (e: any) {
    return res.status(401).json({ error: 'Token Firebase inválido', detail: e.message });
  }
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.authUser?.role !== 'admin') return res.status(403).json({ error: 'Apenas administradores' });
  next();
}

function auditActor(req: AuthedRequest) {
  return req.authUser
    ? { uid: req.authUser.uid, email: req.authUser.email, name: req.authUser.name, role: req.authUser.role }
    : undefined;
}

// ─── Google Auth ─────────────────────────────────────────────
const googleAuth = new GoogleAuth({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function gToken(): Promise<string> {
  const c = await googleAuth.getClient();
  const r = await c.getAccessToken();
  if (!r.token) throw new Error('Falha ao obter token Google');
  return r.token;
}

async function sheetsRead(range: string): Promise<any[][]> {
  const token = await gToken();
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!r.ok) throw new Error(`Sheets read ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.values || [];
}

async function sheetsAppend(range: string, values: any[][]): Promise<any> {
  const token = await gToken();
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ majorDimension: 'ROWS', values }),
    }
  );
  if (!r.ok) throw new Error(`Sheets append ${r.status}: ${await r.text()}`);
  return r.json();
}

async function sheetsUpdate(range: string, values: any[][]): Promise<any> {
  const token = await gToken();
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
    }
  );
  if (!r.ok) throw new Error(`Sheets update ${r.status}: ${await r.text()}`);
  return r.json();
}

// ─── Express ─────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: '10mb' }));

// CORS: local por padrao, producao via CORS_ALLOWED_ORIGINS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && CORS_ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// API key check (defesa em camadas + permite health/login flow)
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  const key = req.header('x-api-key');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized (API key)' });
  next();
});

// Firebase ID Token check (exceto health)
app.use('/api', (req: AuthedRequest, res, next) => {
  if (req.path === '/health') return next();
  return verifyFirebaseToken(req, res, next);
});

const wrap = (fn: (req: Request, res: Response) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

// ─── Endpoints ────────────────────────────────────────────────

/** GET /api/me — dados do usuário logado (com role) */
app.get('/api/me', wrap(async (req: AuthedRequest, res) => {
  await syncUserProfile(req.authUser);
  res.json({ user: req.authUser || null });
}));

/** GET /api/notifications — notificacoes in-app */
app.get('/api/notifications', wrap(async (req: AuthedRequest, res) => {
  const notifications = await listNotifications(req.authUser);
  res.json({ count: notifications.length, notifications });
}));

/** PATCH /api/notifications/:id/read — marca notificacao como lida */
app.patch('/api/notifications/:id/read', wrap(async (req: AuthedRequest, res) => {
  const ok = await markNotificationRead(req.params.id, req.authUser);
  res.json({ ok });
}));

/** GET /api/promotions — areas discretas Thor4Tech */
app.get('/api/promotions', wrap(async (req, res) => {
  const placement = typeof req.query.placement === 'string' ? req.query.placement as any : undefined;
  const promotions = await listPromotions(placement);
  res.json({ count: promotions.length, promotions });
}));

/** GET /api/users — lista usuários (admin only) */
app.get('/api/users', verifyFirebaseToken as any, requireAdmin as any, wrap(async (_req, res) => {
  if (!firebaseAdminEnabled) return res.json({ users: [] });
  const list = await admin.auth().listUsers(100);
  const users = list.users.map(u => ({
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    phoneNumber: u.phoneNumber,
    disabled: u.disabled,
    role: (u.customClaims as any)?.role || 'operator',
    createdAt: u.metadata.creationTime,
    lastSignInAt: u.metadata.lastSignInTime,
  }));
  res.json({ count: users.length, users });
}));

/** PATCH /api/users/:uid/role — promove/rebaixa (admin only) */
app.patch('/api/users/:uid/role', verifyFirebaseToken as any, requireAdmin as any, wrap(async (req, res) => {
  const role = String(req.body?.role || '').toLowerCase();
  if (!['admin', 'operator'].includes(role)) return res.status(400).json({ error: 'role inválido' });
  await admin.auth().setCustomUserClaims(req.params.uid, { role, admin: role === 'admin' });
  await writeAuditEvent({
    type: 'user.role',
    actor: auditActor(req as AuthedRequest),
    target: { kind: 'user', id: req.params.uid },
    metadata: { role },
  });
  res.json({ ok: true, uid: req.params.uid, role });
}));

/** PATCH /api/users/:uid/disable — desativa/ativa (admin only) */
app.patch('/api/users/:uid/disable', verifyFirebaseToken as any, requireAdmin as any, wrap(async (req, res) => {
  const disabled = req.body?.disabled === true;
  await admin.auth().updateUser(req.params.uid, { disabled });
  await writeAuditEvent({
    type: 'user.disable',
    actor: auditActor(req as AuthedRequest),
    target: { kind: 'user', id: req.params.uid },
    metadata: { disabled },
  });
  res.json({ ok: true, uid: req.params.uid, disabled });
}));

/** GET /api/health — status das integrações */
app.get('/api/health', wrap(async (_req, res) => {
  const checks: Record<string, any> = { dryRun: DRY_RUN, ts: new Date().toISOString() };

  // n8n
  try {
    const r = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${N8N_WF_PRINCIPAL}`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY },
    });
    const j: any = r.ok ? await r.json() : null;
    checks.n8n = { ok: r.ok, active: j?.active, name: j?.name };
  } catch (e: any) { checks.n8n = { ok: false, error: e.message }; }

  // Sheets
  try {
    const token = await gToken();
    const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=properties.title`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    checks.sheets = { ok: r.ok };
  } catch (e: any) { checks.sheets = { ok: false, error: e.message }; }

  // BSOFT — leitura segura pelo backend, com credencial opcional
  checks.bsoft = await checkBsoftHealth(BSOFT_BASE_URL);

  // Firestore — best-effort; o painel continua funcionando se faltar permissao
  checks.firestore = await getFirestoreHealth();

  res.json(checks);
}));

/** GET /api/invoices — lista com filtros (status, limit, offset, onlyPending) */
app.get('/api/invoices', wrap(async (req, res) => {
  const rows = await sheetsRead(`${TAB_PENDENTES}!A2:AI5000`);
  let invoices = rows
    .map((row, idx) => adaptToInvoice(row, idx + 2))
    .filter((inv): inv is NonNullable<typeof inv> => inv !== null);

  const status = String(req.query.status || '').toLowerCase();
  if (status) invoices = invoices.filter(i => i.status === status);
  if (String(req.query.onlyPending || '') === 'true') invoices = invoices.filter(i => i.status === 'pendente');

  invoices.sort((a, b) => {
    if (!status) {
      if (a.status === 'pendente' && b.status !== 'pendente') return -1;
      if (a.status !== 'pendente' && b.status === 'pendente') return 1;
    }
    return new Date(b.detectadoEm).getTime() - new Date(a.detectadoEm).getTime();
  });

  const totalAll = invoices.length;
  const pendingsCount = invoices.filter(i => i.status === 'pendente').length;
  const limit = Math.min(parseInt(String(req.query.limit || '5000'), 10) || 5000, 5000);
  const offset = Math.max(0, parseInt(String(req.query.offset || '0'), 10) || 0);
  const top = invoices.slice(offset, offset + limit);
  res.json({ count: top.length, total: totalAll, pendings: pendingsCount, offset, limit, invoices: top });
}));

/** GET /api/invoices/:chave — detalhe de uma nota */
app.get('/api/invoices/:chave', wrap(async (req, res) => {
  const rows = await sheetsRead(`${TAB_PENDENTES}!A2:AI5000`);
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === req.params.chave) {
      const inv = adaptToInvoice(rows[i], i + 2);
      if (inv) return res.json(inv);
    }
  }
  res.status(404).json({ error: 'Nota não encontrada' });
}));

/** POST /api/invoices/:chave/approve — webhook decisão SIM */
app.post('/api/invoices/:chave/approve', wrap(async (req: AuthedRequest, res) => {
  const { chave } = req.params;
  const { execId } = req.body || {};
  // Identidade vem do Firebase token (não confiar em body.user)
  const user = req.authUser?.name || req.authUser?.email || req.body?.user || 'desconhecido';

  if (DRY_RUN) {
    console.log(`[DRY_RUN] approve ${chave} by ${user}`);
    await writeAuditEvent({
      type: 'invoice.approve.dry_run',
      actor: auditActor(req),
      target: { kind: 'invoice', id: chave },
      metadata: { execId, dryRun: true },
    });
    return res.json({ ok: true, dryRun: true, chave, user });
  }

  const r = await fetch(N8N_WEBHOOK_DECISAO, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chave, exec: execId, acao: 'SIM', usuario: user }),
  });
  const text = await r.text();
  await writeAuditEvent({
    type: 'invoice.approve',
    actor: auditActor(req),
    target: { kind: 'invoice', id: chave },
    metadata: { execId, ok: r.ok, status: r.status },
  });
  res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, user, response: text });
}));

/** POST /api/invoices/:chave/deny — webhook decisão NAO */
app.post('/api/invoices/:chave/deny', wrap(async (req: AuthedRequest, res) => {
  const { chave } = req.params;
  const { execId, motivo = 'Cancelado pelo cliente' } = req.body || {};
  const user = req.authUser?.name || req.authUser?.email || req.body?.user || 'desconhecido';

  if (DRY_RUN) {
    console.log(`[DRY_RUN] deny ${chave} by ${user} — motivo: ${motivo}`);
    await writeAuditEvent({
      type: 'invoice.deny.dry_run',
      actor: auditActor(req),
      target: { kind: 'invoice', id: chave },
      metadata: { execId, motivo, dryRun: true },
    });
    return res.json({ ok: true, dryRun: true, chave, user, motivo });
  }

  const r = await fetch(N8N_WEBHOOK_DECISAO, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chave, exec: execId, acao: 'NAO', usuario: user, motivo }),
  });
  const text = await r.text();
  await writeAuditEvent({
    type: 'invoice.deny',
    actor: auditActor(req),
    target: { kind: 'invoice', id: chave },
    metadata: { execId, motivo, ok: r.ok, status: r.status },
  });
  res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, user, response: text });
}));

/** POST /api/invoices/:chave/cancel — marca CT-e como cancelado no painel
 *
 *  IMPORTANTE: NÃO chama BSOFT/SEFAZ. Apenas registra no Sheet + audit.
 *  Cancelamento oficial deve ser feito manualmente no TMS Rota 31.
 *
 *  Body: { motivo: string (obrigatório), user?: string }
 */
app.post('/api/invoices/:chave/cancel', wrap(async (req: AuthedRequest, res) => {
  const { chave } = req.params;
  const { motivo } = req.body || {};
  const user = req.authUser?.name || req.authUser?.email || req.body?.user || 'desconhecido';

  if (!motivo || !String(motivo).trim() || String(motivo).trim().length < 3) {
    return res.status(400).json({ error: 'motivo é obrigatório (mínimo 3 caracteres)' });
  }

  if (DRY_RUN) {
    console.log(`[DRY_RUN] cancel ${chave} by ${user} — motivo: ${motivo}`);
    await writeAuditEvent({
      type: 'invoice.cancel.dry_run',
      actor: auditActor(req),
      target: { kind: 'invoice', id: chave },
      metadata: { motivo, dryRun: true },
    });
    return res.json({ ok: true, dryRun: true, chave, user, motivo });
  }

  const rows = await sheetsRead(`${TAB_PENDENTES}!A2:AI5000`);
  let rowNumber = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === chave) { rowNumber = i + 2; break; }
  }
  if (rowNumber === -1) {
    return res.status(404).json({ error: 'NF não encontrada no Sheet' });
  }

  const now = new Date().toISOString();
  try {
    await sheetsUpdate(`${TAB_PENDENTES}!C${rowNumber}`, [['CANCELADA']]);
    await sheetsUpdate(`${TAB_PENDENTES}!N${rowNumber}`, [[now]]);
  } catch (e: any) {
    console.error('Erro ao atualizar Sheet:', e);
    return res.status(500).json({ error: 'Falha ao gravar cancelamento', detail: e.message });
  }

  try {
    await writeAuditEvent({
      type: 'invoice.cancel',
      actor: auditActor(req),
      target: { kind: 'invoice', id: chave },
      metadata: { motivo, rowNumber, timestamp: now },
    });
  } catch (e) { console.warn('Falha audit:', e); }

  res.json({
    ok: true, chave, status: 'cancelada', motivo, user, timestamp: now,
    aviso: 'Cancelamento registrado no painel. Lembre de cancelar oficialmente no TMS Rota 31 se ainda não foi feito.',
  });
}));

/** GET /api/rules — lê CADASTRO_CLIENTES */
app.get('/api/rules', wrap(async (_req, res) => {
  const rows = await sheetsRead(`${TAB_REGRAS}!A2:F1000`);
  const rules = rows
    .map((row, idx) => ({
      row: idx + 2,
      tipoBusca: row[0] || '',
      valorBusca: row[1] || '',
      nomeCliente: row[2] || '',
      valorMinimo: row[3] || '',
      porcentagem: row[4] || '',
      observacoes: row[5] || '',
    }))
    .filter(r => r.tipoBusca);
  res.json({ count: rules.length, rules });
}));

/** POST /api/rules — append nova regra */
app.post('/api/rules', wrap(async (req, res) => {
  const { tipoBusca, valorBusca = '', nomeCliente, valorMinimo, porcentagem, observacoes = '' } = req.body || {};
  if (!tipoBusca || !nomeCliente) return res.status(400).json({ error: 'tipoBusca e nomeCliente obrigatórios' });
  const result = await sheetsAppend(`${TAB_REGRAS}!A:F`, [[
    tipoBusca, valorBusca, nomeCliente, valorMinimo, porcentagem, observacoes
  ]]);
  await writeAuditEvent({
    type: 'rule.add',
    actor: auditActor(req as AuthedRequest),
    target: { kind: 'rule', id: String(result.updates?.updatedRange || nomeCliente) },
    metadata: { tipoBusca, valorBusca, nomeCliente, valorMinimo, porcentagem },
  });
  res.json({ ok: true, updated: result.updates });
}));

/** PATCH /api/rules/:row — atualiza regra existente */
app.patch('/api/rules/:row', wrap(async (req, res) => {
  const row = Number(req.params.row);
  if (!row || row < 2) return res.status(400).json({ error: 'row inválido' });
  const { tipoBusca, valorBusca, nomeCliente, valorMinimo, porcentagem, observacoes } = req.body || {};
  const result = await sheetsUpdate(`${TAB_REGRAS}!A${row}:F${row}`, [[
    tipoBusca || '', valorBusca || '', nomeCliente || '',
    valorMinimo || '', porcentagem || '', observacoes || ''
  ]]);
  await writeAuditEvent({
    type: 'rule.update',
    actor: auditActor(req as AuthedRequest),
    target: { kind: 'rule', id: String(row) },
    metadata: { tipoBusca, valorBusca, nomeCliente, valorMinimo, porcentagem },
  });
  res.json({ ok: true, updated: result.updatedCells });
}));

/** DELETE /api/rules/:row — limpa linha (não remove pra preservar índice) */
app.delete('/api/rules/:row', wrap(async (req, res) => {
  const row = Number(req.params.row);
  if (!row || row < 2) return res.status(400).json({ error: 'row inválido' });
  const result = await sheetsUpdate(`${TAB_REGRAS}!A${row}:F${row}`, [['', '', '', '', '', '']]);
  await writeAuditEvent({
    type: 'rule.delete',
    actor: auditActor(req as AuthedRequest),
    target: { kind: 'rule', id: String(row) },
    metadata: { cleared: result.updatedCells },
  });
  res.json({ ok: true, cleared: result.updatedCells });
}));

// ─── Error handler ───────────────────────────────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('💥 Server error:', err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  🚛 Rota 31 — Painel API rodando na porta ${PORT}`);
  console.log(`  📊 Sheet: ${SHEET_ID}`);
  console.log(`  🔌 n8n:   ${N8N_BASE_URL}`);
  console.log(`  🛡️  DRY_RUN: ${DRY_RUN ? 'ATIVO (approve/deny mockados)' : 'INATIVO (chamadas reais)'}`);
  console.log('═══════════════════════════════════════════════════════');
});
