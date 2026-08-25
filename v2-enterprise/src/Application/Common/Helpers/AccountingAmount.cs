using System;

namespace CarShowroomManagementV2.Application.Common.Helpers
{
    public static class AccountingAmount
    {
        // تقريب المبالغ المالية إلى منزلتين عشريتين (مثل الصندوق، البنك، الذمم، الضرائب، الأرباح المحققة)
        public static decimal RoundMoney(decimal amount)
        {
            return Math.Round(amount, 2, MidpointRounding.AwayFromZero);
        }

        // تقريب القيود الداخلية والمعدلات المرجحة إلى 4 منازل عشرية
        public static decimal RoundLedger(decimal amount)
        {
            return Math.Round(amount, 4, MidpointRounding.AwayFromZero);
        }
    }
}
