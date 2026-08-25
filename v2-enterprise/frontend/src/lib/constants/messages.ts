/**
 * Arabic error and success messages for consistent UX
 */
export const ArabicMessages = {
  // Success Messages
  SUCCESS: {
    SAVED: 'تم الحفظ بنجاح ✓',
    CREATED: 'تم الإنشاء بنجاح ✓',
    UPDATED: 'تم التحديث بنجاح ✓',
    DELETED: 'تم الحذف بنجاح ✓',
    ADDED: 'تم الإضافة بنجاح ✓',
    PAID: 'تم تسجيل الدفعة بنجاح ✓',
    CANCELLED: 'تم الإلغاء بنجاح ✓',
    EXPORTED: 'تم التصدير بنجاح ✓',
    PRINTED: 'تم الطباعة بنجاح ✓',
    COPIED: 'تم النسخ إلى الحافظة ✓',
  },

  // Error Messages - Validation
  VALIDATION: {
    REQUIRED: 'هذا الحقل مطلوب',
    INVALID_EMAIL: 'البريد الإلكتروني غير صحيح',
    INVALID_PHONE: 'رقم الهاتف غير صحيح',
    INVALID_VIN: 'رقم الشاصي غير صحيح',
    INVALID_PLATE: 'رقم اللوحة غير صحيح',
    INVALID_ID: 'رقم الهوية غير صحيح',
    INVALID_DATE: 'التاريخ غير صحيح',
    INVALID_AMOUNT: 'المبلغ يجب أن يكون أكبر من صفر',
    MIN_LENGTH: (min: number) => `يجب أن يكون الحد الأدنى ${min} أحرف`,
    MAX_LENGTH: (max: number) => `يجب أن لا يتجاوز ${max} أحرف`,
    INVALID_RANGE: (min: number, max: number) => `يجب أن يكون بين ${min} و ${max}`,
    DUPLICATE: 'هذه القيمة موجودة بالفعل',
    MUST_BE_UNIQUE: 'يجب أن تكون قيمة فريدة',
  },

  // Error Messages - Form Operations
  FORM: {
    SUBMIT_ERROR: 'حدث خطأ أثناء الإرسال، يرجى المحاولة مرة أخرى',
    VALIDATION_ERROR: 'يوجد أخطاء في النموذج، يرجى التحقق',
    UNSAVED_CHANGES: 'لديك تغييرات غير محفوظة. هل تريد المغادرة؟',
    CONFIRM_DELETE: 'هل أنت متأكد من حذف هذا السجل؟ هذا الإجراء لا يمكن التراجع عنه',
  },

  // Error Messages - API/Network
  API: {
    NETWORK_ERROR: 'خطأ في الشبكة. يرجى التحقق من الاتصال',
    SERVER_ERROR: 'حدث خطأ في الخادم (500). يرجى المحاولة لاحقاً',
    NOT_FOUND: 'السجل غير موجود (404)',
    UNAUTHORIZED: 'غير مصرح. يرجى تسجيل الدخول',
    FORBIDDEN: 'ليس لديك صلاحية للوصول إلى هذا المورد',
    CONFLICT: 'تعارض في البيانات. قد تكون موجودة بالفعل',
    TIMEOUT: 'انتهت المهلة الزمنية. يرجى المحاولة مرة أخرى',
    GENERIC: 'حدث خطأ ما. يرجى المحاولة مرة أخرى',
  },

  // Error Messages - Business Logic
  BUSINESS: {
    NO_AVAILABLE_CARS: 'لا توجد سيارات متاحة للبيع',
    INSUFFICIENT_PAYMENT: 'المبلغ المدفوع أقل من المتطلب',
    INVALID_STATUS: 'حالة غير صحيحة للسيارة',
    CANNOT_MODIFY_CANCELLED: 'لا يمكن تعديل فاتورة ملغاة',
    CANNOT_DELETE_SOLD: 'لا يمكن حذف سيارة مباعة',
    INSTALLMENT_NOT_FOUND: 'خطة الأقساط غير موجودة',
    CUSTOMER_HAS_DEBT: 'العميل لديه ديون غير مسددة',
    DUPLICATE_PLATE: 'رقم اللوحة موجود بالفعل',
    DUPLICATE_VIN: 'رقم الشاصي موجود بالفعل',
  },

  // Error Messages - File Upload
  FILE: {
    INVALID_TYPE: 'نوع الملف غير مدعوم',
    FILE_TOO_LARGE: 'حجم الملف كبير جداً',
    UPLOAD_FAILED: 'فشل رفع الملف',
    REQUIRED: 'الملف مطلوب',
  },

  // Loading/Progress Messages
  LOADING: {
    SAVING: 'جاري الحفظ...',
    LOADING: 'جاري التحميل...',
    PROCESSING: 'جاري المعالجة...',
    GENERATING: 'جاري الإنشاء...',
    UPLOADING: 'جاري الرفع...',
    EXPORTING: 'جاري التصدير...',
  },

  // Empty States
  EMPTY: {
    NO_DATA: 'لا توجد بيانات',
    NO_RECORDS: 'لا توجد سجلات حتى الآن',
    NO_CARS: 'لا توجد سيارات بعد',
    NO_CUSTOMERS: 'لا توجد عملاء بعد',
    NO_SALES: 'لا توجد مبيعات بعد',
    NO_PURCHASES: 'لا توجد مشتريات بعد',
    NO_RESULTS: 'لم يتم العثور على نتائج',
    NO_NOTIFICATIONS: 'لا توجد إشعارات',
  },
}
