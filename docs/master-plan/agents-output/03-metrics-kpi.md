# 03 — Métricas, KPIs, Funil & Tracking

*Versão 1.0 | 2026-05-08 | Owner: Strat (strategist Thor4Tech) | Status: Ready for review*

> Documento estratégico de medição completo para a transformação UX/UX + cross-sell do painel Rota 31. Tudo aqui é mensurável, instrumentável via Firebase Analytics + Firestore (zero dependência paga), e desenhado para casar com os 7 Princípios Governamentais e o Grand Slam Offer descritos em `00-sumario-executivo.md`.

---

## Sumário deste documento

1. [Tese de medição](#1-tese-de-medição)
2. [North Stars (5 KPIs primários)](#2-north-stars--5-kpis-primários)
3. [KPIs secundários (15)](#3-kpis-secundários-15)
4. [Funil de conversão completo](#4-funil-de-conversão-completo)
5. [Eventos de tracking](#5-eventos-de-tracking-analytics)
6. [Dashboards de monitoramento](#6-dashboards-de-monitoramento)
7. [Plano de A/B tests (10 priorizados)](#7-plano-de-ab-tests)
8. [Sistema de alertas](#8-sistema-de-alertas)
9. [Roadmap de implementação tracking](#9-roadmap-de-implementação-tracking)
10. [LGPD & data governance](#10-lgpd--data-governance)

---

## 1. Tese de medição

> Cada decisão de produto e cada CTA precisa empurrar **uma das 5 north stars**. Se um experimento não move ao menos uma, ele não vai pra produção.

**Premissas:**
- Ferramenta-base: **Firebase Analytics (GA4) + Firestore** (já em uso no `segundo-cerebro-4094c` e funções Rota 31). Custo zero.
- Cada evento tem `user_id`, `persona`, `session_id`, `timestamp`, `value` (quando monetizável) e `context` (página/ação).
- Toda métrica tem **owner único** (Talita / Rafael / Sistema). Sem dono = não é medida.
- Cadência fixa: **diária** (operacional Rafael), **semanal** (executiva Rafael), **mensal** (revisão estratégica Rafael + alinhamento Jader/Raphael).
- Métricas qualitativas (NPS, percepção de valor) são coletadas via micropulses no painel — não via formulário externo.

---

## 2. North Stars — 5 KPIs primários

> "Se essas 5 métricas se mexem na direção certa, vencemos o jogo. Se elas estagnam, qualquer outra subida é vaidade."

### N* 1 — Receita Thor4Tech via cliente Rota 31 (MRR)

| Item | Valor |
|---|---|
| **Definição** | Soma de receita mensal recorrente Thor4Tech proveniente do CNPJ Rota 31 (transportadora) — inclui mensalidade SaaS + serviços contratados (tráfego, social, gravação, dashboard exec, consultoria) |
| **Fórmula** | `Σ(serviços_ativos[Rota31].valor_mensal) por mês` |
| **Baseline** | R$ 1.197/mês (apenas mensalidade SaaS atual) |
| **Target 30d** | R$ 1.197 (mantido — sem upsell ainda, foco em UX) |
| **Target 60d** | R$ 2.500/mês (1 upsell fechado: pacote relatório executivo OU consultoria 1:1) |
| **Target 90d** | R$ 4.500/mês (2-3 serviços ativos: SaaS + Tráfego/Social + Dashboard Exec) |
| **Instrumentação** | Firestore collection `clients/rota31/services` com `[{name, monthly_value, started_at, status}]`. Soma agregada via Cloud Function `getClientMRR(clientId)` |
| **Dono** | **Rafael** (decisão comercial); sistema reporta |
| **Cadência** | Mensal |

### N* 2 — Reuniões geradas com Jader/Raphael por mês

| Item | Valor |
|---|---|
| **Definição** | Número de reuniões agendadas e realizadas com Jader OU Raphael com pauta "novo serviço Thor4Tech" no mês |
| **Fórmula** | `count(meetings WHERE attendee IN [jader, raphael] AND topic == "thor4tech_service" AND status == "completed" AND month == current)` |
| **Baseline** | 0/mês (nunca foi medido — assumir zero) |
| **Target 30d** | 1 reunião (após Sprint 2 com dashboard exec ativo) |
| **Target 60d** | 2 reuniões/mês |
| **Target 90d** | 2-3 reuniões/mês sustentado |
| **Instrumentação** | Firestore `meetings/` com `{persona, topic, scheduled_at, completed, source_cta_id}`. Logado quando Rafael cria reunião via WhatsApp ou agenda Google Cal compartilhada |
| **Dono** | **Rafael** (executa); sistema rastreia origem (qual CTA gerou) |
| **Cadência** | Mensal |

### N* 3 — NFs/hora processadas pela Talita

| Item | Valor |
|---|---|
| **Definição** | Throughput operacional — quantas NFs (CT-e) Talita aprova/nega por hora-trabalhada-no-painel |
| **Fórmula** | `count(nf_decisions WHERE user == talita AND timestamp BETWEEN session_start AND session_end) / session_duration_hours` |
| **Baseline** | 60 NFs/hora (estimado pelo plano) |
| **Target 30d** | 90 NFs/hora (Sprint 1 — atalhos teclado + skeleton + quick filters) |
| **Target 60d** | 120 NFs/hora (Sprint 2 — bulk actions + gamificação dispara fluxo) |
| **Target 90d** | 150 NFs/hora (Sprint 3 — polish + tudo otimizado) |
| **Instrumentação** | Cada `nf_approved`/`nf_denied` event registra `user_id`, `timestamp`. Sessão definida por `session_start`/`session_end` events. Cálculo agregado por dia |
| **Dono** | **Sistema** (mede); Talita influencia indiretamente |
| **Cadência** | Diária + média semanal |

### N* 4 — Cliques mensais em CTAs Thor4Tech (cross-sell)

| Item | Valor |
|---|---|
| **Definição** | Total de cliques em CTAs com categoria "thor4tech_service" no painel SaaS (todas as personas combinadas) |
| **Fórmula** | `count(cta_clicked WHERE cta_category == "thor4tech_service" AND month == current)` |
| **Baseline** | 0 (CTAs não existem hoje) |
| **Target 30d** | 30 cliques/mês (Sprint 2 — CTAs subliminares ativos) |
| **Target 60d** | 80 cliques/mês |
| **Target 90d** | 200 cliques/mês (Sprint 3 + landing pages upsell) |
| **Instrumentação** | Evento `cta_clicked` com `cta_id`, `cta_category`, `cta_position`, `persona`, `page` |
| **Dono** | **Sistema** (mede + agrega); copywriter (otimiza copy) |
| **Cadência** | Diária |

### N* 5 — Engagement Score Diário (DAU + sessões + tempo)

| Item | Valor |
|---|---|
| **Definição** | Índice composto de 0-100 que mede vício/dependência saudável no painel. Combina sessões/dia, tempo total, ações executadas |
| **Fórmula** | `(sessions_per_day × 0.3 + log10(actions_per_day + 1) × 30 + min(time_minutes_per_day / 6, 10) × 4) × normalize_0_100` |
| **Baseline** | ~35 (4-5 sessões/dia, ~50 ações, ~4h painel) |
| **Target 30d** | 50 |
| **Target 60d** | 70 |
| **Target 90d** | 85+ (gamificação completa, painel é "casa" da Talita) |
| **Instrumentação** | Eventos `session_start`/`session_end` + count de ações por dia. Cálculo via Cloud Function diária `computeEngagementScore(userId, date)` |
| **Dono** | **Sistema** (mede); Designer/Dev (impactam via UX) |
| **Cadência** | Diária |

---

## 3. KPIs secundários (15)

> Métricas que sustentam as 5 north stars. Não vencem o jogo sozinhas mas explicam **por quê** as north stars sobem ou caem.

| # | KPI | Definição | Baseline | Target 90d | Owner |
|---|---|---|---|---|---|
| 1 | Tempo médio aprovação NF | Mediana de `time_to_decide` por NF | 8s | 3s | Sistema |
| 2 | Taxa de erro Talita | % de NFs revertidas após decisão / total decisões | desconhecido (~2% est.) | <0,5% | Talita |
| 3 | Streak médio (dias consecutivos sem erro) | Avg de `current_streak` ativos | 0 (não existe) | 12 dias | Sistema |
| 4 | XP médio por usuário | Avg(`user.xp_total`) entre usuários ativos | 0 | 8.500 | Sistema |
| 5 | Bounce rate dashboard exec | % visitas dashboard exec com `duration < 15s` | n/d | <20% | Designer |
| 6 | Abertura email semanal exec | `emails_opened / emails_sent` para newsletter Jader/Raphael | n/d (newsletter não existe) | >55% | Copywriter |
| 7 | CTR email exec → painel | `email_link_clicked / emails_opened` | n/d | >18% | Copywriter |
| 8 | Insights "Você está perdendo R$X" — taxa de visualização | `insight_viewed / insights_shown` | n/d | >70% | Designer |
| 9 | Insights — taxa de ação | `action_taken / insight_viewed` | n/d | >12% | Copywriter+Felix |
| 10 | Badges desbloqueados/mês (sistema todo) | `count(badge_unlocked WHERE month == current)` | 0 | 25+ | Sistema |
| 11 | Tempo até 1ª aprovação na sessão | Mediana de `session_start` → primeiro `nf_approved` | n/d | <30s | Designer |
| 12 | Taxa abandono página upsell | % visits LP upsell sem clicar CTA | n/d | <60% | Copywriter |
| 13 | NPS Talita (micropulse) | Média de NPS coletado in-app a cada 30 dias | n/d | >9 | Designer |
| 14 | Churn risk score Rota 31 | Score 0-100 baseado em queda de uso 4 semanas | n/d | <30 | Sistema |
| 15 | Tempo de resposta API painel (p95) | p95 latency em `/api/invoices` | desconhecido | <800ms | Dev |

---

## 4. Funil de conversão completo

> Do "Talita usa o painel" até "Jader fecha um novo serviço". Cinco etapas. Cada uma tem volume esperado, taxa de conversão, e ponto de atrito a investir.

### Mapa visual do funil

```
┌─────────────────────────────────────────────────────────────────┐
│ AWARENESS — Talita/Jader/Raphael VEEM CTA              100%    │ ← topo
│ Volume estimado: 800 impressões CTA/semana após Sprint 2        │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (taxa esperada: 15-25%)
┌─────────────────────────────────────────────────────────────────┐
│ INTEREST — clica, lê insight/landing                   ~20%    │
│ Volume esperado: 160 cliques/semana                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (taxa esperada: 30-40%)
┌─────────────────────────────────────────────────────────────────┐
│ DESIRE — sente que precisa (sinais: re-visit, time>30s) ~35%   │
│ Volume esperado: 56 leads quentes/semana                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (taxa esperada: 8-15%)
┌─────────────────────────────────────────────────────────────────┐
│ ACTION — pede info pro Rafael (msg WhatsApp / agenda)  ~12%    │
│ Volume esperado: 6-8 pedidos/semana                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (taxa esperada: 25-35%)
┌─────────────────────────────────────────────────────────────────┐
│ CLOSING — Rafael fecha contrato                        ~30%    │
│ Volume esperado: 2 fechamentos/mês (target N*2)                 │
└─────────────────────────────────────────────────────────────────┘
```

### Detalhamento por etapa

#### Etapa 1 — AWARENESS

| Item | Valor |
|---|---|
| **O que conta** | CTA "thor4tech_service" foi exibido no viewport do usuário (impression real, não só carregou no DOM) |
| **Volume mensal target (90d)** | 3.200 impressões |
| **Conversão pra próxima** | 15-25% (CTR padrão para CTAs in-app contextual) |
| **Ponto de atrito** | CTA invisível, copy fraca, momento errado |
| **Onde investir** | A/B testing copy + posicionamento + Hormozi value-stacking |
| **Eventos relevantes** | `cta_impression`, `cta_viewed_50pct` (50% visível >1s) |

#### Etapa 2 — INTEREST

| Item | Valor |
|---|---|
| **O que conta** | Clicou no CTA E permaneceu na página de destino >15s OU rolou >30% |
| **Volume mensal target (90d)** | 640 visitas qualificadas |
| **Conversão pra próxima** | 30-40% |
| **Ponto de atrito** | Landing page pobre, sem prova social, sem oferta clara |
| **Onde investir** | Landing pages dedicadas (skill `frontend-landings-claude-skill`) com Hormozi Grand Slam |
| **Eventos relevantes** | `cta_clicked`, `landing_page_view`, `landing_scroll_50`, `landing_time_30s` |

#### Etapa 3 — DESIRE

| Item | Valor |
|---|---|
| **O que conta** | Sinais de "está considerando seriamente": (a) revisitou a LP em ≤7d, (b) viu video até 50%+, (c) clicou em "saber mais", (d) baixou PDF/case |
| **Volume mensal target (90d)** | 224 leads quentes |
| **Conversão pra próxima** | 8-15% |
| **Ponto de atrito** | Falta urgência, falta gatilho de ação, falta prova de ROI |
| **Onde investir** | Insights "Você está perdendo R$ X/mês" + escassez ("3 vagas") + selo Hormozi |
| **Eventos relevantes** | `landing_revisit`, `video_50pct_watched`, `case_pdf_downloaded`, `learn_more_clicked` |

#### Etapa 4 — ACTION

| Item | Valor |
|---|---|
| **O que conta** | Pediu reunião OU mandou WhatsApp pro Rafael OU clicou "Quero contratar" |
| **Volume mensal target (90d)** | 24-32 pedidos |
| **Conversão pra próxima** | 25-35% (taxa típica Lucas Felix B2B, validada) |
| **Ponto de atrito** | WhatsApp não responde rápido, Rafael lento, falta proposta pronta |
| **Onde investir** | @lucas-felix scripts + skill `orcamento` (proposta NotebookLM em <2h) |
| **Eventos relevantes** | `meeting_requested`, `whatsapp_clicked`, `contract_intent_clicked` |

#### Etapa 5 — CLOSING

| Item | Valor |
|---|---|
| **O que conta** | Contrato assinado (Assinafy) E primeiro pagamento confirmado |
| **Volume mensal target (90d)** | 2 fechamentos |
| **Conversão pra próxima** | n/a (fim do funil) |
| **Ponto de atrito** | Objeção de preço, timing, decisão sócios |
| **Onde investir** | @alex-hormozi (oferta), @lucas-felix (objeção), case Rota 31 interno |
| **Eventos relevantes** | `contract_signed`, `first_payment_received` |

### Gaps prioritários no funil (onde investir 80% do esforço)

1. **Etapa 1→2 (Awareness→Interest):** maior volume, maior leverage. Cada +1pp de CTR = +32 leads/mês.
2. **Etapa 3→4 (Desire→Action):** maior valor unitário. Cada conversão a mais = R$ 1.500+ MRR.
3. **Etapa 4→5 (Action→Closing):** Lucas Felix entra aqui. Skill de proposta + scripts.

---

## 5. Eventos de tracking (analytics)

> Lista exaustiva de events do Firebase Analytics. Tudo com `user_id`, `session_id`, `timestamp`, `persona` (`talita` / `jader` / `raphael` / `unknown`).

### Categoria A — Operacional (Talita)

```yaml
event: nf_listed
  description: NF carregada na lista
  properties: { count, filter_status, page }

event: nf_clicked
  description: Talita clicou em NF para detalhar
  properties: { nf_id, time_in_list_before_click_s }

event: nf_approved
  description: Talita aprovou NF
  properties:
    - nf_id
    - value_brl
    - time_to_decide_ms
    - alert_count          # quantos alertas a NF tinha
    - user_xp_before
    - user_xp_after
    - xp_gained
    - streak_before
    - streak_after
    - was_bulk             # boolean — aprovação em lote

event: nf_denied
  description: Talita negou NF
  properties: { nf_id, value_brl, reason_code, time_to_decide_ms }

event: nf_bulk_action
  description: Aprovou/negou várias NFs de uma vez
  properties: { count, action, total_value_brl, duration_ms }

event: filter_changed
  properties: { from_filter, to_filter, results_count }

event: search_performed
  properties: { query_length, results_count, found: bool }

event: keyboard_shortcut_used
  properties: { shortcut: 'a|n|j|k|/|esc', context }
```

### Categoria B — Engajamento & Gamificação

```yaml
event: session_start
  properties: { entry_point, device, last_session_minutes_ago }

event: session_end
  properties: { duration_s, actions_count, nfs_processed }

event: badge_unlocked
  properties: { badge_id, badge_name, badge_rarity, total_badges_user }

event: streak_milestone
  properties: { milestone_days: 7|30|90|365, current_streak_days }

event: level_up
  properties: { from_level, to_level, total_xp }

event: prestige_earned
  properties: { prestige_level, perks_unlocked }

event: rank_changed
  properties: { from_rank, to_rank, total_users }

event: identity_card_viewed
  description: Carteira de Operador acessada
  properties: { duration_s, edited_after_view: bool }
```

### Categoria C — Cross-sell (CRÍTICA)

```yaml
event: cta_impression
  description: CTA entrou no viewport ≥1s + ≥50% visível
  properties: { cta_id, cta_category, cta_position, page, persona }

event: cta_clicked
  properties:
    - cta_id
    - cta_category   # 'thor4tech_service' | 'gamification' | 'feature'
    - cta_text
    - cta_position
    - page
    - persona
    - time_on_page_before_click_s

event: insight_shown
  description: Bloco "Você está perdendo R$ X" exibido
  properties: { insight_id, value_calculated_brl, persona }

event: insight_viewed
  description: Insight viewed >3s
  properties: { insight_id, value_calculated_brl, dwell_s }

event: insight_action_taken
  properties: { insight_id, action: 'click_cta' | 'dismiss' | 'request_info' }

event: landing_page_view
  properties: { lp_slug, referrer, persona, utm_source }

event: landing_scroll_milestone
  properties: { lp_slug, milestone: 25|50|75|100 }

event: landing_video_watched
  properties: { lp_slug, video_id, watch_pct: 25|50|75|100 }

event: case_pdf_downloaded
  properties: { case_slug, persona }

event: meeting_requested
  description: Pediu reunião via CTA painel
  properties: { source_cta_id, persona, topic }

event: whatsapp_link_clicked
  properties: { link_context, persona, message_template }

event: contract_intent_clicked
  description: Botão "Quero contratar" ou similar
  properties: { service_slug, expected_value_brl, persona }
```

### Categoria D — Dashboard Executivo (Jader/Raphael)

```yaml
event: executive_dashboard_visit
  properties: { user, sections_loaded, persona }

event: executive_widget_viewed
  properties: { widget_id, dwell_s, persona }

event: executive_export_clicked
  properties: { export_type: 'pdf' | 'xlsx', sections_included }

event: executive_compare_period_changed
  properties: { period_from, period_to, comparison_type }

event: executive_share_clicked
  properties: { destination: 'whatsapp' | 'email' | 'copy_link' }
```

### Categoria E — Email (newsletter executiva)

```yaml
event: email_sent
  properties: { campaign_id, persona, subject_line }

event: email_opened
  properties: { campaign_id, persona, opened_at, device }

event: email_link_clicked
  properties: { campaign_id, link_url, link_position, persona }

event: email_unsubscribed
  properties: { campaign_id, persona, reason }
```

### Categoria F — Performance & Erros

```yaml
event: api_response_slow
  properties: { endpoint, duration_ms, p95_threshold_ms }

event: error_shown
  properties: { error_code, page, recovery_action_available: bool }

event: skeleton_shown
  properties: { duration_ms, page }

event: feature_flag_evaluated
  properties: { flag_name, variant, persona }
```

**Total de eventos: 38** distintos cobrindo todos os fluxos críticos.

---

## 6. Dashboards de monitoramento

> 3 dashboards distintos. Cada um tem audiência fixa, cadência fixa e widgets fixos. Sem pivotar — se a pergunta é nova, é dashboard novo.

### Dashboard 1 — Executivo Rafael (cadência: semanal, segunda 8h)

**Audiência:** Rafael apenas. Foco: receita + conversões + risco.

| # | Widget | Tipo | Métrica |
|---|---|---|---|
| 1 | MRR Rota 31 — sparkline 12 semanas | Line chart | N* 1 |
| 2 | Reuniões Jader/Raphael — mês corrente | Big number + comparação mês anterior | N* 2 |
| 3 | Funil de conversão — etapas 1-5 | Funnel chart com volume + % | Funil completo |
| 4 | Top 5 CTAs com mais cliques | Bar chart | `cta_clicked` agrupado |
| 5 | Churn risk score Rota 31 | Gauge 0-100 com semáforo | KPI #14 |
| 6 | Próximas ações automáticas (queue) | Lista | Pendências do sistema |
| 7 | NPS Talita — última coleta | Score gigante | KPI #13 |

### Dashboard 2 — Operacional Rafael (cadência: diária, 7h)

**Audiência:** Rafael. Foco: saúde do produto + erros.

| # | Widget | Tipo | Métrica |
|---|---|---|---|
| 1 | NFs processadas hoje (Talita) | Big number + meta diária | N* 3 derivado |
| 2 | Tempo médio aprovação — últimos 7 dias | Line chart | KPI #1 |
| 3 | Engagement score Talita (hoje vs média 30d) | Gauge | N* 5 |
| 4 | Erros nas últimas 24h | Tabela com top 5 | `error_shown` |
| 5 | Latência API p95 (24h) | Line chart com threshold | KPI #15 |
| 6 | Sessões ativas agora | Big number live | session_start sem session_end |
| 7 | Alertas pendentes | Lista | sistema de alertas |

### Dashboard 3 — Jader/Raphael (in-app, sempre visível)

**Audiência:** sócios donos Rota 31. Foco: receita + economia + status.

> Esse dashboard é **dentro do painel Rota 31**, não fora. É parte do produto. Cada widget é também CTA disfarçado.

| # | Widget | Tipo | Métrica + CTA disfarçado |
|---|---|---|---|
| 1 | Receita processada este mês | Big number animado | "Sua transportadora processou R$ X em CT-e" + selo Thor4Tech |
| 2 | Economia gerada pela Thor4Tech | Big number + comparativo | "Você economizou R$ X com automação" → CTA "Veja o relatório completo" |
| 3 | Performance vs setor | Comparativo | "Você está 23% acima da média de transportadoras do mesmo porte" + CTA premium |
| 4 | Insight semanal — "Você está perdendo R$ X" | Card persuasivo | Insight calculado + CTA reunião |
| 5 | NFs processadas — heatmap 90 dias | Heatmap calendário | Demonstra dependência criada |
| 6 | Equipe operacional ranking | Ranking com Talita destacada | Reforça status Talita + identidade ligada ao produto |
| 7 | Próximas vagas Premium | Card com escassez | "3 vagas no programa de Tráfego em maio" |

---

## 7. Plano de A/B tests

> 10 experimentos priorizados. Cada um com hipótese, variantes, métrica primária, sample size, duração esperada. **Apenas 1 ativo por vez no mesmo segmento** para evitar interação.

| # | Experimento | Hipótese | Variante A (controle) | Variante B | Métrica primária | Sample size mín. | Duração |
|---|---|---|---|---|---|---|---|
| 1 | **Copy CTA principal Talita** | Hormozi value-stacking aumenta CTR | "Quer relatório executivo?" | "Você está perdendo R$ 2.300/mês — veja como recuperar" | CTR (`cta_clicked`/`cta_impression`) | 800 impressões | 7 dias |
| 2 | **Posição CTA Jader/Raphael** | Topo do dashboard converte mais que rodapé | Rodapé do dashboard | Header sticky no dashboard | CTR | 500 imp. | 14 dias |
| 3 | **Insight Hormozi vs Insight neutro** | Linguagem de perda > linguagem de ganho | "Otimize sua operação" | "Você está perdendo R$ X/mês" | `insight_action_taken` rate | 400 views | 10 dias |
| 4 | **Gamificação visível vs invisível** | Mostrar XP+streak aumenta engagement | UI sem gamificação | UI com badges + XP visível | Engagement Score (N* 5) | 30 sessões/variante | 21 dias |
| 5 | **Carteira de Operador on/off** | Identidade visual cria lock-in | Sem carteira | Com carteira (foto+QR+histórico) | Sessões/dia (KPI derivado) | 14 dias por braço | 30 dias |
| 6 | **Email exec semanal — assunto** | Pergunta > afirmação no subject | "Relatório semanal Rota 31" | "Você sabia que perdeu R$ X esta semana?" | Open rate (KPI #6) | 50 envios/variante | 4 envios |
| 7 | **Streak reward — flat vs variable** | Recompensa variável (Skinner) > fixa | XP fixo a cada NF | XP variável + chance de raridade | NFs/hora (N* 3) | 2 semanas/variante | 28 dias |
| 8 | **Quick filters — dropdown vs chips** | Chips reduzem tempo de filtro | Dropdown atual | Chips inline com contadores | Tempo médio aprovação (KPI #1) | 200 sessões | 14 dias |
| 9 | **Landing upsell — vídeo vs texto** | Vídeo aumenta conversão action | LP só com texto + bullets | LP com vídeo Rafael 90s no topo | LP→Action rate (etapa 3→4) | 200 visits/variante | 21 dias |
| 10 | **Escassez declarada** | Escassez genuína converte mais | "Agendar reunião" | "Agendar reunião — 3 vagas em maio" | Meeting requests (KPI etapa 4) | 100 imp/variante | 14 dias |

**Critério de victory:** mínimo 95% confidence (chi-squared test) + lift ≥10% relativo no outcome principal. Caso contrário, mantém controle.

**Ordem de rollout:** 1 → 2 → 3 → 4 (Sprint 2) → 5-7 (Sprint 3) → 8-10 (Sprint 4).

---

## 8. Sistema de alertas

> Alertas via WhatsApp pro Rafael (Uazapi `https://acria.uazapi.com`) usando workflow n8n. Severidade clara, sem alarme falso, com ação sugerida.

### Alertas críticos (P1 — disparam imediatamente, dia ou noite)

| Trigger | Condição | Ação sugerida |
|---|---|---|
| **Pipeline NF parou** | `nf_approved == 0` por >2h em horário comercial | Verificar workflow n8n + credenciais BSOFT (vide `rota31-bug-nfloss.md`) |
| **Latência API p95 > 3s** | p95 `/api/invoices` > 3000ms por 15min | @verifier diagnostica |
| **Engajamento Talita caiu 30%** | Engagement Score 7d < 70% do baseline 30d | Conversa com Talita, possível churn signal |
| **Conversão funil Etapa 4→5 zerou** | `contract_signed == 0` por 30 dias E `meeting_requested >= 3` | Revisar oferta com Lucas Felix + Hormozi |

### Alertas importantes (P2 — dia útil 8h-19h)

| Trigger | Condição | Ação sugerida |
|---|---|---|
| **CTR caiu 20% w/w** | CTR semana atual < 80% semana anterior em CTAs principais | Copywriter revisa copy |
| **Churn risk > 80** | Score 0-100 sobe acima de 80 | Reunião urgente com Jader |
| **Bug rate > 1%** | `error_shown / sessions > 1%` em 7 dias | @verifier + @dev investigam |
| **NPS caiu** | NPS última coleta < NPS coleta anterior - 1 ponto | Conversa qualitativa Talita |

### Alertas de oportunidade (P3 — review semanal)

| Trigger | Condição | Ação sugerida |
|---|---|---|
| **Lead quente Jader** | Jader clicou ≥3 CTAs premium na semana | Lucas Felix prepara abordagem |
| **Lead quente Raphael** | Raphael baixou ≥2 PDFs de case | Reunião proativa com proposta de ROI |
| **Streak Talita 90 dias** | Marco psicológico — alavancar | Email de reconhecimento + brinde |
| **Talita LinkedIn ativo** | Sinal externo de avaliar mudar emprego (se monitorável) | Reforçar identidade in-app |

### Estrutura técnica do sistema de alertas

```
Cloud Function diária (00:30 BRT) → Roda checagem das 12 regras
  → Para cada match, dispara workflow n8n WF03 (Meta Alerts)
    → Envia mensagem Uazapi para 5511980470203 (Rafael)
      → Loga em Firestore alerts/ (auditoria)
        → Se P1: também escala via @verifier auto-dispatch
```

---

## 9. Roadmap de implementação tracking

> Ordem de implementação dos eventos. Não dá pra instrumentar tudo no Sprint 1 — escolher os críticos primeiro.

### Sprint 1 — Fundação (instrumentação básica)

**Objetivo:** medir o que JÁ existe + preparar para Sprint 2.

- [x] `session_start`, `session_end`
- [x] `nf_approved`, `nf_denied`, `nf_bulk_action`
- [x] `filter_changed`, `search_performed`
- [x] `keyboard_shortcut_used`
- [x] `error_shown`, `skeleton_shown`
- [x] `api_response_slow`
- Setup Firebase Analytics + property + DebugView
- Setup user properties (`persona`, `client_id`, `role`)
- Cloud Function `recordEvent(eventName, properties)` centralizada
- Dashboard 2 (Operacional Rafael) — versão MVP

### Sprint 2 — CTAs e Cross-sell (core do negócio)

**Objetivo:** Capturar TUDO do funil de cross-sell.

- [ ] `cta_impression`, `cta_clicked`
- [ ] `insight_shown`, `insight_viewed`, `insight_action_taken`
- [ ] `landing_page_view`, `landing_scroll_milestone`
- [ ] `meeting_requested`, `whatsapp_link_clicked`, `contract_intent_clicked`
- [ ] `executive_dashboard_visit`, `executive_widget_viewed`
- [ ] `email_sent`, `email_opened`, `email_link_clicked`
- Dashboard 1 (Executivo Rafael) — versão completa
- Dashboard 3 (Jader/Raphael in-app) — V1
- Sistema de alertas P1+P2 ativo
- A/B tests #1, #2, #3, #4

### Sprint 3 — Gamificação e Identidade

**Objetivo:** Capturar lock-in psicológico.

- [ ] `badge_unlocked`, `streak_milestone`, `level_up`, `prestige_earned`
- [ ] `rank_changed`, `identity_card_viewed`
- [ ] `landing_video_watched`, `case_pdf_downloaded`
- A/B tests #5, #6, #7
- Engagement Score (N* 5) cálculo automático diário
- Churn risk score automatizado

### Sprint 4 — Polish e oportunidades

**Objetivo:** Refinar + ativar P3 alertas.

- [ ] Eventos restantes (`feature_flag_evaluated`, `executive_compare_period_changed`, etc.)
- A/B tests #8, #9, #10
- Sistema de alertas P3 (oportunidades quentes)
- Relatório anual gigante (gerado via Cloud Function)
- Dashboard 1 com forecast (regressão simples 4-6 semanas)

---

## 10. LGPD & data governance

> Tracking de produção em SaaS B2B com pessoa física (Talita, Jader, Raphael) é regulado pela LGPD. Aqui é como ficamos compliance.

### Princípios

1. **Finalidade legítima:** todo evento serve operação do produto OU melhoria do produto. Sem revenda, sem terceiros.
2. **Minimização:** não coletar dado que não é usado em decisão. Se não vira dashboard ou alerta, não loga.
3. **Anonimização parcial:** PII (nome, email) ficam em `users/` separado dos events. Events usam `user_id` hash.
4. **Direito de acesso:** Talita pode pedir export dos próprios dados (Cloud Function `exportMyData(userId)`).
5. **Direito de exclusão:** se Talita sair, Rota 31 pede deletion → Cloud Function `purgeUserData(userId)` em 30 dias.
6. **Consentimento explícito:** primeira sessão exibe banner "este painel coleta dados de uso para melhorar a operação. Você aceita?". Sem aceite → eventos críticos rodam (operacional), eventos de cross-sell não.

### Mapa de dados

| Categoria | Onde armazena | TTL | PII? |
|---|---|---|---|
| Events analytics | Firebase Analytics | 14 meses (default GA4) | Não (user_id hash) |
| Event detalhes | Firestore `events/` | 24 meses | Não |
| User profile | Firestore `users/` | enquanto ativo | Sim — protegido por security rules |
| Sessions | Firestore `sessions/` | 6 meses | Hash |
| Logs Cloud Functions | GCP Logging | 30 dias | Não |
| Backups | Storage Firebase | 12 meses | Sim — encrypted at rest |

### Security rules — checagens

```
users/{uid} — só o próprio user OU admin (rafael) lê
events/{id} — só sistema escreve (Cloud Function); só admin lê agregado
sessions/{id} — só o próprio user lê o próprio + admin
clients/rota31/services — só admin (Rafael) lê/escreve
```

### Cookie / consent

- Banner LGPD primeira sessão (componente `<LGPDConsent />`)
- Aceite vai pra `users/{uid}/consent`
- Se sem aceite: rodar APENAS eventos operacionais (sem `cta_*`, sem `landing_*`)

---

## Encerramento

Este documento é a **fonte da verdade de medição** para a transformação do painel Rota 31. Tudo que for implementado precisa apontar pra ao menos uma das **5 north stars**. Tudo que for medido tem **owner único e cadência fixa**. Tudo que for coletado é **LGPD-compliance e mensurável zero-cost** via Firebase.

**Próximos passos sugeridos:**
1. Rafael revisa este documento (15min de leitura crítica)
2. Aprovação ou ajustes nos targets 30/60/90
3. @dev e @data-engineer preparam Cloud Functions do Sprint 1
4. @copywriter alinha CTAs com IDs do tracking (#1-#10 dos A/B tests)
5. @aios-master orquestra o rollout em paralelo aos outputs dos outros agentes (Plan, Lucas Felix)

**Revisão recomendada:** semanal nos primeiros 30 dias, depois mensal.
