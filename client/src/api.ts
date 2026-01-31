import axios from "axios";

export const API_BASE = "http://localhost:5245"; // ASP.NET default often 5000 (http)
export const api = axios.create({ baseURL: API_BASE });

export type Product = {
  id: string;
  productCode: string;
  name: string;
  price: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};

export type CheckoutItem = { productCode: string; quantity: number };

export type CheckoutRequest = {
  customerName?: string;
  customerPhone?: string;
  gstPercent: number;
  discountPercent: number; // ₹
  paidAmount: number;     // ₹
  paymentMethod: "Cash" | "UPI" | "Card";
  items: CheckoutItem[];
};

export async function checkoutSale(req: CheckoutRequest) {
  const res = await axios.post(`${API_BASE}/api/sales/checkout`, req);
  return res.data as {
    saleId: string;
    invoiceNo: string;
    totalAmount: number;
    paidAmount: number;
    balanceDue: number;
  };
}

export function invoicePdfUrl(saleId: string) {
  return `${API_BASE}/api/sales/${saleId}/invoice.pdf`;
}


export async function listProducts(search: string) {
  const res = await api.get(`/api/products`, { params: { search, page: 1, pageSize: 50 } });
  return res.data as { total: number; items: Product[] };
}

export async function getProduct(code: string) {
  const res = await api.get(`/api/products/${encodeURIComponent(code)}`);
  return res.data as Product;
}

export async function createProduct(payload: { productCode: string; name: string; price: number; quantity: number }) {
  const res = await api.post(`/api/products`, payload);
  return res.data as Product;
}

export async function updateProduct(code: string, payload: { name: string; price: number; quantity: number }) {
  const res = await api.put(`/api/products/${encodeURIComponent(code)}`, payload);
  return res.data as Product;
}

export async function deleteProduct(code: string) {
  await api.delete(`/api/products/${encodeURIComponent(code)}`);
}

export async function adjustStock(code: string, delta: number, note?: string) {
  const res = await api.post(`/api/products/${encodeURIComponent(code)}/adjust`, { delta, note });
  return res.data as Product;
}

export async function downloadLabelsPdf(items: { productCode: string; labelCount: number }[]) {
  const res = await api.post(`/api/labels/pdf`, { items }, { responseType: "blob" });
  return res.data as Blob;
}

export function qrUrl(code: string) {
  return `${API_BASE}/api/qr/${encodeURIComponent(code)}`;
}
export async function updateSalePayment(saleId: string, paidAmount: number, paymentMethod?: string) {
    const res = await api.put(`/api/sales/${saleId}/payment`, { paidAmount, paymentMethod });
    return res.data as { saleId: string; paidAmount: number; balanceDue: number };
  }
  

