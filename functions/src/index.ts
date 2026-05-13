/**
 * @file server/index.ts
 * @description Backend proxy do Painel Rota 31
 *              - Lê APROVACOES_PENDENTES do Google Sheets
 *              - Adapta DADOS_JSON → Invoice
 *              - Proxy para webhooks n8n (approve/deny)
 *              - CRUD de regras na planilha CADASTRO_CLIENTES
 * @created 2026-04-29
 */

// Firebase Functions wrapper — variáveis vêm de runtime config / env vars do deploy
import express, { Request, Response, NextFunction } from 'express';
import { GoogleAuth } from 'google-auth-library';
import admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { adaptToInvoice } from './adapter.js';
import { checkBsoftHealth } from './services/bsoft.js';
import {
  getFirestoreHealth,
  listNotifications,
  listPromotions,
  markNotificationRead,
  syncUserProfile,
  writeAuditEvent,
  addInvoiceNote,
  listInvoiceNotes,
  setInvoiceSnooze,
  listInvoiceStates,
} from './services/firestore.js';
import { creditXp } from './services/gamification/userProfile.js';
import { createMeRouter } from './routes/me.js';
import { createInsightsRouter } from './routes/insights.js';
import { createExecutiveRouter } from './routes/executive.js';
import { computeInsights as computeInsightsPure } from './services/insights/computeInsights.js';
import { persistInsights } from './services/insights/persistInsights.js';

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
  console.warn('⚠️ Variáveis obrigatórias ainda não carregadas: SHEET_ID, N8N_API_KEY (ok durante build, falha em runtime se persistir)');
}

// Firebase Admin — em Cloud Functions usa default credentials do projeto rota-31---backend
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'rota-31---backend';
let firebaseAdminEnabled = false;
try {
  admin.initializeApp();
  firebaseAdminEnabled = true;
  console.log(`🔐 Firebase Admin inicializado | projectId=${FIREBASE_PROJECT_ID}`);
} catch (e: any) {
  console.warn('⚠️ Firebase Admin já inicializado ou falhou:', e.message);
  firebaseAdminEnabled = !!admin.apps.length;
}

// Region default — sa-east-1 (mais perto do Brasil)
setGlobalOptions({ region: 'southamerica-east1', maxInstances: 10 });

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

/**
 * Middleware: requireFeatureFlag('XP_ENABLED')
 * Bloqueia request se a flag estiver desabilitada pro usuário.
 * Usa cache 60s in-memory para reduzir reads no Firestore.
 * @story Sprint 1 / A4
 */
const flagCache = new Map<string, { flags: Record<string, boolean>; ts: number }>();
const FLAG_CACHE_TTL_MS = 60_000;

function requireFeatureFlag(flagName: string) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!firebaseAdminEnabled) return next(); // dev/test sem firebase: deixa passar
    const uid = req.authUser?.uid || 'anon';
    const cacheKey = `${uid}:${flagName}`;
    const cached = flagCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < FLAG_CACHE_TTL_MS) {
      if (cached.flags[flagName]) return next();
      return res.status(403).json({ error: `Feature ${flagName} desabilitada pra este usuário` });
    }
    try {
      const globalDoc = await admin.firestore().doc('config/featureFlags').get();
      const userDoc = uid !== 'anon'
        ? await admin.firestore().doc(`userProfiles/${uid}`).get()
        : null;
      const panicMode = globalDoc.exists && globalDoc.data()?.panicMode === true;
      const merged: Record<string, boolean> = panicMode
        ? {}
        : {
            ...(globalDoc.exists ? globalDoc.data()?.global || {} : {}),
            ...(userDoc?.exists ? userDoc.data()?.featureFlags || {} : {}),
          };
      flagCache.set(cacheKey, { flags: merged, ts: Date.now() });
      if (merged[flagName]) return next();
      return res.status(403).json({ error: `Feature ${flagName} desabilitada pra este usuário` });
    } catch (e) {
      console.warn('[requireFeatureFlag] erro:', e);
      return res.status(503).json({ error: 'Verificação de feature flag indisponível' });
    }
  };
}
// suprimir warn de import não-usado quando middleware ainda não tem consumidor
void requireFeatureFlag;

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

// Sprint 2 — Routes /api/me/* (profile, xp, badges, events) — modular em routes/me.ts
app.use('/api/me', createMeRouter(firebaseAdminEnabled));

// Sprint 2 P2 — Routes /api/insights/* + /api/executive/*
app.use('/api/insights', createInsightsRouter(firebaseAdminEnabled));
app.use('/api/executive', createExecutiveRouter({
  fetchAllInvoices: async () => {
    const rows = await sheetsRead(`${TAB_PENDENTES}!A2:AI5000`);
    const out: any[] = [];
    for (let i = 0; i < rows.length; i++) {
      const inv = adaptToInvoice(rows[i], i + 2);
      if (inv) out.push(inv);
    }
    return out;
  },
}));

/**
 * POST /api/admin/recompute-insights — admin-only trigger manual de computeInsights.
 * Substitui o Cloud Scheduler enquanto SA não tem roles/functions.admin.
 * @story Sprint 2 P2 (workaround IAM)
 */
app.post('/api/admin/recompute-insights', verifyFirebaseToken as any, requireAdmin as any, wrap(async (_req: AuthedRequest, res) => {
  if (!firebaseAdminEnabled) {
    return res.status(503).json({ error: 'Firestore não inicializado' });
  }
  const rows = await sheetsRead(`${TAB_PENDENTES}!A2:AI5000`);
  const invoices: any[] = [];
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
  const now = Date.now();
  const ms30d = 30 * 24 * 3600 * 1000;
  const current30d = invoices.filter((i) => i.detectadoEm && now - Date.parse(i.detectadoEm) < ms30d);
  const prev30d = invoices.filter((i) => {
    if (!i.detectadoEm) return false;
    const t = Date.parse(i.detectadoEm);
    return now - t >= ms30d && now - t < 2 * ms30d;
  });
  const insights = computeInsightsPure(current30d, prev30d.length);
  const persisted = await persistInsights(insights);
  res.json({ ok: true, computed: insights.length, written: persisted.written });
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

/** GET /api/feature-flags — flags do usuário logado (Sprint 1 / A4)
 *  Lê de userProfiles/{uid}.featureFlags, faz merge com global/default.
 *  Cliente cacheia 5min (useFeatureFlags Zustand store).
 */
const DEFAULT_FLAGS = {
  XP_ENABLED: false,
  INSIGHTS_ENABLED: false,
  EXECUTIVE_DASHBOARD_ENABLED: false,
  STORE_ENABLED: false,
  ONBOARDING_TOUR_ENABLED: false,
};

app.get('/api/feature-flags', wrap(async (req: AuthedRequest, res) => {
  const uid = req.authUser?.uid;
  let flags = { ...DEFAULT_FLAGS };

  if (firebaseAdminEnabled) {
    try {
      // 1) Global override
      const globalDoc = await admin.firestore().doc('config/featureFlags').get();
      if (globalDoc.exists) {
        const data = globalDoc.data() || {};
        if (data.global) flags = { ...flags, ...data.global };
        // Killswitch: se panicMode, força tudo false
        if (data.panicMode === true) {
          flags = { ...DEFAULT_FLAGS };
        }
      }

      // 2) Per-user override (não pode bypassar panicMode)
      if (uid && !(globalDoc.exists && globalDoc.data()?.panicMode)) {
        const userDoc = await admin.firestore().doc(`userProfiles/${uid}`).get();
        if (userDoc.exists) {
          const userFlags = userDoc.data()?.featureFlags;
          if (userFlags) flags = { ...flags, ...userFlags };
        }
      }
    } catch (e) {
      console.warn('[feature-flags] erro ao ler Firestore, usando defaults:', e);
    }
  }

  res.json({ flags, ts: Date.now() });
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

/** GET /api/invoices — lê APROVACOES_PENDENTES + hidrata com state Firestore
 *  Query params:
 *    status        — filtra apenas notas com este status (pendente|aprovada|negada|emitida|cancelada|denegada|erro)
 *    onlyPending   — atalho para status=pendente
 *    limit         — máximo de itens retornados (default 5000, max 5000)
 *    offset        — offset para paginação server-side (default 0)
 */
app.get('/api/invoices', wrap(async (req, res) => {
  const rows = await sheetsRead(`${TAB_PENDENTES}!A2:AI5000`);
  let invoices = rows
    .map((row, idx) => adaptToInvoice(row, idx + 2))
    .filter((inv): inv is NonNullable<typeof inv> => inv !== null);

  const status = String(req.query.status || '').toLowerCase();
  if (status) invoices = invoices.filter(i => i.status === status);
  if (String(req.query.onlyPending || '') === 'true') invoices = invoices.filter(i => i.status === 'pendente');

  invoices.sort((a, b) => {
    // Pendentes primeiro APENAS quando não há filtro de status (default Dashboard)
    if (!status) {
      if (a.status === 'pendente' && b.status !== 'pendente') return -1;
      if (a.status !== 'pendente' && b.status === 'pendente') return 1;
    }
    return new Date(b.detectadoEm).getTime() - new Date(a.detectadoEm).getTime();
  });

  const totalAll = invoices.length;
  const pendingsCount = invoices.filter(i => i.status === 'pendente').length;

  // Cap subiu de 1000 -> 5000 (Sheet tem ~3000 linhas histórico)
  const limit = Math.min(parseInt(String(req.query.limit || '5000'), 10) || 5000, 5000);
  const offset = Math.max(0, parseInt(String(req.query.offset || '0'), 10) || 0);
  const top = invoices.slice(offset, offset + limit);

  // Hidrata com snooze do Firestore (batch)
  try {
    const states = await listInvoiceStates(top.map(i => i.chaveAcesso));
    for (const inv of top) {
      const s = states[inv.chaveAcesso];
      if (s) {
        if (s.snoozeUntil) (inv as any).snoozeUntil = s.snoozeUntil;
        (inv as any).hasNotes = !!s.hasNotes;
      }
    }
  } catch {}

  res.json({ count: top.length, total: totalAll, pendings: pendingsCount, offset, limit, invoices: top });
}));

/** GET /api/invoices/:chave/notes — lista notas internas */
app.get('/api/invoices/:chave/notes', wrap(async (req, res) => {
  const notes = await listInvoiceNotes(req.params.chave);
  res.json({ count: notes.length, notes });
}));

/** POST /api/invoices/:chave/note — adiciona nota interna */
app.post('/api/invoices/:chave/note', wrap(async (req: AuthedRequest, res) => {
  const text = String(req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'text é obrigatório' });
  const user = req.authUser || { uid: 'anon' };
  const result = await addInvoiceNote(req.params.chave, { text, user });
  await writeAuditEvent({
    type: 'invoice.note',
    actor: auditActor(req),
    target: { kind: 'invoice', id: req.params.chave },
    metadata: { textLen: text.length },
  });
  res.json({ ok: true, ...result });
}));

/** PATCH /api/invoices/:chave/snooze — adiar nota */
app.patch('/api/invoices/:chave/snooze', wrap(async (req: AuthedRequest, res) => {
  const until = req.body?.until ? String(req.body.until) : null;
  const user = req.authUser || { uid: 'anon' };
  const ok = await setInvoiceSnooze(req.params.chave, until, user);
  await writeAuditEvent({
    type: until ? 'invoice.snooze' : 'invoice.unsnooze',
    actor: auditActor(req),
    target: { kind: 'invoice', id: req.params.chave },
    metadata: { until },
  });
  res.json({ ok });
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

/** POST /api/invoices/:chave/approve — webhook decisão SIM (aceita valorFreteOverride) */
app.post('/api/invoices/:chave/approve', wrap(async (req: AuthedRequest, res) => {
  const { chave } = req.params;
  const { execId, valorFreteOverride, motivoOverride } = req.body || {};
  const user = req.authUser?.name || req.authUser?.email || req.body?.user || 'desconhecido';

  const payload: any = { chave, exec: execId, acao: 'SIM', usuario: user };
  if (valorFreteOverride !== undefined && valorFreteOverride !== null) {
    payload.valorFreteOverride = Number(valorFreteOverride);
    payload.motivoOverride = motivoOverride || 'Ajustado no painel';
  }

  if (DRY_RUN) {
    console.log(`[DRY_RUN] approve ${chave} by ${user}`, payload);
    await writeAuditEvent({
      type: 'invoice.approve.dry_run',
      actor: auditActor(req),
      target: { kind: 'invoice', id: chave },
      metadata: { execId, dryRun: true, override: payload.valorFreteOverride },
    });
    return res.json({ ok: true, dryRun: true, chave, user });
  }

  const r = await fetch(N8N_WEBHOOK_DECISAO, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await r.text();
  await writeAuditEvent({
    type: 'invoice.approve',
    actor: auditActor(req),
    target: { kind: 'invoice', id: chave },
    metadata: { execId, ok: r.ok, status: r.status, override: payload.valorFreteOverride },
  });

  // Sprint 2 — Credita XP se aprovação foi sucesso e firestore + auth disponíveis
  let xpResult: any = null;
  if (r.ok && firebaseAdminEnabled && req.authUser?.uid) {
    try {
      xpResult = await creditXp({
        uid: req.authUser.uid,
        action: 'invoice_approved',
        invoiceId: chave,
      });
    } catch (e) {
      console.warn('[xp] falhou ao creditar:', e); // não bloqueia o approve
    }
  }

  res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, user, response: text, xp: xpResult });
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
 *  IMPORTANTE: este endpoint NÃO chama a API do BSOFT/SEFAZ pra cancelar oficialmente.
 *  Apenas registra o cancelamento no Sheet (STATUS=CANCELADA) + audit trail.
 *  Cancelamento oficial na SEFAZ deve ser feito manualmente no TMS Rota 31 pelo operador.
 *
 *  Body: { motivo: string (obrigatório), user?: string }
 */
app.post('/api/invoices/:chave/cancel', wrap(async (req: AuthedRequest, res) => {
  const { chave } = req.params;
  const { motivo } = req.body || {};
  const user = req.authUser?.name || req.authUser?.email || req.body?.user || 'desconhecido';

  if (!motivo || !String(motivo).trim()) {
    return res.status(400).json({ error: 'motivo é obrigatório (mínimo 3 caracteres)' });
  }
  if (String(motivo).trim().length < 3) {
    return res.status(400).json({ error: 'motivo deve ter pelo menos 3 caracteres' });
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

  // Localizar a linha no Sheet
  const rows = await sheetsRead(`${TAB_PENDENTES}!A2:AI5000`);
  let rowNumber = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === chave) { rowNumber = i + 2; break; }
  }
  if (rowNumber === -1) {
    return res.status(404).json({ error: 'NF não encontrada no Sheet' });
  }

  const now = new Date().toISOString();

  // Atualizar STATUS (col C) e TIMESTAMP_DECISAO (col N)
  try {
    await sheetsUpdate(`${TAB_PENDENTES}!C${rowNumber}`, [['CANCELADA']]);
    await sheetsUpdate(`${TAB_PENDENTES}!N${rowNumber}`, [[now]]);
  } catch (e: any) {
    console.error('Erro ao atualizar Sheet:', e);
    return res.status(500).json({ error: 'Falha ao gravar cancelamento no Sheet', detail: e.message });
  }

  // Audit trail
  try {
    await writeAuditEvent({
      type: 'invoice.cancel',
      actor: auditActor(req),
      target: { kind: 'invoice', id: chave },
      metadata: { motivo, rowNumber, timestamp: now },
    });
  } catch (e) {
    console.warn('Falha audit:', e);
  }

  res.json({
    ok: true,
    chave,
    status: 'cancelada',
    motivo,
    user,
    timestamp: now,
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

// Export Function HTTP — invoker public (frontend chama direto). API key + Bearer protegem internamente.
export const api = onRequest({ cors: false, timeoutSeconds: 60, memory: '512MiB', invoker: 'public' }, app);

// Sprint 2 P2 — Cloud Scheduler nativo desabilitado temporariamente:
// SA precisa de role `Cloud Functions Admin` (além de Editor) pra criar function
// nova com IAM policy. Por enquanto, recompute via POST /api/admin/recompute-insights.
// TODO: re-habilitar quando role for adicionado.
// export { computeInsightsScheduled } from './scheduled/computeInsights.js';
