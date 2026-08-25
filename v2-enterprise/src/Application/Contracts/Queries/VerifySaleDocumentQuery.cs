using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Application.Contracts.DTOs;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.Application.Contracts.Queries
{
    public class VerifySaleDocumentQuery : IRequest<PublicDocumentVerificationDto?>
    {
        public string Code { get; set; } = string.Empty;
    }

    public class VerifySaleDocumentQueryHandler : IRequestHandler<VerifySaleDocumentQuery, PublicDocumentVerificationDto?>
    {
        private readonly IApplicationDbContext _context;

        public VerifySaleDocumentQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<PublicDocumentVerificationDto?> Handle(VerifySaleDocumentQuery request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Code)) return null;

            var code = request.Code.Trim();

            var contract = await _context.SalesContracts
                .IgnoreQueryFilters()
                .Include(sc => sc.Customer)
                .Include(sc => sc.Vehicle)
                .FirstOrDefaultAsync(sc => sc.VerificationCode == code ||
                                           sc.ContractNumber == code ||
                                           sc.DocumentNumber == code ||
                                           sc.Id.ToString() == code ||
                                           (sc.VerificationCode != null && sc.VerificationCode.StartsWith(code)), cancellationToken);

            if (contract == null) return null;

            var docNum = contract.DocumentNumber;
            var contractNum = contract.ContractNumber;
            var rev = contract.DocumentRevision > 0 ? contract.DocumentRevision : 1;

            if (contract.DocumentStatus == SaleDocumentStatus.CANCELLED)
            {
                return new PublicDocumentVerificationDto
                {
                    IsValid = false,
                    Status = "CANCELLED",
                    DocumentNumber = docNum,
                    ContractNumber = contractNum,
                    Revision = rev,
                    Message = "هذه الوثيقة ملغاة وغير معتمدة للاستخدام الرسمي."
                };
            }

            if (contract.DocumentStatus == SaleDocumentStatus.REISSUED)
            {
                // Find replacement document by ContractNumber and higher revision
                var replacementDoc = await _context.SalesContracts
                    .IgnoreQueryFilters()
                    .Where(sc => sc.ContractNumber == contract.ContractNumber && sc.DocumentRevision > contract.DocumentRevision)
                    .OrderByDescending(sc => sc.DocumentRevision)
                    .FirstOrDefaultAsync(cancellationToken);

                return new PublicDocumentVerificationDto
                {
                    IsValid = false,
                    Status = "SUPERSEDED",
                    DocumentNumber = docNum,
                    ContractNumber = contractNum,
                    Revision = rev,
                    ReplacementDocumentNumber = replacementDoc?.DocumentNumber,
                    Message = "تم إلغاء هذه النسخة بسبب إعادة إصدارها، وتم استبدالها بوثيقة رسمية أحدث."
                };
            }

            // Status == FINALIZED or DRAFT
            var isFinalized = contract.DocumentStatus == SaleDocumentStatus.FINALIZED;
            var brand = contract.VehicleBrandSnapshot ?? contract.Vehicle?.Brand ?? "سيارة";
            var model = contract.VehicleModelSnapshot ?? contract.Vehicle?.Model ?? "";
            var year = contract.VehicleYearSnapshot ?? contract.Vehicle?.Year ?? 0;
            var vin = contract.VinSnapshot ?? contract.Vehicle?.ChassisNumber ?? "";
            
            var maskedVin = vin.Length > 4 ? $"***{vin[^4..]}" : vin;
            var vehicleSummary = $"{brand} {model} {year} (شاصي: {maskedVin})".Trim();

            var buyerName = contract.BuyerNameSnapshot ?? contract.Customer?.FullName ?? contract.Customer?.Name ?? "";
            var buyerNameMasked = MaskName(buyerName);

            return new PublicDocumentVerificationDto
            {
                IsValid = isFinalized,
                Status = contract.DocumentStatus.ToString(),
                DocumentNumber = docNum,
                ContractNumber = contractNum,
                Revision = rev,
                SaleDate = contract.SaleDate.ToString("yyyy-MM-dd"),
                VehicleSummary = vehicleSummary,
                BuyerNameMasked = buyerNameMasked,
                Message = isFinalized ? "الوثيقة مطابقة ومعتمدة رسمياً في سجلات شركة الأصدقاء لتجارة السيارات." : "الوثيقة مسودة غير معتمدة رسمياً بعد."
            };
        }

        private static string MaskName(string name)
        {
            if (string.IsNullOrWhiteSpace(name)) return "—";
            var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0) return "—";
            return string.Join(" ", parts.Select(p => $"{p[0]}."));
        }
    }
}
