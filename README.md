# Inventory QR (Barcode Billing + Invoicing) — MVP

A full-stack retail billing + inventory system built for a small clothing shop.  
Supports **barcode-scanner-based checkout**, **GST + percentage discount**, **PDF invoice generation**, and **printable barcode labels**.

> Built for real in-store usage: USB barcode scanners work like a keyboard (scan → code types → Enter).

---

## Features

### Inventory
- Create / update / search products
- Track stock quantity
- Optional barcode value (numeric) per product

### Barcode Labels (Print)
- Generate **print-ready PDF labels** for products
- Large barcode + product name + price (₹)
- Designed for A4 printing

### Billing / POS
- Scan product codes to build cart (fast POS flow)
- Update quantity / remove items / undo last scan
- Apply **GST %** and **Discount %**
- Generate **PDF invoice** with:
  - Item list, qty, unit price, amount
  - Subtotal, discount, taxable, GST, total
  - Paid amount and balance due
- Store sales for reprint/audit

### Payment Workflow (In-store)
- Generate invoice first (even if unpaid)
- Later update paid amount and reprint invoice (due becomes ₹0)

---

## Tech Stack

**Frontend**
- React + TypeScript (Vite)
- Simple POS UX with “Scan mode” focus handling

**Backend**
- C# / .NET Minimal API
- Entity Framework Core + SQLite
- QuestPDF for invoices and label PDFs
- Barcode generation service

---

## Project Structure

```text
inventory-qr/
├── client/                # React (Vite) frontend (POS + Billing UI)
└── server/
    └── InventoryQr.Api/   # .NET API (SQLite, Invoices, Barcode PDFs)
```
## Usage
### Add Products
1. Navigate to Products
2. Add product code (SKU), name, price, quantity
3. Optionally set barcode value (recommended numeric)

### Billing (POS)
1. Go to Billing
2. Enable Scan Mode
3. Scan product barcode (scanner types code + Enter)
4. Apply GST % and Discount %
5. Click Generate Invoice (PDF)

### To mark payment later:
1. Enter paid amount
2. Click Update Paid & Reprint
3. Invoice updates balance to ₹0 when fully paid
