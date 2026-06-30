using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Http;
using CarShowroomManagementV2.Application.Common.Interfaces;
using CarShowroomManagementV2.Infrastructure.Persistence;
using CarShowroomManagementV2.Infrastructure.Persistence.Interceptors;
using CarShowroomManagementV2.Infrastructure.Identity;
using CarShowroomManagementV2.Infrastructure.Services;

namespace CarShowroomManagementV2.Infrastructure
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
        {
            // تسجيل IHttpContextAccessor للوصول للـ HttpContext الحالي
            services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();

            // تسجيل معترض الحفظ للتدقيق والقيود المحاسبية
            services.AddScoped<AuditableEntitySaveChangesInterceptor>();

            // تسجيل سياق قاعدة البيانات باستخدام PostgreSQL
            services.AddDbContext<ApplicationDbContext>((sp, options) =>
            {
                options.UseNpgsql(
                    configuration.GetConnectionString("DefaultConnection"),
                    builder => builder.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName));
            });

            // ربط سياق قاعدة البيانات بالواجهة المجردة لطبقة الـ Application
            services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());

            // تسجيل خدمة المستخدم الحالي والهوية والمصادقة
            services.AddScoped<ICurrentUserService, CurrentUserService>();
            services.AddScoped<IdentityService>();

            // تسجيل خدمة البريد الإلكتروني
            services.AddScoped<IEmailService, SmtpEmailService>();

            // تسجيل خدمة الفاتورة الإلكترونية
            services.AddScoped<IEInvoiceService, EInvoiceService>();

            // تسجيل خدمة الإشعارات التلقائية والرسائل
            services.AddScoped<IMessageNotificationService, MessageNotificationService>();

            // تسجيل عامل معالجة أرباح التقسيط المجدول في الخلفية
            services.AddHostedService<InstallmentProfitBackgroundWorker>();

            return services;
        }
    }
}
