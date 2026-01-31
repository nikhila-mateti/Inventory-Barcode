import { useEffect, useMemo, useRef, useState } from "react";
import { checkoutSale, invoicePdfUrl, getProduct, updateSalePayment, type Product } from "../api";


type CartItem = {
  productCode: string;
  name: string;
  price: number;
  qty: number;
};

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export default function BillingPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [scanValue, setScanValue] = useState("");
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanMode, setScanMode] = useState(true);
  const [saleId, setSaleId] = useState<string | null>(null);
  const isInvoiced = saleId !== null;



  // Invoice fields (MVP A)
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [gstPercent, setGstPercent] = useState(5); // 0,5,12,18,28
  const [discountPercent, setDiscountPercent] = useState(0); // %
  const [paidAmount, setPaidAmount] = useState(0); // ₹
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "UPI" | "Card">("Cash");

  // for Undo
  const [actions, setActions] = useState<{ productCode: string }[]>([]);
  

  useEffect(() => {
    if (!scanMode) return;
  
    inputRef.current?.focus();
  
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tag = target?.tagName?.toLowerCase();
  
      // If user is typing in any input/select/button → do NOT steal focus
      if (["input", "select", "textarea", "button"].includes(tag)) return;
  
      inputRef.current?.focus();
    };
  
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [scanMode]);
  

  const items = useMemo(() => Object.values(cart), [cart]);

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + it.price * it.qty, 0),
    [items]
  );

  const safeDiscountPercent = useMemo(
    () => Math.max(0, Math.min(discountPercent || 0, 100)),
    [discountPercent]
  );
  const discountValue = useMemo(
    () => (subtotal * safeDiscountPercent) / 100,
    [subtotal, safeDiscountPercent]
  );
  

  const taxable = useMemo(() => Math.max(0, subtotal - discountValue), [subtotal, discountValue]);
  const gstAmount = useMemo(() => (taxable * (gstPercent || 0)) / 100, [taxable, gstPercent]);
  const total = useMemo(() => taxable + gstAmount, [taxable, gstAmount]);

  const safePaid = useMemo(
    () => Math.max(0, Math.min(paidAmount || 0, total)),
    [paidAmount, total]
  );

  const balance = useMemo(() => total - safePaid, [total, safePaid]);

  function clearInput() {
    setScanValue("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function handleScan(raw: string) {
    const code = raw.trim();
    if (!code) return;

    setBusy(true);
    setError(null);

    try {
      // Fetch product details so we have name/price in cart
      const p: Product = await getProduct(code);

      setCart(prev => {
        const existing = prev[code];
        if (existing) {
          return { ...prev, [code]: { ...existing, qty: existing.qty + 1 } };
        }
        return {
          ...prev,
          [code]: { productCode: p.productCode, name: p.name, price: p.price, qty: 1 }
        };
      });

      setActions(prev => [...prev, { productCode: code }]);
    } catch (e: any) {
      const msg =
        e?.response?.status === 404
          ? `Product not found: ${code}`
          : (e?.response?.data?.message ?? e?.message ?? "Scan failed");
      setError(msg);
    } finally {
      setBusy(false);
      clearInput();
    }
  }

  async function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      await handleScan(scanValue);
    }
  }

  function updateQty(code: string, qty: number) {
    setCart(prev => {
      const existing = prev[code];
      if (!existing) return prev;

      if (qty <= 0) {
        const copy = { ...prev };
        delete copy[code];
        return copy;
      }
      return { ...prev, [code]: { ...existing, qty } };
    });
  }

  function removeItem(code: string) {
    setCart(prev => {
      const copy = { ...prev };
      delete copy[code];
      return copy;
    });
    inputRef.current?.focus();
  }

  function undoLast() {
    const last = actions[actions.length - 1];
    if (!last) return;

    const code = last.productCode;

    setCart(prev => {
      const existing = prev[code];
      if (!existing) return prev;

      const newQty = existing.qty - 1;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[code];
        return copy;
      }
      return { ...prev, [code]: { ...existing, qty: newQty } };
    });

    setActions(prev => prev.slice(0, -1));
    inputRef.current?.focus();
  }

  function clearAll() {
    setCart({});
    setActions([]);
    setError(null);
    setScanValue("");
    setDiscountPercent(0);
    setPaidAmount(0);
    setCustomerName("");
    setCustomerPhone("");
    setPaymentMethod("Cash");
    setGstPercent(5);
    inputRef.current?.focus();
  }

  async function generateInvoice() {
    if (items.length === 0) {
      setError("Cart is empty.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const payload = {
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        gstPercent,
        discountPercent: safeDiscountPercent,
        paidAmount: safePaid,
        paymentMethod,
        items: items.map(it => ({ productCode: it.productCode, quantity: it.qty })),
      };

      const out = await checkoutSale(payload);

      setSaleId(out.saleId);
      // Open invoice PDF in new tab
      window.open(invoicePdfUrl(out.saleId), "_blank");

      // Reset for next customer
    //   setCart({});
    //   setActions([]);
    //   setScanValue("");
    //   setDiscountPercent(0);
    //   setPaidAmount(0);
    //   setCustomerName("");
    //   setCustomerPhone("");
    //   setPaymentMethod("Cash");
      // keep GST selection as-is
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Checkout failed");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }
  async function updatePaid() {
    if (!saleId) return;
  
    setBusy(true);
    setError(null);
    try {
      await updateSalePayment(saleId, safePaid, paymentMethod);
  
      // open updated invoice (same invoice, due updated)
      window.open(invoicePdfUrl(saleId), "_blank");
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to update payment");
    } finally {
      setBusy(false);
    }
  }
  

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Billing (Barcode Scan)</div>
          {/* <div className="muted" style={{ marginTop: 4 }}>
            Scan barcode → it types the code + Enter → adds item to cart. Stock updates only when you generate invoice.
          </div> */}
          <label
            style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                fontSize: 14,
            }}
            >
            <input
                type="checkbox"
                checked={scanMode}
                onChange={(e) => setScanMode(e.target.checked)}
            />
            Scan mode
            </label>

        </div>

        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <button className="btn" onClick={undoLast} disabled={busy || actions.length === 0}>
            Undo
          </button>
          <button className="btn danger" onClick={clearAll} disabled={busy || items.length === 0}>
            Clear
          </button>
          {/*  */}

        </div>
      </div>

      <hr />

      {/* Scan input row */}
      <div className="row" style={{ alignItems: "end", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div className="muted" style={{ marginBottom: 6 }}>Scan / Enter Product Code</div>
          <input
            ref={inputRef}
            className="input"
            style={{ fontSize: 18, padding: "14px 14px" }}
            placeholder="Scan barcode…"
            value={scanValue}
            onChange={(e) => setScanValue(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={busy}
          />
        </div>

        <button className="btn primary" onClick={() => handleScan(scanValue)} disabled={busy}>
          Add
        </button>
      </div>

      {error && <div style={{ marginTop: 10, color: "#fca5a5" }}>{error}</div>}

      <hr />

      {/* Cart table */}
      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 140 }}>Code</th>
              <th>Item</th>
              <th style={{ width: 140 }}>Price</th>
              <th style={{ width: 120 }}>Qty</th>
              <th style={{ width: 160 }}>Line Total</th>
              <th style={{ width: 120 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.productCode}>
                <td style={{ fontWeight: 700 }}>{it.productCode}</td>
                <td>{it.name}</td>
                <td>{INR.format(it.price)}</td>
                <td>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={it.qty}
                    onChange={(e) => updateQty(it.productCode, Number(e.target.value))}
                    disabled={busy}
                    style={{ maxWidth: 90 }}
                  />
                </td>
                <td>{INR.format(it.price * it.qty)}</td>
                <td>
                  <button className="btn small danger" onClick={() => removeItem(it.productCode)} disabled={busy}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  Cart is empty. Scan an item to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <hr />

      {/* Invoice controls */}
      <div className="row" style={{ gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <div style={{ minWidth: 220 }}>
          <div className="muted" style={{ marginBottom: 6 }}>Customer Name (optional)</div>
          <input className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </div>

        <div style={{ minWidth: 180 }}>
          <div className="muted" style={{ marginBottom: 6 }}>Phone (optional)</div>
          <input className="input" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
        </div>

        <div style={{ width: 140 }}>
          <div className="muted" style={{ marginBottom: 6 }}>GST %</div>
          <select className="input" value={gstPercent} onChange={(e) => setGstPercent(Number(e.target.value))}>
            {[0, 5, 12, 18, 28].map(p => (
              <option key={p} value={p}>{p}%</option>
            ))}
          </select>
        </div>

        <div style={{ width: 160 }}>
            <div className="muted" style={{ marginBottom: 6 }}>Discount (%)</div>
            <input
                className="input"
                type="number"
                min={0}
                max={100}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
            />
        </div>


        <div style={{ width: 160 }}>
          <div className="muted" style={{ marginBottom: 6 }}>Paid (₹)</div>
          <input
            className="input"
            type="number"
            min={0}
            value={paidAmount}
            onChange={(e) => setPaidAmount(Number(e.target.value))}
          />
        </div>

        <div style={{ width: 150 }}>
          <div className="muted" style={{ marginBottom: 6 }}>Payment</div>
          <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
          </select>
        </div>

        <button className="btn primary" onClick={generateInvoice} disabled={busy || items.length === 0}>
          Generate Invoice (PDF)
        </button>
      </div>

      <hr />

      {/* Totals */}
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <div className="card" style={{ minWidth: 340 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="muted">Subtotal</div>
            <div style={{ fontWeight: 700 }}>{INR.format(subtotal)}</div>
          </div>

          <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
            <div className="muted">Discount ({safeDiscountPercent}%)</div>
            <div style={{ fontWeight: 700 }}>- {INR.format(discountValue)}</div>
          </div>


          <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
            <div className="muted">Taxable</div>
            <div style={{ fontWeight: 700 }}>{INR.format(taxable)}</div>
          </div>

          <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
            <div className="muted">GST ({gstPercent}%)</div>
            <div style={{ fontWeight: 700 }}>{INR.format(gstAmount)}</div>
          </div>

          <div className="row" style={{ justifyContent: "space-between", marginTop: 10 }}>
            <div style={{ fontWeight: 900 }}>Total</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{INR.format(total)}</div>
          </div>

          <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
            <div className="muted">Paid</div>
            <div style={{ fontWeight: 700 }}>{INR.format(safePaid)}</div>
          </div>

          <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
            <div style={{ fontWeight: 900 }}>Balance</div>
            <div style={{ fontWeight: 900 }}>{INR.format(balance)}</div>
          </div>

          <div className="muted" style={{ marginTop: 10 }}>
            Tip: If the PDF doesn’t open, allow popups for localhost in Chrome.
          </div>
        </div>
      </div>
    </div>
  );
}
