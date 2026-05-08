# 🔐 GitHub Secrets — Checklist obrigatório

*Configurar em: https://github.com/rfaellster-lab/Rota-31-/settings/secrets/actions*

> Sem essas Secrets configuradas, os workflows de deploy vão FALHAR.

---

## 📋 Lista completa (6 secrets)

### Frontend deploy (FTP Hostgator)

| # | Secret name | Valor | Onde encontrar |
|---|---|---|---|
| 1 | `FTP_SERVER` | `108.167.132.68` (IP) ou `ftp.thor4tech.com.br` | já validado em deploys anteriores |
| 2 | `FTP_USERNAME` | `thor4t63` | já validado |
| 3 | `FTP_PASSWORD` | (senha do FTP do Hostgator) | painel Hostgator → FTP Accounts |

### Frontend build (variáveis de ambiente do Vite)

| # | Secret name | Valor |
|---|---|---|
| 4 | `VITE_API_URL` | `https://api-ajc3rclwsa-rj.a.run.app` |
| 5 | `VITE_API_KEY` | `rota31-prod-2026-painel` (ou outra chave que você definir) |

### Backend deploy (Firebase Functions)

| # | Secret name | Valor | Como gerar |
|---|---|---|---|
| 6 | `FIREBASE_SERVICE_ACCOUNT` | JSON completo do service account | passos abaixo ↓ |

---

## 🛠️ Como gerar `FIREBASE_SERVICE_ACCOUNT`

1. Abrir Firebase Console: https://console.firebase.google.com/project/rota-31---backend/settings/serviceaccounts/adminsdk
2. Clicar em **"Generate new private key"**
3. Confirmar
4. Vai baixar um arquivo `rota-31---backend-firebase-adminsdk-XXXXX.json`
5. Abrir o arquivo e copiar o conteúdo TODO (é um JSON multi-linha)
6. Colar TODO o conteúdo no Secret `FIREBASE_SERVICE_ACCOUNT` no GitHub

**ATENÇÃO:** este arquivo dá acesso total ao seu projeto Firebase. **NÃO compartilhar, não commitar, não enviar por email.**

---

## ✅ Checklist Rafael

Em ordem:

- [ ] Abrir https://github.com/rfaellster-lab/Rota-31-/settings/secrets/actions
- [ ] Clicar "New repository secret" 6 vezes (uma por secret)
- [ ] Adicionar `FTP_SERVER` (valor: `108.167.132.68`)
- [ ] Adicionar `FTP_USERNAME` (valor: `thor4t63`)
- [ ] Adicionar `FTP_PASSWORD` (valor: senha do Hostgator)
- [ ] Adicionar `VITE_API_URL` (valor: `https://api-ajc3rclwsa-rj.a.run.app`)
- [ ] Adicionar `VITE_API_KEY` (valor: chave que você quiser, sugiro `rota31-prod-2026-painel`)
- [ ] Gerar `FIREBASE_SERVICE_ACCOUNT` no Firebase Console e colar o JSON
- [ ] Confirmar pra mim que terminou (digitar "secrets ok")

---

## 🧪 Como validar

Após adicionar todas as 6 Secrets, podemos testar de 2 formas:

**Opção A — Disparo manual (recomendado pra teste)**
1. Abrir https://github.com/rfaellster-lab/Rota-31-/actions
2. Clicar em "Deploy Frontend Rota 31" (workflow)
3. Clicar em "Run workflow" → branch `main` → "Run workflow"
4. Acompanhar logs

**Opção B — Esperar próximo push**
- Qualquer commit em `main` que toque arquivos do frontend dispara deploy
- Qualquer commit que toque `functions/**` dispara backend deploy
- Qualquer PR pra `main` dispara preview build

---

## 🚨 Em caso de problema

| Sintoma | Causa provável | Fix |
|---|---|---|
| `FTP login failed` | Senha errada ou expirada | Verificar Hostgator → FTP Accounts |
| `npm ci failed` | `package-lock.json` desatualizado | Rodar `npm install` local + commit |
| `vite build failed` | Erro TypeScript | Rodar `npm run lint` local antes de push |
| `firebase deploy failed` | Service account sem permissão | Verificar IAM no Google Cloud Console |
| `backend health check failed` | Functions demoraram pra subir | Aguardar 1-2min, validar manualmente |

---

## 🔒 Segurança

- Secrets **NUNCA** aparecem nos logs (mesmo `echo $FTP_PASSWORD` é mascarado)
- Secrets **NÃO** ficam acessíveis fora dos workflows
- Mesmo colaboradores do repo **NÃO** veem o valor (só substituem)
- Para rotacionar: Settings → Secrets → clicar no nome → "Update"

---

## 📝 Última atualização

Setup criado: 2026-05-08 pela skill `deploy-pipeline`. Mantido por @aios-master conforme regra `mandatory-backup-before-deploy.md`.
