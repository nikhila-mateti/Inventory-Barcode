using System.ComponentModel.DataAnnotations;

namespace InventoryQr.Api.Models;

public class Product
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(64)]
    public string ProductCode { get; set; } = default!; // unique manual code/SKU

    [Required, MaxLength(200)]
    public string Name { get; set; } = default!;

    [Range(0, 9999999)]
    public decimal Price { get; set; }

    public int Quantity { get; set; }

    // public string Department { get; set; } = "department";
    public string BarcodeValue { get; set; } = ""; // numeric (12/13) recommended

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

}
