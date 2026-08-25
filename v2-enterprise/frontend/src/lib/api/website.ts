import { get, put, post, del } from './client'

export interface WebsiteSetting {
  id: string
  companyNameEn: string
  companyNameAr: string
  logoPath: string | null
  contactPhone: string | null
  whatsAppNumber: string | null
  email: string | null
  addressEn: string
  addressAr: string
  workingHoursEn: string
  workingHoursAr: string
  facebookUrl: string | null
  instagramUrl: string | null
  twitterUrl: string | null
  youtubeUrl: string | null
  defaultMetaTitleEn: string
  defaultMetaTitleAr: string
  defaultMetaDescriptionEn: string
  defaultMetaDescriptionAr: string
}

export interface WebsiteService {
  id?: string
  titleEn: string
  titleAr: string
  descriptionEn: string
  descriptionAr: string
  icon: string
  displayOrder: number
  isActive: boolean
  createdAt?: string
}

export interface WebsiteTestimonial {
  id?: string
  customerName: string
  customerRoleEn: string
  customerRoleAr: string
  reviewEn: string
  reviewAr: string
  rating: number
  customerImage: string | null
  displayOrder: number
  isActive: boolean
  createdAt?: string
}

export interface WebsitePage {
  id?: string
  pageKey: string
  titleEn: string
  titleAr: string
  contentEn: string
  contentAr: string
  coverImage: string | null
  isActive: boolean
  metaTitleEn?: string
  metaTitleAr?: string
  metaDescriptionEn?: string
  metaDescriptionAr?: string
}

export interface WebsiteArticle {
  id?: string
  titleEn: string
  titleAr: string
  summaryEn: string
  summaryAr: string
  contentEn: string
  contentAr: string
  coverImage: string | null
  category: string
  slug: string
  isFeatured: boolean
  status: 'Draft' | 'Published' | 'Archived'
  publishedAt?: string
  publishedBy?: string
  metaTitleEn?: string
  metaTitleAr?: string
  metaDescriptionEn?: string
  metaDescriptionAr?: string
  createdAt?: string
}

export interface WebsiteMedia {
  id: string
  fileName: string
  filePath: string
  altTextEn: string | null
  altTextAr: string | null
  fileSize: number
  mimeType: string
  createdAt: string
}

/* ─── API Requests ──────────────────────────────────────────────────────── */

// Settings
export const getWebsiteSettings = () => get<{ success: boolean; data: WebsiteSetting }>('/admin/website/settings')
export const updateWebsiteSettings = (data: WebsiteSetting) => put<{ success: boolean; data: WebsiteSetting }>('/admin/website/settings', data)

// Services
export const getWebsiteServices = () => get<{ success: boolean; data: WebsiteService[] }>('/admin/website/services')
export const createWebsiteService = (data: WebsiteService) => post<{ success: boolean; data: WebsiteService }>('/admin/website/services', data)
export const updateWebsiteService = (id: string, data: WebsiteService) => put<{ success: boolean; data: WebsiteService }>(`/admin/website/services/${id}`, data)
export const deleteWebsiteService = (id: string) => del<{ success: boolean }>(`/admin/website/services/${id}`)

// Testimonials
export const getWebsiteTestimonials = () => get<{ success: boolean; data: WebsiteTestimonial[] }>('/admin/website/testimonials')
export const createWebsiteTestimonial = (data: WebsiteTestimonial) => post<{ success: boolean; data: WebsiteTestimonial }>('/admin/website/testimonials', data)
export const updateWebsiteTestimonial = (id: string, data: WebsiteTestimonial) => put<{ success: boolean; data: WebsiteTestimonial }>(`/admin/website/testimonials/${id}`, data)
export const deleteWebsiteTestimonial = (id: string) => del<{ success: boolean }>(`/admin/website/testimonials/${id}`)

// Pages
export const getWebsitePages = () => get<{ success: boolean; data: WebsitePage[] }>('/admin/website/pages')
export const getWebsitePage = (key: string) => get<{ success: boolean; data: WebsitePage }>(`/admin/website/pages/${key}`)
export const updateWebsitePage = (key: string, data: WebsitePage) => put<{ success: boolean; data: WebsitePage }>(`/admin/website/pages/${key}`, data)

// News / Articles
export const getWebsiteArticles = (search?: string, status?: string, page = 1, perPage = 15) => {
  const query = new URLSearchParams()
  if (search) query.append('search', search)
  if (status) query.append('status', status)
  query.append('page', String(page))
  query.append('perPage', String(perPage))
  return get<{ success: boolean; data: { total: number; items: WebsiteArticle[] } }>(`/admin/website/news?${query.toString()}`)
}
export const getWebsiteArticle = (id: string) => get<{ success: boolean; data: WebsiteArticle }>(`/admin/website/news/${id}`)
export const createWebsiteArticle = (data: WebsiteArticle) => post<{ success: boolean; data: WebsiteArticle }>('/admin/website/news', data)
export const updateWebsiteArticle = (id: string, data: WebsiteArticle) => put<{ success: boolean; data: WebsiteArticle }>(`/admin/website/news/${id}`, data)
export const deleteWebsiteArticle = (id: string) => del<{ success: boolean }>(`/admin/website/news/${id}`)
export const publishWebsiteArticle = (id: string, status: 'Draft' | 'Published' | 'Archived') => put<{ success: boolean; data: WebsiteArticle }>(`/admin/website/news/${id}/publish?status=${status}`)

// Media Library
export const getWebsiteMedia = (search?: string, page = 1, perPage = 24) => {
  const query = new URLSearchParams()
  if (search) query.append('search', search)
  query.append('page', String(page))
  query.append('perPage', String(perPage))
  return get<{ success: boolean; data: { total: number; items: WebsiteMedia[] } }>(`/admin/website/media?${query.toString()}`)
}
export const deleteWebsiteMedia = (id: string) => del<{ success: boolean }>(`/admin/website/media/${id}`)
export const uploadWebsiteMedia = (formData: FormData) => post<{ success: boolean; data: WebsiteMedia }>('/admin/website/media/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
