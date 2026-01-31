namespace InventoryQr.Api.Dtos;

public class UpdatePaymentRequest
{
    public decimal PaidAmount { get; set; } = 0;
    public string? PaymentMethod { get; set; }
}
