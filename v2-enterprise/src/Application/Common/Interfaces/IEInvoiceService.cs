using System;
using System.Threading.Tasks;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.Application.Common.Interfaces
{
    public interface IEInvoiceService
    {
        string GenerateTlvQrCodeBase64(string sellerName, string sellerVat, DateTime timestamp, decimal totalWithVat, decimal vatTotal);
        string GenerateInvoiceXml(SalesContract contract, Branch branch, Customer customer);
        string CalculateXmlHash(string xmlContent);
        Task<(bool Success, string Message, string? ClearanceStatus)> SubmitInvoiceToPortalAsync(SalesContract contract, string xmlContent);
    }
}
