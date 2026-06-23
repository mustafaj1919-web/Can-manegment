using System;
using System.Collections.Generic;
using CarShowroomManagementV2.Domain.Common;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class SalesContract : AuditableEntity
    {
        public string ContractNumber { get; set; } = string.Empty; // رقم العقد / الفاتورة الفريد
        public Guid CustomerId { get; set; }
        public Guid VehicleId { get; set; }
        public DateTime SaleDate { get; set; } = DateTime.UtcNow;

        // تفاصيل التسعير
        public decimal SalePrice { get; set; } // سعر البيع المتفق عليه
        public decimal TaxAmount { get; set; } // الضريبة
        public decimal RegistrationFees { get; set; } // رسوم التسجيل
        public decimal Discount { get; set; } // الخصم الممنوح
        public decimal NetPrice { get; set; } // الصافي الكلي = سعر البيع + الضريبة + الرسوم - الخصم
        public decimal DownPayment { get; set; } // الدفعة المقدمة
        public decimal RemainingBalance { get; set; } // المبلغ المتبقي المستحق للتقسيط أو السداد اللاحق

        public decimal Profit { get; set; } // أرباح العملية = سعر البيع - التكلفة الدفترية للسيارة

        public PaymentMethod PaymentMethod { get; set; } // Cash or Installment
        public string Status { get; set; } = "Active"; // Active, Cancelled
        public Guid? SalesRepId { get; set; } // مندوب المبيعات (موظف) المسؤول عن العقد

        // حقول الفاتورة الإلكترونية والربط الضريبي
        public string? EInvoiceStatus { get; set; } = "Draft"; // Draft, Pending, Sent, Failed
        public string? EInvoiceXmlHash { get; set; }
        public string? EInvoiceQrCode { get; set; }
        public string? EInvoiceUuid { get; set; }
        public string? EInvoiceError { get; set; }

        // علاقات التنقل
        public virtual Customer? Customer { get; set; }
        public virtual Vehicle? Vehicle { get; set; }
        public virtual InstallmentPlan? InstallmentPlan { get; set; }
        public virtual Employee? SalesRep { get; set; }
    }
}
