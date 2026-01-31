namespace InventoryQr.Api.Models;

public class SaleItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string SaleId { get; set; } = "";

    public string ProductCode { get; set; } = "";
    public string Name { get; set; } = "";

    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }

    public decimal LineTotal { get; set; }
}
