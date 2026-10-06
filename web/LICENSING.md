# BharatLedger — Offline Commercial Licensing

## Model (Phase 1: Offline owner control)

| Role | Capability |
|------|------------|
| **Owner** | Sets Master PIN, generates unique keys, lists/revokes/exports keys, all offline |
| **Customer** | Activates with key + mobile; app validates against local key pool automatically |
| **System** | Generates unique keys (`BL-{PLAN}-{RANDOM}-{CHECK}`); no two keys collide |

Keys are stored in the same local database as company data. Owner backs up via **Settings → Backup**.

### Key format

```
BL-{PLAN}-{TIMESTAMP36}-{RANDOM}-{CHECK}
Example: BL-PRO-M8K2X-A7F9Q2-P4
```

- `PLAN`: `PRO` | `SAL` | `SMB`
- Unique per generation (timestamp + CSPRNG-style random)
- Check character for basic typo detection

### Lifecycle

```
available → activated (bound to mobile) → [optional] revoked
```

Activation is **automatic**: client checks key exists, status `available` or same mobile re-activation, plan, not past expiry, not revoked.

### Owner PIN

- Set once on first use of License Admin.
- Required to generate / revoke / export keys.
- Stored as a simple hash in localStorage (deterrent, not bank-grade). Change device = set new PIN after restore if needed.

### Export / import

- **Export keys** downloads JSON of the licence pool (for moving to another owner device or future server import).
- Full app **Backup** also includes `licencePool` + `ownerPinHash`.

---

## Phase 2: Online subscription (when you scale)

Keep the same entitlement shape on the client:

```json
{
  "key": "BL-PRO-…",
  "plan": "PRO",
  "mobile": "98XXXXXXXX",
  "expiry": "2027-10-06",
  "active": true,
  "activatedAt": "…",
  "deviceId": "…"
}
```

Migration steps:

1. Stand up `POST /v1/activate` and `POST /v1/refresh`.
2. Import exported key pool (or issue new keys from payments).
3. Server returns signed JWT; client verifies with embedded public key.
4. Offline grace = last successful refresh + N days.
5. Feature gates continue to read `plan` from verified local entitlement.

No UI rewrite required for customers—only the validation path behind “Activate”.

---

## Recommendations

- Generate keys on a dedicated owner device; do not generate production keys in public demos.
- Issue 1-year expiry for annual plans; use shorter expiry when testing online renewals later.
- Max devices per key can be enforced when you add `deviceId` list in Phase 2.
- WhatsApp/share of keys: share only the key string + activation instructions, never the full pool export.
