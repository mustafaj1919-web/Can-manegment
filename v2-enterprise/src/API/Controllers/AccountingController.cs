using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using CarShowroomManagementV2.Application.Accounting.Commands;
using CarShowroomManagementV2.Application.Accounting.Queries;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize]
    public class AccountingController : ApiControllerBase
    {
        // 1. إنشاء قيد محاسبي مزدوج
        [HttpPost("journal-entry")]
        public async Task<IActionResult> CreateJournalEntry([FromBody] CreateJournalEntryCommand command)
        {
            if (command == null)
            {
                return BadRequest(new { success = false, message = "بيانات القيد غير صالحة." });
            }

            var entryId = await Mediator.Send(command);
            
            return Ok(new
            {
                success = true,
                message = "تم تسجيل وترحيل القيد المحاسبي بنجاح.",
                journalEntryId = entryId
            });
        }

        // 2. استعلام ميزان المراجعة
        [HttpGet("trial-balance")]
        public async Task<IActionResult> GetTrialBalance([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
        {
            var result = await Mediator.Send(new GetTrialBalanceQuery { FromDate = fromDate, ToDate = toDate });
            return Ok(new
            {
                success = true,
                data = result
            });
        }

        // 3. استعلام الأرباح والخسائر
        [HttpGet("profit-loss")]
        public async Task<IActionResult> GetProfitAndLoss([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
        {
            var result = await Mediator.Send(new GetProfitAndLossQuery { FromDate = fromDate, ToDate = toDate });
            return Ok(new
            {
                success = true,
                data = result
            });
        }

        // 4. استعلام الميزانية العمومية
        [HttpGet("balance-sheet")]
        public async Task<IActionResult> GetBalanceSheet([FromQuery] DateTime? toDate)
        {
            var result = await Mediator.Send(new GetBalanceSheetQuery { ToDate = toDate });
            return Ok(new
            {
                success = true,
                data = result
            });
        }

        // 5. استعلام كشف حساب العميل
        [HttpGet("customer-ledger")]
        public async Task<IActionResult> GetCustomerLedger(
            [FromQuery] Guid customerId, 
            [FromQuery] DateTime? fromDate, 
            [FromQuery] DateTime? toDate, 
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 10;

            var result = await Mediator.Send(new GetCustomerLedgerQuery
            {
                CustomerId = customerId,
                FromDate = fromDate,
                ToDate = toDate,
                Page = page,
                PageSize = pageSize
            });
            return Ok(new
            {
                success = true,
                data = result
            });
        }

        // 6. استعلام كشف حساب المورد
        [HttpGet("supplier-ledger")]
        public async Task<IActionResult> GetSupplierLedger(
            [FromQuery] Guid supplierId, 
            [FromQuery] DateTime? fromDate, 
            [FromQuery] DateTime? toDate, 
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 10;

            var result = await Mediator.Send(new GetSupplierLedgerQuery
            {
                SupplierId = supplierId,
                FromDate = fromDate,
                ToDate = toDate,
                Page = page,
                PageSize = pageSize
            });
            return Ok(new
            {
                success = true,
                data = result
            });
        }

        // 7. استعلام تقييم المخزون
        [HttpGet("inventory-valuation")]
        public async Task<IActionResult> GetInventoryValuation([FromQuery] DateTime? asOfDate)
        {
            var result = await Mediator.Send(new GetInventoryValuationQuery { AsOfDate = asOfDate });
            return Ok(new
            {
                success = true,
                data = result
            });
        }

        // 8. استعلام أعمار الأقساط
        [HttpGet("installments-aging")]
        public async Task<IActionResult> GetInstallmentsAging([FromQuery] DateTime? asOfDate)
        {
            var result = await Mediator.Send(new GetInstallmentsAgingQuery { AsOfDate = asOfDate });
            return Ok(new
            {
                success = true,
                data = result
            });
        }

        // 9. استعلام تقرير أرباح المبيعات
        [HttpGet("sales-profit")]
        public async Task<IActionResult> GetSalesProfit([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
        {
            var result = await Mediator.Send(new GetSalesProfitReportQuery { FromDate = fromDate, ToDate = toDate });
            return Ok(new
            {
                success = true,
                data = result
            });
        }
    }
}
