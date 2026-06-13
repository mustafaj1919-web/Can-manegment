using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using CarShowroomManagementV2.Application.Payments.Commands;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize]
    public class PaymentsController : ApiControllerBase
    {
        // 1. إنشاء سند قبض أو صرف مالي
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreatePaymentCommand command)
        {
            var paymentId = await Mediator.Send(command);
            return Ok(new { success = true, paymentId = paymentId, message = "تم تسجيل وترحيل السند المالي وتوليد قيد اليومية بنجاح." });
        }
    }
}
