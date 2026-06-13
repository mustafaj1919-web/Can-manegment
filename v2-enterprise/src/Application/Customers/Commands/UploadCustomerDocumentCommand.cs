using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Domain.Entities;

namespace CarShowroomManagementV2.Application.Customers.Commands
{
    public class UploadCustomerDocumentCommand : IRequest<Guid>
    {
        public Guid CustomerId { get; set; }
        public string DocumentType { get; set; } = string.Empty; // id_front, id_back, document_photo, etc.
        public string OriginalFileName { get; set; } = string.Empty;
        public byte[] FileBytes { get; set; } = Array.Empty<byte>();
    }

    public class UploadCustomerDocumentCommandHandler : IRequestHandler<UploadCustomerDocumentCommand, Guid>
    {
        private readonly IApplicationDbContext _context;

        public UploadCustomerDocumentCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Guid> Handle(UploadCustomerDocumentCommand request, CancellationToken cancellationToken)
        {
            var customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.Id == request.CustomerId, cancellationToken);

            if (customer == null)
            {
                throw new KeyNotFoundException("العميل غير موجود.");
            }

            // 1. تحديد وحفظ المستندات في مسار محمي بعيداً عن wwwroot
            var storagePath = Path.Combine(Directory.GetCurrentDirectory(), "storage", "private", "customers");
            if (!Directory.Exists(storagePath))
            {
                Directory.CreateDirectory(storagePath);
            }

            var extension = Path.GetExtension(request.OriginalFileName);
            var secureFileName = $"{Guid.NewGuid().ToString("N")}{extension}";
            var fullFilePath = Path.Combine(storagePath, secureFileName);

            // 2. كتابة محتوى الملف
            await File.WriteAllBytesAsync(fullFilePath, request.FileBytes, cancellationToken);

            // 3. حفظ السجل في قاعدة البيانات
            var document = new CustomerDocument
            {
                Id = Guid.NewGuid(),
                CustomerId = customer.Id,
                DocumentType = request.DocumentType,
                FileName = secureFileName,
                OriginalFileName = request.OriginalFileName,
                UploadedAt = DateTime.UtcNow
            };

            _context.CustomerDocuments.Add(document);
            await _context.SaveChangesAsync(cancellationToken);

            return document.Id;
        }
    }
}
