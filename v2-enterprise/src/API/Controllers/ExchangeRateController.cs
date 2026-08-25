using System;
using System.Collections.Generic;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace CarShowroomManagementV2.API.Controllers
{
    [Authorize]
    [Route("api/exchange-rate")]
    public class ExchangeRateController : ApiControllerBase
    {
        private static readonly object _lock = new();

        private static decimal _currentRate = 1450.00m;
        private static string _source = "manual";
        private static DateTime _updatedAt = DateTime.UtcNow;
        private static string _updatedBy = "system";

        private static readonly List<ExchangeRateDto> _history = new()
        {
            new ExchangeRateDto { Id = 1, Rate = 1450.00m, Source = "manual", UpdatedAt = DateTime.UtcNow.AddDays(-2), UpdatedBy = "admin" },
            new ExchangeRateDto { Id = 2, Rate = 1460.00m, Source = "manual", UpdatedAt = DateTime.UtcNow.AddDays(-5), UpdatedBy = "admin" }
        };

        // 1. جلب سعر الصرف الحالي
        [HttpGet("current")]
        public IActionResult GetCurrentRate()
        {
            ExchangeRateDto rate;
            lock (_lock)
            {
                rate = new ExchangeRateDto
                {
                    Id = _history.Count + 1,
                    Rate = _currentRate,
                    Source = _source,
                    UpdatedAt = _updatedAt,
                    UpdatedBy = _updatedBy
                };
            }
            return Ok(rate);
        }

        // 2. جلب تاريخ تغيرات أسعار الصرف
        [HttpGet("history")]
        public IActionResult GetRateHistory()
        {
            List<ExchangeRateDto> list;
            lock (_lock)
            {
                list = new List<ExchangeRateDto>(_history);
                list.Insert(0, new ExchangeRateDto
                {
                    Id = _history.Count + 1,
                    Rate = _currentRate,
                    Source = _source,
                    UpdatedAt = _updatedAt,
                    UpdatedBy = _updatedBy
                });
            }
            return Ok(list);
        }

        // 3. تعديل سعر الصرف
        [HttpPost]
        public IActionResult SetRate([FromBody] SetRateRequest request)
        {
            var currentUser = User.FindFirst(ClaimTypes.Name)?.Value
                           ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? "system";

            ExchangeRateDto newRate;
            lock (_lock)
            {
                if (request.Action == "manual" && request.Rate > 0)
                {
                    _currentRate = request.Rate;
                    _source = "manual";
                    _updatedAt = DateTime.UtcNow;
                    _updatedBy = currentUser;
                }
                else if (request.Action == "online")
                {
                    _currentRate = 1450.00m;
                    _source = "online";
                    _updatedAt = DateTime.UtcNow;
                    _updatedBy = "system";
                }

                newRate = new ExchangeRateDto
                {
                    Id = _history.Count + 1,
                    Rate = _currentRate,
                    Source = _source,
                    UpdatedAt = _updatedAt,
                    UpdatedBy = _updatedBy
                };

                _history.Insert(0, newRate);
            }

            return Ok(newRate);
        }
    }

    public class ExchangeRateDto
    {
        public int Id { get; set; }
        public decimal Rate { get; set; }
        public string Source { get; set; } = "manual";
        public DateTime UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }
    }

    public class SetRateRequest
    {
        public string Action { get; set; } = "manual";
        public decimal Rate { get; set; }
    }
}
