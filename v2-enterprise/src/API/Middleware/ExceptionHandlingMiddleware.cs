using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace CarShowroomManagementV2.API.Middleware
{
    public class ExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionHandlingMiddleware> _logger;
        private readonly IHostEnvironment _env;

        public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger, IHostEnvironment env)
        {
            _next = next;
            _logger = logger;
            _env = env;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "خطأ غير متوقع في {Path}: {Message}", context.Request.Path, ex.Message);
                await HandleExceptionAsync(context, ex, _env.IsDevelopment());
            }
        }

        private static Task HandleExceptionAsync(HttpContext context, Exception exception, bool isDevelopment)
        {
            context.Response.ContentType = "application/json";

            var statusCode = HttpStatusCode.InternalServerError;
            var message = "حدث خطأ داخلي في النظام. يرجى مراجعة المسؤولين.";

            if (exception is FluentValidation.ValidationException validationEx)
            {
                statusCode = HttpStatusCode.BadRequest;
                var errors = validationEx.Errors.Select(e => e.ErrorMessage).ToList();
                var validationResponse = JsonSerializer.Serialize(new { success = false, message = "فشل التحقق من صحة البيانات المرسلة.", errors });
                context.Response.StatusCode = (int)statusCode;
                return context.Response.WriteAsync(validationResponse);
            }
            else if (exception is InvalidOperationException || exception.Message.Contains("قوانين الأمان المالي"))
            {
                statusCode = HttpStatusCode.Forbidden;
                message = exception.Message;
            }
            else if (exception.Message.Contains("غير موجود") || exception.Message.Contains("غير نشط"))
            {
                statusCode = HttpStatusCode.BadRequest;
                message = exception.Message;
            }

            // في الإنتاج: لا نكشف تفاصيل داخلية. في التطوير: نُظهرها للمطورين فقط.
            var response = isDevelopment
                ? JsonSerializer.Serialize(new
                {
                    success = false,
                    message,
                    detailed = exception.InnerException?.Message ?? exception.Message,
                    stackTrace = exception.StackTrace
                })
                : JsonSerializer.Serialize(new
                {
                    success = false,
                    message
                });

            context.Response.StatusCode = (int)statusCode;
            return context.Response.WriteAsync(response);
        }
    }
}
