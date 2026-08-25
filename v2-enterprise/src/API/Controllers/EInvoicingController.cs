using System;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.API.Controllers
{
    public class EInvoicingController : ApiControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly IEInvoiceService _eInvoiceService;
        private readonly ICurrentUserService _currentUserService;

        public EInvoicingController(
            IApplicationDbContext context,
            IEInvoiceService eInvoiceService,
            ICurrentUserService currentUserService)
        {
            _context = context;
            _eInvoiceService = eInvoiceService;
            _currentUserService = currentUserService;
        }

        [HttpGet("{id}/xml")]
        public async Task<IActionResult> GetInvoiceXml(Guid id)
        {
            var branchId = _currentUserService.BranchId;

            var contract = await _context.SalesContracts
                .Include(c => c.Customer)
                .Include(c => c.Vehicle)
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.Id == id && c.BranchId == branchId);

            if (contract == null)
            {
                return NotFound("عقد البيع المحدد غير موجود أو لا ينتمي لهذا الفرع.");
            }

            var branch = await _context.Branches
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(b => b.Id == branchId);

            if (branch == null)
            {
                return BadRequest("الفرع الحالي غير موجود.");
            }

            var xmlContent = _eInvoiceService.GenerateInvoiceXml(contract, branch, contract.Customer!);
            var bytes = Encoding.UTF8.GetBytes(xmlContent);

            return File(bytes, "application/xml", $"Invoice-{contract.ContractNumber}.xml");
        }

        [HttpPost("{id}/submit")]
        public async Task<IActionResult> SubmitToPortal(Guid id)
        {
            var branchId = _currentUserService.BranchId;

            var contract = await _context.SalesContracts
                .Include(c => c.Customer)
                .Include(c => c.Vehicle)
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.Id == id && c.BranchId == branchId);

            if (contract == null)
            {
                return NotFound("عقد البيع المحدد غير موجود أو لا ينتمي لهذا الفرع.");
            }

            var branch = await _context.Branches
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(b => b.Id == branchId);

            if (branch == null)
            {
                return BadRequest("الفرع الحالي غير موجود.");
            }

            var xmlContent = _eInvoiceService.GenerateInvoiceXml(contract, branch, contract.Customer!);
            var submissionResult = await _eInvoiceService.SubmitInvoiceToPortalAsync(contract, xmlContent);

            if (submissionResult.Success)
            {
                contract.EInvoiceStatus = "Sent";
                contract.EInvoiceError = null;
            }
            else
            {
                contract.EInvoiceStatus = "Failed";
                contract.EInvoiceError = submissionResult.Message;
            }

            _context.SalesContracts.Update(contract);
            await _context.SaveChangesAsync(default);

            return Ok(new
            {
                Success = submissionResult.Success,
                Message = submissionResult.Message,
                Status = contract.EInvoiceStatus,
                ClearanceStatus = submissionResult.ClearanceStatus
            });
        }

        [HttpGet("{id}/status")]
        public async Task<IActionResult> GetEInvoiceStatus(Guid id)
        {
            var branchId = _currentUserService.BranchId;

            var contract = await _context.SalesContracts
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.Id == id && c.BranchId == branchId);

            if (contract == null)
            {
                return NotFound("عقد البيع المحدد غير موجود.");
            }

            return Ok(new
            {
                contract.ContractNumber,
                contract.EInvoiceUuid,
                contract.EInvoiceStatus,
                contract.EInvoiceQrCode,
                contract.EInvoiceXmlHash,
                contract.EInvoiceError
            });
        }
    }
}
