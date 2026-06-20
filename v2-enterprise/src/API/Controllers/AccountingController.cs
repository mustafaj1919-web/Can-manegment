using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Accounting.Commands;
using CarShowroomManagementV2.Application.Accounting.Queries;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize(Roles = "Owner,Admin,Accountant,Viewer")]
    public class AccountingController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public AccountingController(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        private static AccountType MapType(string? t) => t switch
        {
            "Asset" => AccountType.Asset,
            "Liability" => AccountType.Liability,
            "Equity" => AccountType.Equity,
            "Income" or "Revenue" => AccountType.Revenue,
            "Expense" => AccountType.Expense,
            _ => AccountType.Asset,
        };

        // 1. إنشاء قيد محاسبي مزدوج
        [Authorize(Roles = "Owner,Admin,Accountant")]
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

        // ─── إدارة شجرة الحسابات (بالكود) ───
        [Authorize(Roles = "Owner,Admin,Accountant")]
        [HttpPost("accounts")]
        public async Task<IActionResult> CreateAccount([FromBody] AccountDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Code)) return BadRequest(new { success = false, message = "كود الحساب مطلوب." });
            if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest(new { success = false, message = "اسم الحساب مطلوب." });
            var branchId = _currentUserService.BranchId;
            var exists = await _context.Accounts.IgnoreQueryFilters().AnyAsync(a => a.AccountCode == dto.Code && a.BranchId == branchId);
            if (exists) return BadRequest(new { success = false, message = "كود الحساب مستخدم بالفعل." });

            Guid? parentId = null;
            if (!string.IsNullOrWhiteSpace(dto.ParentCode))
            {
                var parent = await _context.Accounts.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.AccountCode == dto.ParentCode && a.BranchId == branchId);
                if (parent == null) return BadRequest(new { success = false, message = "الحساب الأب غير موجود." });
                parentId = parent.Id;
            }

            var account = new Account
            {
                Id = Guid.NewGuid(),
                AccountCode = dto.Code,
                Name = dto.Name,
                Type = MapType(dto.Type),
                ParentAccountId = parentId,
                IsActive = dto.IsActive ?? true,
                BranchId = branchId,
            };
            _context.Accounts.Add(account);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, accountId = account.Id, code = account.AccountCode, message = "تم إضافة الحساب بنجاح." });
        }

        [Authorize(Roles = "Owner,Admin,Accountant")]
        [HttpPut("accounts/{code}")]
        public async Task<IActionResult> UpdateAccount(string code, [FromBody] AccountDto dto)
        {
            var account = await _context.Accounts.FirstOrDefaultAsync(a => a.AccountCode == code);
            if (account == null) return NotFound(new { success = false, message = "الحساب غير موجود." });
            if (!string.IsNullOrWhiteSpace(dto.Name)) account.Name = dto.Name;
            if (!string.IsNullOrWhiteSpace(dto.Type)) account.Type = MapType(dto.Type);
            if (dto.IsActive.HasValue) account.IsActive = dto.IsActive.Value;
            await _context.SaveChangesAsync();
            return Ok(new { success = true, code = account.AccountCode, is_active = account.IsActive, message = "تم تعديل الحساب بنجاح." });
        }

        [Authorize(Roles = "Owner,Admin,Accountant")]
        [HttpDelete("accounts/{code}")]
        public async Task<IActionResult> DeactivateAccount(string code)
        {
            var account = await _context.Accounts.FirstOrDefaultAsync(a => a.AccountCode == code);
            if (account == null) return NotFound(new { success = false, message = "الحساب غير موجود." });
            account.IsActive = false;
            await _context.SaveChangesAsync();
            return Ok(new { success = true, is_active = false, message = "تم إيقاف الحساب بنجاح." });
        }

        [Authorize(Roles = "Owner,Admin,Accountant")]
        [HttpPost("recompute-balances")]
        public IActionResult RecomputeBalances()
        {
            // الأرصدة مشتقة من سطور اليومية لحظيًا، لا يوجد رصيد مخزّن لإعادة احتسابه.
            return Ok(new { success = true, message = "أرصدة الحسابات محدّثة (تُحتسب لحظيًا من القيود)." });
        }

        // ─── قيود اليومية: سرد / عكس / ترحيل ───
        [HttpGet("journal-entries")]
        public async Task<IActionResult> GetJournalEntries(
            [FromQuery] int page = 1, [FromQuery] int per_page = 30,
            [FromQuery] string? date_from = null, [FromQuery] string? date_to = null,
            [FromQuery] string? ref_type = null, [FromQuery] string? search = null)
        {
            if (page < 1) page = 1;
            if (per_page < 1 || per_page > 200) per_page = 30;

            var q = _context.JournalEntries.Include(j => j.Lines).AsQueryable();
            if (DateTime.TryParse(date_from, out var df)) q = q.Where(j => j.EntryDate >= df.ToUniversalTime());
            if (DateTime.TryParse(date_to, out var dt)) q = q.Where(j => j.EntryDate <= dt.ToUniversalTime().AddDays(1).AddTicks(-1));
            if (!string.IsNullOrWhiteSpace(ref_type)) q = q.Where(j => j.ReferenceType == ref_type);
            if (!string.IsNullOrWhiteSpace(search)) q = q.Where(j => j.Description.Contains(search) || j.EntryNumber.Contains(search));

            var all = await q.OrderByDescending(j => j.EntryDate).ToListAsync();
            var accountMap = await _context.Accounts.IgnoreQueryFilters()
                .ToDictionaryAsync(a => a.Id, a => new { a.AccountCode, a.Name });

            var total = all.Count;
            var items = all.Skip((page - 1) * per_page).Take(per_page).Select(j => new
            {
                id = j.Id,
                reference_number = j.EntryNumber,
                status = j.ReferenceType == "PaymentReversal" || j.EntryNumber.StartsWith("REV") ? "reversed" : (j.IsPosted ? "posted" : "draft"),
                entry_date = j.EntryDate,
                description = j.Description,
                reference_type = j.ReferenceType,
                line_count = j.Lines.Count,
                total_debit = j.Lines.Sum(l => l.Debit),
                total_credit = j.Lines.Sum(l => l.Credit),
                is_balanced = j.Lines.Sum(l => l.Debit) == j.Lines.Sum(l => l.Credit),
                lines = j.Lines.Select(l => new
                {
                    account_code = accountMap.ContainsKey(l.AccountId) ? accountMap[l.AccountId].AccountCode : null,
                    account_name = accountMap.ContainsKey(l.AccountId) ? accountMap[l.AccountId].Name : null,
                    debit = l.Debit, credit = l.Credit, description = l.Description
                }).ToList()
            }).ToList();

            return Ok(new { success = true, data = new { total, page, per_page, items } });
        }

        [Authorize(Roles = "Owner,Admin,Accountant")]
        [HttpPost("journal-entries/{id}/reverse")]
        public async Task<IActionResult> ReverseJournalEntry(Guid id)
        {
            var entry = await _context.JournalEntries.Include(j => j.Lines).FirstOrDefaultAsync(j => j.Id == id);
            if (entry == null) return NotFound(new { success = false, message = "القيد غير موجود." });

            var count = await _context.JournalEntries.IgnoreQueryFilters().CountAsync();
            var reversal = new JournalEntry
            {
                Id = Guid.NewGuid(),
                EntryNumber = $"REV-{DateTime.UtcNow:yyyyMMdd}-{count + 1:D5}",
                EntryDate = DateTime.UtcNow,
                Description = $"عكس القيد رقم {entry.EntryNumber}",
                IsPosted = true,
                BranchId = _currentUserService.BranchId,
                ReferenceType = "JournalReversal",
                ReferenceId = entry.Id,
                CreatedBy = _currentUserService.UserId,
            };
            foreach (var l in entry.Lines)
            {
                reversal.Lines.Add(new JournalLine
                {
                    Id = Guid.NewGuid(), JournalEntryId = reversal.Id, AccountId = l.AccountId,
                    Debit = l.Credit, Credit = l.Debit, Description = $"عكس: {l.Description}"
                });
            }
            _context.JournalEntries.Add(reversal);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, id = reversal.Id, reference_number = reversal.EntryNumber, original_id = entry.Id, message = "تم عكس القيد بنجاح." });
        }

        [Authorize(Roles = "Owner,Admin,Accountant")]
        [HttpPost("journal-entries/{id}/post")]
        public async Task<IActionResult> PostJournalEntry(Guid id)
        {
            var entry = await _context.JournalEntries.FirstOrDefaultAsync(j => j.Id == id);
            if (entry == null) return NotFound(new { success = false, message = "القيد غير موجود." });
            entry.IsPosted = true;
            await _context.SaveChangesAsync();
            return Ok(new { success = true, id = entry.Id, status = "posted", message = "تم ترحيل القيد." });
        }

        // ─── حركة حساب (صندوق/بنك) ───
        [HttpGet("account-movement")]
        public async Task<IActionResult> GetAccountMovement([FromQuery] string account_code, [FromQuery] string? start_date, [FromQuery] string? end_date)
        {
            var account = await _context.Accounts.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.AccountCode == account_code);
            if (account == null) return NotFound(new { success = false, message = "الحساب غير موجود." });

            var linesQ = _context.JournalLines.Where(l => l.AccountId == account.Id);
            var entryIds = await linesQ.Select(l => l.JournalEntryId).Distinct().ToListAsync();
            var entries = await _context.JournalEntries.Where(j => entryIds.Contains(j.Id)).ToListAsync();
            var entryMap = entries.ToDictionary(j => j.Id, j => j);

            var lines = await linesQ.ToListAsync();
            var joined = lines
                .Select(l => new { l, e = entryMap.GetValueOrDefault(l.JournalEntryId) })
                .Where(x => x.e != null)
                .Where(x => !DateTime.TryParse(start_date, out var sd) || x.e!.EntryDate >= sd.ToUniversalTime())
                .Where(x => !DateTime.TryParse(end_date, out var ed) || x.e!.EntryDate <= ed.ToUniversalTime().AddDays(1).AddTicks(-1))
                .OrderBy(x => x.e!.EntryDate).ToList();

            decimal balance = 0; var rows = new List<object>();
            decimal totalIn = 0, totalOut = 0;
            foreach (var x in joined)
            {
                balance += x.l.Debit - x.l.Credit; // حساب أصول: مدين يزيد
                totalIn += x.l.Debit; totalOut += x.l.Credit;
                rows.Add(new {
                    date = x.e!.EntryDate, journal_ref = x.e.EntryNumber, voucher_number = x.e.EntryNumber,
                    description = x.l.Description ?? x.e.Description, inflow = x.l.Debit, outflow = x.l.Credit, balance
                });
            }
            return Ok(new { success = true, data = new {
                account_code = account.AccountCode, account_name = account.Name,
                rows, total_inflow = totalIn, total_outflow = totalOut, final_balance = balance
            }});
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
            [FromQuery] int per_page = 10)
        {
            if (page < 1) page = 1;
            if (per_page < 1 || per_page > 100) per_page = 10;

            var result = await Mediator.Send(new GetCustomerLedgerQuery
            {
                CustomerId = customerId,
                FromDate = fromDate,
                ToDate = toDate,
                Page = page,
                PageSize = per_page
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
            [FromQuery] int per_page = 10)
        {
            if (page < 1) page = 1;
            if (per_page < 1 || per_page > 100) per_page = 10;

            var result = await Mediator.Send(new GetSupplierLedgerQuery
            {
                SupplierId = supplierId,
                FromDate = fromDate,
                ToDate = toDate,
                Page = page,
                PageSize = per_page
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

        // 10. تقرير مراكز التكلفة
        [HttpGet("cost-center-report")]
        public async Task<IActionResult> GetCostCenterReport(
            [FromQuery] string? from_date,
            [FromQuery] string? to_date)
        {
            DateTime? fromDate = DateTime.TryParse(from_date, out var fd) ? fd.ToUniversalTime() : null;
            DateTime? toDate   = DateTime.TryParse(to_date,   out var td) ? td.ToUniversalTime().AddDays(1).AddTicks(-1) : null;

            // المصاريف مجمّعة حسب التصنيف
            var expQ = _context.Expenses.AsQueryable();
            if (fromDate.HasValue) expQ = expQ.Where(e => e.ExpenseDate >= fromDate.Value);
            if (toDate.HasValue)   expQ = expQ.Where(e => e.ExpenseDate <= toDate.Value);
            var allExpenses = await expQ.OrderByDescending(e => e.ExpenseDate).ToListAsync();

            var centerGroups = allExpenses
                .GroupBy(e => string.IsNullOrWhiteSpace(e.Category) ? "مصاريف عامة" : e.Category)
                .Select(g => new
                {
                    center         = g.Key,
                    total          = g.Sum(e => e.Amount),
                    count          = g.Count(),
                    items = g.Select(e => new
                    {
                        id       = e.Id,
                        title    = e.Title,
                        amount   = e.Amount,
                        currency = e.Currency,
                        date     = e.ExpenseDate,
                        notes    = e.Notes
                    }).OrderByDescending(e => e.date).ToList<object>()
                })
                .OrderByDescending(g => g.total)
                .ToList();

            // تكاليف السيارات
            var vCostQ = _context.VehicleCosts.Include(vc => vc.Vehicle).AsQueryable();
            var allVCosts = await vCostQ.ToListAsync();
            var vehicleCostGroups = allVCosts
                .GroupBy(vc => string.IsNullOrWhiteSpace(vc.CostType) ? "تكاليف سيارات" : vc.CostType)
                .Select(g => new
                {
                    center = $"تكاليف السيارات - {g.Key}",
                    total  = g.Sum(vc => vc.Amount),
                    count  = g.Count(),
                    items  = new List<object>()
                })
                .ToList();

            // إيرادات المبيعات
            var salesQ = _context.SalesContracts.AsQueryable();
            if (fromDate.HasValue) salesQ = salesQ.Where(s => s.SaleDate >= fromDate.Value);
            if (toDate.HasValue)   salesQ = salesQ.Where(s => s.SaleDate <= toDate.Value);
            var totalRevenue   = await salesQ.SumAsync(s => (decimal?)s.NetPrice) ?? 0;
            var salesCount     = await salesQ.CountAsync();

            var totalExpenses  = allExpenses.Sum(e => e.Amount);
            var totalVehicleCosts = allVCosts.Sum(vc => vc.Amount);
            var netResult      = totalRevenue - totalExpenses - totalVehicleCosts;

            return Ok(new
            {
                success = true,
                data = new
                {
                    from_date      = from_date,
                    to_date        = to_date,
                    total_revenue  = totalRevenue,
                    sales_count    = salesCount,
                    total_expenses = totalExpenses,
                    total_vehicle_costs = totalVehicleCosts,
                    net_result     = netResult,
                    expense_centers = centerGroups,
                    vehicle_cost_centers = vehicleCostGroups
                }
            });
        }

        // 11. تقرير مقارنة الفروع
        [HttpGet("branch-comparison")]
        public async Task<IActionResult> GetBranchComparison(
            [FromQuery] string? from_date,
            [FromQuery] string? to_date)
        {
            DateTime? fromDate = DateTime.TryParse(from_date, out var fd) ? fd.ToUniversalTime() : null;
            DateTime? toDate   = DateTime.TryParse(to_date,   out var td) ? td.ToUniversalTime().AddDays(1).AddTicks(-1) : null;

            var branches = await _context.Branches.OrderBy(b => b.Name).ToListAsync();

            var scQ = _context.SalesContracts.AsQueryable();
            if (fromDate.HasValue) scQ = scQ.Where(s => s.SaleDate >= fromDate.Value);
            if (toDate.HasValue)   scQ = scQ.Where(s => s.SaleDate <= toDate.Value);
            var allSales = await scQ.ToListAsync();

            var purchQ = _context.Purchases.AsQueryable();
            if (fromDate.HasValue) purchQ = purchQ.Where(p => p.PurchaseDate >= fromDate.Value);
            if (toDate.HasValue)   purchQ = purchQ.Where(p => p.PurchaseDate <= toDate.Value);
            var allPurchases = await purchQ.ToListAsync();

            var expQ2 = _context.Expenses.AsQueryable();
            if (fromDate.HasValue) expQ2 = expQ2.Where(e => e.ExpenseDate >= fromDate.Value);
            if (toDate.HasValue)   expQ2 = expQ2.Where(e => e.ExpenseDate <= toDate.Value);
            var allExpenses2 = await expQ2.ToListAsync();

            var vehicles   = await _context.Vehicles.ToListAsync();
            var customers  = await _context.Customers.ToListAsync();

            var branchRows = branches.Select(b =>
            {
                var bSales     = allSales.Where(s => s.BranchId == b.Id).ToList();
                var bPurchases = allPurchases.Where(p => p.BranchId == b.Id).ToList();
                var bExpenses  = allExpenses2.Where(e => e.BranchId == b.Id).ToList();
                var bVehicles  = vehicles.Where(v => v.BranchId == b.Id).ToList();
                var bCustomers = customers.Where(c => c.BranchId == b.Id).ToList();

                var revenue   = bSales.Sum(s => s.NetPrice);
                var expenses  = bExpenses.Sum(e => e.Amount);
                var purchases = bPurchases.Sum(p => p.PurchaseCost);
                var netProfit = revenue - purchases - expenses;

                return new
                {
                    branch_id       = b.Id,
                    branch_name     = b.Name,
                    branch_code     = b.Code,
                    is_active       = b.IsActive,
                    sales_count     = bSales.Count,
                    purchases_count = bPurchases.Count,
                    customers_count = bCustomers.Count,
                    available_cars  = bVehicles.Count(v => !v.IsSold),
                    sold_cars       = bVehicles.Count(v => v.IsSold),
                    total_revenue   = revenue,
                    total_purchases = purchases,
                    total_expenses  = expenses,
                    net_profit      = netProfit
                };
            }).ToList();

            var totals = new
            {
                sales_count     = allSales.Count,
                purchases_count = allPurchases.Count,
                total_revenue   = allSales.Sum(s => s.NetPrice),
                total_purchases = allPurchases.Sum(p => p.PurchaseCost),
                total_expenses  = allExpenses2.Sum(e => e.Amount),
                net_profit      = allSales.Sum(s => s.NetPrice) - allPurchases.Sum(p => p.PurchaseCost) - allExpenses2.Sum(e => e.Amount)
            };

            return Ok(new
            {
                success = true,
                data = new
                {
                    from_date = from_date,
                    to_date   = to_date,
                    branches  = branchRows,
                    totals    = totals
                }
            });
        }

        // 12. فحص قواعد المحاسبة
        [HttpGet("accounting-rules")]
        public async Task<IActionResult> GetAccountingRulesCheck()
        {
            var entries  = await _context.JournalEntries.Include(j => j.Lines).ToListAsync();
            var accounts = await _context.Accounts.IgnoreQueryFilters().ToListAsync();

            var issues   = new List<object>();
            var warnings = new List<object>();
            var stats    = new { total_entries = entries.Count, total_accounts = accounts.Count };

            // 1. قيود غير متوازنة
            var unbalanced = entries.Where(j => Math.Abs(j.Lines.Sum(l => l.Debit) - j.Lines.Sum(l => l.Credit)) > 0.001m).ToList();
            foreach (var j in unbalanced)
            {
                issues.Add(new
                {
                    type    = "unbalanced_entry",
                    label   = "قيد غير متوازن",
                    ref_num = j.EntryNumber,
                    date    = j.EntryDate,
                    debit   = j.Lines.Sum(l => l.Debit),
                    credit  = j.Lines.Sum(l => l.Credit),
                    diff    = Math.Abs(j.Lines.Sum(l => l.Debit) - j.Lines.Sum(l => l.Credit))
                });
            }

            // 2. قيود بدون سطور
            var emptyEntries = entries.Where(j => !j.Lines.Any()).ToList();
            foreach (var j in emptyEntries)
            {
                warnings.Add(new
                {
                    type    = "empty_entry",
                    label   = "قيد بدون سطور",
                    ref_num = j.EntryNumber,
                    date    = j.EntryDate
                });
            }

            // 3. حسابات غير نشطة فيها قيود
            var inactiveAccountIds = accounts.Where(a => !a.IsActive).Select(a => a.Id).ToHashSet();
            var linesOnInactive = entries
                .SelectMany(j => j.Lines)
                .Where(l => inactiveAccountIds.Contains(l.AccountId))
                .GroupBy(l => l.AccountId)
                .ToList();
            foreach (var g in linesOnInactive)
            {
                var acct = accounts.First(a => a.Id == g.Key);
                warnings.Add(new
                {
                    type         = "inactive_account_used",
                    label        = "حساب غير نشط يحتوي قيوداً",
                    account_code = acct.AccountCode,
                    account_name = acct.Name,
                    lines_count  = g.Count()
                });
            }

            // ملخص
            var passed = issues.Count == 0;
            var score  = entries.Count == 0 ? 100 : Math.Max(0, 100 - (issues.Count * 20) - (warnings.Count * 5));

            return Ok(new
            {
                success = true,
                data = new
                {
                    passed,
                    score,
                    stats,
                    issues,
                    warnings,
                    summary = passed
                        ? "✓ جميع القيود المحاسبية متوازنة وصحيحة"
                        : $"⚠ تم اكتشاف {issues.Count} مشكلة و{warnings.Count} تحذير"
                }
            });
        }

        public class AccountDto
        {
            public string Code { get; set; } = string.Empty;
            public string Name { get; set; } = string.Empty;
            public string? Type { get; set; }
            public string? ParentCode { get; set; }
            public bool? IsActive { get; set; }
        }
    }
}
