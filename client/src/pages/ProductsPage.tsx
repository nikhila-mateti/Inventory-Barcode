import { useEffect, useMemo, useState } from "react";
import { createProduct, deleteProduct, listProducts, type Product, updateProduct } from "../api";

type FormState = { productCode: string; name: string; price: string; quantity: string };

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>({ productCode: "", name: "", price: "0", quantity: "0" });
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => (mode === "edit" ? `Edit ${editing?.productCode}` : "Add Product"), [mode, editing]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listProducts(search);
      setItems(data.items);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []); // initial
  useEffect(() => {
    const t = setTimeout(() => refresh(), 250);
    return () => clearTimeout(t);
  }, [search]);

  function openCreate() {
    setMode("create");
    setEditing(null);
    setForm({ productCode: "", name: "", price: "0", quantity: "0" });
  }

  function openEdit(p: Product) {
    setMode("edit");
    setEditing(p);
    setForm({ productCode: p.productCode, name: p.name, price: String(p.price), quantity: String(p.quantity) });
  }

  function closeModal() {
    setMode(null);
    setEditing(null);
    setError(null);
  }

  async function submit() {
    setError(null);
    const payload = {
      productCode: form.productCode.trim(),
      name: form.name.trim(),
      price: Number(form.price),
      quantity: Number(form.quantity),
    };

    if (!payload.productCode || !payload.name || Number.isNaN(payload.price) || Number.isNaN(payload.quantity)) {
      setError("Please fill all fields correctly.");
      return;
    }

    try {
      if (mode === "create") {
        await createProduct(payload);
      } else if (mode === "edit" && editing) {
        await updateProduct(editing.productCode, { name: payload.name, price: payload.price, quantity: payload.quantity });
      }
      closeModal();
      await refresh();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Failed");
    }
  }

  async function remove(code: string) {
    if (!confirm(`Delete product ${code}?`)) return;
    await deleteProduct(code);
    await refresh();
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Products</div>
          <div className="muted" style={{ marginTop: 4 }}>Create products, then print QR label sheets.</div>
        </div>
        <button className="btn primary" onClick={openCreate}>+ Add</button>
      </div>

      <hr />

      <div className="row">
        <div style={{ flex: 1, minWidth: 240 }}>
          <input className="input" placeholder="Search by code or name..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn" onClick={() => { setSearch(""); refresh(); }} disabled={loading}>{loading ? "Loading..." : "Refresh"}</button>
      </div>

      {error && <div style={{ marginTop: 10, color: "#fca5a5" }}>{error}</div>}

      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Price</th>
              <th>Qty</th>
              <th style={{ width: 220 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.productCode}</td>
                <td>{p.name}</td>
                <td>{INR.format(p.price)}</td>
                <td>{p.quantity}</td>
                <td>
                  <div className="row">
                    <button className="btn small" onClick={() => openEdit(p)}>Edit</button>
                    <button className="btn small danger" onClick={() => remove(p.productCode)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="muted">No products yet. Click “Add”.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal (simple) */}
      {mode && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16
        }}>
          <div className="card" style={{ width: 520, maxWidth: "100%" }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{title}</div>
            <div className="muted" style={{ marginTop: 6 }}>
              ProductCode is the manual code you already use in the shop.
            </div>

            <div style={{ marginTop: 12 }} className="row">
              <div style={{ flex: 1, minWidth: 220 }}>
                <div className="muted" style={{ marginBottom: 6 }}>Product Code</div>
                <input
                  className="input"
                  value={form.productCode}
                  disabled={mode === "edit"}
                  onChange={(e) => setForm(s => ({ ...s, productCode: e.target.value }))}
                />
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div className="muted" style={{ marginBottom: 6 }}>Name</div>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm(s => ({ ...s, name: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ marginTop: 12 }} className="row">
              <div style={{ flex: 1, minWidth: 220 }}>
                <div className="muted" style={{ marginBottom: 6 }}>Price</div>
                <input
                  className="input"
                  value={form.price}
                  onChange={(e) => setForm(s => ({ ...s, price: e.target.value }))}
                />
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div className="muted" style={{ marginBottom: 6 }}>Quantity</div>
                <input
                  className="input"
                  value={form.quantity}
                  onChange={(e) => setForm(s => ({ ...s, quantity: e.target.value }))}
                />
              </div>
            </div>

            {error && <div style={{ marginTop: 10, color: "#fca5a5" }}>{error}</div>}

            <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
              <button className="btn" onClick={closeModal}>Cancel</button>
              <button className="btn primary" onClick={submit}>{mode === "edit" ? "Save" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
