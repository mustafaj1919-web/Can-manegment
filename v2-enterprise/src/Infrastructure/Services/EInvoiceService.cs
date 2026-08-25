using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.Infrastructure.Services
{
    public class EInvoiceService : IEInvoiceService
    {
        public string GenerateTlvQrCodeBase64(string sellerName, string sellerVat, DateTime timestamp, decimal totalWithVat, decimal vatTotal)
        {
            if (string.IsNullOrWhiteSpace(sellerName)) sellerName = "معرض السيارات";
            if (string.IsNullOrWhiteSpace(sellerVat)) sellerVat = "300000000000003";

            var sellerNameBytes = Encoding.UTF8.GetBytes(sellerName);
            var sellerVatBytes = Encoding.UTF8.GetBytes(sellerVat);
            var timestampBytes = Encoding.UTF8.GetBytes(timestamp.ToString("yyyy-MM-ddTHH:mm:ssZ"));
            var totalBytes = Encoding.UTF8.GetBytes(totalWithVat.ToString("0.00"));
            var vatBytes = Encoding.UTF8.GetBytes(vatTotal.ToString("0.00"));

            var list = new List<byte>();

            // Tag 1: Seller Name
            list.Add(1);
            list.Add((byte)sellerNameBytes.Length);
            list.AddRange(sellerNameBytes);

            // Tag 2: Seller VAT Number
            list.Add(2);
            list.Add((byte)sellerVatBytes.Length);
            list.AddRange(sellerVatBytes);

            // Tag 3: Timestamp
            list.Add(3);
            list.Add((byte)timestampBytes.Length);
            list.AddRange(timestampBytes);

            // Tag 4: Invoice Total
            list.Add(4);
            list.Add((byte)totalBytes.Length);
            list.AddRange(totalBytes);

            // Tag 5: VAT Amount
            list.Add(5);
            list.Add((byte)vatBytes.Length);
            list.AddRange(vatBytes);

            return Convert.ToBase64String(list.ToArray());
        }

        public string GenerateInvoiceXml(SalesContract contract, Branch branch, Customer customer)
        {
            var uuid = contract.EInvoiceUuid ?? Guid.NewGuid().ToString();
            var sellerName = branch.TaxName ?? branch.Name;
            var sellerVat = branch.VatNumber ?? "300000000000003";
            var buyerName = customer.FullName ?? customer.Name;
            var buyerVat = customer.VatNumber ?? "";

            var sb = new StringBuilder();
            sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
            sb.AppendLine("<Invoice xmlns=\"urn:oasis:names:specification:ubl:schema:xsd:Invoice-2\"");
            sb.AppendLine("         xmlns:cac=\"urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2\"");
            sb.AppendLine("         xmlns:cbc=\"urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2\">");
            sb.AppendLine($"    <cbc:UUID>{uuid}</cbc:UUID>");
            sb.AppendLine($"    <cbc:ID>{contract.ContractNumber}</cbc:ID>");
            sb.AppendLine($"    <cbc:IssueDate>{contract.SaleDate:yyyy-MM-dd}</cbc:IssueDate>");
            sb.AppendLine($"    <cbc:IssueTime>{contract.SaleDate:HH:mm:ss}</cbc:IssueTime>");
            sb.AppendLine("    <cbc:InvoiceTypeCode name=\"388\">0100000</cbc:InvoiceTypeCode>");
            sb.AppendLine("    <cbc:DocumentCurrencyCode>IQD</cbc:DocumentCurrencyCode>");
            sb.AppendLine("    <cbc:TaxCurrencyCode>IQD</cbc:TaxCurrencyCode>");
            
            // Seller Info
            sb.AppendLine("    <cac:AccountingSupplierParty>");
            sb.AppendLine("        <cac:Party>");
            sb.AppendLine("            <cac:PartyIdentification>");
            sb.AppendLine($"                <cbc:ID schemeID=\"CRN\">{branch.Code}</cbc:ID>");
            sb.AppendLine("            </cac:PartyIdentification>");
            sb.AppendLine("            <cac:PartyName>");
            sb.AppendLine($"                <cbc:Name>{sellerName}</cbc:Name>");
            sb.AppendLine("            </cac:PartyName>");
            sb.AppendLine("            <cac:PartyTaxScheme>");
            sb.AppendLine($"                <cbc:CompanyID>{sellerVat}</cbc:CompanyID>");
            sb.AppendLine("                <cac:TaxScheme>");
            sb.AppendLine("                    <cbc:ID>VAT</cbc:ID>");
            sb.AppendLine("                </cac:TaxScheme>");
            sb.AppendLine("            </cac:PartyTaxScheme>");
            sb.AppendLine("        </cac:Party>");
            sb.AppendLine("    </cac:AccountingSupplierParty>");

            // Buyer Info
            sb.AppendLine("    <cac:AccountingCustomerParty>");
            sb.AppendLine("        <cac:Party>");
            if (!string.IsNullOrWhiteSpace(buyerVat))
            {
                sb.AppendLine("            <cac:PartyTaxScheme>");
                sb.AppendLine($"                <cbc:CompanyID>{buyerVat}</cbc:CompanyID>");
                sb.AppendLine("                <cac:TaxScheme>");
                sb.AppendLine("                    <cbc:ID>VAT</cbc:ID>");
                sb.AppendLine("                </cac:TaxScheme>");
                sb.AppendLine("            </cac:PartyTaxScheme>");
            }
            sb.AppendLine("            <cac:PartyLegalEntity>");
            sb.AppendLine($"                <cbc:RegistrationName>{buyerName}</cbc:RegistrationName>");
            sb.AppendLine("            </cac:PartyLegalEntity>");
            sb.AppendLine("        </cac:Party>");
            sb.AppendLine("    </cac:AccountingCustomerParty>");

            // Totals
            sb.AppendLine("    <cac:TaxTotal>");
            sb.AppendLine($"        <cbc:TaxAmount currencyID=\"IQD\">{contract.TaxAmount:F2}</cbc:TaxAmount>");
            sb.AppendLine("    </cac:TaxTotal>");

            sb.AppendLine("    <cac:LegalMonetaryTotal>");
            sb.AppendLine($"        <cbc:LineExtensionAmount currencyID=\"IQD\">{contract.SalePrice:F2}</cbc:LineExtensionAmount>");
            sb.AppendLine($"        <cbc:TaxExclusiveAmount currencyID=\"IQD\">{contract.SalePrice - contract.Discount:F2}</cbc:TaxExclusiveAmount>");
            sb.AppendLine($"        <cbc:TaxInclusiveAmount currencyID=\"IQD\">{contract.NetPrice:F2}</cbc:TaxInclusiveAmount>");
            sb.AppendLine($"        <cbc:AllowanceTotalAmount currencyID=\"IQD\">{contract.Discount:F2}</cbc:AllowanceTotalAmount>");
            sb.AppendLine($"        <cbc:PayableAmount currencyID=\"IQD\">{contract.NetPrice:F2}</cbc:PayableAmount>");
            sb.AppendLine("    </cac:LegalMonetaryTotal>");

            // Invoice Line (The Vehicle)
            sb.AppendLine("    <cac:InvoiceLine>");
            sb.AppendLine("        <cbc:ID>1</cbc:ID>");
            sb.AppendLine($"        <cbc:InvoicedQuantity unitCode=\"PCE\">1</cbc:InvoicedQuantity>");
            sb.AppendLine($"        <cbc:LineExtensionAmount currencyID=\"IQD\">{contract.SalePrice:F2}</cbc:LineExtensionAmount>");
            sb.AppendLine("        <cac:Item>");
            var brand = contract.Vehicle != null ? contract.Vehicle.Brand : "السيارة";
            var model = contract.Vehicle != null ? contract.Vehicle.Model : "";
            var year = contract.Vehicle != null ? contract.Vehicle.Year.ToString() : "";
            sb.AppendLine($"            <cbc:Name>{brand} {model} {year}</cbc:Name>");
            sb.AppendLine("            <cac:ClassifiedTaxCategory>");
            sb.AppendLine("                <cbc:ID>S</cbc:ID>");
            sb.AppendLine("                <cbc:Percent>15</cbc:Percent>");
            sb.AppendLine("                <cac:TaxScheme>");
            sb.AppendLine("                    <cbc:ID>VAT</cbc:ID>");
            sb.AppendLine("                </cac:TaxScheme>");
            sb.AppendLine("            </cac:ClassifiedTaxCategory>");
            sb.AppendLine("        </cac:Item>");
            sb.AppendLine("        <cac:Price>");
            sb.AppendLine($"            <cbc:PriceAmount currencyID=\"IQD\">{contract.SalePrice:F2}</cbc:PriceAmount>");
            sb.AppendLine("        </cac:Price>");
            sb.AppendLine("    </cac:InvoiceLine>");

            sb.AppendLine("</Invoice>");

            return sb.ToString();
        }

        public string CalculateXmlHash(string xmlContent)
        {
            using (var sha256 = SHA256.Create())
            {
                var bytes = Encoding.UTF8.GetBytes(xmlContent);
                var hashBytes = sha256.ComputeHash(bytes);
                return Convert.ToBase64String(hashBytes);
            }
        }

        public async Task<(bool Success, string Message, string? ClearanceStatus)> SubmitInvoiceToPortalAsync(SalesContract contract, string xmlContent)
        {
            // محاكاة إرسال للربط الإلكتروني الضريبي
            await Task.Delay(150); // محاكاة زمن تأخير شبكة الـ API
            
            // نجاح دائم في المحاكي ما لم تكن الفاتورة ملغاة
            if (contract.Status == "Cancelled")
            {
                return (false, "لا يمكن تقديم فاتورة ملغاة إلى البوابة الضريبية.", "Failed");
            }

            return (true, "تم التحقق من الفاتورة ومطابقتها واعتمادها ضريبياً بنجاح.", "Cleared");
        }
    }
}
