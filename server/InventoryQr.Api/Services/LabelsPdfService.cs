using InventoryQr.Api.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace InventoryQr.Api.Services;

public static class LabelsPdfService
{
    public static byte[] BuildRetailStickerLabelsPdf(
        string companyName,
        string website,
        List<(Product product, int labelCount, Func<string, byte[]> barcodePng)> items
    )
    {
        QuestPDF.Settings.License = LicenseType.Community;

        var labels = new List<Product>();
        foreach (var (product, count, _) in items)
        {
            var safeCount = Math.Clamp(count, 0, 500);
            for (int i = 0; i < safeCount; i++) labels.Add(product);
        }

        // Sticker size vibe: 2 columns, bigger cells
        const int columns = 2;

        var doc = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(18);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Content().Grid(grid =>
                {
                    grid.Columns(columns);
                    grid.Spacing(14);

                    foreach (var p in labels)
                    {
                        var gen = items.First(x => x.product.Id == p.Id).barcodePng;
                        var barcodeValue = string.IsNullOrWhiteSpace(p.BarcodeValue) ? p.ProductCode : p.BarcodeValue;
                        var barcodeBytes = gen(barcodeValue);

                        grid.Item().Element(sticker =>
                        {
                            sticker
                                .Background(Colors.White)
                                .Border(2)
                                .BorderColor(Colors.Grey.Lighten2)
                                .Padding(12)
                                .Column(col =>
                                {
                                    col.Spacing(4);

                                    // COMPANY NAME
                                    col.Item().AlignCenter().Text(companyName)
                                        .FontSize(14).SemiBold().FontColor(Colors.Black);

                                    // ₹ PRICE
                                    col.Item().AlignCenter().Text($"₹ {p.Price:0.00}")
                                        .FontSize(13).SemiBold().FontColor(Colors.Black);

                                    // department
                                    // col.Item().AlignCenter().Text(string.IsNullOrWhiteSpace(p.Department) ? "department" : p.Department)
                                    //     .FontSize(9).FontColor(Colors.Grey.Darken2);

                                    // Product Description
                                    // col.Item().AlignCenter().Text(p.Name)
                                    //     .FontSize(10).FontColor(Colors.Black);

                                    col.Item().PaddingTop(6);

                                    // Barcode (like malls)
                                    col.Item().AlignCenter().Height(65).Image(barcodeBytes).FitArea();

                                    // Digits under barcode (simple + reliable)
                                    col.Item().AlignCenter().Text(barcodeValue)
                                        .FontSize(11).FontColor(Colors.Black).LetterSpacing(1);

                                    // Website
                                    if (!string.IsNullOrWhiteSpace(website))
                                    {
                                        col.Item().AlignCenter().Text(website)
                                            .FontSize(8).FontColor(Colors.Grey.Darken2);
                                    }
                                });
                        });
                    }
                });
            });
        });

        return doc.GeneratePdf();
    }
}
