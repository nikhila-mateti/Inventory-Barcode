using SkiaSharp;
using System.Runtime.InteropServices;
using ZXing;
using ZXing.Common;

namespace InventoryQr.Api.Services;

public static class BarcodeService
{
    // Always Code128 for your single-shop internal codes (alphanumeric supported)
    public static byte[] GenerateCode128Png(string text, int width = 520, int height = 160)
    {
        var writer = new ZXing.BarcodeWriterPixelData
        {
            Format = BarcodeFormat.CODE_128,
            Options = new EncodingOptions
            {
                Width = width,
                Height = height,
                Margin = 8,
                PureBarcode = true
            }
        };

        var pixelData = writer.Write(text);

        // Create Skia bitmap and copy pixels safely (no unsafe)
        var info = new SKImageInfo(pixelData.Width, pixelData.Height, SKColorType.Bgra8888, SKAlphaType.Premul);
        using var bitmap = new SKBitmap(info);

        // Copy managed byte[] into Skia memory
        IntPtr dst = bitmap.GetPixels();
        Marshal.Copy(pixelData.Pixels, 0, dst, pixelData.Pixels.Length);

        using var image = SKImage.FromBitmap(bitmap);
        using var data = image.Encode(SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }
}
