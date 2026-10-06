# BharatLedger – Complete User Guidebook

**Offline-first accounting for Indian businesses, professionals & individuals**  
Version 2.0 | Mobile-friendly web app

---

## Table of Contents

1. [What is BharatLedger?](#1-what-is-bharatledger)
2. [Getting Started](#2-getting-started)
3. [License Activation](#3-license-activation)
4. [Company Profile](#4-company-profile)
5. [Chart of Accounts & Ledgers](#5-chart-of-accounts--ledgers)
6. [Inventory Management](#6-inventory-management)
7. [Vouchers (Transactions)](#7-vouchers-transactions)
8. [Reports & Tax](#8-reports--tax)
9. [Data Security & Audit Lock](#9-data-security--audit-lock)
10. [Review, Edit & Confirmations](#10-review-edit--confirmations)
11. [Tips & Best Practices](#11-tips--best-practices)
12. [FAQ](#12-faq)

---

## 1. What is BharatLedger?

BharatLedger is a lightweight, **offline-first** alternative to Tally for:

- Small businesses & kirana stores  
- Professionals (doctors, CAs, consultants)  
- Salaried individuals tracking side income  

**Key principles:**

- All data stays on your device (no mandatory cloud)  
- Instant local execution  
- Confirmation + review before every important action  
- Full edit support so mistakes can be fixed  

---

## 2. Getting Started

1. Open the app URL on your mobile browser (Chrome recommended).  
2. Optionally **Add to Home Screen** for an app-like experience.  
3. Bottom navigation: **Home | Vouchers | Stock | Accounts | Reports | Guide | Settings**.  
4. Start with **License → Company Profile → Inventory → Vouchers**.

---

## 3. License Activation

| Plan | Key pattern | Example |
|------|-------------|---------|
| Professional / Doctor | Contains `PRO` | `BL-PRO-DEMO` |
| Salaried Individual | Contains `SAL` | `BL-SAL-DEMO` |
| Small Business / Kirana | Standard `BL-` | `BL-KIRANA-DEMO` |

**Steps:**

1. Tap **Activate License** (Home banner or Settings).  
2. Enter key (must start with `BL-`) and 10-digit mobile.  
3. App shows a **confirmation dialog** with Plan & Expiry.  
4. Confirm → license is activated for 1 year.

---

## 4. Company Profile

**Required:** Company Name, Owner Name  

**Optional:** Phone, State, Business Type, Entity Category, GSTIN, PAN  

**Flow (Create / Edit):**

1. Settings → Set Up Company (or Edit Profile).  
2. Fill the form (Step 1).  
3. Tap **Review →** (Step 2).  
4. Check the summary carefully.  
5. Tap **Confirm Create / Confirm Update**.  
6. You can edit the profile anytime later.

---

## 5. Chart of Accounts & Ledgers

### Pre-seeded groups

- **Assets:** Current Assets, Cash-in-Hand, Bank Accounts, Sundry Debtors, Stock-in-Hand, Fixed Assets  
- **Liabilities:** Current Liabilities, Sundry Creditors, Loans  
- **Equity:** Capital Account  
- **Income:** Direct / Indirect Incomes, Sales Accounts  
- **Expense:** Direct / Indirect Expenses, Purchase Accounts  

### Creating a custom ledger

1. Accounts tab → **+ Ledger**.  
2. Name, Account Group, Opening Balance.  
3. Confirmation shows name, group, nature & opening balance.  
4. Confirm to save.

### Editing / Deleting

- Custom ledgers: ✏️ Edit | 🗑️ Delete (with confirmation).  
- System ledgers (Cash, Bank, Sales, Purchases, Capital) **cannot be deleted**.

---

## 6. Inventory Management

**Fields:** Name, HSN, Unit Rate, GST %, Quantity, Unit (Nos / Kg / Litre / Box / Meter / Packet)

**Add / Edit:**

1. Stock tab → **+ Item** (or ✏️ on existing).  
2. Fill details → **Review & Add/Update**.  
3. Confirmation shows calculated stock value.  
4. Confirm.

**Delete:** 🗑️ with confirmation. Past voucher history remains; item is removed from catalog.

**Stock impact of vouchers:**

- **Sales / Receipt** → quantity decreases  
- **Purchase / Payment** → quantity increases  

---

## 7. Vouchers (Transactions)

**Types:** Sales | Purchase | Receipt | Payment | Contra  

### Creating a voucher (2-step)

**Step 1 – Enter data**

- Choose type, date, party name.  
- For Sales/Purchase: add line items (item, qty, rate, GST %). Total incl. GST is calculated.  
- Or enter a simple amount (for Receipt / Payment / Contra).  
- Select From & To ledgers, narration.  
- Tap **Review →**.

**Step 2 – Review & Confirm**

- Full summary is shown (type, date, party, amount, ledgers, line items).  
- Tap **← Edit** to go back and correct.  
- Tap **Confirm & Save** to post.  

After save: ledgers update and stock adjusts automatically. Voucher is marked `sync_status = pending`.

### Viewing, Editing, Deleting

- Tap a voucher → full view.  
- ✏️ Edit: change date, party, narration (amount & stock lines stay fixed). Confirmation required.  
- 🗑️ Delete: confirmation + **automatic stock reversal**.

When **Audit Lock** is on, create / edit / delete are blocked.

---

## 8. Reports & Tax

| Report | What it shows |
|--------|----------------|
| Profit & Loss | Sales/Receipts vs Purchases/Payments → Net Profit |
| Balance Sheet (simplified) | Cash, Bank, Stock value → Current Assets |
| Section 44ADA | 50% of gross receipts as presumptive income (professionals) |
| GST Summary | CGST + SGST split from voucher line items |
| Download Statement | Text file of key figures |

All figures update live as you add vouchers.

---

## 9. Data Security & Audit Lock

| Feature | Behaviour |
|---------|-----------|
| **Backup** | Downloads full JSON. Confirmation first. |
| **Restore** | Replaces all current data. Double confirmation (danger). |
| **CA Audit Lock** | Locks voucher create / edit / delete. Confirm to lock or unlock. |
| **Offline** | Works without internet after first load (service worker + localStorage). |

---

## 10. Review, Edit & Confirmations

This version is designed so mistakes can be fixed **before** final submission and **after** if needed.

| Action | Review step | Confirmation dialog | Later edit |
|--------|-------------|---------------------|------------|
| License activation | — | Yes (plan & expiry) | — |
| Company create/update | Step 2 review screen | Yes | ✏️ Edit Profile |
| Ledger create/update | — | Yes | ✏️ / 🗑️ |
| Inventory add/update | — | Yes (with value) | ✏️ / 🗑️ |
| Voucher create | Step 2 full review | Yes | ✏️ (party/narration/date) / 🗑️ (stock reversed) |
| Backup / Restore / Audit lock | — | Yes | — |

**Rule of thumb:** If the action changes financial data, you will always see a confirmation. For complex forms (company, voucher) you also get an intermediate **Review** screen where you can go back and edit.

---

## 11. Tips & Best Practices

1. Always use the **Review** screen — it is there to catch typos.  
2. Create inventory items **before** sales/purchase vouchers with line items.  
3. Use clear narrations and party names for easy search later.  
4. Take a **Backup** before major changes or at month-end.  
5. Lock books when sending data to your CA.  
6. System ledgers are protected — create custom ledgers for loans, rent, etc.  
7. Deleting a voucher reverses its stock impact; use this if you entered a wrong sale/purchase.

---

## 12. FAQ

**Q: Data is lost after closing the browser?**  
A: No. Data is stored in the browser’s localStorage and survives refresh. Use Backup for extra safety or when changing devices.

**Q: Can I use it fully offline?**  
A: Yes, after the first load. The service worker caches the app.

**Q: Why can’t I edit voucher amount after saving?**  
A: Amount and stock lines are fixed to keep ledger/stock consistent. Edit party/narration/date, or delete and re-create the voucher.

**Q: What does “pending” mean on vouchers?**  
A: Cloud sync is stubbed; every local voucher is queued as `pending` for a future sync API.

**Q: How do I clear all data?**  
A: Settings → Restore from an empty/new backup, or clear site data in browser settings (this wipes everything).

---

**BharatLedger** – Keep your books simple, offline, and under your control.
