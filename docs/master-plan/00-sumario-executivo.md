# 🚛 ROTA 31 — Master Plan UX/UX + Cross-sell Estratégico

*Versão 1.0 | 2026-05-08 | Owner: Rafael Torquato | Status: Planning*

---

## 🎯 Tese Central

Transformar o painel Rota 31 de uma **ferramenta operacional** em um **ecossistema de dependência psicológica controlada**, aplicando princípios:

1. **Governamental Design** — uma vez dentro, sair é mais caro que ficar
2. **Hormozi Grand Slam Offer** — em cada CTA, o valor percebido > 10x o preço cobrado
3. **Gamificação Operante** — recompensas variáveis (Skinner Box ético) que viciam no fluxo
4. **Cross-sell Subliminar** — eles PEDEM os outros serviços Thor4Tech, não recebem proposta

## 📊 Estado Atual (baseline pré-implementação)

| Item | Estado |
|---|---|
| Painel SaaS funcional | ✅ thor4tech.com.br/rota31/ |
| Bugs críticos corrigidos | ✅ 5 bugs (1, 2, 4, 5, 6) deployados em 08/05 |
| Workflow n8n operacional | ✅ ROTA31 - VERSÃO FINAL CORRIGIDA |
| Backend Functions | ✅ Cap 5000, paginação, /cancel endpoint |
| Frontend FTP | ✅ Deploy automatizado via skill ftp-deploy |
| Backup obrigatório | ✅ Regra `mandatory-backup-before-deploy.md` ativa |
| UX subliminar | ❌ Zero estratégia de cross-sell |
| Gamificação | ❌ Não existe |
| CTAs persuasivos | ❌ Nenhum |
| Dashboard executivo | ❌ Talita e donos veem mesma tela |
| Insights gratuitos | ❌ Nada de "Você está perdendo X" |

## 🎮 Personas (target da implantação)

### 🏷️ Persona 1: Talita (operacional, 6h/dia no painel)
- **Job-to-be-done:** aprovar/negar 200 NFs/dia sem cometer erro
- **Frustrações atuais:** sistema lento, falta atalhos, confunde filtros
- **Triggers emocionais:** medo de errar, orgulho de processar muito
- **Tipo de CTA que funciona:** "facilita meu trabalho", gamificação leve
- **Influência decisão de compra:** indireta (fala com chefe)

### 🏷️ Persona 2: Jader (sócio, dono, decide compras)
- **Job-to-be-done:** ver receita, margem, identificar problemas
- **Frustrações atuais:** depende de Talita pra info, painel é só operacional
- **Triggers emocionais:** medo de perder dinheiro, ego de crescer, status com pares
- **Tipo de CTA que funciona:** "comparativo com mercado", "perdendo R$ X/mês"
- **Influência decisão de compra:** ALTA (dono)

### 🏷️ Persona 3: Raphael (sócio, dono, mais técnico)
- **Job-to-be-done:** otimizar operação, reduzir custo
- **Frustrações atuais:** falta dados pra decisão
- **Triggers emocionais:** racionalidade, quer prova
- **Tipo de CTA que funciona:** dados, cases, ROI calculado
- **Influência decisão de compra:** ALTA (dono)

## 🏛️ Os 7 Princípios Governamentais aplicados

> Como o Estado mantém você dependente sem que você reclame? Aplicando isto:

### 1. **Cartão de Identidade Único** (você precisa pra existir)
**Aplicação:** Cada usuário do painel ganha "Carteira de Operador Rota 31" com:
- Foto, nome, função, data de cadastro
- QR Code único (sem ele não acessa)
- Histórico imutável de ações ("você aprovou 47.382 NFs desde 12/01/2024")
- Selo de autenticidade

**Efeito psicológico:** Identidade fundida com o produto. Sair = perder identidade construída.

### 2. **Hierarquia de Privilégios por Tempo de Casa**
**Aplicação:** Níveis baseados em uso acumulado:
- 🥉 **Operador Júnior** (0-1.000 NFs aprovadas)
- 🥈 **Operador Pleno** (1.001-10.000)
- 🥇 **Operador Sênior** (10.001-50.000)
- 💎 **Operador Master** (50.000+) — desbloqueia features especiais
- 👑 **Lendário** (100.000+) — placa nominal no rodapé "Talita - Lendária"

**Efeito psicológico:** Eles não trocam de plataforma porque PERDEM o status acumulado.

### 3. **Burocracia Controlada (regras só nossas)**
**Aplicação:** Certas operações SÓ funcionam pelo painel:
- Cancelar CT-e via SEFAZ → "use o portal Rota 31 pra registrar o motivo (auditoria)"
- Relatório executivo → só baixa pelo painel (não tem fora)
- Histórico fiscal completo → só nosso DB tem

**Efeito psicológico:** Mesmo se quisessem sair, falta ferramentas equivalentes.

### 4. **Subsídios Condicionais (você ganha se usar mais)**
**Aplicação:**
- "Aprovou 1.000 NFs este mês? Ganhe relatório executivo grátis"
- "10 dias seguidos sem erro? Desbloqueia atalhos premium"
- "Indicar transportadora amiga? Ganha 1 mês de Tráfego pago grátis"

**Efeito psicológico:** Eles trabalham mais NO painel pra ganhar grátis. Cria hábito.

### 5. **Selos Oficiais (chancela = autoridade)**
**Aplicação:**
- Badge "Auditado pela Thor4Tech" no perfil deles
- Selo "Operador Verificado" nos relatórios que saem
- "Aprovado por sistema com SLA de 99,8%"

**Efeito psicológico:** Eles usam ESSES selos pra impressionar clientes deles. Vira parte da identidade comercial.

### 6. **Recompensas Atrasadas (você vê depois, fideliza agora)**
**Aplicação:**
- "Sua conta acumula benefício de R$ 247 em créditos pra usar em outros serviços Thor4Tech"
- Score de fidelidade visível, com progresso ("faltam 3 NFs pra desbloquear próximo nível")
- Relatório anual gigante "12 meses com a Thor4Tech: você economizou R$ 47.230 e processou 23.847 NFs"

**Efeito psicológico:** Eles não saem porque "estão construindo algo".

### 7. **Escassez Artificial (limitada, primeiros chegam)**
**Aplicação:**
- "Apenas 3 vagas no programa de Tráfego Premium em maio"
- "Slot de consultoria 1:1 — apenas terças, 2 horários"
- "Beta tester de Dashboard Executivo: 5 vagas Rota 31"

**Efeito psicológico:** FOMO genuína. Donos brigam pra entrar.

## 🚀 Hormozi Grand Slam Offer aplicado

> Frame: "Como fazer um pedido tão bom que você se sentiria estúpido de recusar?"

Para cada momento do painel, valor percebido > 10x preço cobrado. Estrutura:

```
DREAM OUTCOME — o que eles desejam profundamente
PERCEIVED LIKELIHOOD — como aumentar a confiança que vai funcionar
TIME DELAY — como reduzir tempo até resultado
EFFORT/SACRIFICE — como reduzir esforço deles
```

Cada CTA do painel passa por essa fórmula. Detalhes em `02-cta-hormozi.md`.

## 🎮 Sistema de Gamificação (Skinner Box ético)

Loop principal:
```
Trigger (NF aparece)
  → Action (Talita decide)
  → Variable Reward (XP + chance de raridade + streak)
  → Investment (perfil cresce, badges, ranking)
  → próxima trigger reforçada
```

Detalhes completos em `03-gamificacao.md`.

## 📁 Estrutura de Documentação

```
docs/master-plan/
├── 00-sumario-executivo.md         (este arquivo)
├── 01-filosofia-governamental.md   (7 princípios + aplicação prática)
├── 02-cta-hormozi.md               (50+ CTAs prontas, formato Grand Slam)
├── 03-gamificacao.md               (XP, badges, levels, streaks, prestigios)
├── 04-cross-sell-estrategia.md     (catalog Thor4Tech + funil)
├── 05-dashboard-executivo.md       (tela separada Jader/Raphael)
├── 06-microcopy-persuasivo.md      (cada palavra do produto)
├── 07-design-system-atomic.md      (Brad Frost aplicado)
├── 08-arquitetura-tecnica.md       (stack, schema, APIs)
├── 09-pipeline-multi-agent.md      (como agentes vão executar)
├── 10-roadmap-sprints.md           (3 sprints + stories)
├── 11-metricas-kpi.md              (o que medir, como medir)
├── 12-rollback-emergency.md        (planos de rollback por sprint)
├── stories/                        (user stories detalhadas)
│   ├── S1-01-toasts.md
│   ├── S1-02-skeleton.md
│   └── ...
├── sprints/
│   ├── sprint-1-essencial.md
│   ├── sprint-2-impacto.md
│   └── sprint-3-polish.md
└── agents-output/                  (saída dos agentes especialistas)
    ├── plan-agent-architecture.md
    ├── copywriter-ctas.md
    ├── strategist-metrics.md
    └── lucas-felix-comercial.md
```

## 🤖 Pipeline Multi-Agent

Agentes que vão executar em paralelo:

| Agente | Skill | Responsabilidade |
|---|---|---|
| `Plan` (architect) | nativo | Arquitetura técnica + atomic design |
| `copywriter` (The One) | thor4tech:agents:copywriter | 50+ CTAs Hormozi + microcopy |
| `strategist` (Strat) | thor4tech:agents:strategist | KPIs + funil + métricas |
| `lucas-felix` (Felix) | nativo | Estratégia comercial Jader/Raphael |
| `aios-master` (Orion) | nativo | Orquestração + execução |
| `verifier` (Proof) | nativo | Validação após cada deploy |
| `design-reviewer` (Lens) | nativo | Validação visual |
| `dev` (Dex) | nativo | Implementação |
| `devops` (Gage) | nativo | Deploy backend + FTP |
| `data-engineer` (Dara) | nativo | Schema gamificação |

Skills auxiliares:
- `n8n-safe-edit` — alterações no workflow (BUG 3 ainda pendente)
- `frontend-landings-claude-skill` — landing page de upsell
- `coderabbit-review` — code review automático
- `ftp-deploy` — deploy frontend
- `architect-first` — design antes de código

Detalhes em `09-pipeline-multi-agent.md`.

## ⚖️ Regras Obrigatórias (já criadas)

Esta implantação segue:
- `mandatory-backup-before-deploy.md` — backup imutável em `deploys/{ts}.json`
- `mandatory-self-learning.md` — lição salva após cada fix
- `mandatory-verifier-on-investigation.md` — `@verifier` em troubleshooting
- `verifier-mandatory-after-deploy.md` — validação runtime real obrigatória
- `mandatory-agent-routing.md` — sempre escolher agente certo

## 📅 Cronograma macro

| Sprint | Duração | Foco | Status |
|---|---|---|---|
| 0 | 1 dia | Planejamento + agentes em paralelo | 🟡 em curso |
| 1 | 1 semana | UX essencial (toasts, atalhos, skeleton, quick filters) | ⏸ |
| 2 | 2 semanas | CTAs subliminares + Dashboard exec + Gamificação base | ⏸ |
| 3 | 1 semana | Polish + cross-sell ativo + landing pages upsell | ⏸ |
| 4 | 1 semana | Hardening + métricas + bug 3 (n8n) | ⏸ |

Total: **5 semanas** pra entrega completa.

## 🎯 Métricas de Sucesso

| Métrica | Baseline atual | Target após implementação |
|---|---|---|
| Tempo médio aprovação | 8s | 3s (atalhos + bulk) |
| NFs/hora processadas | 60 | 150 (gamificação + UX) |
| NPS Talita | desconhecido | >9 |
| Receita Thor4Tech via Rota 31 | R$ 1.197/mês | R$ 4.500+/mês (cross-sell) |
| Churn risk | médio | baixo (lock-in psicológico) |
| Engajamento dia (sessões) | 4-5/dia | 15+/dia (gamificação) |
| Cliques em CTA Thor4Tech | 0 | 50+/semana |
| Reuniões geradas com Jader/Raphael | 0/mês | 2/mês |

---

**Status atual deste plano:** documentação iniciada, pipeline multi-agent ativando.

Próxima atualização: quando os 4 agentes paralelos retornarem.
