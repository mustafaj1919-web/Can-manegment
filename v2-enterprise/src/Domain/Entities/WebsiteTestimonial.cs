using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class WebsiteTestimonial : BaseEntity
    {
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerRoleEn { get; set; } = string.Empty;
        public string CustomerRoleAr { get; set; } = string.Empty;
        public string ReviewEn { get; set; } = string.Empty;
        public string ReviewAr { get; set; } = string.Empty;
        public int Rating { get; set; } = 5;
        public string? CustomerImage { get; set; }
        public int DisplayOrder { get; set; } = 0;
        public bool IsActive { get; set; } = true;
        
        // Audit Fields
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? CreatedBy { get; set; }
        public DateTime? LastModifiedAt { get; set; }
        public string? LastModifiedBy { get; set; }
    }
}
