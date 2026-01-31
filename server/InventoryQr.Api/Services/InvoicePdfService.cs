using InventoryQr.Api.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace InventoryQr.Api.Services;

public static class InvoicePdfService
{
    public static byte[] BuildInvoicePdf(Sale sale)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        var doc = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(24);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Content().Column(col =>
                {
                    // Header
                    col.Item().Row(r =>
                    {
                        r.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Srinivasa Cloth Stores").FontSize(16).SemiBold();
                            c.Item().Text("5-81, Pasra, Govindarao Pet, Mulugu, 506347").FontColor(Colors.Grey.Darken1);
                            c.Item().Text("Phone: +91 XXXXX XXXXX").FontColor(Colors.Grey.Darken1);
                            // c.Item().Text("GSTIN: XXXXX | PAN: XXXXX").FontColor(Colors.Grey.Darken1);
                        });

                        r.ConstantItem(180).AlignRight().Column(c =>
                        {
                            c.Item().Text("TAX INVOICE").FontSize(14).SemiBold();
                            c.Item().Text($"Invoice No: {sale.InvoiceNo}");
                            c.Item().Text($"Date: {sale.CreatedAt:dd MMM yyyy}");
                        });
                    });

                    col.Item().PaddingVertical(10).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);

                    // Customer box
                    col.Item().Row(r =>
                    {
                        r.RelativeItem().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Column(c =>
                        {
                            c.Item().Text("BILL TO").SemiBold();
                            c.Item().Text(string.IsNullOrWhiteSpace(sale.CustomerName) ? "-" : sale.CustomerName);
                            c.Item().Text(string.IsNullOrWhiteSpace(sale.CustomerPhone) ? "-" : sale.CustomerPhone);
                        });

                        r.ConstantItem(16);

                        r.RelativeItem().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Column(c =>
                        {
                            c.Item().Text("GST").SemiBold();
                            c.Item().Text($"{sale.GstPercent:0.##}% (single rate)");
                            c.Item().Text($"Payment: {sale.PaymentMethod}");
                        });
                    });

                    col.Item().PaddingVertical(10);

                    // Items table
                    col.Item().Table(t =>
                    {
                        t.ColumnsDefinition(cols =>
                        {
                            cols.ConstantColumn(30);   // #
                            cols.RelativeColumn(4);    // Item
                            cols.ConstantColumn(60);   // Qty
                            cols.ConstantColumn(80);   // Unit
                            cols.ConstantColumn(90);   // Line total
                        });

                        // Header row
                        t.Header(h =>
                        {
                            h.Cell().Element(CellHead).Text("#");
                            h.Cell().Element(CellHead).Text("Item");
                            h.Cell().Element(CellHead).AlignRight().Text("Qty");
                            h.Cell().Element(CellHead).AlignRight().Text("Unit (₹)");
                            h.Cell().Element(CellHead).AlignRight().Text("Amount (₹)");
                        });

                        int i = 1;
                        foreach (var it in sale.Items)
                        {
                            t.Cell().Element(CellBody).Text(i++.ToString());
                            t.Cell().Element(CellBody).Text(it.Name);
                            t.Cell().Element(CellBody).AlignRight().Text(it.Quantity.ToString());
                            t.Cell().Element(CellBody).AlignRight().Text($"{it.UnitPrice:0.00}");
                            t.Cell().Element(CellBody).AlignRight().Text($"{it.LineTotal:0.00}");
                        }

                        static IContainer CellHead(IContainer c) =>
                            c.Background(Colors.Grey.Lighten3).Padding(6).BorderBottom(1).BorderColor(Colors.Grey.Lighten2).DefaultTextStyle(x => x.SemiBold());

                        static IContainer CellBody(IContainer c) =>
                            c.Padding(6).BorderBottom(1).BorderColor(Colors.Grey.Lighten3);
                    });

                    col.Item().PaddingVertical(10);

                    // Totals
                    col.Item().AlignRight().Column(tot =>
                    {
                        tot.Item().Row(r => { r.RelativeItem().Text("Subtotal"); r.ConstantItem(120).AlignRight().Text($"₹ {sale.Subtotal:0.00}"); });
                        tot.Item().Row(r =>
                        {
                            var pctText = sale.DiscountPercent > 0 ? $" ({sale.DiscountPercent:0.##}%)" : "";
                            r.RelativeItem().Text($"Discount{pctText}");
                            r.ConstantItem(120).AlignRight().Text($"- ₹ {sale.DiscountAmount:0.00}");
                        });

                        tot.Item().Row(r => { r.RelativeItem().Text("Taxable Amount"); r.ConstantItem(120).AlignRight().Text($"₹ {sale.TaxableAmount:0.00}"); });
                        tot.Item().Row(r => { r.RelativeItem().Text($"GST ({sale.GstPercent:0.##}%)"); r.ConstantItem(120).AlignRight().Text($"₹ {sale.GstAmount:0.00}"); });

                        tot.Item().PaddingTop(6).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);

                        tot.Item().Row(r => { r.RelativeItem().Text("Total").SemiBold(); r.ConstantItem(120).AlignRight().Text($"₹ {sale.TotalAmount:0.00}").SemiBold(); });
                        tot.Item().Row(r => { r.RelativeItem().Text("Paid"); r.ConstantItem(120).AlignRight().Text($"₹ {sale.PaidAmount:0.00}"); });
                        tot.Item().Row(r => { r.RelativeItem().Text("Balance Due").SemiBold(); r.ConstantItem(120).AlignRight().Text($"₹ {sale.BalanceDue:0.00}").SemiBold(); });
                    });

                    col.Item().PaddingTop(18).AlignCenter().Text("Thank you for your business!").FontColor(Colors.Grey.Darken1);
                });
            });
        });

        return doc.GeneratePdf();
    }
}
