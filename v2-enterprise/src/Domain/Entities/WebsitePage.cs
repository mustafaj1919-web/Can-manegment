using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class WebsitePage : BaseEntity
    {
        public string PageKey { get; set; } = string.Empty; // about, warranty, after-sales, trade-in
        public string TitleEn { get; set; } = string.Empty;
        public string TitleAr { get; set; } = string.Empty;
        public string ContentEn { get; set; } = string.Empty;
        public string ContentAr { get; set; } = string.Empty;
        public string? CoverImage { get; set; }
        public bool IsActive { get; set; } = true;
        
        // SEO metadata
        public string? MetaTitleEn { get; set; }
        public string? MetaTitleAr { get; set; }
        public string? MetaDescriptionEn { get; set; }
        public string? MetaDescriptionAr { get; set; }
        
        // Audit Fields
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? CreatedBy { get; set; }
        public DateTime? LastModifiedAt { get; set; }
        public string? LastModifiedBy { get; set; }
    }
}
