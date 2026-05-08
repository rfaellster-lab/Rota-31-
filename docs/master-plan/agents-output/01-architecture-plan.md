# Plano de Arquitetura — Painel Rota 31 v2

*Owner: @architect (Aria) | Versão 1.0 | 2026-05-08 | Status: Approved for execution*

> **Princípio diretor:** o painel atual já tem 5 bugs corrigidos, Cloud Functions modularizado e Firestore best-effort funcionando. **Não vamos refazer. Vamos estender com cirurgia**, atrás de feature flags, mantendo backward compatibility 100%.

---

## 1. Arquitetura técnica

### 1.1 Schema novo no Firestore

Coleções existentes (manter): `users`, `auditEvents`, `notifications`, `invoiceState`, `promotions`.

Novas coleções:

```
userProfiles/{uid}
  uid, email, displayName, photoURL
  role: 'admin'|'operator'
  joinedAt: Timestamp                    # imutável (princípio governamental #1)
  carteiraId: string                     # ex: "ROTA31-2024-0001"
  carteiraQrCode: string                 # storage URL
  level: 1..100                          # derivado server-side
  rank: 'junior'|'pleno'|'senior'|'master'|'lendario'
  totalXP, currentLevelXP, nextLevelXP
  hierarchyTier: 1-5
  selos: string[]
  lastSeenAt, createdAt, updatedAt: Timestamp
  featureFlags: { XP_ENABLED, INSIGHTS_ENABLED, EXECUTIVE_DASHBOARD_ENABLED }

gamification/{uid}
  totalXP, level, rank
  streakDays, streakLastDay, longestStreak
  badges: Array<{ id, unlockedAt, rarity }>
  achievements: Array<{ id, progress, target, unlockedAt? }>
  multiplier: number
  /eventLog/{autoId}
     type, amount, reason, invoiceId?, ts

insights/{insightId}
  type, scope, title, body, ctaLabel, ctaUrl, severity
  delta, metric, validFrom, validUntil, computedAt
  metadata: { period, sample, formula }

storeItems/{itemId}
  title, description, type, costXP, image, available, stockType, rarity

storePurchases/{uid}/{purchaseId}
  itemId, costXP, redeemedAt, status
```

**Indices necessários** em `firestore.indexes.json`:
- `gamification/eventLog`: `(uid, ts DESC)`
- `insights`: `(scope, validUntil DESC, severity DESC)`
- `userProfiles`: `(rank, totalXP DESC)`

**Custo estimado:** < R$ 5/mês para 3 usuários ativos.

### 1.2 XP/Level/Badges — server-authoritative

**Regra de ouro:** XP NUNCA é calculado no cliente. Frontend só EXIBE. Evita exploits, permite rebalanceamento sem deploy, protege contra adulteração.

**Fluxo aprovação NF:**
1. `POST /api/invoices/:chave/approve`
2. Backend grava Sheets, faz audit, dispara n8n (existente)
3. NOVO: `xpEngine.compute(action, context)` calcula XP determinístico
4. Aplica multiplicadores (streak, hora premium, combo, raridade 5%)
5. Transação Firestore atômica: `gamification/{uid}` + log em `eventLog`
6. Verifica achievements + level-up
7. Retorna no response: `{ ok, xp: { gained, newTotal, leveledUp, badgesUnlocked } }`
8. Frontend anima (motion/framer) o ganho **após** confirmação backend

**Optimistic update permitido:** UI mostra "+10 XP" instantâneo, mas reconcilia com response real. Se diferir, ajusta silenciosamente.

**Curva XP:** `xpToLevel(n) = 50 * n^2 + 50 * n`

**Achievement engine declarativo:**
```ts
const ACHIEVEMENTS = [
  { id:'first_100', target:100, metric:'invoices_approved' },
  { id:'streak_30', target:30, metric:'streak_days' },
  { id:'midnight_owl', condition:(ctx)=> ctx.hour >= 22 || ctx.hour <= 5 },
];
```

### 1.3 Insights "Você está perdendo R$ X"

`functions/src/scheduled/computeInsights.ts` (Cloud Scheduler 6h em 6h):
1. Lê últimos 30-90d de invoices via Sheets
2. Calcula:
   - frete_perdido_fob_sem_regra
   - tempo_medio_aprovacao
   - nfs_negadas_sem_motivo
   - comparativo_rank_setor
3. Grava em `insights/{type}_{date}` com validUntil = +6h
4. `GET /api/insights?audience=admin` retorna ativos

Frontend lê 1x por sessão + invalida em mutações relevantes.

### 1.4 API endpoints novos

```
GET  /api/me/profile            → userProfile + gamification merged
GET  /api/me/xp                 → totalXP, level, streak (rápido)
POST /api/me/xp/event           → INTERNO (chamado por approve/deny/cancel)
POST /api/me/xp/redeem          → resgate na loja
GET  /api/me/badges             → desbloqueadas + progresso
GET  /api/me/achievements       → progresso por categoria
GET  /api/me/audit              → trilha pessoal "47.382 NFs desde X"

GET  /api/insights              → ativos pro role
POST /api/insights/:id/dismiss  → marca como visto

GET  /api/store/items           → lista loja
POST /api/store/redeem/:itemId  → resgatar

GET  /api/leaderboard           → top 10 (público interno)
GET  /api/executive/kpis        → admin only
GET  /api/executive/cohort      → admin only
GET  /api/feature-flags         → fonte servidor
```

### 1.5 Cache strategy

- **Backend:** Map in-memory por instância Cloud Function (TTL 3-5min) para flags, insights ativos, storeItems
- **Frontend:** stale-while-revalidate manual + localStorage com TTL 24h
- **Polling adaptativo:** pausar quando `document.hidden` (Page Visibility API)

---

## 2. Atomic Design (Brad Frost)

Migração gradual: novos vão na nova estrutura, antigos migram quando tocados.

### Atoms
`Toast`, `Skeleton`, `Badge`, `XPBar`, `KbdShortcut`, `InsightCard`, `RarityGlow`, `CountUp`, `Avatar`

### Molecules
`NotificationItem`, `UserMenu`, `QuickFilter`, `CTAButton`, `MetricTile`, `BadgeUnlockToast`, `StreakIndicator`, `HierarchyChip`

### Organisms
`NotificationBell`, `DashboardHeader`, `InsightSection`, `GamificationDock`, `InvoiceTable`, `ApprovalQueue`, `ExecutiveKpiGrid`, `CarteiraOperador`

### Templates
`DashboardLayout`, `HistoricoLayout`, `ExecutiveDashboardLayout`, `StoreLayout`

### Pages
Adicionar: `DashboardExecutivo` (`/executivo`), `Loja` (`/loja`), `MeuPerfil` (`/perfil`), `Achievements` (`/conquistas`)

---

## 3. State management

**Decisão:** Zustand para gamificação + Context API mantido para domínio existente.

```ts
useGamificationStore — { totalXP, level, rank, streak, badges[], optimisticEvents[] }
useFeatureFlags — { XP_ENABLED, INSIGHTS_ENABLED, ... }
useNotificationStore — { items, unreadCount, markRead(id) }
useUiStore — { sidebarCollapsed, density, theme }
```

Optimistic updates pattern:
```
1. snapshot prev state
2. aplica optimistic
3. await server
4a. sucesso: reconcile com server response
4b. erro: rollback + Toast erro
```

---

## 4. Performance budget

**Baseline:** 974 KB. **Cap:** 1.2 MB.

```ts
// vite.config.ts manualChunks
'vendor-react': ['react','react-dom','react-router-dom']
'vendor-firebase': ['firebase/app','firebase/auth']
'vendor-charts': ['recharts']     // só DashboardExecutivo
'vendor-motion': ['motion']
'vendor-icons': ['lucide-react']
```

Lazy:
```ts
const DashboardExecutivo = lazy(() => import('./pages/DashboardExecutivo'));
const Loja = lazy(() => import('./pages/Loja'));
```

---

## 5. Sequenciamento

**Sprint 1:** refactor preliminar (modular `routes/` + atomic design + zustand + flags + toasts/skeletons)

**Sprint 2-3:** schema gamification + xpEngine + UI + insights cron + DashboardExecutivo + carteira

**Sprint 3-4:** loja + leaderboard + achievements + cross-sell embeds

**Sprint 4-5:** hardening + bug 3 (n8n) + métricas

---

## 6. Backup & Migration

- Função one-shot `001-backfill-userProfiles.ts` lê auditEvents histórico → dá XP retroativo a Talita
- Rollback por feature flag (`XP_ENABLED=false`)
- Killswitch global em `config/featureFlags/global.panicMode`
- FTP-deploy mantém `frontend-backups/`

---

## 7. Estrutura de pastas final

```
src/
├── components/
│   ├── atoms/
│   ├── molecules/
│   ├── organisms/
│   └── templates/
├── features/
│   ├── gamification/
│   ├── insights/
│   ├── executive/
│   └── store/
├── pages/
├── stores/             (zustand)
├── store/              (legado AuthContext, InvoiceContext)
├── services/
└── lib/

functions/src/
├── routes/
│   ├── invoices.ts
│   ├── me.ts            (NOVO)
│   ├── insights.ts      (NOVO)
│   ├── executive.ts     (NOVO)
│   ├── store.ts         (NOVO)
│   └── leaderboard.ts   (NOVO)
├── scheduled/
│   └── computeInsights.ts (NOVO)
├── services/
│   ├── gamification/
│   │   ├── xpEngine.ts
│   │   ├── achievements.ts
│   │   ├── ranks.ts
│   │   └── badges.ts
│   ├── insights/
│   └── store/
└── migrations/
    └── 001-backfill-userProfiles.ts
```

---

## 8. Restrições atendidas

| Restrição | Como |
|---|---|
| Backward compatible | Nada removido; novo atrás de flag |
| Feature flags por módulo | XP, INSIGHTS, EXECUTIVE_DASHBOARD, STORE |
| Schema barato | < R$ 5/mês |
| Mobile-first | Templates responsivos + dock collapse |
| A11y | role status, focus trap, contraste WCAG AA, prefers-reduced-motion |

---

## 9. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Talita acha gamificação infantil | Tom "operador profissional", selos governamentais > ícones cartoon |
| Sócios acham insight enviesado | Mostrar fórmula clicável ("Como calculamos?") |
| Bug XP afeta confiança fiscal | XP é coleção SEPARADA de auditEvents fiscais |
| Bundle estourar 1.2 MB | analyzer Vite no CI bloqueando merge |
| Firestore custo escapa | alertas Cloud Monitoring em writes/dia |

---

## 10. Critical Files for Implementation

- `functions/src/index.ts` — refactor obrigatório em `routes/` antes da Sprint 2
- `functions/src/services/firestore.ts` — estender com `gamification`, `insights`, `userProfiles`
- `src/App.tsx` — rotas novas com `lazy()` + Suspense + `useFeatureFlags` no boot
- `src/store/InvoiceContext.tsx` — interceptar response de approve/deny pra `gamificationStore.reconcile()`
- `src/services/api.ts` — adicionar métodos novos
- `firestore.indexes.json` — popular indexes antes do primeiro deploy
- `vite.config.ts` — `manualChunks` + `chunkSizeWarningLimit`

---

**Status:** APROVADO para execução. Pronto para Sprint 1 começar com refactor preliminar.
