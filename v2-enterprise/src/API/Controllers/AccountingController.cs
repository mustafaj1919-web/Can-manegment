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

        // ─── الإهلاك الشهري ───
        [HttpPost("depreciation")]
        public async Task<IActionResult> ComputeDepreciation([FromBody] ComputeDepreciationRequest request)
        {
            try
            {
                var result = await Mediator.Send(new ComputeDepreciationCommand
                {
                    Month = request.Month,
                    Year = request.Year,
                    AnnualRatePercent = request.AnnualRatePercent ?? 20m
                });
                return Ok(new
                {
                    success = true,
                    entries_created = result.EntriesCreated,
                    total_depreciation = result.TotalDepreciation,
                    vehicles = result.Vehicles.Select(v => new
                    {
                        vehicle_id = v.VehicleId,
                        vehicle_name = v.VehicleName,
                        chassis_number = v.ChassisNumber,
                        book_value_before = v.BookValueBefore,
                        depreciation_amount = v.DepreciationAmount,
                        book_value_after = v.BookValueAfter
                    }),
                    message = $"تم احتساب إهلاك {result.EntriesCreated} سيارة بمجموع {result.TotalDepreciation:N0} ريال/دينار."
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("depreciation-report")]
        public async Task<IActionResult> GetDepreciationReport([FromQuery] int? month, [FromQuery] int? year)
        {
            var branchId = _currentUserService.BranchId;
            var targetMonth = month ?? DateTime.UtcNow.Month;
            var targetYear  = year  ?? DateTime.UtcNow.Year;
            var periodTag   = $"DEP-{targetYear:D4}-{targetMonth:D2}";

            var entries = await _context.JournalEntries
                .Include(e => e.Lines)
                .IgnoreQueryFilters()
                .Where(e => e.BranchId == branchId
                    && e.ReferenceType == "Depreciation"
                    && e.EntryNumber.StartsWith(periodTag))
                .OrderBy(e => e.EntryDate)
                .ToListAsync();

            var totalDep = entries.SelectMany(e => e.Lines).Where(l => l.Debit > 0).Sum(l => l.Debit);
            return Ok(new
            {
                success = true,
                month = targetMonth,
                year = targetYear,
                total_depreciation = totalDep,
                entries_count = entries.Count,
                entries = entries.Select(e => new
                {
                    id = e.Id,
                    entry_number = e.EntryNumber,
                    entry_date = e.EntryDate,
                    description = e.Description,
                    amount = e.Lines.Where(l => l.Debit > 0).Sum(l => l.Debit)
                })
            });
        }

        // ─── تنبيهات ذكية ───
        [HttpGet("alerts")]
        public async Task<IActionResult> GetAlerts([FromQuery] decimal cashThreshold = 1000000)
        {
            var branchId = _currentUserService.BranchId;
            var now = DateTime.UtcNow;
            var alertsList = new System.Collections.Generic.List<object>();

            // 1. رصيد الصندوق المنخفض
            var cashAccount = await _context.Accounts.IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == "111001" && a.BranchId == branchId);
            if (cashAccount != null)
            {
                var cashBalance = await _context.JournalLines
                    .Where(l => l.AccountId == cashAccount.Id)
                    .SumAsync(l => l.Debit - l.Credit);
                if (cashBalance < cashThreshold)
                    alertsList.Add(new { id = "low_cash", severity = "warning", category = "صندوق",
                        title = "رصيد الصندوق منخفض",
                        message = $"الرصيد الحالي {cashBalance:N0} د.ع — أقل من الحد الأدنى {cashThreshold:N0} د.ع",
                        amount = cashBalance, threshold = cashThreshold });
            }

            // 2. الأقساط المتأخرة
            var overdueInstallments = await _context.Installments
                .IgnoreQueryFilters()
                .Where(i => i.BranchId == branchId
                    && (i.Status == "Pending" || i.Status == "PartiallyPaid")
                    && i.DueDate < now)
                .ToListAsync();
            if (overdueInstallments.Any())
            {
                var overdueAmount = overdueInstallments.Sum(i => i.Amount - i.PaidAmount);
                alertsList.Add(new { id = "overdue_installments", severity = "error", category = "أقساط",
                    title = $"{overdueInstallments.Count} قسط متأخر عن السداد",
                    message = $"إجمالي المتأخرات: {overdueAmount:N0} د.ع",
                    count = overdueInstallments.Count, amount = overdueAmount });
            }

            // 3. فواتير موردين غير مسددة منذ أكثر من 30 يوم
            var thirtyDaysAgo = now.AddDays(-30);
            var unpaidPurchases = await _context.Purchases
                .IgnoreQueryFilters()
                .Where(p => p.BranchId == branchId && p.Status == "Active"
                    && p.AmountPaid < p.PurchaseCost && p.PurchaseDate < thirtyDaysAgo)
                .ToListAsync();
            if (unpaidPurchases.Any())
            {
                var unpaidAmount = unpaidPurchases.Sum(p => p.PurchaseCost - p.AmountPaid);
                alertsList.Add(new { id = "overdue_suppliers", severity = "warning", category = "موردون",
                    title = $"{unpaidPurchases.Count} فاتورة مورد متأخرة",
                    message = $"فواتير تجاوزت 30 يوماً — إجمالي المتبقي: {unpaidAmount:N0} د.ع",
                    count = unpaidPurchases.Count, amount = unpaidAmount });
            }

            // 4. ارتفاع مفاجئ في المصاريف (هذا الشهر vs متوسط 3 أشهر سابقة)
            var startOfThisMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var startOf3MonthsAgo = startOfThisMonth.AddMonths(-3);
            var expenseAccountIds = await _context.Accounts.IgnoreQueryFilters()
                .Where(a => a.BranchId == branchId && a.Type == CarShowroomManagementV2.Domain.Enums.AccountType.Expense && a.IsActive)
                .Select(a => a.Id).ToListAsync();

            if (expenseAccountIds.Any())
            {
                var thisMonthExp = await _context.JournalLines
                    .Include(l => l.JournalEntry)
                    .Where(l => expenseAccountIds.Contains(l.AccountId)
                        && l.JournalEntry != null && l.JournalEntry.IsPosted
                        && l.JournalEntry.BranchId == branchId
                        && l.JournalEntry.EntryDate >= startOfThisMonth)
                    .SumAsync(l => l.Debit - l.Credit);

                var last3MonthsExp = await _context.JournalLines
                    .Include(l => l.JournalEntry)
                    .Where(l => expenseAccountIds.Contains(l.AccountId)
                        && l.JournalEntry != null && l.JournalEntry.IsPosted
                        && l.JournalEntry.BranchId == branchId
                        && l.JournalEntry.EntryDate >= startOf3MonthsAgo
                        && l.JournalEntry.EntryDate < startOfThisMonth)
                    .SumAsync(l => l.Debit - l.Credit);

                if (last3MonthsExp > 0)
                {
                    var avgMonthly = last3MonthsExp / 3m;
                    if (avgMonthly > 0 && thisMonthExp > avgMonthly * 1.2m)
                    {
                        var increasePercent = Math.Round((thisMonthExp - avgMonthly) / avgMonthly * 100, 1);
                        alertsList.Add(new { id = "expense_spike", severity = "info", category = "مصاريف",
                            title = "ارتفاع في المصاريف",
                            message = $"مصاريف هذا الشهر أعلى من المتوسط بنسبة {increasePercent}%",
                            current = thisMonthExp, average = avgMonthly, increase_percent = increasePercent });
                    }
                }
            }

            return Ok(new { success = true, count = alertsList.Count, alerts = alertsList });
        }

        // ─── رؤى مالية ذكية ───
        [HttpGet("insights")]
        public async Task<IActionResult> GetFinancialInsights()
        {
            var branchId = _currentUserService.BranchId;
            var now = DateTime.UtcNow;
            var startOfThisMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var startOfLastMonth = startOfThisMonth.AddMonths(-1);
            var endOfLastMonth = startOfThisMonth.AddTicks(-1);

            var revenueIds = await _context.Accounts.IgnoreQueryFilters()
                .Where(a => a.BranchId == branchId && a.Type == CarShowroomManagementV2.Domain.Enums.AccountType.Revenue && a.IsActive)
                .Select(a => a.Id).ToListAsync();
            var expenseIds = await _context.Accounts.IgnoreQueryFilters()
                .Where(a => a.BranchId == branchId && a.Type == CarShowroomManagementV2.Domain.Enums.AccountType.Expense && a.IsActive)
                .Select(a => a.Id).ToListAsync();

            async Task<decimal> SumLines(System.Collections.Generic.List<Guid> ids, DateTime from, DateTime to)
            {
                if (!ids.Any()) return 0;
                return await _context.JournalLines
                    .Include(l => l.JournalEntry)
                    .Where(l => ids.Contains(l.AccountId)
                        && l.JournalEntry != null && l.JournalEntry.IsPosted
                        && l.JournalEntry.BranchId == branchId
                        && l.JournalEntry.EntryDate >= from && l.JournalEntry.EntryDate <= to)
                    .SumAsync(l => l.Debit - l.Credit);
            }

            var thisMonthRevenue = await SumLines(revenueIds, startOfThisMonth, now);
            var lastMonthRevenue = await SumLines(revenueIds, startOfLastMonth, endOfLastMonth);
            // Revenue is credit-nature: negate
            thisMonthRevenue = -thisMonthRevenue;
            lastMonthRevenue = -lastMonthRevenue;

            var thisMonthExpenses = await SumLines(expenseIds, startOfThisMonth, now);
            var lastMonthExpenses = await SumLines(expenseIds, startOfLastMonth, endOfLastMonth);

            // Top 3 expense accounts this month
            var topExpenses = expenseIds.Any()
                ? await _context.JournalLines
                    .Include(l => l.JournalEntry)
                    .Include(l => l.Account)
                    .Where(l => expenseIds.Contains(l.AccountId)
                        && l.JournalEntry != null && l.JournalEntry.IsPosted
                        && l.JournalEntry.BranchId == branchId
                        && l.JournalEntry.EntryDate >= startOfThisMonth)
                    .GroupBy(l => new { l.AccountId, l.Account!.Name, l.Account.AccountCode })
                    .Select(g => new { account_code = g.Key.AccountCode, account_name = g.Key.Name, amount = g.Sum(l => l.Debit - l.Credit) })
                    .OrderByDescending(x => x.amount)
                    .Take(3)
                    .ToListAsync()
                : new System.Collections.Generic.List<object>() as dynamic;

            var thisNetProfit = thisMonthRevenue - thisMonthExpenses;
            var lastNetProfit = lastMonthRevenue - lastMonthExpenses;

            decimal Pct(decimal current, decimal previous) =>
                previous == 0 ? 0 : Math.Round((current - previous) / Math.Abs(previous) * 100, 1);

            var revenueChangePct = Pct(thisMonthRevenue, lastMonthRevenue);
            var expenseChangePct = Pct(thisMonthExpenses, lastMonthExpenses);
            var profitChangePct  = Pct(thisNetProfit, lastNetProfit);

            // نص الرؤى
            var insights = new System.Collections.Generic.List<string>();
            if (lastMonthRevenue > 0)
            {
                if (revenueChangePct > 10) insights.Add($"الإيرادات ارتفعت {revenueChangePct}% مقارنة بالشهر الماضي");
                else if (revenueChangePct < -10) insights.Add($"الإيرادات انخفضت {Math.Abs(revenueChangePct)}% مقارنة بالشهر الماضي");
                else insights.Add($"الإيرادات مستقرة ({(revenueChangePct >= 0 ? "+" : "")}{revenueChangePct}%)");
            }
            if (lastMonthExpenses > 0 && expenseChangePct > 20)
                insights.Add($"المصاريف ارتفعت {expenseChangePct}% — راجع بنود الإنفاق");
            if (thisNetProfit > 0) insights.Add($"صافي الربح هذا الشهر {thisNetProfit:N0} د.ع");
            else if (thisNetProfit < 0) insights.Add($"خسارة هذا الشهر {Math.Abs(thisNetProfit):N0} د.ع — يستوجب المراجعة");

            return Ok(new {
                success = true,
                period = new { month = now.Month, year = now.Year, month_name = new[] {"","يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"}[now.Month] },
                this_month = new { revenue = thisMonthRevenue, expenses = thisMonthExpenses, net_profit = thisNetProfit },
                last_month = new { revenue = lastMonthRevenue, expenses = lastMonthExpenses, net_profit = lastNetProfit },
                changes = new { revenue_pct = revenueChangePct, expense_pct = expenseChangePct, profit_pct = profitChangePct },
                top_expenses = topExpenses,
                insights
            });
        }

        // ─── توقع التدفق النقدي ───
        [HttpGet("cash-forecast")]
        public async Task<IActionResult> GetCashForecast([FromQuery] int days = 30)
        {
            if (days < 1 || days > 365) days = 30;
            var branchId = _currentUserService.BranchId;
            var now = DateTime.UtcNow;
            var forecastEnd = now.AddDays(days);

            // الأقساط المستحقة في الفترة (وارد متوقع)
            var dueInstallments = await _context.Installments
                .IgnoreQueryFilters()
                .Include(i => i.InstallmentPlan)
                    .ThenInclude(p => p!.SalesContract)
                        .ThenInclude(sc => sc!.Customer)
                .Where(i => i.BranchId == branchId
                    && (i.Status == "Pending" || i.Status == "PartiallyPaid")
                    && i.DueDate >= now && i.DueDate <= forecastEnd)
                .OrderBy(i => i.DueDate)
                .Select(i => new {
                    due_date = i.DueDate,
                    amount = i.Amount - i.PaidAmount,
                    customer_name = i.InstallmentPlan != null && i.InstallmentPlan.SalesContract != null && i.InstallmentPlan.SalesContract.Customer != null
                        ? i.InstallmentPlan.SalesContract.Customer.FullName : "عميل",
                    installment_number = i.InstallmentNumber
                })
                .ToListAsync();

            // فواتير موردين غير مسددة (صادر مستحق)
            var unpaidPurchases = await _context.Purchases
                .IgnoreQueryFilters()
                .Include(p => p.Supplier)
                .Where(p => p.BranchId == branchId && p.Status == "Active"
                    && p.AmountPaid < p.PurchaseCost)
                .OrderBy(p => p.PurchaseDate)
                .Select(p => new {
                    due_date = p.PurchaseDate,
                    amount = p.PurchaseCost - p.AmountPaid,
                    supplier_name = p.Supplier != null ? p.Supplier.Name : "مورد",
                    invoice_number = p.PurchaseNumber
                })
                .Take(50)
                .ToListAsync();

            // الرصيد الحالي للصندوق
            var cashAccount = await _context.Accounts.IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == "111001" && a.BranchId == branchId);
            var currentCash = cashAccount != null
                ? await _context.JournalLines
                    .Where(l => l.AccountId == cashAccount.Id)
                    .SumAsync(l => l.Debit - l.Credit)
                : 0;

            var bankAccount = await _context.Accounts.IgnoreQueryFilters()
                .FirstOrDefaultAsync(a => a.AccountCode == "112001" && a.BranchId == branchId);
            var currentBank = bankAccount != null
                ? await _context.JournalLines
                    .Where(l => l.AccountId == bankAccount.Id)
                    .SumAsync(l => l.Debit - l.Credit)
                : 0;

            var totalInflow  = dueInstallments.Sum(i => i.amount);
            var totalOutflow = unpaidPurchases.Sum(p => p.amount);
            var netForecast  = currentCash + currentBank + totalInflow - totalOutflow;

            return Ok(new {
                success = true,
                days,
                current_cash = currentCash,
                current_bank = currentBank,
                total_current = currentCash + currentBank,
                expected_inflow = totalInflow,
                expected_outflow = totalOutflow,
                net_forecast = netForecast,
                is_healthy = netForecast > 0,
                inflow_count = dueInstallments.Count,
                outflow_count = unpaidPurchases.Count,
                inflow_items = dueInstallments,
                outflow_items = unpaidPurchases
            });
        }

    }

    public record ComputeDepreciationRequest(int Month, int Year, decimal? AnnualRatePercent);
}
