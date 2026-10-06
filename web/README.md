# BharatLedger

**Offline-first Tally alternative for Indian businesses, professionals & individuals.**

Mobile-friendly Progressive Web App (PWA) with:

- Stock-integrated vouchers (Sales / Purchase / Receipt / Payment / Contra)
- Chart of Accounts, inventory, GST split, P&L, Balance Sheet, Section 44ADA
- **Offline commercial licensing** — system-generated unique keys, full owner control without internet
- **WhatsApp invoice sharing**
- Review → Confirm flows, edit everywhere, CA audit lock, backup/restore
- Designed to grow into an online subscription model later

---

## Quick start

```bash
# Clone your repo
git clone https://github.com/YOUR_USERNAME/bharatledger.git
cd bharatledger

# Serve locally (any static server)
python3 -m http.server 8080
# or: npx serve .
# or open index.html via Live Server in VS Code
```

Open `http://localhost:8080` on desktop or phone (same Wi‑Fi).

### Deploy

| Platform | How |
|----------|-----|
| **GitHub Pages** | Settings → Pages → Deploy from branch `main` / root |
| **Netlify / Vercel / Cloudflare Pages** | Connect repo, publish directory = `/` |
| **Any static host** | Upload all files in this folder |

No build step required. Pure HTML + React (CDN) + localStorage.

---

## Offline licensing (commercial release)

### Owner (you)

1. Open **Settings → License Admin** (or Guide).
2. Set a **Master Owner PIN** once (stored only on this device; backup the licence DB).
3. **Generate keys** — system creates unique keys per plan (`PRO` / `SAL` / `SMB`).
4. Copy / share key + instruct customer to activate with their mobile number.
5. **List / revoke / export** all keys offline. Full control without a server.

### Customer

1. Enter key (`BL-…`) + mobile → Review → Confirm.
2. App validates **locally** against the owner’s key pool (or embedded issued keys).
3. Works fully offline after activation (grace based on expiry).

### Scaling to online later

The data model already separates:

- Key ID / plan / expiry / mobile binding / status (`available` | `activated` | `revoked`)

When you add a licence API, replace local pool lookup with `POST /activate` and keep the same signed (or plain) local entitlement shape. See `docs/LICENSING.md`.

---

## WhatsApp invoice share

On any Sales / Purchase voucher → open voucher → **Share on WhatsApp**.  
Opens WhatsApp with a pre-filled invoice-style message (party, items, GST, total). Works on mobile; on desktop opens WhatsApp Web if available.

---

## Project structure

```
bharatledger/
├── index.html          # Full application (UI + logic)
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (offline cache)
├── README.md
├── GUIDEBOOK.md        # End-user guide
├── docs/
│   └── LICENSING.md    # Owner licensing & future online migration
└── .gitignore
```

---

## Demo keys (dev only)

After generating keys in License Admin, use those.  
Legacy demo prefixes still work only if you generate matching keys or enable demo mode in admin.

---

## Security notes

- Master PIN and licence pool live in **browser localStorage** on the owner device. **Backup** regularly (Settings → Backup includes licence data).
- This offline model deters casual sharing; it is not DRM against a determined attacker. For high-value online products, move validation to your server (see `docs/LICENSING.md`).
- Do not commit real customer keys or Master PIN to Git.

---

## Licence

Proprietary — BharatLedger. All rights reserved.  
Use this codebase for your commercial product under your own terms.
