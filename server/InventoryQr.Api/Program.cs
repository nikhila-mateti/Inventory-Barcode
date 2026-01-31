using InventoryQr.Api.Data;
using InventoryQr.Api.DTOs;
using InventoryQr.Api.Models;
using InventoryQr.Api.Services;
using Microsoft.EntityFrameworkCore;



var builder = WebApplication.CreateBuilder(args);

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// EF Core (SQLite)
builder.Services.AddDbContext<AppDbContext>(opt =>
{
    var cs = builder.Configuration.GetConnectionString("Default");
    opt.UseSqlite(cs);
});

// CORS for Vite dev server
builder.Services.AddCors(opt =>
{
    opt.AddPolicy("dev", p =>
        p.WithOrigins("http://localhost:5173")
         .AllowAnyHeader()
         .AllowAnyMethod());
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("dev");

// Auto-create DB on startup (MVP convenience).
// Later, replace with migrations.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.EnsureCreatedAsync();
}

// Base URL used inside QR codes (dev default).
// You can change to your deployed domain later.
string ClientBaseUrl(HttpRequest req) => "http://localhost:5173";

// -------------------------
// Products CRUD
// -------------------------

app.MapGet("/api/products", async (AppDbContext db, string? search, int page = 1, int pageSize = 20) =>
{
    page = Math.Max(page, 1);
    pageSize = Math.Clamp(pageSize, 1, 100);

    var q = db.Products.AsNoTracking();

    if (!string.IsNullOrWhiteSpace(search))
    {
        var s = search.Trim();
        q = q.Where(p => p.ProductCode.Contains(s) || p.Name.Contains(s));

    }

    var total = await q.CountAsync();
    var items = await q.OrderByDescending(p => p.UpdatedAt)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();

    return Results.Ok(new { total, page, pageSize, items });
});

app.MapGet("/api/products/{productCode}", async (AppDbContext db, string productCode) =>
{
    var code = productCode.Trim();
    var product = await db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.ProductCode == code);
    return product is null ? Results.NotFound() : Results.Ok(product);
});

app.MapPost("/api/products", async (AppDbContext db, ProductCreateDto dto) =>
{
    var code = dto.ProductCode.Trim();
    if (await db.Products.AnyAsync(p => p.ProductCode == code))
        return Results.Conflict(new { message = "ProductCode already exists." });

    var product = new Product
    {
        ProductCode = code,
        Name = dto.Name.Trim(),
        Price = dto.Price,
        Quantity = dto.Quantity,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    db.Products.Add(product);
    await db.SaveChangesAsync();
    return Results.Created($"/api/products/{product.ProductCode}", product);
});

app.MapPut("/api/products/{productCode}", async (AppDbContext db, string productCode, ProductUpdateDto dto) =>
{
    var code = productCode.Trim();
    var product = await db.Products.FirstOrDefaultAsync(p => p.ProductCode == code);
    if (product is null) return Results.NotFound();

    product.Name = dto.Name.Trim();
    product.Price = dto.Price;
    product.Quantity = dto.Quantity;
    product.UpdatedAt = DateTime.UtcNow;

    await db.SaveChangesAsync();
    return Results.Ok(product);
});

app.MapDelete("/api/products/{productCode}", async (AppDbContext db, string productCode) =>
{
    var code = productCode.Trim();
    var product = await db.Products.FirstOrDefaultAsync(p => p.ProductCode == code);
    if (product is null) return Results.NotFound();

    db.Products.Remove(product);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// -------------------------
// Adjust stock
// -------------------------
app.MapPost("/api/products/{productCode}/adjust", async (AppDbContext db, string productCode, AdjustStockDto dto) =>
{
    var code = productCode.Trim();
    var product = await db.Products.FirstOrDefaultAsync(p => p.ProductCode == code);
    if (product is null) return Results.NotFound();

    // Simple adjustment: quantity += delta
    // (You can add StockTransaction table later.)
    checked
    {
        product.Quantity += dto.Delta;
    }
    product.UpdatedAt = DateTime.UtcNow;

    await db.SaveChangesAsync();
    return Results.Ok(product);
});

// -------------------------
// QR as PNG
// -------------------------
app.MapGet("/api/qr/{productCode}", async (AppDbContext db, HttpRequest req, string productCode) =>
{
    var code = productCode.Trim();
    var exists = await db.Products.AsNoTracking().AnyAsync(p => p.ProductCode == code);
    if (!exists) return Results.NotFound();

    var url = $"{ClientBaseUrl(req)}/p/{Uri.EscapeDataString(code)}";
    var png = QrService.GeneratePng(url, pixelsPerModule: 8);

    return Results.File(png, "image/png");
});

// -------------------------
// Labels PDF (A4 grid)
// -------------------------
app.MapPost("/api/labels/pdf", async (AppDbContext db, LabelsPdfRequest request) =>
{
    if (request.Items is null || request.Items.Count == 0)
        return Results.BadRequest(new { message = "Items required." });

    var codes = request.Items.Select(i => i.ProductCode.Trim()).Distinct().ToList();
    var products = await db.Products.AsNoTracking()
        .Where(p => codes.Contains(p.ProductCode))
        .ToListAsync();

    if (products.Count != codes.Count)
    {
        var missing = codes.Except(products.Select(p => p.ProductCode)).ToList();
        return Results.BadRequest(new { message = "Some product codes were not found.", missing });
    }

    var items = request.Items.Select(i =>
    {
        var p = products.First(x => x.ProductCode == i.ProductCode.Trim());
        var count = Math.Max(0, i.LabelCount);

        return (product: p, labelCount: count, barcodePng: (Func<string, byte[]>)(val =>
            BarcodeService.GenerateCode128Png(val)
        ));
    }).ToList();

    var companyName = "Srinivasa Cloth Stores";
    var website = "www.website.com";

    var pdfBytes = LabelsPdfService.BuildRetailStickerLabelsPdf(companyName, website, items);

    return Results.File(pdfBytes, "application/pdf", "labels.pdf");
});

app.MapPost("/api/sales/checkout", async (AppDbContext db, InventoryQr.Api.Dtos.CheckoutRequest req) =>
{
    if (req.Items == null || req.Items.Count == 0)
        return Results.BadRequest(new { message = "No items." });

    var gst = Math.Clamp(req.GstPercent, 0m, 28m);

    var codes = req.Items.Select(i => i.ProductCode.Trim()).Distinct().ToList();
    var products = await db.Products.Where(p => codes.Contains(p.ProductCode)).ToListAsync();

    if (products.Count != codes.Count)
    {
        var missing = codes.Except(products.Select(p => p.ProductCode)).ToList();
        return Results.BadRequest(new { message = "Some product codes not found.", missing });
    }

    var invoiceNo = $"INV-{DateTime.UtcNow:yyyyMMdd-HHmmss}";

    decimal subtotal = 0m;
    var saleItems = new List<InventoryQr.Api.Models.SaleItem>();

    foreach (var it in req.Items)
    {
        var code = it.ProductCode.Trim();
        var qty = Math.Max(1, it.Quantity);

        var p = products.First(x => x.ProductCode == code);

        if (p.Quantity < qty)
            return Results.BadRequest(new { message = $"Not enough stock for {code} (available {p.Quantity})." });

        var lineBase = p.Price * qty;
        subtotal += lineBase;

        saleItems.Add(new InventoryQr.Api.Models.SaleItem
        {
            SaleId = "", // set after Sale created
            ProductCode = code,
            Name = p.Name,
            Quantity = qty,
            UnitPrice = p.Price,
            LineTotal = lineBase
        });

        // decrement stock now
        p.Quantity -= qty;
        p.UpdatedAt = DateTime.UtcNow;
    }

    var discountPct = Math.Clamp(req.DiscountPercent, 0m, 100m);
    var discount = subtotal * (discountPct / 100m);
    discount = Math.Clamp(discount, 0m, subtotal);

    var taxable = Math.Max(0m, subtotal - discount);

    var gstAmount = taxable * (gst / 100m);
    var total = taxable + gstAmount;

    var paid = Math.Clamp(req.PaidAmount, 0m, total);
    var balance = total - paid;

    var sale = new InventoryQr.Api.Models.Sale
    {
        InvoiceNo = invoiceNo,
        CustomerName = req.CustomerName,
        CustomerPhone = req.CustomerPhone,
        GstPercent = gst,

        DiscountAmount = discount,      // ₹ value saved
        DiscountPercent = discountPct,  // % saved (optional but useful)

        PaidAmount = paid,
        PaymentMethod = string.IsNullOrWhiteSpace(req.PaymentMethod) ? "Cash" : req.PaymentMethod,
        Subtotal = subtotal,
        TaxableAmount = taxable,
        GstAmount = gstAmount,
        TotalAmount = total,
        BalanceDue = balance,
        Items = saleItems
    };


    foreach (var si in sale.Items) si.SaleId = sale.Id;

    db.Sales.Add(sale);
    await db.SaveChangesAsync();

    return Results.Ok(new { saleId = sale.Id, invoiceNo = sale.InvoiceNo, totalAmount = sale.TotalAmount, paidAmount = sale.PaidAmount, balanceDue = sale.BalanceDue });
});

app.MapGet("/api/sales/{saleId}/invoice.pdf", async (AppDbContext db, string saleId) =>
{
    var sale = await db.Sales.Include(s => s.Items).FirstOrDefaultAsync(s => s.Id == saleId);
    if (sale == null) return Results.NotFound();

    var pdf = InventoryQr.Api.Services.InvoicePdfService.BuildInvoicePdf(sale);
    return Results.File(pdf, "application/pdf", $"{sale.InvoiceNo}.pdf");
});

app.MapPut("/api/sales/{saleId}/payment", async (AppDbContext db, string saleId, InventoryQr.Api.Dtos.UpdatePaymentRequest req) =>
{
    var sale = await db.Sales.FirstOrDefaultAsync(s => s.Id == saleId);
    if (sale == null) return Results.NotFound(new { message = "Sale not found" });

    var paid = Math.Clamp(req.PaidAmount, 0m, sale.TotalAmount);
    sale.PaidAmount = paid;
    sale.BalanceDue = sale.TotalAmount - paid;

    if (!string.IsNullOrWhiteSpace(req.PaymentMethod))
        sale.PaymentMethod = req.PaymentMethod;

    sale.UpdatedAt = DateTime.UtcNow;

    await db.SaveChangesAsync();

    return Results.Ok(new { saleId = sale.Id, paidAmount = sale.PaidAmount, balanceDue = sale.BalanceDue });
});


app.Run();
