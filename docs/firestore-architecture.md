# Rota 31 Panel - Firestore Architecture

## Decision

Use Firestore as the panel database while keeping Google Sheets and n8n as the operational source of truth for the current CT-e workflow.

This is a staged migration:

1. Sheets remains active for `APROVACOES_PENDENTES` and `CADASTRO_CLIENTES`.
2. Express writes panel metadata and audit records to Firestore.
3. The React app only talks to Express. It does not read/write Firestore directly.
4. Later, once the panel is stable, n8n can write to Firestore directly or call Express endpoints.

## Why

- Firebase Auth alone does not create Firestore documents. User records must be written explicitly.
- Firestore is better than Sheets for panel concerns: permissions, notifications, audit trail, settings and future feature flags.
- Keeping the current n8n/Sheets flow avoids breaking the WhatsApp automation while the panel matures.
- Firestore security rules can stay closed (`allow read, write: if false`) because the backend uses Firebase Admin SDK.

## Collections

### `users/{uid}`

Panel user profile mirrored from Firebase Auth.

```json
{
  "uid": "firebase uid",
  "email": "user@example.com",
  "displayName": "Nome",
  "role": "admin | operator",
  "disabled": false,
  "lastSeenAt": "server timestamp",
  "createdAt": "server timestamp"
}
```

### `auditEvents/{eventId}`

Append-only panel action log.

```json
{
  "type": "invoice.approve | invoice.deny | user.role | user.disable | rule.add | rule.update | rule.delete",
  "actor": { "uid": "...", "email": "...", "name": "...", "role": "admin" },
  "target": { "kind": "invoice | user | rule", "id": "..." },
  "metadata": {},
  "createdAt": "server timestamp"
}
```

### `notifications/{id}`

In-app operational notification stream.

```json
{
  "level": "info | warning | error | success",
  "title": "Aprovacoes pendentes",
  "message": "Ha notas aguardando decisao.",
  "source": "panel | sheets | bsoft | n8n",
  "readBy": { "uid": true },
  "createdAt": "server timestamp"
}
```

### `promotions/{id}`

Discreet Thor4Tech placement, controlled from backend/admin later.

```json
{
  "active": true,
  "placement": "sidebar | config | notifications",
  "title": "Automacoes que reduzem retrabalho",
  "body": "Painel, integracoes e rotinas operacionais por Thor4Tech.",
  "ctaLabel": "Falar com a Thor4Tech",
  "ctaUrl": "https://thor4tech.com.br",
  "priority": 10
}
```

## Backend Safety Rules

- Firestore writes are best-effort. If Firestore credentials are missing, the panel still works with Sheets/n8n.
- Approve/deny still obey `DRY_RUN`. No CT-e emission is enabled by this architecture.
- BSOFT credentials remain server-only.
- Production CORS must use an allowlist, never wildcard.
- Any production deploy, WhatsApp send, n8n activation or real CT-e action still requires explicit Rafael approval.

## Firestore Rules

Recommended while Express is the only data access path:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Validation Plan

1. `npm run lint`
2. `npm run build`
3. Local login with `thor4tech@gmail.com`
4. Verify `/api/me` creates or updates `users/{uid}` when Firestore credentials allow it
5. Approve/deny in `DRY_RUN=true` and verify audit events are recorded
6. Confirm the panel continues loading invoices if Firestore is unavailable

