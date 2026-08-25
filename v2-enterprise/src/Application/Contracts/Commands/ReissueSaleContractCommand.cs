using System;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.Application.Contracts.Commands
{
    public class ReissueSaleContractCommand : IRequest<Guid>
    {
        public Guid OriginalDocumentId { get; set; }
        public string? ReissueReason { get; set; }
        public string? UpdatedOwnerPersonName { get; set; }
        public string? UpdatedOwnerPersonPhone { get; set; }
        public string? UpdatedOwnerNotes { get; set; }
        public string? UpdatedDocumentNotes { get; set; }
    }

    public class ReissueSaleContractCommandValidator : AbstractValidator<ReissueSaleContractCommand>
    {
        public ReissueSaleContractCommandValidator()
        {
            RuleFor(x => x.OriginalDocumentId).NotEmpty().WithMessage("معرّف الوثيقة الأصلية مطلوب لإعادة الإصدار.");
        }
    }

    public class ReissueSaleContractCommandHandler : IRequestHandler<ReissueSaleContractCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public ReissueSaleContractCommandHandler(
            IApplicationDbContext context,
            ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Guid> Handle(ReissueSaleContractCommand request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            var original = await _context.SalesContracts
                .Include(sc => sc.Customer)
                .Include(sc => sc.Vehicle)
                .Include(sc => sc.Supplier)
                .FirstOrDefaultAsync(sc => sc.Id == request.OriginalDocumentId && sc.BranchId == branchId, cancellationToken);

            if (original == null)
            {
                throw new InvalidOperationException("الوثيقة الأصلية غير موجودة أو لا تنتمي للفرع الحالي.");
            }

            if (original.DocumentStatus == SaleDocumentStatus.CANCELLED)
            {
                throw new InvalidOperationException("لا يمكن إعادة إصدار وثيقة ملغاة رسمياً.");
            }

            // Mark original as REISSUED (superseded)
            original.DocumentStatus = SaleDocumentStatus.REISSUED;
            _context.SalesContracts.Update(original);

            // Fetch current user details for preparer snapshot
            Guid? prepUserId = null;
            User? currentUser = null;
            if (Guid.TryParse(_currentUserService.UserId, out var parsedUserId))
            {
                currentUser = await _context.Users
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(u => u.Id == parsedUserId, cancellationToken);
                if (currentUser != null) prepUserId = currentUser.Id;
            }

            var newRevision = (original.DocumentRevision > 0 ? original.DocumentRevision : 1) + 1;
            var docNumber = $"SALE-{DateTime.UtcNow:yyyy}-{original.ContractNumber.Replace("SC-", "")}-R{newRevision}";

            var randomBytes = new byte[8];
            RandomNumberGenerator.Fill(randomBytes);
            var verificationCode = "vsc_" + Convert.ToHexString(randomBytes).ToLowerInvariant();

            var newContract = new SalesContract
            {
                Id = Guid.NewGuid(),
                ContractNumber = original.ContractNumber,
                DocumentNumber = docNumber,
                DocumentRevision = newRevision,
                ReceiptNumber = original.ReceiptNumber,
                DocumentStatus = SaleDocumentStatus.FINALIZED,
                VerificationCode = verificationCode,
                SaleDate = original.SaleDate,
                FinalizedAt = DateTime.UtcNow,
                FinalizedByUserId = prepUserId != Guid.Empty ? prepUserId : null,
                ReissuedFromDocumentId = original.Id,

                CustomerId = original.CustomerId,
                BuyerNameSnapshot = original.BuyerNameSnapshot ?? (original.Customer?.FullName ?? original.Customer?.Name),
                BuyerPhoneSnapshot = original.Customer?.Phone ?? original.BuyerPhoneSnapshot,
                BuyerIdNumberSnapshot = original.BuyerIdNumberSnapshot ?? original.Customer?.IdNumber,
                BuyerAddressSnapshot = original.Customer?.Address ?? original.BuyerAddressSnapshot,
                BuyerVatNumberSnapshot = original.Customer?.VatNumber ?? original.BuyerVatNumberSnapshot,

                VehicleId = original.VehicleId,
                VehicleBrandSnapshot = original.VehicleBrandSnapshot ?? original.Vehicle?.Brand,
                VehicleModelSnapshot = original.VehicleModelSnapshot ?? original.Vehicle?.Model,
                VehicleYearSnapshot = original.VehicleYearSnapshot ?? original.Vehicle?.Year,
                VehicleColorSnapshot = original.VehicleColorSnapshot ?? original.Vehicle?.Color,
                VinSnapshot = original.VinSnapshot ?? original.Vehicle?.ChassisNumber,
                EngineNumberSnapshot = original.EngineNumberSnapshot ?? original.Vehicle?.EngineNumber,
                PlateNumberSnapshot = original.PlateNumberSnapshot ?? original.Vehicle?.PlateNumber,
                ImportCountrySnapshot = original.ImportCountrySnapshot ?? original.Vehicle?.ImportCountry,

                OwnershipType = original.OwnershipType,
                OwnerPersonId = original.OwnerPersonId,
                OwnerPersonNameSnapshot = request.UpdatedOwnerPersonName ?? original.OwnerPersonNameSnapshot,
                OwnerPersonPhoneSnapshot = request.UpdatedOwnerPersonPhone ?? original.OwnerPersonPhoneSnapshot,
                OwnerPersonIdNumberSnapshot = original.OwnerPersonIdNumberSnapshot,
                OwnerNotes = request.UpdatedOwnerNotes ?? original.OwnerNotes,

                SupplierId = original.SupplierId,
                SupplierNameSnapshot = original.SupplierNameSnapshot ?? original.Supplier?.Name,
                SupplierReference = original.SupplierReference,
                SupplyDate = original.SupplyDate,

                CompanyNameSnapshot = original.CompanyNameSnapshot,
                CompanyRegistrationReference = original.CompanyRegistrationReference,

                SalePrice = original.SalePrice,
                TaxAmount = original.TaxAmount,
                RegistrationFees = original.RegistrationFees,
                Discount = original.Discount,
                NetPrice = original.NetPrice,
                DownPayment = original.DownPayment,
                RemainingBalance = original.RemainingBalance,
                PaidAmountAtIssue = original.PaidAmountAtIssue,
                RemainingAmountAtIssue = original.RemainingAmountAtIssue,
                CostBasis = original.CostBasis,
                Profit = original.Profit,
                Currency = original.Currency,
                PaymentMethod = original.PaymentMethod,

                InstallmentCountSnapshot = original.InstallmentCountSnapshot,
                MonthlyInstallmentAmountSnapshot = original.MonthlyInstallmentAmountSnapshot,
                FirstDueDateSnapshot = original.FirstDueDateSnapshot,

                PreparedByUserId = prepUserId,
                PreparedByNameSnapshot = currentUser?.FullName ?? "منظّم العقد",
                PreparedByRoleSnapshot = "منظّم العقد",
                SalesRepId = original.SalesRepId,
                SalespersonNameSnapshot = original.SalespersonNameSnapshot,

                TermsTemplateId = original.TermsTemplateId,
                TermsTemplateVersion = original.TermsTemplateVersion,
                TermsContentSnapshot = original.TermsContentSnapshot,
                DocumentNotes = request.UpdatedDocumentNotes ?? original.DocumentNotes,

                BranchId = branchId
            };

            _context.SalesContracts.Add(newContract);
            await _context.SaveChangesAsync(cancellationToken);

            return newContract.Id;
        }
    }
}
