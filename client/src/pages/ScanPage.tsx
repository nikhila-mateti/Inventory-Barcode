import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ScanPage() {
  const navigate = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const id = "qr-reader";
    const qr = new Html5Qrcode(id);
    scannerRef.current = qr;

    (async () => {
      try {
        setErr(null);
        await qr.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decodedText) => {
            // We encoded URL like http://localhost:5173/p/ABC123
            // If it's a URL, route to its path; otherwise treat as code.
            try {
              const url = new URL(decodedText);
              if (url.pathname.startsWith("/p/")) {
                navigate(url.pathname);
              } else {
                // fallback
                navigate(`/p/${encodeURIComponent(decodedText)}`);
              }
            } catch {
              navigate(`/p/${encodeURIComponent(decodedText)}`);
            }
          },
          () => {}
        );
      } catch (e: any) {
        setErr(e?.message ?? "Camera permission denied or scanner failed.");
      }
    })();

    return () => {
      (async () => {
        try {
          await scannerRef.current?.stop();
          await scannerRef.current?.clear();
        } catch {}
      })();
    };
  }, [navigate]);

  return (
    <div className="card">
      <div style={{ fontSize: 18, fontWeight: 700 }}>Scan QR</div>
      <div className="muted" style={{ marginTop: 6 }}>
        Use your phone camera in the browser. If asked, allow camera permission.
      </div>

      <div style={{ marginTop: 12 }}>
        {err && <div style={{ color: "#fca5a5", marginBottom: 10 }}>{err}</div>}
        <div id="qr-reader" style={{ width: "100%" }} />
      </div>
    </div>
  );
}
