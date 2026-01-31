import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { adjustStock, getProduct, type Product, qrUrl } from "../api";

export default function ProductPublicPage() {
  const { productCode } = useParams();
  const code = productCode ?? "";

  const [product, setProduct] = useState<Product | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [delta, setDelta] = useState("-1");
  const [loading, setLoading] = useState(false);

  async function load() {
    setErr(null);
    try {
      const p = await getProduct(code);
      setProduct(p);
    } catch (e: any) {
      setErr(e?.response?.status === 404 ? "Product not found." : (e?.message ?? "Failed to load"));
      setProduct(null);
    }
  }

  useEffect(() => { load(); }, [code]);

  async function quickAdjust(d: number, note: string) {
    setLoading(true);
    setErr(null);
    try {
      const p = await adjustStock(code, d, note);
      setProduct(p);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to update stock");
    } finally {
      setLoading(false);
    }
  }

  async function manualAdjust() {
    const d = Number(delta);
    if (Number.isNaN(d) || d === 0) {
      setErr("Enter a non-zero number.");
      return;
    }
    await quickAdjust(d, "Manual adjust");
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{product?.name ?? code}</div>
          <div className="muted" style={{ marginTop: 4 }}>Code: <b>{code}</b></div>
        </div>
        <div className="badge">Mobile</div>
      </div>

      {err && <div style={{ marginTop: 10, color: "#fca5a5" }}>{err}</div>}

      {product && (
        <>
          <hr />
          <div className="row">
            <div className="card" style={{ flex: 1, minWidth: 240 }}>
              <div className="muted">Price</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>${product.price.toFixed(2)}</div>
            </div>
            <div className="card" style={{ flex: 1, minWidth: 240 }}>
              <div className="muted">Quantity</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{product.quantity}</div>
            </div>
            <div className="card" style={{ minWidth: 200 }}>
              <div className="muted">QR</div>
              <img src={qrUrl(code)} style={{ width: 140, height: 140, marginTop: 8 }} />
            </div>
          </div>

          <hr />

          <div className="row">
            <button className="btn danger" disabled={loading} onClick={() => quickAdjust(-1, "Sold 1")}>
              Sold -1
            </button>
            <button className="btn" disabled={loading} onClick={() => quickAdjust(-5, "Sold 5")}>
              Sold -5
            </button>
            <button className="btn primary" disabled={loading} onClick={() => quickAdjust(+10, "Restock 10")}>
              Restock +10
            </button>
          </div>

          <div className="row" style={{ marginTop: 12, alignItems: "center" }}>
            <div style={{ width: 180 }}>
              <input className="input" value={delta} onChange={(e) => setDelta(e.target.value)} />
              <div className="muted" style={{ marginTop: 6 }}>Use negative for sales.</div>
            </div>
            <button className="btn" disabled={loading} onClick={manualAdjust}>Apply</button>
            <button className="btn" disabled={loading} onClick={load}>Refresh</button>
          </div>
        </>
      )}
    </div>
  );
}
