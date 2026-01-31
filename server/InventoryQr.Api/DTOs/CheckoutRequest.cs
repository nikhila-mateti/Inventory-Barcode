namespace InventoryQr.Api.Dtos;

public class CheckoutRequest
{
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }

    public decimal GstPercent { get; set; } = 0;
    public decimal DiscountPercent { get; set; } = 0; // 0..100
    public decimal PaidAmount { get; set; } = 0;
    public string PaymentMethod { get; set; } = "Cash";

    public List<CheckoutItem> Items { get; set; } = new();
}

public class CheckoutItem
{
    public string ProductCode { get; set; } = "";
    public int Quantity { get; set; } = 1;
}
