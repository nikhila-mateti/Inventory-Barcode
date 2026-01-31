import { useEffect, useState } from "react";
import { downloadLabelsPdf, listProducts, type Product } from "../api";

export default function PrintLabelsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await listProducts("");
      setProducts(data.items);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function setCount(code: string, val: number) {
    setCounts(prev => ({ ...prev, [code]: val }));
  }

  async function download() {
    setErr(null);

    const items = Object.entries(counts)
      .filter(([, c]) => c > 0)
      .map(([productCode, labelCount]) => ({ productCode, labelCount }));

    if (items.length === 0) {
      setErr("Select at least one product and label count > 0.");
      return;
    }

    try {
      const blob = await downloadLabelsPdf(items);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "labels.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e?.message ?? "Failed to generate PDF");
    }
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Print Labels</div>
          <div className="muted" style={{ marginTop: 4 }}>Choose label counts and download an A4 PDF sheet.</div>
        </div>
        <button className="btn" onClick={load} disabled={loading}>{loading ? "Loading..." : "Reload"}</button>
      </div>

      <hr />

      {err && <div style={{ color: "#fca5a5" }}>{err}</div>}

      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Qty</th>
              <th style={{ width: 180 }}>Labels</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 700 }}>{p.productCode}</td>
                <td>{p.name}</td>
                <td>{p.quantity}</td>
                <td>
                  <input
                    className="input"
                    style={{ maxWidth: 140 }}
                    type="number"
                    min={0}
                    value={counts[p.productCode] ?? 0}
                    onChange={(e) => setCount(p.productCode, Number(e.target.value))}
                  />
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={4} className="muted">No products. Add from Products page.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
        <button className="btn primary" onClick={download}>Download PDF</button>
      </div>
    </div>
  );
}
