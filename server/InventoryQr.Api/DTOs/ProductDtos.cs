using System.ComponentModel.DataAnnotations;

namespace InventoryQr.Api.DTOs;

public record ProductCreateDto(
    [Required, MaxLength(64)] string ProductCode,
    [Required, MaxLength(200)] string Name,
    [Range(0, 9999999)] decimal Price,
    int Quantity
);

public record ProductUpdateDto(
    [Required, MaxLength(200)] string Name,
    [Range(0, 9999999)] decimal Price,
    int Quantity
);

public record AdjustStockDto(
    int Delta,
    string? Note
);

public record LabelsPdfRequest(List<LabelsPdfItem> Items);

public record LabelsPdfItem(
    [Required, MaxLength(64)] string ProductCode,
    int LabelCount
);
