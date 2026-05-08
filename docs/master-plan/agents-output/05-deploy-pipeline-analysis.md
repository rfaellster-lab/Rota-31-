# 🚀 Análise Deploy Pipeline — Painel Rota 31

*Versão 1.0 | 2026-05-08 | Owner: skill `deploy-pipeline` + análise contextual*

---

## 🎯 Recomendação Final: **Modo 1 — GitHub Actions + FTP Hostgator**

Apesar da skill genérica recomendar Modo 3 (Firebase Hosting) pra projetos Firebase, **a restrição de URL e infraestrutura compartilhada do Rafael torna Modo 1 a escolha correta agora**.

---

## 🔍 Análise comparativa aplicada ao Rota 31

| Critério | Modo 1 (GH+FTP) | Modo 2 (Cloudflare) | Modo 3 (Firebase) |
|---|---|---|---|
| Mantém URL `thor4tech.com.br/rota31/` | ✅ Idêntica | ⚠️ Requer DNS subdomain ou redirect | ⚠️ Requer custom domain Firebase |
| Mantém Hostgator no ar (outros projetos) | ✅ | ✅ | ✅ |
| Mudança de DNS | ❌ Nenhuma | ⚠️ Necessária | ⚠️ Necessária |
| Risco de Talita perder acesso | 🟢 ZERO | 🟡 Médio (DNS propagation) | 🟡 Médio |
| CDN global | ❌ Hostgator (BR) | ✅ Cloudflare (200+ POPs) | ✅ Google CDN |
| Velocidade de deploy | 🟡 1-3 min FTP | 🟢 30s-2min | 🟢 30s-2min |
| Preview deploys por PR | ❌ Não nativo | ✅ Sim | ✅ Sim |
| Rollback | 🟢 git revert (30s) | 🟢 1-clique UI | 🟢 1-clique UI |
| Custo mensal | 🟢 R$ 0 (já paga Hostgator) | 🟢 R$ 0 (free tier) | 🟢 R$ 0 (free tier) |
| Curva de setup | 🟢 30min | 🟡 1-2h (DNS) | 🟡 2-3h (DNS + custom domain) |
| Risco operacional na migração | 🟢 BAIXO | 🟡 MÉDIO | 🟡 MÉDIO |

**Pontos decisivos:**
- Talita acostumada com URL exata
- 3 usuários ativos = não justifica CDN global agora
- Migração de DNS = janela de risco que não compensa o ganho

---

## 📋 Plano de migração — Modo 1 (recomendado)

### Pré-requisitos

**1. Criar repositório GitHub privado** (Rafael precisa fazer):
```
nome sugerido: rota31-painel
visibilidade: privado
```

**2. Verificar git local:**
```bash
cd "C:\Users\Torquato\OneDrive\Área de Trabalho\Todos os Clientes\Rota\Painel SaaS"
git status
# Se não tem .git, fazer git init
```

**3. Adicionar `.gitignore` se não existir:**
```
node_modules/
dist/
.env
.env.local
.env.production
functions/.env
*.log
.DS_Store
n8n-backups/        # backups locais não vão pro repo
frontend-backups/   # idem
functions-backups/  # idem
workspace/          # arquivos temporários
.firebase/
*.tar.gz
```

**4. Push inicial:**
```bash
git remote add origin https://github.com/{username}/rota31-painel.git
git add .
git commit -m "chore: initial commit"
git push -u origin main
```

### Setup do CI/CD (skill executa)

**Arquivo 1:** `.github/workflows/deploy.yml`
```yaml
name: Deploy Frontend Rota 31

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run typecheck
        run: npm run lint

      - name: Build
        run: npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
          VITE_API_KEY: ${{ secrets.VITE_API_KEY }}

      - name: Deploy to FTP (apenas em push pra main)
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: SamKirkland/FTP-Deploy-Action@v4.3.5
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          server-dir: public_html/rota31/
          local-dir: ./dist/
          dangerous-clean-slate: false
          security: loose

      - name: Notify on success
        if: success() && github.event_name == 'push'
        run: echo "✅ Deploy successful"

      - name: Notify on failure
        if: failure()
        run: echo "❌ Deploy failed - check logs"
```

**Arquivo 2:** `.github/workflows/preview-build.yml` (preview em PR)
```yaml
name: Preview Build (PR)

on:
  pull_request:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run build

      - name: Comment PR with build status
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Build OK. Bundle size: ~970 KB. Pronto para review e merge.'
            })
```

**Arquivo 3:** `.github/workflows/backend-deploy.yml` (Functions também automatizado)
```yaml
name: Deploy Backend Functions

on:
  push:
    branches:
      - main
    paths:
      - 'functions/**'
      - 'firebase.json'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
          cache-dependency-path: functions/package-lock.json

      - name: Install dependencies
        working-directory: functions
        run: npm ci

      - name: Build
        working-directory: functions
        run: npm run build

      - name: Deploy to Firebase
        uses: w9jds/firebase-action@master
        with:
          args: deploy --only functions --project rota-31---backend
        env:
          GCP_SA_KEY: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
```

### Secrets a configurar no GitHub

(Rafael configura manualmente em Settings → Secrets)

| Secret | Valor |
|---|---|
| `FTP_SERVER` | `ftp.thor4tech.com.br` |
| `FTP_USERNAME` | `thor4t63` |
| `FTP_PASSWORD` | (senha já validada) |
| `VITE_API_URL` | `https://api-ajc3rclwsa-rj.a.run.app` |
| `VITE_API_KEY` | `rota31-prod-2026-painel` (ou outra chave) |
| `FIREBASE_SERVICE_ACCOUNT` | JSON do service account (gerar no Firebase Console) |

---

## 🌊 Plano de migração SEM downtime

### Janela de execução
**Sábado 9h-11h BRT** — horário de baixíssimo volume da Rota 31. Talita não trabalha.

### Etapas (60-90 min total)

**Fase 1: Setup local (15 min)**
- [ ] Verificar `git status` no projeto
- [ ] Adicionar `.gitignore` adequado
- [ ] Limpar arquivos sensíveis (verificar `.env` está gitignored)
- [ ] Commit inicial limpo

**Fase 2: GitHub setup (10 min)**
- [ ] Rafael cria repo `rota31-painel` privado
- [ ] Push inicial: `git remote add origin ... && git push -u origin main`

**Fase 3: Secrets (5 min)**
- [ ] Rafael adiciona 6 secrets em Settings → Secrets

**Fase 4: Workflows (10 min)**
- [ ] Skill cria os 3 arquivos em `.github/workflows/`
- [ ] Commit + push

**Fase 5: Primeiro deploy via Actions (15 min)**
- [ ] Trigger automático ao push
- [ ] Acompanhar Actions tab no GitHub
- [ ] Verificar deploy completou
- [ ] **NÃO sobrescrever site atual ainda** — primeiro deploy vai pra `public_html/rota31-staging/` (preview)

**Fase 6: Validação preview (15 min)**
- [ ] Abrir `https://thor4tech.com.br/rota31-staging/` (URL temporária)
- [ ] Validar painel funciona, login OK, dados aparecem
- [ ] Talita confirma (se disponível) — opcional

**Fase 7: Cutover (5 min)**
- [ ] Mudar `server-dir: public_html/rota31-staging/` → `public_html/rota31/` no workflow
- [ ] Commit + push
- [ ] Deploy automático sobrescreve produção
- [ ] Validar `https://thor4tech.com.br/rota31/` funciona

**Fase 8: Validação pós-migração (15 min)**
- [ ] Verifier abre browser, testa fluxo completo
- [ ] Console limpo
- [ ] Network OK
- [ ] Screenshot pra documentação

---

## 🛡️ Plano de rollback

**Cenário 1: Deploy via Actions falha**
```
Ação: Actions tab → Re-run jobs da última run boa
Tempo: 2 min
```

**Cenário 2: Deploy ok mas site quebrado**
```
Ação: git revert {commit-bad} && git push
Tempo: 1 min (push) + 2 min (Actions deploy do revert)
```

**Cenário 3: GitHub Actions fora do ar**
```
Ação: Skill ftp-deploy manual (fallback existente, já validada)
Tempo: 5 min
```

**Cenário 4: Hostgator fora do ar**
```
Ação: Aguardar (não afeta backend, painel fica offline)
Backend Firebase Functions continua respondendo
Frontend volta quando Hostgator volta
```

**Cenário 5: Catastrófico (perdemos acesso ao FTP)**
```
Ação: Backups em frontend-backups/deploys/ permitem
re-upload via skill ftp-deploy direto (sem Actions)
Tempo: 10 min
```

---

## 💰 Custo estimado

| Item | Custo mensal |
|---|---|
| GitHub Actions free tier | R$ 0 (2.000 min/mês, vamos usar ~50 min) |
| Hostgator (já paga) | R$ 0 incremental |
| Firebase Functions (já paga) | R$ 0 incremental |
| **TOTAL** | **R$ 0** |

---

## ⏱️ Tempo de setup

- Análise (esta etapa): ✅ feita (30 min)
- Setup local + GitHub repo: 25 min
- Secrets + workflows: 15 min
- Primeiro deploy + validação: 30 min
- Cutover staging → prod: 20 min
- **Total: ~90 minutos** em uma janela controlada (sábado manhã)

---

## ⚠️ Riscos identificados + mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| `.env.production` versionado no Git | BAIXA | ALTO (vaza secrets) | `.gitignore` rigoroso + `git status` antes do push |
| FTP_PASSWORD vaza nos logs | BAIXA | ALTO | Action FTP-Deploy não loga password (validado) |
| Build quebra em CI mas funciona local | MÉDIA | MÉDIO | `npm ci` (não install) + Node version pinning |
| Cutover deixa Talita sem acesso 5min | BAIXA | MÉDIO | Janela sábado manhã + smoke test rápido |
| Workflow.yml com erro de sintaxe | MÉDIA | BAIXO | Validar com act ou GitHub Actions Editor antes |
| Service account Firebase com permissão errada | BAIXA | MÉDIO | Permissão mínima: Cloud Functions Admin + IAM Service Account User |

---

## 🎯 Próximos passos (ordem)

### 1. Você (Rafael) confirma plano
Antes de eu disparar setup, preciso de seu OK em:
- ✅ Modo 1 (FTP automatizado) é o caminho?
- ✅ Sábado manhã (10/05 ou próximo) é uma janela boa?
- ✅ Pode criar repo GitHub privado pra mim?

### 2. Sprint 0.5 — execução
Após seu OK:
- Skill `deploy-pipeline` cria os 3 workflows
- Eu te passo lista exata de Secrets pra configurar
- Você executa setup do GitHub (Secrets, repo, push inicial)
- Disparamos deploy de teste em staging
- Validamos
- Cutover pra prod

### 3. Pós-migração
- Atualizar `memory/clients/rota31.md` com novo fluxo de deploy
- Atualizar regra `mandatory-backup-before-deploy.md` (backups agora vêm de git history)
- Documentar em `aios-log.md`
- Sprint 1 começa com pipeline já no ar

---

## 🤔 Por que NÃO Modo 3 (Firebase Hosting) agora

Apesar de stack 100% Firebase, Modo 3 traz complicações:

1. **URL `thor4tech.com.br/rota31/` é subpath, não subdomínio** — Firebase Hosting trabalha melhor com subdomínios (`rota31.thor4tech.com.br`)
2. **Pra manter subpath:** opções são (a) mover thor4tech.com.br inteiro pra Firebase (afeta outros projetos do Rafael), (b) configurar redirect/proxy no Hostgator → Firebase (frágil), (c) mudar URL pra subdomínio (afeta Talita)
3. **DNS propagation:** custom domain Firebase pode levar 24-48h pra propagar
4. **Migração de outros projetos do Rafael:** Hostgator tem prospectathor, p12-digital, segundocerebro, carrossel-express e outros. Mover só Rota 31 vira gestão dupla
5. **Modo 1 preserva tudo** que já funciona, só automatiza

**Quando voltar a considerar Modo 3:** se Rafael decidir migrar TODO o ecossistema thor4tech.com.br pra Firebase de uma vez (decisão estratégica maior, fora do escopo de Rota 31).

---

## ✅ Veredito

**MODO 1: GitHub Actions + FTP Hostgator**

- Setup mínimo (90min)
- Risco mínimo (zero DNS, zero migration)
- Ganho máximo (deploy automatizado, preview em PR, rollback git)
- Mantém infra atual estável
- Custo zero
- Reversível (se quisermos Modo 3 no futuro, é fácil migrar depois)

**Pronto pra setup mediante seu OK.**
