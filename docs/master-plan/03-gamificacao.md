# 🎮 Sistema de Gamificação — Skinner Box Ético

*Versão 1.0 | 2026-05-08 | Referenciado em 00-sumario-executivo.md*

---

## 🎯 Tese

> Transformar **trabalho repetitivo** (aprovar 200 NFs/dia) em **vício saudável** usando 3 alavancas científicas:
> 1. **Recompensa variável** (Skinner Box) — vicia mais que recompensa fixa
> 2. **Investment loop** (Hooked Model) — quanto mais usa, mais perde se sair
> 3. **Status game** (Sapolsky) — humanos competem mesmo quando o prêmio é simbólico

**Resultado esperado:** Talita aumenta de 60 NFs/h → 150 NFs/h, sente prazer em aprovar (não obrigação) e protege o painel se alguém sugerir trocar.

---

## 🧬 Princípios fundamentais

### 1. Recompensa variável > recompensa fixa
- **Errado:** "Cada NF aprovada = 10 XP" (vira chato)
- **Certo:** "Cada NF aprovada = 8-15 XP, com 5% de chance de critical (50 XP)" (vicia)

Inspiração: máquinas de slots, Tinder, Instagram likes.

### 2. Progresso visível mas nunca completo
- Barra de XP sempre visível
- Próximo nível sempre 20-30% do progresso atual
- Nunca atinge "tudo desbloqueado" (sempre tem mais)

Inspiração: World of Warcraft, Duolingo.

### 3. Loss aversion (Kahneman)
- Streak de dias trabalhados sem erro
- Quebrar streak = perder coisa valiosa, não "não ganhar"
- Eles trabalham mais pra NÃO PERDER do que pra ganhar

Inspiração: Snapchat streaks, Duolingo flames.

### 4. Status público entre pares
- Ranking semanal entre operadoras (se tiver multi-cliente Thor)
- Badge no perfil visível pra outros
- Ego social ativa cooperação inconsciente

Inspiração: Strava, Nike Run Club.

### 5. Sunk cost fallacy
- Eles "construíram" algo no painel (XP, badges, level)
- Sair = perder construção
- Quanto mais tempo, mais resistência a sair

Inspiração: LinkedIn profile, Reddit karma.

---

## 🏗️ Arquitetura do sistema

### Schema Firestore

```typescript
// users/{uid}/gamification
{
  level: number,                    // 1-100
  xp: number,                       // total acumulado
  xpToNextLevel: number,            // calculado
  prestige: number,                 // 0+ (após level 100, reseta com bônus)

  badges: [
    { id: 'first_blood', unlockedAt: '2026-05-08T10:23:00Z' },
    { id: 'streak_7', unlockedAt: ... },
  ],

  streaks: {
    daily: {
      current: 12,                  // dias consecutivos
      longest: 47,                  // recorde pessoal
      lastDate: '2026-05-08',
    },
    perfectDay: {
      current: 3,                   // dias sem erro
      longest: 18,
    },
    weeklyGoal: {
      current: 145,                 // NFs aprovadas na semana
      target: 200,
      week: '2026-W19',
    },
  },

  stats: {
    totalApproved: 47382,
    totalDenied: 1247,
    totalEdited: 89,
    fastestApproval: 1.3,           // segundos
    averageApproval: 4.7,
    approvedThisMonth: 3421,
  },

  achievements: {
    speedrunner: { progress: 73, target: 100 },  // 100 NFs em 1h
    encyclopedist: { progress: 234, target: 500 }, // já viu 500 modal de NF
    diplomat: { progress: 12, target: 50 },       // 50 negações com motivo claro
  },

  currency: {
    coins: 1247,                    // moeda fictícia, usa na "loja"
    gemsForReal: 0,                 // moeda premium (futuro: paid)
    coinsLifetime: 12453,
  },

  hierarchyLevel: 'plenum',         // junior | pleno | senior | master | legendary
  hierarchyProgress: 0.34,          // % até próximo

  prestigeBenefits: [
    'unlock_dark_mode',
    'unlock_avatar_gold_frame',
    'unlock_keyboard_shortcuts_pro',
  ],
}
```

### API endpoints novos

```
POST /api/gamification/grant-xp
  body: { reason, amount?, multiplier? }
  → calcula XP, aplica multiplicadores, retorna novo total

GET /api/gamification/me
  → estado completo do usuário

POST /api/gamification/redeem
  body: { itemId }
  → desbloqueia item da loja com moedas

GET /api/gamification/leaderboard
  → top 20 da semana (se tiver multi-cliente)

GET /api/gamification/achievements/progress
  → todos achievements com progresso atual

POST /api/gamification/streak/refresh
  → chamado quando login do dia (cron pra reset)
```

---

## 🎯 Sistema de XP

### Tabela de XP por ação

| Ação | XP Base | Multiplicador máx | Random crit |
|---|---|---|---|
| Aprovar NF | 8 | 2.5x | 5% chance × 4x |
| Negar NF (com motivo) | 10 | 2x | 3% × 3x |
| Cancelar CT-e (com motivo) | 15 | — | — |
| Editar valor frete + aprovar | 12 | 1.5x | 2% × 5x |
| Adicionar nota interna | 5 | — | — |
| Snooze NF | 3 | — | — |
| Aprovar bulk (10+ NFs) | 8/NF + bonus 50 | — | 10% × 200 bonus |
| Streak diário (login) | 20 | 1.5x | — |
| Resolver alerta (freteAcima) | 18 | 2x | 5% × 5x |
| Primeira NF do dia | 30 | — | — |
| Última NF do dia (zerou fila) | 50 | — | 100% × 100 (sempre crit) |

### Multiplicadores (stack)

- **Streak diário:** +5% por dia consecutivo (max +50% em 10 dias)
- **Sem erro hoje:** +25% se Talita não cometeu erro de aprovação
- **Velocidade:** +10% se aprovou NF em < 3 segundos
- **Hora premium:** +20% se aprovou entre 14h-15h (horário pico Rota 31)
- **Combo:** +15% por NF aprovada em sequência (max +100% em 7 seguidas)
- **Friday Boost:** +30% sextas (eles desejam fechar a semana forte)

### Levels e thresholds

```
Level 1   → 0 XP
Level 2   → 100 XP
Level 3   → 250 XP
Level 4   → 450 XP
Level 5   → 700 XP
...
Level 10  → 5.000 XP
Level 25  → 50.000 XP
Level 50  → 250.000 XP
Level 100 → 1.000.000 XP → entra em Prestige 1 (reset com benefícios)
```

Curva: `xpToLevel(n) = 50 * n^2 + 50 * n`

### Hierarquia visível (governamental)

| Nível | NFs aprovadas | Selo | Benefícios |
|---|---|---|---|
| 🥉 Júnior | 0-1.000 | "Operador Júnior" | acesso básico |
| 🥈 Pleno | 1.001-10.000 | "Operador Pleno" | atalhos avançados desbloqueados |
| 🥇 Sênior | 10.001-50.000 | "Operador Sênior" | aparece em "Hall da Fama" |
| 💎 Master | 50.001-100.000 | "Operador Master" | bulk approve liberado, dark mode |
| 👑 Lendário | 100.000+ | "Lendário" + nome no rodapé | tudo + features beta |

**Talita atual:** ~47.000 NFs estimado → quase Master. Se ela vir essa barra de progresso, vai querer chegar no Master nas próximas 2 semanas só pelo orgulho.

---

## 🏆 Sistema de Badges

### Categorias

#### Onboarding (5 badges, fáceis de pegar)
- 🩸 **First Blood** — primeira NF aprovada
- 🐣 **Recém-chegado** — completar onboarding tour
- 🎯 **Bom de mira** — aprovar 10 NFs sem erro
- ⚡ **Mãos rápidas** — primeira NF aprovada em <5s
- 📚 **Estudioso** — abrir o modal de detalhe 50 vezes

#### Maestria (10 badges, médios)
- 💯 **Centena** — 100 NFs aprovadas
- 🔥 **Mil** — 1.000 NFs
- 🌟 **Dez Mil** — 10.000 NFs
- 💎 **Cinquenta Mil** — 50.000 NFs (Talita está perto)
- 👑 **Cem Mil** — 100.000 NFs
- 🚀 **Velocista** — 100 NFs em uma hora
- 🎯 **Atirador** — 50 NFs sem erro
- 🛡️ **Guardião** — resolver 50 alertas freteAcima
- 📋 **Diplomata** — 100 negações com motivo bem escrito
- 🎪 **Multitalento** — usar todas as features (filtro, edit, cancel, nota, snooze)

#### Streaks (5 badges, grandes)
- 🔥 **Em chamas** — 7 dias seguidos
- 🌋 **Vulcão** — 30 dias seguidos
- ⭐ **Astro** — 90 dias seguidos
- 🌌 **Nebulosa** — 180 dias seguidos
- 🦄 **Lendário** — 365 dias seguidos

#### Sazonais (10 badges, recorrentes)
- 🎃 **Halloween Guru** — aprovou em 31/10
- 🎄 **Natal Operacional** — aprovou em 25/12
- 🎉 **Ano Novo Top** — primeira aprovação de 2027
- ⛱️ **Verão Quente** — 1.000 NFs em janeiro
- 🍂 **Outono Produtivo** — meta abril/maio batida
- ...

#### Secretas (10 badges, viciam)
- 🌃 **Coruja** — aprovou NF entre 22h e 6h (raro)
- 🌅 **Madrugador** — aprovou NF antes 7h
- 🍕 **Hora do Almoço** — aprovou durante 12h-13h (10 dias)
- 🎲 **Sortudo** — pegou critical 10x no mesmo dia
- 🎯 **Sniper** — aprovou em <2s 50 vezes
- ⚡ **Reflexo** — aprovou em <1s
- 🤝 **Fair Play** — negou NF com motivo bem detalhado (>200 chars)
- 👻 **Fantasma** — voltou após 7 dias sumido (retention)
- 💪 **Maratonista** — 8h sem fechar painel
- 🧙 **Wizard** — desbloqueou tudo do level 1 ao 25

### UI dos Badges

- Aba "🏆 Conquistas" no perfil
- Quando desbloqueia: animação de pop + confete + som de "ding"
- Compartilhar no WhatsApp (link gerado, "Talita acabou de virar Master Operadora!")
- Badges em destaque no avatar (top 3)

---

## ⚡ Sistema de Streaks

### Daily streak

```
Dia 1: 20 XP
Dia 2: 25 XP
Dia 3: 30 XP
...
Dia 7: 50 XP + badge "Em chamas"
Dia 30: 200 XP + badge "Vulcão" + 100 moedas
```

**Loss aversion:**
- Notificação WhatsApp 22h: "🔥 Você tem 12 dias seguidos. Tá faltando aprovar pelo menos 1 NF hoje pra manter."
- Painel mostra: "12 dias 🔥 (perde se não aprovar até 23:59)"
- Barra que pisca quando faltam 2h pra meia-noite

### Perfect Day

Sem erro de aprovação, sem cancelamento "estúpido", taxa >95% acerto.
- 50 XP bonus + badge progressivo
- Ciclo: 3 → 7 → 15 → 30 → 60 → 90 dias

### Weekly Goal

Meta de 200 NFs/semana (configurável).
- Barra de progresso no header sempre visível
- 80% da meta = badge "Quase lá"
- 100% = 500 XP + 50 moedas
- 150% (overdelivery) = 1000 XP + badge "Maquina"

---

## 💰 Sistema de Moedas + Loja

### Moedas (currency)

Ganhas em:
- Critical hits: 1-3 moedas
- Streaks milestone: 10-100 moedas
- Bater meta semanal: 50 moedas
- Level up: 25 moedas
- Achievement desbloqueado: 5-50 moedas

### Loja (`/loja` ou `/store`)

Itens cosméticos + funcionais:

| Item | Custo | Categoria |
|---|---|---|
| 🌑 Dark Mode | 100 moedas | tema |
| 🦊 Avatar frame: bronze | 50 moedas | cosmético |
| 🥈 Avatar frame: prata | 200 moedas | cosmético |
| 🥇 Avatar frame: ouro | 500 moedas | cosmético |
| 💎 Avatar frame: diamante | 2000 moedas | cosmético |
| 🎵 Som "ka-ching" ao aprovar | 75 moedas | audio |
| 🎵 Pacote de sons (10) | 300 moedas | audio |
| 🌈 Tema "neon" | 150 moedas | tema |
| 🐱 Avatar gato | 100 moedas | cosmético |
| 🚀 XP Boost 2x por 1h | 250 moedas | consumível |
| 💪 XP Boost 1.5x dia inteiro | 500 moedas | consumível |
| 🎯 "Skip" cooldown de bulk | 100 moedas | consumível |
| ⏰ Streak protetor (1 uso) | 1000 moedas | consumível ★ |
| 🎁 Caixa misteriosa | 200 moedas | random |

**Streak protetor** — se Talita esquecer 1 dia, gasta o protetor e mantém streak. Item premium = ela JOGA pra acumular moedas pra comprar (engagement loop).

### Caixas misteriosas

Random rewards (Skinner Box):
- 60% chance: 50-100 moedas
- 25% chance: avatar cosmético raro
- 10% chance: tema novo
- 4% chance: badge secreto
- 1% chance: 5000 XP instantâneo

Vira "vício de loot box" mas ético (não cobra dinheiro).

---

## 🏛️ Hierarquia governamental (selo oficial)

### "Carteira de Operador Rota 31"

Documento simulado, com aparência de RG. Mostra:
```
┌─────────────────────────────────────────┐
│  CARTEIRA DE OPERADOR ROTA 31           │
│  ─────────────────────────────────       │
│  [foto]  TALITA SILVA                    │
│          Operador Master                 │
│          NFs aprovadas: 47.382           │
│          Nível: 47 (Prestige 0)          │
│          Cadastro: 12/01/2024            │
│          ID: ROT31-2024-001              │
│  ─────────────────────────────────       │
│  Validade: permanente                    │
│  Emitida por: Thor4Tech                  │
│  [QR Code]                               │
└─────────────────────────────────────────┘
```

Aparece no `/perfil`. Pode imprimir ("baixa em PDF"). Talita compartilha no WhatsApp da empresa orgulhosa.

**Efeito psicológico:** identidade fundida com produto. Sair = perder identidade.

---

## 🎬 Loop emocional completo (uma "sessão Talita")

```
1. 09:00 Talita abre painel
   → Badge "Bom dia!" + 20 XP "Login diário"
   → Notificação: "Você tá em 12 dias de streak 🔥"
   → Header mostra: "147/200 NFs essa semana"

2. 09:01 Vê 47 NFs pendentes
   → Quick filter: "Sem alerta (35)"
   → Bulk approve sugerido

3. 09:05 Aprovou as 35 sem alerta
   → Animation: confete + "+325 XP" + "+5 moedas"
   → Trigger: "🚀 Modo turbo! Próxima aprovada vale 2x" (next 5 minutos)
   → Avatar dele "subiu" 5% na barra de level

4. 09:10 Aprovou 4 NFs em sequência (combo +15%)
   → Pop-up: "🔥 Combo 4x! +50 XP bonus"
   → Achievement "Velocista" tem progresso 73 → 77

5. 09:30 Apareceu NF com freteAcima (alerta laranja)
   → Modal abre, ela edita frete pra valor correto
   → "+18 XP × 2 (resolveu alerta) = 36 XP" + chance critical
   → Crit: "⚡ +144 XP critical hit!"

6. 10:00 Bateu 50 NFs aprovadas no dia
   → Badge progress: "🎯 Atirador" 73 → 100% UNLOCKED
   → Pop-up gigante: "🎯 BADGE DESBLOQUEADO: Atirador"
   → Compartilhar no WhatsApp? "Talita acabou de pegar Atirador no painel Rota 31!"

7. 11:30 Outra notificação:
   → "💡 Insight: você está aprovando 30% mais rápido que mês passado.
      Se mantiver esse ritmo, você bate 250 NFs/dia (recorde). Continua assim!"

8. 14:00 Hora premium ativada (+20% XP)
   → Header pisca: "⚡ HORA PREMIUM 14h-15h"

9. 17:00 Fila zerada
   → "✨ Todas processadas! +50 XP bonus 'Última do dia' (sempre crit) = +200 XP"
   → Confetti gigante. Som de vitória.
   → "Você zerou em 7h12. Recorde semanal: 6h30."

10. 17:01 Notificação Hormozi sutil:
    → "Você processou 234 NFs hoje, valor total R$ 1.2M.
       A operação Rota 31 está rodando bem. Quer que eu te mostre como
       outras transportadoras desse porte estão captando mais clientes?
       ➜ Falar com Rafael"
```

11 momentos de prazer + 1 CTA subliminar. **Vício saudável + cross-sell plantado.**

---

## ⚖️ Ética: onde paramos?

> "Skinner Box ético" significa: cria engajamento que BENEFICIA o usuário, não que prejudica.

### Sim
- Recompensa por usar bem o produto (aprovar NFs corretamente)
- Streak que celebra dedicação real ao trabalho
- Achievements que destacam habilidades genuínas
- Loja com itens cosméticos (não pay-to-win)

### Não
- Cobrar dinheiro real por features que deveriam ser grátis
- Penalizar usuário por NÃO usar (criar pânico)
- Dark patterns que enganam pra clicar
- Notificações fora de horário (respeitar 22h-6h)
- Manipular a Talita pra trabalhar mais do que deveria
- Score que humilha quando tá ruim

### Princípio de ouro
**"Se a Talita soubesse exatamente como funciona, ela ainda gostaria?"**

Se sim, está OK. Se não, refazer.

---

## 📊 Métricas pra acompanhar

| KPI | Como medir | Target 30 dias |
|---|---|---|
| % usuários com login diário | logins únicos / total cadastrados | >85% |
| Streak médio | mean(streak.daily.current) | >12 dias |
| Badges desbloqueados/usuário | sum(badges) / users | >8 |
| Engajamento na loja | redeems/usuário/mês | >2 |
| NFs/hora (Talita) | track de aprovações | 60→150 |
| Taxa de erro | erros / total aprovações | <1% |
| Sessions/dia | logs de login | >12 |
| Tempo no painel | duração total/dia | >4h |
| NPS | survey trimestral | >9 |

---

## 🚀 Roadmap de implementação

### Sprint 1 (essencial)
- Schema Firestore
- API endpoints básicos (grant-xp, get-me)
- Componente XPBar atom
- Login XP
- Aprovar XP
- Daily streak counter

### Sprint 2 (engajamento)
- 30 badges principais (onboarding + maestria + streaks)
- Combo multiplier
- Critical hits visuais
- Loja básica (10 itens cosméticos)
- Carteira de Operador

### Sprint 3 (vício)
- Caixas misteriosas
- Achievements secretos
- Hora premium
- Hierarquia visual completa
- Compartilhar conquistas WhatsApp
- Leaderboard semanal

### Sprint 4 (refinement)
- Sazonais
- Prestige system
- Loja premium (XP boosts)
- Tutoriais embutidos por level
- Easter eggs

---

## 🎯 Conclusão

**Esse sistema transforma o painel Rota 31 de OBRIGAÇÃO em RECOMPENSA.**

Talita acorda animada pra abrir o painel. Os donos veem produtividade subir 2.5x. A Thor4Tech vira indispensável (sair = perder identidade construída).

E como bonus: **cada interação tem oportunidade plantada de cross-sell** sem que ela perceba.

Documento técnico completo. Implementação sob demanda.
