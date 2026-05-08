# 🗓️ Roadmap consolidado — 5 Sprints até R$ 4.500/mês

*Versão 1.0 | 2026-05-08 | Consolidação dos 4 outputs (architect + copywriter + strategist + lucas-felix)*

---

## 🎯 North Stars confirmadas (Strategist)

| N* | Métrica | Baseline | 30d | 60d | 90d | Owner |
|---|---|---|---|---|---|---|
| 1 | MRR Thor4Tech via Rota 31 | R$ 1.197 | R$ 1.197 | R$ 2.500 | R$ 4.500 | Rafael |
| 2 | Reuniões com Jader/Raphael/mês | 0 | 1 | 2 | 2-3 | Rafael |
| 3 | NFs/hora processadas Talita | 60 | 90 | 120 | 150 | Sistema |
| 4 | Cliques mensais em CTAs | 0 | 30 | 80 | 200 | Sistema |
| 5 | Engagement Score Diário | ~35 | 50 | 70 | 85+ | Sistema |

---

## ⏰ Filosofia comercial (Lucas-Felix)

> **Mês 1-3 = ZERO venda direta.** Só execução impecável + relatório semanal informal + primeira pergunta investigativa (mês 3). Plant first, harvest later.
> 
> **Mês 4-6:** primeira oferta (tráfego pago R$ 1.500/mês)
> 
> **Mês 7-9:** monitoring + segunda oferta (site institucional R$ 2.500 setup)
> 
> **Mês 10-12:** cross-sell #3 (BI R$ 600/mês) + consultoria recorrente

**Crítico:** Reunião trimestral presencial em SP. Folha A4 impressa, NÃO laptop. 60min ritualizados.

---

## 📅 Sprint 1 — Refactor + UX Essencial (Semana 1)

**Objetivo:** Preparar terreno técnico + entregar UX wins imediatos.

### Refactor preliminar (obrigatório antes de qualquer feature nova)

| Story | Quem | Tempo |
|---|---|---|
| Modularizar `functions/src/index.ts` em `routes/` | dev (Dex) | 4h |
| Criar estrutura `atoms/molecules/organisms/templates/` em `src/components/` | dev | 2h |
| Instalar Zustand + criar 4 stores base | dev | 2h |
| Endpoint `/api/feature-flags` + middleware `requireFeatureFlag` | dev | 3h |
| `firestore.indexes.json` com indexes novos | data-engineer | 1h |
| `vite.config.ts` com `manualChunks` + chunkSizeWarningLimit | dev | 1h |

### Stories de UX essencial (impacto direto Talita)

| # | Story | Agentes | Tempo | KPI impactado |
|---|---|---|---|---|
| S1-01 | Toasts no lugar de `alert()` | dev + design-reviewer | 3h | NPS Talita |
| S1-02 | Skeleton screens | dev | 2h | LCP percebido |
| S1-03 | Atalhos de teclado (A, N, J/K, /, Esc) | dev | 4h | NFs/hora |
| S1-04 | Indicador "última atualização há Xs" | dev | 2h | Confiança |
| S1-05 | Quick filter chips (Hoje, Com Alerta, etc) | dev | 3h | Cliques/dia |
| S1-06 | Bulk approve inteligente (50+ NFs) | dev + verifier | 5h | NFs/hora |
| S1-07 | Sticky table header | dev | 1h | UX |
| S1-08 | Empty states com personalidade | dev + copywriter | 2h | Engagement |
| S1-09 | Onboarding tour (react-joyride) | dev + copywriter | 4h | Time to value |

**Total Sprint 1:** ~40h dev + 4h review = ~5 dias úteis

**Critérios de aceite:**
- Todos os 9 stories deployados em prod
- Verifier PASS runtime real
- NFs/hora sobe de 60 → 80+ (medido em 3 dias após deploy)
- Console limpo, mobile OK, sem regressão

---

## 📅 Sprint 2 — Gamificação base + Insights + Dashboard Exec (Semana 2-3)

**Objetivo:** Plantar semente da identidade fundida + começar cross-sell sutil.

### Backend (obrigatório primeiro)

| Story | Quem | Tempo |
|---|---|---|
| Schema Firestore (userProfiles, gamification, insights, storeItems) | data-engineer + architect | 4h |
| `xpEngine.compute(action, context)` server-side | dev + architect | 8h |
| Endpoints `/me/profile`, `/me/xp`, `/me/badges` | dev | 6h |
| Cloud Scheduler `computeInsights.ts` (6h em 6h) | devops + dev | 4h |
| Endpoint `/insights` + lógica calc 4 métricas | dev | 6h |
| Migration `001-backfill-userProfiles.ts` (XP retroativo Talita) | dev | 3h |

### Frontend

| Story | Quem | Tempo |
|---|---|---|
| Atom `<XPBar>` com motion + CountUp | dev | 3h |
| Atom `<Toast>` (já feito Sprint 1) — variant para badge unlock | dev | 2h |
| Organism `<GamificationDock>` (fixed bottom-right) | dev + design-reviewer | 5h |
| Organism `<InsightSection>` no Dashboard | dev | 4h |
| Page `<DashboardExecutivo>` (6 linhas widgets do Felix) | dev + design-reviewer | 8h |
| Organism `<CarteiraOperador>` (modal RG-style) | dev + nano-banana-generator | 4h |
| Optimistic updates approve/deny com XP reconcile | dev | 4h |

### CTAs subliminares (Copywriter)

| Story | Quem | Tempo |
|---|---|---|
| Categoria A (Insights "perdendo") — 10 CTAs no Dashboard | dev + copywriter | 3h |
| Categoria E (Email semanal) — workflow n8n | aios-master + n8n-safe-edit | 6h |
| Categoria H (Pós-celebração) — 5 CTAs em modais | dev + copywriter | 2h |

### Métricas (Strategist)

| Story | Quem | Tempo |
|---|---|---|
| 38 events analytics (Firebase Analytics) instrumentados | dev + strategist | 6h |
| Dashboard Looker Studio (Rafael executivo + ops) | strategist | 4h |
| Sistema de alertas P1/P2/P3 via Uazapi | devops | 3h |

**Total Sprint 2:** ~75h trabalho técnico + 5h review = ~10 dias úteis

**Critérios de aceite:**
- Talita com XP retroativo correto
- 1+ insight aparecendo no dashboard executivo
- DashboardExecutivo carrega <2s (lazy + chunk)
- 1 CTA Hormozi clicado pelo Jader/Raphael na 1ª semana
- Email semanal disparando segunda 9h
- Tracking events 100% instrumentados

---

## 📅 Sprint 3 — Polish + Cross-sell ativo + Loja XP (Semana 4)

**Objetivo:** Vício saudável + primeira oferta comercial.

### Loja XP

| Story | Quem | Tempo |
|---|---|---|
| Page `<Loja>` com 14 itens iniciais | dev + designer | 6h |
| Endpoint `/api/store/redeem/:itemId` | dev | 3h |
| Sistema moedas (currency separada de XP) | dev + data-engineer | 4h |
| Caixas misteriosas (random rewards) | dev + copywriter | 3h |

### Achievements completos

| Story | Quem | Tempo |
|---|---|---|
| 30 badges principais (onboarding + maestria + streaks) | dev + nano-banana-generator | 6h |
| 10 achievements secretos (Coruja, Madrugador, etc) | dev | 3h |
| Animação unlock + share WhatsApp | dev + copywriter | 4h |

### Cross-sell ativo

| Story | Quem | Tempo |
|---|---|---|
| Landing page `/upsell/trafego` | frontend-landings-claude-skill | 6h |
| Landing page `/upsell/site-institucional` | frontend-landings-claude-skill | 6h |
| Landing page `/upsell/dashboard-bi` | frontend-landings-claude-skill | 4h |
| Categoria B (Você sabia?) — 10 CTAs rotativos | dev + copywriter | 3h |
| Card "🚀 Acelerar operação" sempre visível | dev + copywriter | 2h |

### Streaks + Hierarquia visual

| Story | Quem | Tempo |
|---|---|---|
| Daily streak counter + loss aversion notification | dev + copywriter | 4h |
| Hierarquia 5 níveis com selos visuais | designer + dev | 4h |
| Leaderboard semanal (top 10 XP) | dev | 3h |
| Combo multiplier visual | dev + design-reviewer | 3h |

**Total Sprint 3:** ~64h + 4h review = ~9 dias úteis

**Critérios de aceite:**
- Talita usa loja (>2 redeems/mês)
- 3 landing pages no ar
- Streak médio >7 dias
- 10+ badges desbloqueados pela Talita
- Cliques mensais em CTAs > 30

---

## 📅 Sprint 4 — Hardening + BUG 3 (Semana 5)

**Objetivo:** Operação 100% sólida + métrica "Total Emitidos" real.

### BUG 3 — Workflow Avisos atualizar STATUS=EMITIDO

| Story | Quem | Tempo |
|---|---|---|
| Architect (Plan agent) lê workflow Avisos completo | Plan | 1h |
| Backup obrigatório + diff cirúrgico | aios-master + n8n-safe-edit | 2h |
| Apresentar diff pro Rafael (gate humano) | — | — |
| PUT em produção + readback | aios-master | 1h |
| Verifier runtime real com volume (lição quota Sheets) | verifier | 1h |
| Validar dashboard "Total Emitidos" reflete | verifier + qa | 1h |

### Hardening

| Story | Quem | Tempo |
|---|---|---|
| Migrar dedup do Avisos pro Firestore (anti quota Sheets) | dev + data-engineer | 8h |
| Rate-limit no n8n (Wait 200ms entre items) | aios-master + n8n-safe-edit | 3h |
| Mover credenciais hardcoded → `$credentials` n8n | aios-master + n8n-safe-edit | 2h |
| HMAC no webhook `/processar-decisao-cte` | dev + architect | 4h |
| Limpar 3 nós órfãos workflow Avisos | aios-master + n8n-safe-edit | 1h |
| Reduzir bundle pra <1.0 MB (code-split rigoroso) | dev | 4h |
| A11y completa (ARIA labels, focus trap, prefers-reduced-motion) | dev + design-reviewer | 6h |
| Service Worker + offline mode | dev | 4h |

### Métricas finais

| Story | Quem | Tempo |
|---|---|---|
| Dashboard Looker fechado (executive + ops + jader-in-app) | strategist | 4h |
| Sistema A/B test framework | dev + strategist | 6h |
| Documentação operacional final | analyst | 4h |

**Total Sprint 4:** ~50h + 6h review = ~7 dias úteis

**Critérios de aceite:**
- BUG 3 corrigido e validado em runtime
- Quota Sheets nunca mais estoura
- Bundle <1.0 MB
- 100% A11y (Lighthouse > 95)
- Métricas dashboard completo no ar
- Zero alertas P1 em 7 dias seguidos

---

## 📅 Sprint 5 — Comercial Mês 4 (1ª oferta) (Semana 6+)

**Objetivo:** Reunião presencial Jader/Raphael + 1ª oferta comercial.

### Pré-reunião

| Story | Quem | Tempo |
|---|---|---|
| Dossiê estratégico via `dossie-ia` | Rafael + skill | 2h |
| Folha A4 impressa com 5 dados-chave | Rafael + analyst | 1h |
| Material 1ª oferta (tráfego pago R$ 1.500/mês) | lucas-felix + orcamento | 3h |

### Reunião 60min em SP

```
0-10min  → rapport (não falar de venda)
10-25min → dados em folha A4 (ROI mostrado, não dito)
25-40min → 3 insights "dinheiro na mesa"
40-55min → UMA oferta lógica (tráfego)
55-60min → próximo passo (sim/talvez/não)
```

### Pós-reunião

| Story | Quem | Tempo |
|---|---|---|
| Follow-up D+1 (sequência 5 toques se "talvez") | lucas-felix | constante |
| Setup tráfego se "sim" | thor4tech-traffic + Trafik | 1 semana |
| Atualizar score de saúde do cliente | sistema | auto |

---

## 🚦 Gates obrigatórios (regras criadas)

| Gate | Quando | Regra |
|---|---|---|
| Backup obrigatório PRE-deploy | Sempre | `mandatory-backup-before-deploy.md` |
| Verifier após deploy | Sempre | `verifier-mandatory-after-deploy.md` (PARTIAL = bloqueia) |
| @verifier em troubleshooting | Bug runtime | `mandatory-verifier-on-investigation.md` |
| Self-learning após fix | Sempre | `mandatory-self-learning.md` |
| Routing pro agente certo | Sempre | `mandatory-agent-routing.md` |
| Diff visual antes de PUT n8n | Sempre | skill `n8n-safe-edit` |

---

## 🎯 Marcos de sucesso (visíveis pro Rafael)

| Marco | Quando | Como saber |
|---|---|---|
| Sprint 1 entregue | Semana 1 | Talita confirma "tá mais rápido" |
| Sprint 2 entregue | Semana 3 | Jader entra no `/executivo` 1ª vez |
| Sprint 3 entregue | Semana 4 | 1ª compra na loja XP da Talita |
| Sprint 4 entregue | Semana 5 | "Total Emitidos" mostra valor real |
| 1ª reunião com sócios | Semana 6 (mês 4) | Folha A4 + sim/não |
| 1ª oferta aceita | Mês 6 | Tráfego no ar |
| 2ª oferta aceita | Mês 9 | Site institucional fechado |
| 3ª oferta aceita | Mês 12 | BI + Consultoria recorrente |

**Marco final:** **R$ 4.500/mês recorrente da Rota 31 em 12 meses**.

---

## 🔁 Loop de retroalimentação

A cada fim de sprint:
1. `analyst` faz retrospectiva
2. Atualiza `memory/aios-log.md` + `memory/clients/rota31.md`
3. Identifica regras novas a criar
4. Atualiza `09-pipeline-multi-agent.md` com aprendizados
5. Score de saúde Rota 31 atualizado
6. Apresenta resumo executivo pro Rafael

---

## ⚠️ Riscos macro do roadmap

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Talita não adota gamificação | BAIXA | Tom "operador profissional", não infantil |
| Jader/Raphael não respondem ao Dashboard Exec | MÉDIA | Lucas-felix call mês 4 (presencial) |
| Quota Sheets estoura de novo | MÉDIA | Sprint 4 migra dedup pro Firestore |
| n8n quebra em Sprint 4 (BUG 3) | MÉDIA | Rollback em <30s + verifier obrigatório |
| Bundle estoura 1.2 MB | BAIXA | CI bloqueia merge se passar |
| Cross-sell fica forçado/agressivo | MÉDIA | Lucas-felix valida cada CTA antes de deploy |
| Sócio acha "sistema enviesado" | BAIXA | Toda métrica mostra fórmula clicável |

---

## 📊 KPIs de acompanhamento por sprint

```
SEMANA  N*1 MRR  N*2 RM  N*3 NF/h  N*4 CTAs  N*5 ENGAGE  HEALTH
   0    R$1197    0       60        0          35         baseline
   1    R$1197    0       80        0          40         Sprint 1 OK
   2    R$1197    0       100       5          50         Sprint 2 mid
   3    R$1197    0       110       15         60         Sprint 2 done
   4    R$1197    0       125       30         70         Sprint 3 done
   5    R$1197    0       140       50         80         Sprint 4 done
   6    R$1197    1       150       70         85         Reunião
   ...
   12   R$4500+   2-3     150       200+       85+        Goal
```

---

**Status:** Roadmap aprovado. Pronto pra Rafael dar o go pra Sprint 1.
