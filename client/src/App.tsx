import { Link, Route, Routes } from "react-router-dom";
import ProductsPage from "./pages/ProductsPage";
import PrintLabelsPage from "./pages/PrintLabelsPage";
import ScanPage from "./pages/ScanPage";
import ProductPublicPage from "./pages/ProductPublicPage";
import BillingPage from "./pages/BillingPage";


export default function App() {
  return (
    <>
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 700 }}>Inventory QR</div>
          <span className="badge">MVP</span>
        </div>
        <div className="nav">
          <Link to="/" className="btn small">Products</Link>
          <Link to="/admin/print" className="btn small">Print Labels</Link>
          <Link to="/scan" className="btn small">Scan</Link>
          <Link to="/billing" className="btn small">Billing</Link>

        </div>
      </div>

      <div className="container">
        <Routes>
          <Route path="/" element={<ProductsPage />} />
          <Route path="/admin/print" element={<PrintLabelsPage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/p/:productCode" element={<ProductPublicPage />} />
          <Route path="/billing" element={<BillingPage />} />

        </Routes>
      </div>
    </>
  );
}
