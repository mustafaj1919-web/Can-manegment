using System;
using System.Collections.Generic;
using CarShowroomManagementV2.Domain.Common;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class SalesContract : AuditableEntity
    {
        // ── 1. Document Identity & Lifecycle ──
        public string ContractNumber { get; set; } = string.Empty; // Transaction ID: SC-2026-000041
        public string DocumentNumber { get; set; } = Guid.NewGuid().ToString("N"); // Document ID: SALE-2026-000041-R1 (Unique)
        public int DocumentRevision { get; set; } = 1;            // 1, 2, 3...
        public string? ReceiptNumber { get; set; }                 // REC-2026-000041 (Cash receipt ref)

        public SaleDocumentStatus DocumentStatus { get; set; } = SaleDocumentStatus.DRAFT;
        public bool IsFinalized => DocumentStatus == SaleDocumentStatus.FINALIZED;
        public string VerificationCode { get; set; } = Guid.NewGuid().ToString("N"); // High-entropy unguessable token
        public DateTime SaleDate { get; set; } = DateTime.UtcNow;

        public DateTime? FinalizedAt { get; set; }
        public Guid? FinalizedByUserId { get; set; }
        public DateTime? CancelledAt { get; set; }
        
        public Guid? ReissuedFromDocumentId { get; set; }
        public virtual SalesContract? ReissuedFromDocument { get; set; }

        // Legacy compatibility property mapping to Status
        public string Status
        {
            get => DocumentStatus switch
            {
                SaleDocumentStatus.DRAFT => "Draft",
                SaleDocumentStatus.FINALIZED => "Active",
                SaleDocumentStatus.CANCELLED => "Cancelled",
                SaleDocumentStatus.REISSUED => "Cancelled",
                _ => "Draft"
            };
            set
            {
                if (value == "Cancelled") DocumentStatus = SaleDocumentStatus.CANCELLED;
                else if (value == "Active" || value == "Completed" || value == "Finalized") DocumentStatus = SaleDocumentStatus.FINALIZED;
                else if (value == "Draft") DocumentStatus = SaleDocumentStatus.DRAFT;
            }
        }

        // ── 2. Buyer Reference & Snapshots ──
        public Guid CustomerId { get; set; }
        public virtual Customer? Customer { get; set; }
        public string? BuyerNameSnapshot { get; set; }
        public string? BuyerPhoneSnapshot { get; set; }
        public string? BuyerIdNumberSnapshot { get; set; }
        public string? BuyerAddressSnapshot { get; set; }
        public string? BuyerVatNumberSnapshot { get; set; }

        // ── 3. Vehicle Reference & Snapshots ──
        public Guid VehicleId { get; set; }
        public virtual Vehicle? Vehicle { get; set; }
        public string? VehicleBrandSnapshot { get; set; }
        public string? VehicleModelSnapshot { get; set; }
        public int? VehicleYearSnapshot { get; set; }
        public string? VehicleColorSnapshot { get; set; }
        public string? VinSnapshot { get; set; }           // Chassis # (LTR)
        public string? EngineNumberSnapshot { get; set; } // (LTR)
        public string? PlateNumberSnapshot { get; set; }  // (LTR)
        public string? ImportCountrySnapshot { get; set; }

        // ── 4. Pre-Sale Vehicle Ownership Model ──
        public VehicleOwnershipType OwnershipType { get; set; } = VehicleOwnershipType.PERSON;

        // PERSON Ownership (Reference & Snapshots)
        public Guid? OwnerPersonId { get; set; }
        public string? OwnerPersonNameSnapshot { get; set; }
        public string? OwnerPersonPhoneSnapshot { get; set; }
        public string? OwnerPersonIdNumberSnapshot { get; set; }
        public string? OwnerNotes { get; set; }

        // SUPPLIER Ownership (Reference & Snapshots)
        public Guid? SupplierId { get; set; }
        public virtual Supplier? Supplier { get; set; }
        public string? SupplierNameSnapshot { get; set; }
        public string? SupplierReference { get; set; }
        public DateTime? SupplyDate { get; set; }

        // COMPANY Ownership (Snapshots)
        public string? CompanyNameSnapshot { get; set; } // "شركة الأصدقاء لتجارة السيارات"
        public string? CompanyRegistrationReference { get; set; }

        // ── 5. Financial Snapshots ──
        public decimal SalePrice { get; set; } // سعر البيع المتفق عليه
        public decimal TaxAmount { get; set; } // الضريبة
        public decimal RegistrationFees { get; set; } // رسوم التسجيل
        public decimal Discount { get; set; } // الخصم الممنوح
        public decimal NetPrice { get; set; } // الصافي الكلي
        public decimal DownPayment { get; set; } // الدفعة المقدمة
        public decimal RemainingBalance { get; set; } // المبلغ المتبقي المستحق للتقسيط أو السداد اللاحق
        
        public decimal PaidAmountAtIssue { get; set; }
        public decimal RemainingAmountAtIssue { get; set; }

        private decimal? _costBasis;
        public decimal CostBasis
        {
            get => _costBasis ?? 0m;
            set => _costBasis = value;
        } // تكلفة تملك السيارة وقت البيع المعتمدة محاسبياً
        public decimal Profit { get; set; } // أرباح العملية

        public string? Currency { get; set; } = "IQD";
        public PaymentMethod PaymentMethod { get; set; } // Cash or Installment

        // Installment Specific Snapshots
        public int? InstallmentCountSnapshot { get; set; }
        public decimal? MonthlyInstallmentAmountSnapshot { get; set; }
        public DateTime? FirstDueDateSnapshot { get; set; }

        // ── 6. Staff Responsibilities & Security ──
        public Guid? PreparedByUserId { get; set; } // Server authoritative context
        public virtual User? PreparedByUser { get; set; }
        public string? PreparedByNameSnapshot { get; set; }
        public string? PreparedByRoleSnapshot { get; set; }

        public Guid? SalesRepId { get; set; } // Salesperson (Employee)
        public virtual Employee? SalesRep { get; set; }
        public string? SalespersonNameSnapshot { get; set; }

        // ── 7. Terms Governance & Notes ──
        public string? TermsTemplateId { get; set; }
        public string? TermsTemplateVersion { get; set; }
        public string? TermsContentSnapshot { get; set; }
        public string? DocumentNotes { get; set; }

        // ── 8. E-Invoicing & Compliance ──
        public string? EInvoiceStatus { get; set; } = "Draft"; // Draft, Pending, Sent, Failed
        public string? EInvoiceXmlHash { get; set; }
        public string? EInvoiceQrCode { get; set; }
        public string? EInvoiceUuid { get; set; }
        public string? EInvoiceError { get; set; }

        // علاقات التنقل
        public virtual InstallmentPlan? InstallmentPlan { get; set; }
    }
}
