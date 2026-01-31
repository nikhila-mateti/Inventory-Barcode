namespace InventoryQr.Api.Models;

public class Sale
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string InvoiceNo { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;


    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }

    public decimal GstPercent { get; set; }          // one GST for whole bill
    public decimal DiscountAmount { get; set; }  // ₹
    public decimal DiscountPercent { get; set; } // %

    public decimal PaidAmount { get; set; }          // ₹ paid
    public string PaymentMethod { get; set; } = "Cash";

    public decimal Subtotal { get; set; }
    public decimal TaxableAmount { get; set; }
    public decimal GstAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal BalanceDue { get; set; }

    public List<SaleItem> Items { get; set; } = new();
}
