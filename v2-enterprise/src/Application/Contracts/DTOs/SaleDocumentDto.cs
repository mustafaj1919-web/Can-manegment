using System;
using System.Collections.Generic;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.Application.Contracts.DTOs
{
    public class SaleDocumentDto
    {
        // ── Identity & Metadata ──
        public Guid Id { get; set; }
        public string ContractNumber { get; set; } = string.Empty;
        public string DocumentNumber { get; set; } = string.Empty;
        public int DocumentRevision { get; set; } = 1;
        public string? ReceiptNumber { get; set; }
        public string DocumentStatus { get; set; } = "DRAFT";
        public bool IsFinalized { get; set; }
        public string VerificationCode { get; set; } = string.Empty;
        public string VerificationUrl { get; set; } = string.Empty;
        public DateTime SaleDate { get; set; }
        public DateTime? FinalizedAt { get; set; }
        public DateTime? CancelledAt { get; set; }
        public Guid? ReissuedFromDocumentId { get; set; }

        // ── Branch Info ──
        public string BranchName { get; set; } = string.Empty;
        public string BranchCode { get; set; } = string.Empty;
        public string? BranchAddress { get; set; }
        public string? BranchPhone { get; set; }
        public string? BranchVatNumber { get; set; }
        public string? BranchTaxName { get; set; }

        // ── Buyer Details (Snapshot) ──
        public Guid CustomerId { get; set; }
        public string BuyerName { get; set; } = string.Empty;
        public string BuyerPhone { get; set; } = string.Empty;
        public string BuyerIdNumber { get; set; } = string.Empty;
        public string? BuyerAddress { get; set; }
        public string? BuyerVatNumber { get; set; }

        // ── Vehicle Details (Snapshot) ──
        public Guid VehicleId { get; set; }
        public string Brand { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public int Year { get; set; }
        public string? Color { get; set; }
        public string ChassisNumber { get; set; } = string.Empty; // VIN (LTR)
        public string? EngineNumber { get; set; }
        public string? PlateNumber { get; set; }
        public string? ImportCountry { get; set; }

        // ── Vehicle Ownership / Source Model ──
        public string OwnershipType { get; set; } = "PERSON"; // PERSON, SUPPLIER, COMPANY, LEGACY_UNKNOWN
        
        // PERSON
        public string? OwnerPersonName { get; set; }
        public string? OwnerPersonPhone { get; set; }
        public string? OwnerPersonIdNumber { get; set; }
        public string? OwnerNotes { get; set; }

        // SUPPLIER
        public Guid? SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public string? SupplierCode { get; set; }
        public string? SupplierReference { get; set; }
        public DateTime? SupplyDate { get; set; }

        // COMPANY
        public string? CompanyName { get; set; }
        public string? CompanyRegistrationReference { get; set; }

        // ── Financial Breakdown ──
        public string Currency { get; set; } = "IQD";
        public decimal SalePrice { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal RegistrationFees { get; set; }
        public decimal Discount { get; set; }
        public decimal NetPrice { get; set; } // FinalPrice
        public decimal DownPayment { get; set; }
        public decimal PaidAmountAtIssue { get; set; }
        public decimal RemainingAmountAtIssue { get; set; }
        public string PaymentMethod { get; set; } = "Cash";

        // Installment Details
        public int? InstallmentCount { get; set; }
        public decimal? MonthlyInstallmentAmount { get; set; }
        public DateTime? FirstDueDate { get; set; }
        public List<InstallmentItemDto> InstallmentsSchedule { get; set; } = new();

        // ── Staff Responsibilities ──
        public Guid PreparedByUserId { get; set; }
        public string PreparedByName { get; set; } = string.Empty;
        public string PreparedByRole { get; set; } = "منظّم العقد";

        // ── Terms & Notes ──
        public string? TermsTemplateId { get; set; }
        public string? TermsTemplateVersion { get; set; }
        public string TermsContent { get; set; } = string.Empty;
        public string? DocumentNotes { get; set; }

        // ── Compliance ──
        public string? EInvoiceQrCode { get; set; }
        public string? EInvoiceStatus { get; set; }
    }

    public class InstallmentItemDto
    {
        public int InstallmentNumber { get; set; }
        public DateTime DueDate { get; set; }
        public decimal Amount { get; set; }
        public decimal PaidAmount { get; set; }
        public string Status { get; set; } = "Pending";
    }

    public class PublicDocumentVerificationDto
    {
        public bool IsValid { get; set; }
        public string Status { get; set; } = string.Empty; // FINALIZED, SUPERSEDED, CANCELLED
        public string DocumentNumber { get; set; } = string.Empty;
        public string ContractNumber { get; set; } = string.Empty;
        public int Revision { get; set; }
        public string? SaleDate { get; set; }
        public string? VehicleSummary { get; set; }
        public string? BuyerNameMasked { get; set; }
        public string? ReplacementDocumentNumber { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}
