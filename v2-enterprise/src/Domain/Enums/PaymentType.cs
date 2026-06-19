namespace CarShowroomManagementV2.Domain.Enums
{
    public enum PaymentType
    {
        Receipt = 1, // مقبوضات (سند قبض)
        Payment = 2  // مدفوعات (سند صرف)
    }

    public enum PaymentMethod
    {
        Cash = 1,        // نقدي
        Bank = 2,        // تحويل بنكي
        Cheque = 3,      // شيك
        Installment = 4  // تقسيط (بيع آجل بخطة أقساط)
    }
}
