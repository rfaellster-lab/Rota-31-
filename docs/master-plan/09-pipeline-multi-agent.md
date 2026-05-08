# 🤖 Pipeline Multi-Agent — Como executar 5 sprints sem queimar tokens

*Versão 1.0 | 2026-05-08 | Referenciado em 00-sumario-executivo.md*

---

## 🎯 Tese

> Cada agente faz O QUE FOI FEITO PARA ELE. Claude main vira ORQUESTRADOR, não executor.
> Background paralelo onde possível. Foreground sequencial onde houver dependência.

---

## 🗺️ Mapa completo: agente por responsabilidade

### Pesquisa e estratégia (Sprint 0)

| Agente | Skill ativada | Responsabilidade | Modo |
|---|---|---|---|
| `Plan` (architect/Aria) | `architect-first` | Arquitetura técnica + atomic design + schema Firestore | background |
| `copywriter` (The One) | `thor4tech:agents:copywriter` | 50+ CTAs Hormozi + microcopy + tom Rafael | background |
| `strategist` (Strat) | `thor4tech:agents:strategist` + `thor4tech:tasks:analise-kpis` | KPIs + funil + métricas + tracking | background |
| `lucas-felix` (Felix) | nativo | Estratégia comercial Jader/Raphael + scripts de fechamento | background |
| `tech-search` | skill | Pesquisa de concorrentes Rota 31 (transportadoras com painel) | sob demanda |

### Design (Sprint 1)

| Agente | Skill ativada | Responsabilidade | Modo |
|---|---|---|---|
| `design-system:brad-frost` | nativo | Atomic design — tokenizar atoms, molecules, organisms | foreground |
| `design-system:dan-mall` | nativo | Hot Potato process (design + dev colaborativo) | foreground |
| `design-system:dave-malouf` | nativo | Interaction design — micro-interações, animations | foreground |
| `design-system:design-chief` | nativo | Liderança e revisão final | foreground |
| `nano-banana-generator` | skill | Geração de imagens (badges, avatars, ilustrações) | background batch |

### Implementação (Sprint 2-3)

| Agente | Skill ativada | Responsabilidade | Modo |
|---|---|---|---|
| `dev` (Dex) | nativo + `coderabbit-review` | Implementação React + TS + Tailwind | foreground por feature |
| `data-engineer` (Dara) | nativo | Schema Firestore + indexes + migrations | foreground antes de dev |
| `architect` | nativo | Validação arquitetural antes de dev | foreground |
| `aios-master` (Orion) | nativo | Orquestração + execução de tasks complexas | foreground multi-step |

### Validação (durante e após)

| Agente | Skill ativada | Responsabilidade | Modo |
|---|---|---|---|
| `verifier` (Proof) | nativo | Runtime real após cada deploy | background pós-PUT |
| `qa` (Quinn) | nativo + `checklist-runner` | Quality gate formal | foreground após verifier |
| `design-reviewer` (Lens) | nativo | Validação visual UI | foreground antes de deploy |
| `code-review:code-review` | skill | Code review automático | background pré-merge |

### Deploy (Sprint 1+)

| Agente/Skill | Responsabilidade | Modo |
|---|---|---|
| `devops` (Gage) + `n8n-safe-edit` | Edição segura n8n (BUG 3 ainda pendente) | foreground com gate |
| `devops` + `firebase deploy` | Deploy Cloud Functions | foreground |
| `ftp-deploy` skill | Deploy frontend FTP Hostgator | foreground |
| `deploy-pipeline` skill | Setup CI/CD futuro | sob demanda |

### Cross-sell ativo (Sprint 2-3)

| Agente | Skill ativada | Responsabilidade | Modo |
|---|---|---|---|
| `frontend-landings-claude-skill` | skill | Landing pages de upsell (tráfego pago, site, NFS-e) | background batch |
| `dossie-ia` | skill | Dossiê estratégico pra Jader/Raphael trimestral | sob demanda |
| `orcamento` | skill | Proposta comercial via NotebookLM | sob demanda |
| `instagram-carousel-architect` | skill | Carrossel pra rede Rota 31 (próximo passo) | sob demanda |

### Documentação e memória

| Agente | Skill | Responsabilidade |
|---|---|---|
| `analyst` (Alex) | nativo | Síntese final + relatórios executivos |
| `consolidate-memory` | skill | Limpa e consolida `MEMORY.md` ao fim de cada sprint |
| `architect:tasks:document-project` | nativo | Documentar arquitetura no fim |

---

## 🎬 Cenário-tipo de execução

### Exemplo: Sprint 1, feature "Toasts no lugar de alert"

```
┌─────────────────────────────────────────────────┐
│ 1. ORQUESTRAÇÃO (Claude main)                   │
│    Lê 10-roadmap-sprints.md                     │
│    Identifica feature S1-01-toasts              │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 2. PLAN AGENT (background)                      │
│    Define API: <Toast type, duration, message>  │
│    Define eventos que disparam toast            │
│    Output: spec técnica em sprints/S1-01.md     │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 3. DESIGN-CHIEF (background paralelo)           │
│    Cores por tipo (success, error, warning)     │
│    Animações entrada/saída                      │
│    Position: bottom-right                       │
│    Output: design tokens em design-system/      │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 4. DEV (foreground)                             │
│    Implementa <Toast> + <ToastProvider>         │
│    Substitui window.alert por useToast()       │
│    Build + typecheck local                      │
│    Output: código pronto pra deploy             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 5. CODERABBIT-REVIEW (background)               │
│    Revisa código antes de commit                │
│    Sugere melhorias                             │
│    Output: PR clean                             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 6. DESIGN-REVIEWER (foreground)                 │
│    Valida visual: cores, animações, mobile      │
│    Output: PASS/FAIL                            │
└─────────────────────────────────────────────────┘
                    ↓ (PASS)
┌─────────────────────────────────────────────────┐
│ 7. DEVOPS via ftp-deploy skill (foreground)     │
│    Backup PROD obrigatório                      │
│    npm run build + deploy FTP                   │
│    Output: live em thor4tech.com.br/rota31/     │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 8. VERIFIER (background)                        │
│    Aguarda 2 min                                │
│    Abre browser, dispara 3 alerts mock          │
│    Verifica toast aparece, com cor certa,       │
│    desaparece em 5s, mobile responsivo          │
│    Output: PASS/FAIL                            │
└─────────────────────────────────────────────────┘
                    ↓ (PASS)
┌─────────────────────────────────────────────────┐
│ 9. QA (foreground)                              │
│    7-point checklist                            │
│    Verdict: APPROVED / CONCERNS / FAIL          │
└─────────────────────────────────────────────────┘
                    ↓ (APPROVED)
┌─────────────────────────────────────────────────┐
│ 10. ANALYST (background)                        │
│     Atualiza memory/clients/rota31.md           │
│     Atualiza memory/aios-log.md                 │
│     Salva lição se houver                       │
└─────────────────────────────────────────────────┘
```

**Tempo total:** 30-45 min de calendar time, ~10 min de Claude main token cost (apenas orquestração + decisões).

---

## 🚦 Regras de orquestração

### Regra 1: Background sempre que possível
- Read-only operations → background OK
- Pesquisa, análise, geração de docs → background OK
- Implementação de código → foreground (precisa coordenar com plan)
- Deploy → foreground (gate humano antes do PUT)

### Regra 2: Paralelo > Serial
Se 2+ agentes são independentes, dispara TODOS de uma vez.

```
NÃO FAZER:
1. Plan agent (espera)
2. Copywriter (espera)
3. Strategist (espera)
Total: 3x tempo

FAZER:
[Plan, Copywriter, Strategist] em paralelo
Total: max(plan, copy, strat) ≈ 1x tempo
```

### Regra 3: Foreground só quando depende
- Antes de dev → precisa plan + design (foreground sequencial)
- Antes de deploy → precisa verifier (foreground)
- Antes de PUT n8n → precisa diff visual + Rafael OK (foreground)

### Regra 4: Cada agente tem prompt rico
Não delegar com "faça X". Delegar com:
- Contexto completo
- Arquivos relevantes
- Restrições
- Output esperado
- Critérios PASS/FAIL
- Tempo estimado

### Regra 5: Output sempre em arquivo
Agentes salvam em `docs/master-plan/agents-output/`. Claude main lê e consolida.

### Regra 6: Verifier obrigatório após deploy
Regra `.claude/rules/verifier-mandatory-after-deploy.md` é NON-NEGOTIABLE.
PARTIAL = bloqueia próxima sprint.

### Regra 7: Backup obrigatório antes de deploy
Regra `.claude/rules/mandatory-backup-before-deploy.md` é NON-NEGOTIABLE.
Sem backup confirmado, ABORTA deploy.

---

## 📊 Matriz de decisão: qual agente pra qual task

| Tipo de task | Agente principal | Agentes apoio | Skills |
|---|---|---|---|
| Decisão arquitetural | `Plan` (architect) | `aios-master` | `architect-first` |
| Schema Firestore | `data-engineer` | `architect` (revisão) | nativo |
| Componente React novo | `dev` | `design-reviewer` | `coderabbit-review` |
| Microcopy/CTA | `copywriter` | `cta-diversity-lint` | `thor4tech:agents:copywriter` |
| Imagem (badge, avatar) | `nano-banana-generator` | `designer` | nativo |
| Landing page upsell | `dev` | `frontend-landings-claude-skill` | skill |
| Edição n8n workflow | `aios-master` + `n8n-safe-edit` | `verifier` | skill |
| Deploy backend | `devops` + firebase | `verifier` | nativo |
| Deploy frontend FTP | `devops` + `ftp-deploy` | `verifier` | skill |
| Diagnóstico bug runtime | `verifier` | `Plan` (se arquitetural) | nativo |
| Pesquisa de concorrente | `tech-search` | `analyst` | skill |
| Estratégia comercial | `lucas-felix` | `strategist` | nativo |
| Quality gate | `qa` | `checklist-runner` | skill |
| Code review | `coderabbit-review` | — | skill |
| Documentação memorial | `analyst` | `consolidate-memory` | skill |
| Proposta comercial | `orcamento` | `lucas-felix` | skill |
| Dossiê executivo | `dossie-ia` | `lucas-felix` | skill |

---

## ⚙️ Pipeline de execução por sprint

### Sprint 1 — UX Essencial (1 semana)

**Antes da sprint começar:**
- `Plan` agent → arquitetura técnica completa
- `design-chief` → design system base (cores, espaçamento, fontes)
- `data-engineer` → schema Firestore pra gamificação
- `copywriter` → 50 CTAs prontos
- `strategist` → KPIs e tracking

**Durante a sprint (loop por feature):**
1. `Plan` define spec da feature
2. `dev` implementa
3. `coderabbit-review` revisa
4. `design-reviewer` valida visual
5. Backup + deploy
6. `verifier` valida runtime
7. `qa` quality gate
8. `analyst` atualiza memória

**Stories da sprint:**
- S1-01 Toasts → S1-09 Sticky header (9 stories)

### Sprint 2 — CTAs + Dashboard exec + Gamificação base (2 sem)

Igual ao Sprint 1 mas com agentes adicionais:
- `lucas-felix` → review de cada CTA antes de deploy
- `nano-banana-generator` → gera 30 badges + 20 avatars em background batch
- `frontend-landings-claude-skill` → 3 landing pages de upsell

### Sprint 3 — Polish + cross-sell ativo (1 sem)

- `instagram-carousel-architect` → carrossel pra Instagram da Rota 31
- `dossie-ia` → primeiro dossiê pra Jader (oferecer reunião)
- `orcamento` → proposta de tráfego pago pronta

### Sprint 4 — Hardening + BUG 3 n8n (1 sem)

- `aios-master` + `n8n-safe-edit` → BUG 3 (workflow Avisos atualizar STATUS=EMITIDO)
- `tech-search` → pesquisa best practices n8n quota Sheets
- `verifier` rigoroso runtime sob volume real

---

## 🎯 Métricas de eficiência da orquestração

| Métrica | Target |
|---|---|
| % tasks delegadas (não Claude main) | >70% |
| Tasks em paralelo (vs serial) | >50% |
| Tempo total de sprint vs estimado | <120% |
| Tokens gastos vs estimado | <130% |
| Verifier PASS na primeira | >80% |
| Rollbacks necessários | 0 idealmente |
| Stories entregues por sprint | 100% do escopo |

---

## 🔄 Loop de retroalimentação

Após cada sprint:
1. `analyst` faz retrospectiva
2. Atualiza `memory/aios-log.md` com lições
3. Atualiza `memory/clients/rota31.md` com mudanças
4. Identifica regras a criar/atualizar (como `mandatory-verifier-on-investigation`)
5. Atualiza este pipeline com aprendizados

---

## 🚨 Plano de contenção (se algo der errado)

| Cenário | Ação |
|---|---|
| Agent retorna inconsistente | Re-disparar com prompt mais rico |
| Deploy quebra produção | Rollback automático via backup |
| Verifier PARTIAL | Bloqueia sprint, escala pra Rafael |
| Quota Sheets API estourada | Implementar Wait nodes + Firestore migration |
| n8n quebrado de novo | PUT do backup PRE-FIX em <30s |
| Token budget excedido | Pausa sprint, otimiza prompts |
| Rafael indisponível pra gate | Aguarda — não improvisa |

---

## ✅ Checklist por sprint

Antes de começar sprint:
- [ ] Backups de baseline criados (backend, frontend, n8n, Firestore)
- [ ] Plan agent rodou e entregou spec
- [ ] Design system tokens definidos
- [ ] Stories detalhadas escritas
- [ ] Agentes envolvidos identificados

Durante:
- [ ] Cada feature passa pelos 9 passos do cenário-tipo
- [ ] Backup antes de cada deploy
- [ ] Verifier após cada deploy

Ao fim:
- [ ] Memória atualizada
- [ ] Regras criadas se aplicável
- [ ] Próxima sprint planejada
- [ ] Rafael recebe relatório executivo

---

## 🎬 Próxima ação imediata

Após este documento, executar em paralelo:
1. ✅ Plan, copywriter, strategist, lucas-felix em background (já disparados)
2. 📝 Criar `01-filosofia-governamental.md` e `10-roadmap-sprints.md` em foreground
3. ⏳ Aguardar agentes voltarem (ETA 30-45min cada)
4. 🔄 Consolidar tudo em documento único pra Rafael revisar
5. 🚀 Sprint 0 fecha, Sprint 1 inicia em seguida (após Rafael aprovar)

---

**Status do pipeline:** ATIVO. 4 agentes em paralelo. Documento sendo construído continuamente.
