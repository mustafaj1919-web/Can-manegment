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
    public class GetSaleContractDocumentQuery : IRequest<SaleDocumentDto?>
    {
        public Guid Id { get; set; }
    }

    public class GetSaleContractDocumentQueryHandler : IRequestHandler<GetSaleContractDocumentQuery, SaleDocumentDto?>
    {
        private readonly IApplicationDbContext _context;

        public GetSaleContractDocumentQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<SaleDocumentDto?> Handle(GetSaleContractDocumentQuery request, CancellationToken cancellationToken)
        {
            var contract = await _context.SalesContracts
                .Include(sc => sc.Customer)
                .Include(sc => sc.Vehicle)
                .Include(sc => sc.Supplier)
                .Include(sc => sc.PreparedByUser)
                .Include(sc => sc.SalesRep)
                .Include(sc => sc.InstallmentPlan)
                    .ThenInclude(ip => ip!.Installments)
                .FirstOrDefaultAsync(sc => sc.Id == request.Id, cancellationToken);

            if (contract == null) return null;

            var branch = await _context.Branches
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(b => b.Id == contract.BranchId, cancellationToken);

            // If snapshots are not yet populated (e.g. legacy row or draft), fallback dynamically to live relations
            var buyerName = contract.BuyerNameSnapshot ?? (contract.Customer?.FullName ?? contract.Customer?.Name ?? "—");
            var buyerPhone = contract.BuyerPhoneSnapshot ?? (contract.Customer?.Phone ?? "—");
            var buyerIdNum = contract.BuyerIdNumberSnapshot ?? (contract.Customer?.IdNumber ?? "—");
            var buyerAddress = contract.BuyerAddressSnapshot ?? (contract.Customer?.Address ?? "—");
            var buyerVat = contract.BuyerVatNumberSnapshot ?? contract.Customer?.VatNumber;

            var brand = contract.VehicleBrandSnapshot ?? (contract.Vehicle?.Brand ?? "—");
            var model = contract.VehicleModelSnapshot ?? (contract.Vehicle?.Model ?? "—");
            var year = contract.VehicleYearSnapshot ?? (contract.Vehicle?.Year ?? 0);
            var color = contract.VehicleColorSnapshot ?? contract.Vehicle?.Color;
            var vin = contract.VinSnapshot ?? (contract.Vehicle?.ChassisNumber ?? "—");
            var engine = contract.EngineNumberSnapshot ?? contract.Vehicle?.EngineNumber;
            var plate = contract.PlateNumberSnapshot ?? contract.Vehicle?.PlateNumber;
            var country = contract.ImportCountrySnapshot ?? contract.Vehicle?.ImportCountry;

            var prepName = contract.PreparedByNameSnapshot ?? (contract.PreparedByUser?.FullName ?? "منظّم العقد");
            var prepRole = contract.PreparedByRoleSnapshot ?? "منظّم العقد";

            var defaultTerms = "1. أقر الطرف الأول بأن المركبة المبينة في هذا العقد خالية من الشوائب والالتزامات غير المفصح عنها.\n" +
                               "2. أقر الطرف الثاني بمعاينة المركبة معاينة نافية للجهالة وقبل بحالتها الفنية والقانونية الراهنة.\n" +
                               "3. تنتقل حيازة المركبة فور توقيع العقد واستلام المبلغ المتفق عليه حسب الدفعة المسجلة.\n" +
                               "4. يلتزم الطرفان بتسليم المستندات والسنوية والملحقات القياسية عند التسليم الرسمية.\n" +
                               "5. حرر هذا العقد رسمياً ووثق في سجلات شركة الأصدقاء لتجارة السيارات.";

            var termsText = contract.TermsContentSnapshot ?? defaultTerms;

            var verificationCode = !string.IsNullOrWhiteSpace(contract.VerificationCode)
                ? contract.VerificationCode
                : contract.Id.ToString("N")[..16];

            var dto = new SaleDocumentDto
            {
                Id = contract.Id,
                ContractNumber = contract.ContractNumber,
                DocumentNumber = contract.DocumentNumber,
                DocumentRevision = contract.DocumentRevision > 0 ? contract.DocumentRevision : 1,
                ReceiptNumber = contract.ReceiptNumber,
                DocumentStatus = contract.DocumentStatus.ToString(),
                IsFinalized = contract.IsFinalized,
                VerificationCode = verificationCode,
                VerificationUrl = $"/verify-sale/{verificationCode}",
                SaleDate = contract.SaleDate,
                FinalizedAt = contract.FinalizedAt,
                CancelledAt = contract.CancelledAt,
                ReissuedFromDocumentId = contract.ReissuedFromDocumentId,

                BranchName = branch?.Name ?? "شركة الأصدقاء لتجارة السيارات",
                BranchCode = branch?.Code ?? "MAIN",
                BranchAddress = branch?.Address ?? "بغداد — العراق",
                BranchPhone = branch?.PhoneNumber ?? "07700000000",
                BranchVatNumber = branch?.VatNumber ?? "300000000000003",
                BranchTaxName = branch?.TaxName ?? "شركة الأصدقاء لتجارة السيارات",

                CustomerId = contract.CustomerId,
                BuyerName = buyerName,
                BuyerPhone = buyerPhone,
                BuyerIdNumber = buyerIdNum,
                BuyerAddress = buyerAddress,
                BuyerVatNumber = buyerVat,

                VehicleId = contract.VehicleId,
                Brand = brand,
                Model = model,
                Year = year,
                Color = color,
                ChassisNumber = vin,
                EngineNumber = engine,
                PlateNumber = plate,
                ImportCountry = country,

                OwnershipType = contract.OwnershipType.ToString(),
                OwnerPersonName = contract.OwnerPersonNameSnapshot,
                OwnerPersonPhone = contract.OwnerPersonPhoneSnapshot,
                OwnerPersonIdNumber = contract.OwnerPersonIdNumberSnapshot,
                OwnerNotes = contract.OwnerNotes,

                SupplierId = contract.SupplierId,
                SupplierName = contract.SupplierNameSnapshot ?? contract.Supplier?.Name,
                SupplierCode = contract.Supplier?.Code,
                SupplierReference = contract.SupplierReference,
                SupplyDate = contract.SupplyDate,

                CompanyName = contract.CompanyNameSnapshot ?? (contract.OwnershipType == VehicleOwnershipType.COMPANY ? "شركة الأصدقاء لتجارة السيارات" : null),
                CompanyRegistrationReference = contract.CompanyRegistrationReference,

                Currency = contract.Currency ?? "IQD",
                SalePrice = contract.SalePrice,
                TaxAmount = contract.TaxAmount,
                RegistrationFees = contract.RegistrationFees,
                Discount = contract.Discount,
                NetPrice = contract.NetPrice,
                DownPayment = contract.DownPayment,
                PaidAmountAtIssue = contract.PaidAmountAtIssue > 0 ? contract.PaidAmountAtIssue : contract.DownPayment,
                RemainingAmountAtIssue = contract.RemainingAmountAtIssue > 0 ? contract.RemainingAmountAtIssue : contract.RemainingBalance,
                PaymentMethod = contract.PaymentMethod.ToString(),

                InstallmentCount = contract.InstallmentCountSnapshot ?? contract.InstallmentPlan?.InstallmentPeriodMonths,
                MonthlyInstallmentAmount = contract.MonthlyInstallmentAmountSnapshot ?? contract.InstallmentPlan?.MonthlyInstallmentAmount,
                FirstDueDate = contract.FirstDueDateSnapshot ?? contract.InstallmentPlan?.Installments.FirstOrDefault()?.DueDate,

                PreparedByUserId = contract.PreparedByUserId ?? Guid.Empty,
                PreparedByName = prepName,
                PreparedByRole = prepRole,

                TermsTemplateId = contract.TermsTemplateId ?? "STD-2026",
                TermsTemplateVersion = contract.TermsTemplateVersion ?? "1.0",
                TermsContent = termsText,
                DocumentNotes = contract.DocumentNotes,

                EInvoiceQrCode = contract.EInvoiceQrCode,
                EInvoiceStatus = contract.EInvoiceStatus
            };

            if (contract.InstallmentPlan != null && contract.InstallmentPlan.Installments.Any())
            {
                dto.InstallmentsSchedule = contract.InstallmentPlan.Installments
                    .OrderBy(i => i.InstallmentNumber)
                    .Select(i => new InstallmentItemDto
                    {
                        InstallmentNumber = i.InstallmentNumber,
                        DueDate = i.DueDate,
                        Amount = i.Amount,
                        PaidAmount = i.PaidAmount,
                        Status = i.Status
                    }).ToList();
            }

            return dto;
        }
    }
}
