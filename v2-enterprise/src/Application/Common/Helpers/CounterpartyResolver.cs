using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.Application.Common.Helpers
{
    public class CounterpartyInfo
    {
        public PurchaseSourceType Type { get; set; }
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public Guid AccountId { get; set; }
        public string Phone { get; set; } = string.Empty;
    }

    public static class CounterpartyResolver
    {
        public static async Task<CounterpartyInfo> ResolveAsync(
            IApplicationDbContext context,
            PurchaseSourceType sourceType,
            Guid? supplierId,
            Guid? customerId,
            Guid branchId,
            CancellationToken cancellationToken)
        {
            if (sourceType == PurchaseSourceType.Supplier)
            {
                if (!supplierId.HasValue || supplierId.Value == Guid.Empty)
                    throw new InvalidOperationException("المورد مطلوب لعمليات الشراء من الموردين.");
                if (customerId.HasValue && customerId.Value != Guid.Empty)
                    throw new InvalidOperationException("لا يجوز تحديد عميل عند الشراء من مورد.");

                var supplier = await context.Suppliers
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(s => s.Id == supplierId.Value, cancellationToken);

                if (supplier == null)
                    throw new InvalidOperationException("المورد المحدد غير موجود في النظام.");

                return new CounterpartyInfo
                {
                    Type = PurchaseSourceType.Supplier,
                    Id = supplier.Id,
                    Name = supplier.Name,
                    Code = supplier.Code,
                    AccountId = supplier.AccountId,
                    Phone = supplier.Phone
                };
            }
            else if (sourceType == PurchaseSourceType.Customer)
            {
                if (!customerId.HasValue || customerId.Value == Guid.Empty)
                    throw new InvalidOperationException("الزبون مطلوب لعمليات الشراء من الزبائن.");
                if (supplierId.HasValue && supplierId.Value != Guid.Empty)
                    throw new InvalidOperationException("لا يجوز تحديد مورد عند الشراء من زبون.");

                var customer = await context.Customers
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(c => c.Id == customerId.Value, cancellationToken);

                if (customer == null)
                    throw new InvalidOperationException("الزبون المحدد غير موجود في النظام.");

                return new CounterpartyInfo
                {
                    Type = PurchaseSourceType.Customer,
                    Id = customer.Id,
                    Name = customer.Name,
                    Code = customer.IdNumber,
                    AccountId = customer.AccountId,
                    Phone = customer.Phone
                };
            }
            else
            {
                throw new InvalidOperationException("نوع جهة الشراء غير معروف.");
            }
        }
    }
}
