using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.Application.Payments.Commands
{
    public class ArchiveReceiptResponseDto
    {
        public bool Success { get; set; } = true;
        public Guid ArchiveId { get; set; }
        public Guid PaymentId { get; set; }
        public string ReceiptNumber { get; set; } = string.Empty;
        public bool IsArchived { get; set; } = true;
        public string ArchiveStatus { get; set; } = "ManuallyConfirmed";
        public string ArchiveMethod { get; set; } = "ManuallyConfirmed";
        public string? StorageReference { get; set; }
        public string? DocumentFileName { get; set; }
        public string ConfirmedByUserName { get; set; } = string.Empty;
        public DateTime ConfirmedAt { get; set; } = DateTime.UtcNow;
    }

    public class ArchiveReceiptCommand : IRequest<ArchiveReceiptResponseDto>
    {
        public Guid PaymentId { get; set; }
        public string ArchiveMethod { get; set; } = "ManuallyConfirmed"; // ManuallyConfirmed | Uploaded | Automatic
        public string? StorageReference { get; set; }
        public string? DocumentFileName { get; set; }
        public string? Notes { get; set; }
    }

    public class ArchiveReceiptCommandValidator : AbstractValidator<ArchiveReceiptCommand>
    {
        public ArchiveReceiptCommandValidator()
        {
            RuleFor(x => x.PaymentId).NotEmpty().WithMessage("معرف السند مطلوب.");
            RuleFor(x => x.ArchiveMethod).NotEmpty().WithMessage("طريقة الأرشفة مطلوبة.");
        }
    }

    public class ArchiveReceiptCommandHandler : IRequestHandler<ArchiveReceiptCommand, ArchiveReceiptResponseDto>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public ArchiveReceiptCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<ArchiveReceiptResponseDto> Handle(ArchiveReceiptCommand request, CancellationToken cancellationToken)
        {
            var branchId = _currentUserService.BranchId;

            var payment = await _context.Payments
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(p => p.Id == request.PaymentId && p.BranchId == branchId, cancellationToken);

            if (payment == null)
            {
                throw new InvalidOperationException("السند المالي غير موجود أو لا ينتمي لهذا الفرع.");
            }

            if (string.Equals(payment.Status, "cancelled", StringComparison.OrdinalIgnoreCase) || payment.ReversalOfId.HasValue)
            {
                throw new InvalidOperationException("لا يمكن أرشفة وصل لسند مالي ملغى أو معكوس.");
            }

            var archiveRecord = await _context.ReceiptArchiveRecords
                .FirstOrDefaultAsync(r => r.PaymentId == request.PaymentId, cancellationToken);

            var now = DateTime.UtcNow;
            var currentUserName = _currentUserService.UserId ?? "موظف النظام";
            var receiptNo = !string.IsNullOrWhiteSpace(payment.ReferenceNumber) ? payment.ReferenceNumber : $"RCP-{payment.Id.ToString().Substring(0, 8).ToUpper()}";

            if (archiveRecord == null)
            {
                archiveRecord = new ReceiptArchiveRecord
                {
                    Id = Guid.NewGuid(),
                    PaymentId = payment.Id,
                    ReceiptNumber = receiptNo,
                    BranchId = branchId,
                    ArchiveStatus = request.ArchiveMethod,
                    ArchiveMethod = request.ArchiveMethod,
                    StorageReference = request.StorageReference,
                    DocumentFileName = request.DocumentFileName,
                    ConfirmedByUserId = _currentUserService.UserId,
                    ConfirmedByUserName = currentUserName,
                    ConfirmedAt = now,
                    Notes = request.Notes
                };
                _context.ReceiptArchiveRecords.Add(archiveRecord);
            }
            else
            {
                archiveRecord.ArchiveStatus = request.ArchiveMethod;
                archiveRecord.ArchiveMethod = request.ArchiveMethod;
                if (!string.IsNullOrWhiteSpace(request.StorageReference)) archiveRecord.StorageReference = request.StorageReference;
                if (!string.IsNullOrWhiteSpace(request.DocumentFileName)) archiveRecord.DocumentFileName = request.DocumentFileName;
                archiveRecord.ConfirmedByUserId = _currentUserService.UserId;
                archiveRecord.ConfirmedByUserName = currentUserName;
                archiveRecord.ConfirmedAt = now;
                archiveRecord.Notes = request.Notes;
                _context.ReceiptArchiveRecords.Update(archiveRecord);
            }

            await _context.SaveChangesAsync(cancellationToken);

            var isArchived = string.Equals(archiveRecord.ArchiveStatus, "Uploaded", StringComparison.OrdinalIgnoreCase) ||
                             string.Equals(archiveRecord.ArchiveStatus, "ManuallyConfirmed", StringComparison.OrdinalIgnoreCase);

            return new ArchiveReceiptResponseDto
            {
                Success = true,
                ArchiveId = archiveRecord.Id,
                PaymentId = payment.Id,
                ReceiptNumber = archiveRecord.ReceiptNumber,
                IsArchived = isArchived,
                ArchiveStatus = archiveRecord.ArchiveStatus,
                ArchiveMethod = archiveRecord.ArchiveMethod,
                StorageReference = archiveRecord.StorageReference,
                DocumentFileName = archiveRecord.DocumentFileName,
                ConfirmedByUserName = currentUserName,
                ConfirmedAt = now
            };
        }
    }
}
