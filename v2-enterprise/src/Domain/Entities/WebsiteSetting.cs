using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class WebsiteSetting : BaseEntity
    {
        public string CompanyNameEn { get; set; } = string.Empty;
        public string CompanyNameAr { get; set; } = string.Empty;
        public string? LogoPath { get; set; }
        public string? ContactPhone { get; set; }
        public string? WhatsAppNumber { get; set; }
        public string? Email { get; set; }
        public string AddressEn { get; set; } = string.Empty;
        public string AddressAr { get; set; } = string.Empty;
        public string WorkingHoursEn { get; set; } = string.Empty;
        public string WorkingHoursAr { get; set; } = string.Empty;
        public string? FacebookUrl { get; set; }
        public string? InstagramUrl { get; set; }
        public string? TwitterUrl { get; set; }
        public string? YoutubeUrl { get; set; }
        public string DefaultMetaTitleEn { get; set; } = string.Empty;
        public string DefaultMetaTitleAr { get; set; } = string.Empty;
        public string DefaultMetaDescriptionEn { get; set; } = string.Empty;
        public string DefaultMetaDescriptionAr { get; set; } = string.Empty;
        
        // Audit Fields
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? CreatedBy { get; set; }
        public DateTime? LastModifiedAt { get; set; }
        public string? LastModifiedBy { get; set; }
    }
}
