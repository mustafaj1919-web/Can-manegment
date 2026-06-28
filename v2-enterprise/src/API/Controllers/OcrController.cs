using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CarShowroomManagementV2.API.Controllers
{
    /// <summary>
    /// AI OCR Document Scanner Controller.
    /// Simulates optical character recognition (OCR) and document parsing.
    /// Ready to be connected to cloud AI services (e.g. Azure Form Recognizer, Google Document AI).
    /// </summary>
    [Authorize]
    [Route("api/ocr")]
    public class OcrController : ApiControllerBase
    {
        [HttpPost("scan-document")]
        public async Task<IActionResult> ScanDocument(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { error = "يرجى اختيار ملف مستند أو صورة للمسح." });
            }

            // محاكاة تأخير معالجة الذكاء الاصطناعي (1.2 ثانية)
            await Task.Delay(1200);

            var fileName = file.FileName.ToLower();
            string brand = "Toyota";
            string model = "Camry";
            int year = DateTime.Now.Year - 1;
            string color = "أبيض";
            string chassisNumber = GenerateRandomVin("JTD"); // رمز سيارات تويوتا اليابانية

            if (fileName.Contains("kia") || fileName.Contains("sportage") || fileName.Contains("optima"))
            {
                brand = "Kia";
                model = fileName.Contains("optima") ? "Optima" : "Sportage";
                year = DateTime.Now.Year - 2;
                color = "رمادي";
                chassisNumber = GenerateRandomVin("KND"); // رمز سيارات كيا الكورية
            }
            else if (fileName.Contains("hyundai") || fileName.Contains("elantra") || fileName.Contains("tucson"))
            {
                brand = "Hyundai";
                model = fileName.Contains("tucson") ? "Tucson" : "Elantra";
                year = DateTime.Now.Year - 1;
                color = "أسود";
                chassisNumber = GenerateRandomVin("KMH"); // رمز سيارات هيونداي الكورية
            }
            else if (fileName.Contains("mercedes") || fileName.Contains("benz") || fileName.Contains("c200"))
            {
                brand = "Mercedes-Benz";
                model = "C-Class C200";
                year = DateTime.Now.Year - 1;
                color = "فضي";
                chassisNumber = GenerateRandomVin("WDD"); // رمز سيارات مرسيدس الألمانية
            }
            else if (fileName.Contains("bmw") || fileName.Contains("x5") || fileName.Contains("520"))
            {
                brand = "BMW";
                model = fileName.Contains("x5") ? "X5" : "5 Series";
                year = DateTime.Now.Year - 3;
                color = "كحلي";
                chassisNumber = GenerateRandomVin("WBA"); // رمز سيارات BMW الألمانية
            }

            return Ok(new
            {
                success = true,
                message = "تم تحليل المستند ومسحه بنجاح عبر الذكاء الاصطناعي.",
                data = new
                {
                    brand,
                    model,
                    year,
                    color,
                    chassisNumber,
                    plateNumber = GenerateRandomPlate(),
                    confidence = 98.4 // نسبة دقة المسح
                }
            });
        }

        private string GenerateRandomVin(string prefix)
        {
            var random = new Random();
            var characters = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
            var vin = prefix;
            
            // تكملة الرقم التعريفي للسيارة VIN إلى 17 خانة
            while (vin.Length < 17)
            {
                vin += characters[random.Next(characters.Length)];
            }
            return vin;
        }

        private string GenerateRandomPlate()
        {
            var random = new Random();
            var provinces = new[] { "بغداد", "أربيل", "السليمانية", "دهوك", "البصرة", "نينوى" };
            var categories = new[] { "خصوصي", "أجرة", "حمل" };
            
            var number = random.Next(10000, 99999).ToString();
            var province = provinces[random.Next(provinces.Length)];
            var cat = categories[random.Next(categories.Length)];

            return $"{number} / {province} / {cat}";
        }
    }
}
