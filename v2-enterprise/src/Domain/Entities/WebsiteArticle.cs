using System;
using CarShowroomManagementV2.Domain.Common;

namespace CarShowroomManagementV2.Domain.Entities
{
    public class WebsiteArticle : BaseEntity
    {
        public string TitleEn { get; set; } = string.Empty;
        public string TitleAr { get; set; } = string.Empty;
        public string SummaryEn { get; set; } = string.Empty;
        public string SummaryAr { get; set; } = string.Empty;
        public string ContentEn { get; set; } = string.Empty;
        public string ContentAr { get; set; } = string.Empty;
        public string? CoverImage { get; set; }
        public string Category { get; set; } = "News"; // News, Offers, Events
        public string Slug { get; set; } = string.Empty; // Unique slug
        public bool IsFeatured { get; set; } = false;
        public string Status { get; set; } = "Draft"; // Draft, Published, Archived
        
        // Publishing info
        public DateTime? PublishedAt { get; set; }
        public string? PublishedBy { get; set; }
        
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
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public string? DeletedBy { get; set; }
    }
}
