using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using MediatR;
using FluentValidation;
using CarShowroomManagementV2.Application.Common.Behaviors;

namespace CarShowroomManagementV2.Application
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddApplicationServices(this IServiceCollection services)
        {
            var assembly = Assembly.GetExecutingAssembly();

            // تسجيل مكتبة MediatR لمعالجة الـ Commands والـ Queries
            services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(assembly));

            // تسجيل FluentValidation للتحقق التلقائي من صحة مدخلات الـ API والـ Commands
            services.AddValidatorsFromAssembly(assembly);

            // تفعيل تشغيل الـ validators داخل MediatR pipeline (كانت مسجّلة لكن لا تُنفَّذ)
            services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

            return services;
        }
    }
}
