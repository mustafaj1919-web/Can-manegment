using System;
using System.Text;
using System.Threading.RateLimiting;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using CarShowroomManagementV2.Application;
using CarShowroomManagementV2.Infrastructure;
using CarShowroomManagementV2.Infrastructure.Persistence;
using CarShowroomManagementV2.API.Middleware;
using CarShowroomManagementV2.Domain.Entities;
using CarShowroomManagementV2.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using CarShowroomManagementV2.Infrastructure.Identity;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// 1. إعداد Serilog للسجلات المهيكلة
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/showroom-v2-log-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

// 2. تسجيل خدمات الطبقات المختلفة (Dependency Injection)
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// 3. إعداد CORS — يسمح فقط بالطلبات من Next.js frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? new[] { "http://localhost:3000", "http://localhost:3001" };
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// 4. Rate Limiting — حماية نقطة تسجيل الدخول من هجمات Brute Force
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("LoginPolicy", limiter =>
    {
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.PermitLimit = 10;
        limiter.QueueLimit = 0;
        limiter.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    });

    // حد عام للـ API: 300 طلب/دقيقة لكل IP
    options.AddFixedWindowLimiter("GlobalPolicy", limiter =>
    {
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.PermitLimit = 300;
        limiter.QueueLimit = 0;
        limiter.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    });

    options.RejectionStatusCode = 429;
});

// 5. إعداد المصادقة باستخدام JWT Bearer
var secretKey = builder.Configuration["JwtSettings:Secret"]
    ?? throw new InvalidOperationException("JwtSettings:Secret مطلوب — يرجى تعيينه في متغيرات البيئة.");
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["JwtSettings:Issuer"] ?? "CarShowroomEnterprise",
        ValidAudience = builder.Configuration["JwtSettings:Audience"] ?? "CarShowroomEnterpriseUsers",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
    };
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHealthChecks();

var app = builder.Build();

// 4. تهيئة قاعدة البيانات والبيانات الأولية (Database Seeding)
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var dbContext = services.GetRequiredService<ApplicationDbContext>();
        var identityService = services.GetRequiredService<IdentityService>();
        
        // استخدام InMemory أو التأكد من إتمام الترحيل في بيئات التطوير والإنتاج
        if (dbContext.Database.IsRelational())
        {
            bool tablesExist = false;
            try
            {
                // محاولة فحص وجود جدول الفروع بإجراء استعلام سريع
                _ = await dbContext.Branches.IgnoreQueryFilters().AnyAsync();
                tablesExist = true;
            }
            catch (Exception)
            {
                tablesExist = false;
            }

            if (!tablesExist)
            {
                Log.Information("جداول قاعدة البيانات غير موجودة. يتم الآن إنشاء الجداول تلقائياً...");
                var databaseCreator = dbContext.Database.GetService<Microsoft.EntityFrameworkCore.Storage.IDatabaseCreator>() 
                    as Microsoft.EntityFrameworkCore.Storage.IRelationalDatabaseCreator;
                
                if (databaseCreator != null)
                {
                    await databaseCreator.CreateTablesAsync();
                    Log.Information("تم إنشاء الجداول بنجاح.");
                }
            }
            else
            {
                Log.Information("قاعدة البيانات مهيأة والجداول موجودة. يتم تشغيل الترحيل القياسي...");
                await dbContext.Database.MigrateAsync();
            }
        }
        else
        {
            await dbContext.Database.EnsureCreatedAsync();
        }

        var configuration = services.GetRequiredService<IConfiguration>();
        await SeedDefaultDataAsync(dbContext, identityService, configuration);

        // Demo data: only in Development or when DEMO_SEED=true — never in Production
        if (DemoDataSeeder.ShouldSeed(configuration))
        {
            await DemoDataSeeder.SeedAsync(dbContext);
        }
    }
    catch (Exception ex)
    {
        Log.Error(ex, "حدث خطأ أثناء تهيئة قاعدة البيانات.");
    }
}

// 6. ضبط خط أنابيب معالجة طلبات الـ HTTP (Middleware Pipeline)
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("FrontendPolicy");
app.UseRateLimiter();
app.UseRouting();

var vehicleImagesPath = Path.Combine(Directory.GetCurrentDirectory(), "storage", "vehicles");
Directory.CreateDirectory(vehicleImagesPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(vehicleImagesPath),
    RequestPath = "/static/uploads/vehicles"
});

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/healthz");

app.Run();

// دالة تهيئة البيانات الأولية والمحاسبية للنظام
async Task SeedDefaultDataAsync(ApplicationDbContext context, IdentityService identityService, IConfiguration configuration)
{
    // أ. إنشاء الفرع الرئيسي الافتراضي
    var defaultBranchId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    var defaultBranch = await context.Branches.IgnoreQueryFilters()
        .FirstOrDefaultAsync(b => b.Id == defaultBranchId);

    if (defaultBranch == null)
    {
        defaultBranch = new Branch
        {
            Id = defaultBranchId,
            Name = "الفرع الرئيسي - بغداد",
            Code = "HQ-01",
            Address = "بغداد، الكرادة",
            IsActive = true
        };
        context.Branches.Add(defaultBranch);
        await context.SaveChangesAsync();
    }

    // ب. إنشاء شجرة الحسابات الأولية (Chart of Accounts)
    if (!await context.Accounts.IgnoreQueryFilters().AnyAsync())
    {
        var accountsList = new List<Account>
        {
            // 1. الأصول
            new Account { Id = Guid.NewGuid(), AccountCode = "1000", Name = "الأصول المتداولة", Type = AccountType.Asset, BranchId = defaultBranchId },
            new Account { Id = Guid.Parse("22222222-2222-2222-2222-222222222222"), AccountCode = "111001", Name = "صندوق النقدية الرئيسي", Type = AccountType.Asset, BranchId = defaultBranchId },
            new Account { Id = Guid.NewGuid(), AccountCode = "111002", Name = "صندوق فرع الأصدقاء", Type = AccountType.Asset, BranchId = defaultBranchId },
            new Account { Id = Guid.NewGuid(), AccountCode = "112001", Name = "حساب البنك المركزي", Type = AccountType.Asset, BranchId = defaultBranchId },
            new Account { Id = Guid.Parse("33333333-3333-3333-3333-333333333333"), AccountCode = "1201", Name = "مخزون السيارات للمعرض", Type = AccountType.Asset, BranchId = defaultBranchId },
            new Account { Id = Guid.Parse("44444444-4444-4444-4444-444444444444"), AccountCode = "1301", Name = "ذمم المدينين (العملاء)", Type = AccountType.Asset, BranchId = defaultBranchId },

            // 2. الالتزامات
            new Account { Id = Guid.NewGuid(), AccountCode = "2000", Name = "الالتزامات المتداولة", Type = AccountType.Liability, BranchId = defaultBranchId },
            new Account { Id = Guid.Parse("55555555-5555-5555-5555-555555555555"), AccountCode = "2101", Name = "ذمم الدائنين (الموردين)", Type = AccountType.Liability, BranchId = defaultBranchId },
            new Account { Id = Guid.NewGuid(), AccountCode = "2202", Name = "ضريبة المبيعات المستحقة", Type = AccountType.Liability, BranchId = defaultBranchId },
            new Account { Id = Guid.NewGuid(), AccountCode = "2203", Name = "أمانات رسوم التسجيل", Type = AccountType.Liability, BranchId = defaultBranchId },
            new Account { Id = Guid.NewGuid(), AccountCode = "2301", Name = "إيرادات أقساط مؤجلة", Type = AccountType.Liability, BranchId = defaultBranchId },

            // 3. حقوق الملكية
            new Account { Id = Guid.Parse("66666666-6666-6666-6666-666666666666"), AccountCode = "3101", Name = "رأس المال المدفوع", Type = AccountType.Equity, BranchId = defaultBranchId },

            // 4. الإيرادات
            new Account { Id = Guid.Parse("77777777-7777-7777-7777-777777777777"), AccountCode = "4101", Name = "مبيعات السيارات", Type = AccountType.Revenue, BranchId = defaultBranchId },
            new Account { Id = Guid.NewGuid(), AccountCode = "4102", Name = "إيرادات أقساط محققة", Type = AccountType.Revenue, BranchId = defaultBranchId },

            // 5. المصروفات
            new Account { Id = Guid.Parse("88888888-8888-8888-8888-888888888888"), AccountCode = "5101", Name = "تكلفة السيارات المباعة", Type = AccountType.Expense, BranchId = defaultBranchId },
            new Account { Id = Guid.NewGuid(), AccountCode = "5102", Name = "مصاريف صيانة وتشغيل المعرض", Type = AccountType.Expense, BranchId = defaultBranchId }
        };

        context.Accounts.AddRange(accountsList);
        await context.SaveChangesAsync();
    }

    // ج. إنشاء المستخدم المدير الافتراضي — يُنشأ مرة واحدة فقط، لا تُعاد الكتابة على كلمة المرور
    var adminUser = await context.Users.IgnoreQueryFilters()
        .FirstOrDefaultAsync(u => u.Username == "admin");

    if (adminUser == null)
    {
        // كلمة المرور الأولية — يجب تغييرها فور تسجيل الدخول الأول
        var initialPassword = configuration["AdminSettings:InitialPassword"] ?? "Admin@Showroom2024!";
        adminUser = new User
        {
            Username = "admin",
            FullName = "المدير العام للمؤسسة",
            Email = "admin@showroom.local",
            DefaultBranchId = defaultBranchId,
            IsActive = true,
            PasswordHash = identityService.HashPassword(initialPassword)
        };

        context.Users.Add(adminUser);
        await context.SaveChangesAsync();
        Log.Information("تم إنشاء المستخدم admin للمرة الأولى. يرجى تغيير كلمة المرور فوراً.");
    }
    else
    {
        // إذا كان الهاش قديماً (SHA-256، لا يبدأ بـ $2) نُعيد تشفيره بـ BCrypt
        if (!adminUser.PasswordHash.StartsWith("$2"))
        {
            var migratedPassword = configuration["AdminSettings:InitialPassword"] ?? "Admin@Showroom2024!";
            adminUser.PasswordHash = identityService.HashPassword(migratedPassword);
            context.Users.Update(adminUser);
            await context.SaveChangesAsync();
            Log.Warning("تم ترحيل كلمة مرور admin من SHA-256 إلى BCrypt. يرجى تغيير كلمة المرور فوراً.");
        }
    }

    // د. تصحيح رموز حسابات الصندوق القديمة (1101→111001، 1102→112001) في قواعد البيانات الموجودة
    try
    {
        await context.Database.ExecuteSqlRawAsync(@"
            UPDATE ""Accounts"" SET ""AccountCode"" = '111001' WHERE ""AccountCode"" = '1101';
            UPDATE ""Accounts"" SET ""AccountCode"" = '112001' WHERE ""AccountCode"" = '1102';
        ");
    }
    catch { /* ignore if already updated */ }

    // ه. إنشاء جدول إغلاق الصندوق إذا لم يكن موجوداً (يعالج قواعد البيانات القديمة)
    try
    {
        await context.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""CashboxCloses"" (
                ""Id"" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                ""CloseDate"" date NOT NULL,
                ""BranchId"" uuid,
                ""AccountCode"" varchar(50) NOT NULL DEFAULT '',
                ""AccountName"" varchar(255) NOT NULL DEFAULT '',
                ""SystemBalance"" numeric(15,4) NOT NULL DEFAULT 0,
                ""ActualBalance"" numeric(15,4) NOT NULL DEFAULT 0,
                ""Difference"" numeric(15,4) NOT NULL DEFAULT 0,
                ""Note"" varchar(512),
                ""ClosedBy"" varchar(255),
                ""CreatedAt"" timestamp NOT NULL DEFAULT NOW()
            )
        ");
        Log.Information("تم التحقق من جدول CashboxCloses أو إنشاؤه.");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "تعذر إنشاء جدول CashboxCloses.");
    }
}
