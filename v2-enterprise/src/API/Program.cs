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
using Microsoft.AspNetCore.HttpOverrides;

// السماح لـ Npgsql بكتابة قيم DateTime (Kind=Unspecified القادمة من تواريخ الواجهة)
// إلى أعمدة timestamptz دون رفضها. يجب ضبطه قبل أول استخدام لـ Npgsql.
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

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
    options.AddPolicy("LoginPolicy", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                Window = TimeSpan.FromMinutes(1),
                PermitLimit = 10,
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            }));

    // حد عام للـ API: 300 طلب/دقيقة لكل IP
    options.AddPolicy("GlobalPolicy", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                Window = TimeSpan.FromMinutes(1),
                PermitLimit = 300,
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            }));

    options.AddPolicy("LeadPolicy", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                Window = TimeSpan.FromMinutes(1),
                PermitLimit = 5,
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            }));

    options.RejectionStatusCode = 429;
});

// Production traffic reaches the API only through the local Docker proxies.
// Honor their X-Forwarded-* headers so rate limits are partitioned by visitor IP.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
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
app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("FrontendPolicy");

// Static files must run before routing so they are never subject to auth or rate-limiting
var vehicleImagesPath = Path.Combine(Directory.GetCurrentDirectory(), "storage", "vehicles");
Directory.CreateDirectory(vehicleImagesPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(vehicleImagesPath),
    RequestPath = "/static/uploads/vehicles",
    ServeUnknownFileTypes = false,
});
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(vehicleImagesPath),
    RequestPath = "/static/uploads",
    ServeUnknownFileTypes = false,
});

var websiteMediaPath = Path.Combine(Directory.GetCurrentDirectory(), "storage", "website");
Directory.CreateDirectory(websiteMediaPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(websiteMediaPath),
    RequestPath = "/static/uploads/website",
    ServeUnknownFileTypes = false,
});

app.UseRouting();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers().RequireRateLimiting("GlobalPolicy");
app.MapHealthChecks("/healthz");

app.Run();

// دالة تهيئة البيانات الأولية والمحاسبية للنظام
async Task SeedDefaultDataAsync(ApplicationDbContext context, IdentityService identityService, IConfiguration configuration)
{
    // تشغيل ALTER TABLE migrations أولاً قبل أي query على الجداول
    try
    {
        await context.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE ""Branches"" ADD COLUMN IF NOT EXISTS ""VatNumber"" text;
            ALTER TABLE ""Branches"" ADD COLUMN IF NOT EXISTS ""TaxName"" text;
            ALTER TABLE ""Customers"" ADD COLUMN IF NOT EXISTS ""VatNumber"" text;
            ALTER TABLE ""Customers"" ADD COLUMN IF NOT EXISTS ""Email"" text;
            ALTER TABLE ""SalesContracts"" ADD COLUMN IF NOT EXISTS ""EInvoiceStatus"" text DEFAULT 'Draft';
            ALTER TABLE ""SalesContracts"" ADD COLUMN IF NOT EXISTS ""EInvoiceXmlHash"" text;
            ALTER TABLE ""SalesContracts"" ADD COLUMN IF NOT EXISTS ""EInvoiceQrCode"" text;
            ALTER TABLE ""SalesContracts"" ADD COLUMN IF NOT EXISTS ""EInvoiceUuid"" text;
            ALTER TABLE ""SalesContracts"" ADD COLUMN IF NOT EXISTS ""EInvoiceError"" text;
            ALTER TABLE ""InstallmentPlans"" ALTER COLUMN ""SalesContractId"" DROP NOT NULL;
            ALTER TABLE ""InstallmentPlans"" ADD COLUMN IF NOT EXISTS ""PurchaseId"" uuid;
            ALTER TABLE ""Customers"" ADD COLUMN IF NOT EXISTS ""PhotoUrl"" text;
        ");
        Log.Information("Schema migrations applied successfully.");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "Schema migration warning (non-fatal).");
    }

    // أ. إنشاء الفروع
    var defaultBranchId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    var branchSeeds = new[]
    {
        new Branch { Id = defaultBranchId,                                    Name = "الأصدقاء",  Code = "BR-01", Address = "بغداد", IsActive = true },
        new Branch { Id = Guid.Parse("33333333-3333-3333-3333-333333333333"), Name = "الأصدقاء ٢", Code = "BR-02", Address = "بغداد", IsActive = true },
    };

    foreach (var br in branchSeeds)
    {
        if (!await context.Branches.IgnoreQueryFilters().AnyAsync(b => b.Id == br.Id))
        {
            context.Branches.Add(br);
        }
    }
    await context.SaveChangesAsync();

    var defaultBranch = await context.Branches.IgnoreQueryFilters()
        .FirstOrDefaultAsync(b => b.Id == defaultBranchId);

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

    // ب.2. إنشاء الأدوار الافتراضية إذا لم تكن موجودة
    var defaultRoles = new[]
    {
        new Role { Name = "Owner", Description = "مالك المعرض" },
        new Role { Name = "Admin", Description = "مدير النظام" },
        new Role { Name = "Accountant", Description = "محاسب" },
        new Role { Name = "Sales", Description = "موظف مبيعات" },
        new Role { Name = "Viewer", Description = "مشاهد" }
    };

    foreach (var r in defaultRoles)
    {
        var existingRole = await context.Roles.FirstOrDefaultAsync(dbRole => dbRole.Name == r.Name);
        if (existingRole == null)
        {
            context.Roles.Add(r);
        }
    }
    await context.SaveChangesAsync();

    // ج.1. إنشاء الصلاحيات الافتراضية إذا لم تكن موجودة
    var defaultPermissions = new[]
    {
        new Permission { Name = "view_dashboard", Description = "عرض لوحة التحكم" },
        new Permission { Name = "manage_users", Description = "إدارة المستخدمين" },
        new Permission { Name = "manage_roles", Description = "إدارة الأدوار والصلاحيات" },
        new Permission { Name = "view_inventory", Description = "عرض مخزون السيارات" },
        new Permission { Name = "manage_inventory", Description = "إدارة مخزون السيارات" },
        new Permission { Name = "view_sales", Description = "عرض عقود المبيعات" },
        new Permission { Name = "manage_sales", Description = "إدارة عقود المبيعات" },
        new Permission { Name = "view_purchases", Description = "عرض فواتير المشتريات" },
        new Permission { Name = "manage_purchases", Description = "إدارة المشتريات" },
        new Permission { Name = "view_installments", Description = "عرض الأقساط" },
        new Permission { Name = "manage_installments", Description = "إدارة وتحصيل الأقساط" },
        new Permission { Name = "view_accounting", Description = "عرض الحسابات والقيود اليومية" },
        new Permission { Name = "manage_accounting", Description = "إدارة الحسابات، القيود وإغلاق الصندوق" },
        new Permission { Name = "view_reports", Description = "عرض التقارير المالية والإدارية" },
        new Permission { Name = "manage_settings", Description = "إدارة إعدادات النظام والنسخ الاحتياطي" },
        
        // CMS Permissions
        new Permission { Name = "view_website_content", Description = "عرض محتوى الموقع" },
        new Permission { Name = "manage_website_content", Description = "إدارة محتوى صفحات الموقع" },
        new Permission { Name = "manage_website_news", Description = "إدارة أخبار ومدونات الموقع" },
        new Permission { Name = "manage_website_media", Description = "إدارة مكتبة الوسائط للموقع" },
        new Permission { Name = "publish_website_content", Description = "نشر أو أرشفة محتوى الموقع" },
        new Permission { Name = "manage_website_settings", Description = "إدارة إعدادات وبيانات الموقع" }
    };

    foreach (var p in defaultPermissions)
    {
        var existingPerm = await context.Permissions.FirstOrDefaultAsync(dbP => dbP.Name == p.Name);
        if (existingPerm == null)
        {
            context.Permissions.Add(p);
        }
    }
    await context.SaveChangesAsync();

    // ج.2. ربط الصلاحيات بالأدوار الافتراضية إذا لم تكن مرتبطة
    var dbPermissions = await context.Permissions.ToListAsync();
    var dbRoles = await context.Roles.ToListAsync();

    foreach (var role in dbRoles)
    {
        var allowedPermNames = new List<string> { "view_dashboard" };

        if (role.Name == "Owner" || role.Name == "Admin")
        {
            allowedPermNames = dbPermissions.Select(p => p.Name).ToList();
        }
        else if (role.Name == "Accountant")
        {
            allowedPermNames.AddRange(new[] {
                "view_inventory", "view_sales", "manage_sales",
                "view_purchases", "manage_purchases", "view_installments", "manage_installments",
                "view_accounting", "manage_accounting", "view_reports"
            });
        }
        else if (role.Name == "Sales")
        {
            allowedPermNames.AddRange(new[] {
                "view_inventory", "view_sales", "manage_sales",
                "view_installments", "manage_installments", "view_reports"
            });
        }
        else if (role.Name == "Viewer")
        {
            allowedPermNames.AddRange(new[] {
                "view_inventory", "view_sales", "view_purchases",
                "view_installments", "view_accounting", "view_reports"
            });
        }

        var currentRolePerms = await context.RolePermissions
            .Where(rp => rp.RoleId == role.Id && rp.Permission != null)
            .Select(rp => rp.Permission!.Name)
            .ToListAsync();

        foreach (var permName in allowedPermNames)
        {
            if (!currentRolePerms.Contains(permName))
            {
                var targetPerm = dbPermissions.FirstOrDefault(p => p.Name == permName);
                if (targetPerm != null)
                {
                    context.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = targetPerm.Id });
                }
            }
        }
    }
    await context.SaveChangesAsync();


    // ج. إنشاء المستخدم المدير الافتراضي أو تحديثه
    var adminUser = await context.Users.IgnoreQueryFilters()
        .FirstOrDefaultAsync(u => u.Username == "admin");

    var ownerRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "Owner");
    // كلمة المرور الأولية تُقرأ من البيئة (AdminSettings:InitialPassword) وتُستخدم مرة واحدة فقط
    // عند أول إنشاء للمستخدم admin. لا يُعاد ضبطها لمستخدم موجود.
    var adminPassword = configuration["AdminSettings:InitialPassword"];
    if (string.IsNullOrWhiteSpace(adminPassword))
        adminPassword = "ChangeMe@Showroom2024!";

    if (adminUser == null)
    {
        adminUser = new User
        {
            Username = "admin",
            FullName = "المدير العام للمؤسسة",
            Email = "admin@showroom.local",
            DefaultBranchId = defaultBranchId,
            IsActive = true,
            PasswordHash = identityService.HashPassword(adminPassword)
        };

        context.Users.Add(adminUser);
        await context.SaveChangesAsync();

        if (ownerRole != null)
        {
            context.UserRoles.Add(new UserRole { UserId = adminUser.Id, RoleId = ownerRole.Id });
            await context.SaveChangesAsync();
        }
        Log.Information("تم إنشاء المستخدم admin بنجاح.");
    }
    else
    {
        // نضمن ربط دور المالك (Owner) للمستخدم admin
        if (ownerRole != null)
        {
            var hasRole = await context.UserRoles.AnyAsync(ur => ur.UserId == adminUser.Id && ur.RoleId == ownerRole.Id);
            if (!hasRole)
            {
                context.UserRoles.Add(new UserRole { UserId = adminUser.Id, RoleId = ownerRole.Id });
                await context.SaveChangesAsync();
            }
        }

        // دعم إعادة ضبط كلمة المرور عبر متغير البيئة AdminSettings:ForceResetPassword=true
        var forceReset = configuration["AdminSettings:ForceResetPassword"];
        if (!string.IsNullOrWhiteSpace(forceReset) && forceReset.Equals("true", StringComparison.OrdinalIgnoreCase))
        {
            adminUser.PasswordHash = identityService.HashPassword(adminPassword);
            await context.SaveChangesAsync();
            Log.Information("تم إعادة تعيين كلمة مرور admin بناءً على AdminSettings:ForceResetPassword=true.");
        }
        else
        {
            Log.Information("تم تأكيد دور المالك للمستخدم admin (دون تغيير كلمة المرور).");
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

    // و. إنشاء جدول المصروفات إذا لم يكن موجوداً (المشروع يعتمد EnsureCreated بلا هجرات)
    try
    {
        await context.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""Expenses"" (
                ""Id"" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                ""Title"" text NOT NULL DEFAULT '',
                ""Amount"" numeric(18,2) NOT NULL DEFAULT 0,
                ""Currency"" text NOT NULL DEFAULT 'IQD',
                ""Category"" text,
                ""Notes"" text,
                ""ExpenseDate"" timestamp with time zone NOT NULL DEFAULT NOW(),
                ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT NOW(),
                ""CreatedBy"" text,
                ""LastModifiedAt"" timestamp with time zone,
                ""LastModifiedBy"" text,
                ""BranchId"" uuid NOT NULL
            )
        ");
        Log.Information("تم التحقق من جدول Expenses أو إنشاؤه.");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "تعذر إنشاء جدول Expenses.");
    }

    // ز. إضافة أعمدة حالة/عكس السندات لجدول المدفوعات (لدعم إلغاء السندات)
    try
    {
        await context.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE ""Payments"" ADD COLUMN IF NOT EXISTS ""Status"" text NOT NULL DEFAULT 'posted';
            ALTER TABLE ""Payments"" ADD COLUMN IF NOT EXISTS ""ReversalOfId"" uuid;
        ");
        Log.Information("تم التحقق من أعمدة Status/ReversalOfId في جدول Payments.");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "تعذر تعديل جدول Payments.");
    }

    // ط. إضافة أعمدة المواصفات التقنية لجدول Vehicles (العلامة التجارية، الفئة، الحالة، الوقود...)
    try
    {
        await context.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE ""Vehicles"" ADD COLUMN IF NOT EXISTS ""Brand"" text;
            ALTER TABLE ""Vehicles"" ADD COLUMN IF NOT EXISTS ""Trim"" text;
            ALTER TABLE ""Vehicles"" ADD COLUMN IF NOT EXISTS ""Condition"" text;
            ALTER TABLE ""Vehicles"" ADD COLUMN IF NOT EXISTS ""PlateNumber"" text;
            ALTER TABLE ""Vehicles"" ADD COLUMN IF NOT EXISTS ""PlateStatus"" text;
            ALTER TABLE ""Vehicles"" ADD COLUMN IF NOT EXISTS ""Mileage"" integer;
            ALTER TABLE ""Vehicles"" ADD COLUMN IF NOT EXISTS ""EngineSize"" text;
            ALTER TABLE ""Vehicles"" ADD COLUMN IF NOT EXISTS ""Cylinders"" integer;
            ALTER TABLE ""Vehicles"" ADD COLUMN IF NOT EXISTS ""Transmission"" text;
            ALTER TABLE ""Vehicles"" ADD COLUMN IF NOT EXISTS ""FuelType"" text;
            ALTER TABLE ""Vehicles"" ADD COLUMN IF NOT EXISTS ""ImportCountry"" text;
            ALTER TABLE ""Vehicles"" ADD COLUMN IF NOT EXISTS ""SeatCount"" integer;
            ALTER TABLE ""Vehicles"" ADD COLUMN IF NOT EXISTS ""SeatMaterial"" text;
            ALTER TABLE ""Vehicles"" ADD COLUMN IF NOT EXISTS ""Currency"" text NOT NULL DEFAULT 'IQD';
            ALTER TABLE ""Vehicles"" ADD COLUMN IF NOT EXISTS ""Notes"" text;
        ");
        Log.Information("تم التحقق من أعمدة المواصفات التقنية في جدول Vehicles.");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "تعذر تعديل جدول Vehicles بإضافة أعمدة المواصفات.");
    }

    // ح. إنشاء جدول الموظفين + عمود مندوب المبيعات في عقود البيع
    try
    {
        await context.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""Employees"" (
                ""Id"" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                ""FullName"" text NOT NULL DEFAULT '',
                ""Phone"" text NOT NULL DEFAULT '',
                ""IdNumber"" text,
                ""Address"" text,
                ""Title"" text,
                ""IsActive"" boolean NOT NULL DEFAULT true,
                ""SignatureFilename"" text,
                ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT NOW(),
                ""CreatedBy"" text,
                ""LastModifiedAt"" timestamp with time zone,
                ""LastModifiedBy"" text,
                ""BranchId"" uuid NOT NULL
            );
            ALTER TABLE ""SalesContracts"" ADD COLUMN IF NOT EXISTS ""SalesRepId"" uuid;
        ");
        Log.Information("تم التحقق من جدول Employees وعمود SalesRepId.");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "تعذر إنشاء جدول Employees.");
    }

    // ي. إضافة عمود AmountPaid لجدول Purchases لدعم الدفع بالأقساط
    try
    {
        await context.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE ""Purchases"" ADD COLUMN IF NOT EXISTS ""AmountPaid"" numeric(18,4) NOT NULL DEFAULT 0;
            UPDATE ""Purchases"" SET ""AmountPaid"" = ""PurchaseCost"" WHERE ""AmountPaid"" = 0;
        ");
        Log.Information("تم التحقق من عمود AmountPaid في جدول Purchases.");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "تعذر تعديل جدول Purchases بإضافة عمود AmountPaid.");
    }

    // ط. جداول موديول CRM (تفاعلات، صفقات، عمولات، أهداف)
    try
    {
        await context.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""CrmInteractions"" (
                ""Id"" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                ""CustomerId"" uuid NOT NULL,
                ""EmployeeId"" uuid,
                ""InteractionType"" text NOT NULL DEFAULT 'call',
                ""Notes"" text,
                ""Outcome"" text,
                ""FollowUpDate"" timestamp with time zone,
                ""InteractionDate"" timestamp with time zone NOT NULL DEFAULT NOW(),
                ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT NOW(),
                ""CreatedBy"" text, ""LastModifiedAt"" timestamp with time zone, ""LastModifiedBy"" text,
                ""BranchId"" uuid NOT NULL
            );
            CREATE TABLE IF NOT EXISTS ""Deals"" (
                ""Id"" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                ""CustomerId"" uuid NOT NULL,
                ""VehicleId"" uuid,
                ""AssignedToId"" uuid,
                ""SaleId"" uuid,
                ""Stage"" text NOT NULL DEFAULT 'lead',
                ""ExpectedPrice"" numeric(18,2),
                ""Currency"" text NOT NULL DEFAULT 'IQD',
                ""Notes"" text,
                ""LostReason"" text,
                ""StageChangedAt"" timestamp with time zone NOT NULL DEFAULT NOW(),
                ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT NOW(),
                ""CreatedBy"" text, ""LastModifiedAt"" timestamp with time zone, ""LastModifiedBy"" text,
                ""BranchId"" uuid NOT NULL
            );
            CREATE TABLE IF NOT EXISTS ""EmployeeCommissions"" (
                ""Id"" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                ""EmployeeId"" uuid NOT NULL,
                ""SaleId"" uuid,
                ""Amount"" numeric(18,2) NOT NULL DEFAULT 0,
                ""Currency"" text NOT NULL DEFAULT 'IQD',
                ""IsPaid"" boolean NOT NULL DEFAULT false,
                ""Description"" text,
                ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT NOW(),
                ""CreatedBy"" text, ""LastModifiedAt"" timestamp with time zone, ""LastModifiedBy"" text,
                ""BranchId"" uuid NOT NULL
            );
            CREATE TABLE IF NOT EXISTS ""EmployeeTargets"" (
                ""Id"" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                ""EmployeeId"" uuid NOT NULL,
                ""Period"" text NOT NULL DEFAULT '',
                ""TargetSalesCount"" integer NOT NULL DEFAULT 0,
                ""TargetRevenue"" numeric(18,2) NOT NULL DEFAULT 0,
                ""TargetProfit"" numeric(18,2) NOT NULL DEFAULT 0,
                ""Currency"" text NOT NULL DEFAULT 'IQD',
                ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT NOW(),
                ""CreatedBy"" text, ""LastModifiedAt"" timestamp with time zone, ""LastModifiedBy"" text,
                ""BranchId"" uuid NOT NULL
            );
        ");
        Log.Information("تم التحقق من جداول CRM.");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "تعذر إنشاء جداول CRM.");
    }

    // Phase 2: السنة المالية والقيود الدورية
    try
    {
        await context.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""FiscalYears"" (
                ""Id"" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                ""Year"" integer NOT NULL,
                ""StartDate"" timestamp with time zone NOT NULL,
                ""EndDate"" timestamp with time zone NOT NULL,
                ""Status"" text NOT NULL DEFAULT 'Open',
                ""ClosingJournalEntryId"" uuid,
                ""Notes"" text,
                ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT NOW(),
                ""CreatedBy"" text,
                ""LastModifiedAt"" timestamp with time zone,
                ""LastModifiedBy"" text,
                ""BranchId"" uuid NOT NULL
            );
            CREATE TABLE IF NOT EXISTS ""RecurringJournalTemplates"" (
                ""Id"" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                ""Name"" text NOT NULL DEFAULT '',
                ""Description"" text NOT NULL DEFAULT '',
                ""Frequency"" text NOT NULL DEFAULT 'Monthly',
                ""DayOfMonth"" integer NOT NULL DEFAULT 1,
                ""IsActive"" boolean NOT NULL DEFAULT true,
                ""LastRunAt"" timestamp with time zone,
                ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT NOW(),
                ""CreatedBy"" text,
                ""LastModifiedAt"" timestamp with time zone,
                ""LastModifiedBy"" text,
                ""BranchId"" uuid NOT NULL
            );
            CREATE TABLE IF NOT EXISTS ""RecurringTemplateLines"" (
                ""Id"" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                ""TemplateId"" uuid NOT NULL REFERENCES ""RecurringJournalTemplates""(""Id"") ON DELETE CASCADE,
                ""AccountCode"" text NOT NULL DEFAULT '',
                ""AccountName"" text NOT NULL DEFAULT '',
                ""IsDebit"" boolean NOT NULL DEFAULT true,
                ""Amount"" numeric(18,4) NOT NULL DEFAULT 0,
                ""Description"" text,
                ""SortOrder"" integer NOT NULL DEFAULT 0
            );
        ");
        Log.Information("تم التحقق من جداول السنة المالية والقيود الدورية.");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "تعذر إنشاء جداول السنة المالية.");
    }


    // دعم التقسيط للمشتريات — جعل SalesContractId اختياري وإضافة PurchaseId
    try
    {
        await context.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE ""InstallmentPlans"" ALTER COLUMN ""SalesContractId"" DROP NOT NULL;
            ALTER TABLE ""InstallmentPlans"" ADD COLUMN IF NOT EXISTS ""PurchaseId"" uuid;
            ALTER TABLE ""Customers"" ADD COLUMN IF NOT EXISTS ""PhotoUrl"" text;
        ");
        Log.Information("تم تحديث جدول InstallmentPlans لدعم التقسيط على المشتريات.");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "تعذر تحديث جدول InstallmentPlans.");
    }

    // إضافة عمود Email لجدول العملاء
    try
    {
        await context.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE ""Customers"" ADD COLUMN IF NOT EXISTS ""Email"" text;
        ");
        Log.Information("تم التحقق من عمود Email في جدول Customers.");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "تعذر تعديل جدول Customers بإضافة عمود Email.");
    }

    // فحص وإضافة أعمدة الفاتورة الإلكترونية والربط الضريبي
    try
    {
        await context.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE ""Branches"" ADD COLUMN IF NOT EXISTS ""VatNumber"" text;
            ALTER TABLE ""Branches"" ADD COLUMN IF NOT EXISTS ""TaxName"" text;
            ALTER TABLE ""Customers"" ADD COLUMN IF NOT EXISTS ""VatNumber"" text;
            ALTER TABLE ""SalesContracts"" ADD COLUMN IF NOT EXISTS ""EInvoiceStatus"" text DEFAULT 'Draft';
            ALTER TABLE ""SalesContracts"" ADD COLUMN IF NOT EXISTS ""EInvoiceXmlHash"" text;
            ALTER TABLE ""SalesContracts"" ADD COLUMN IF NOT EXISTS ""EInvoiceQrCode"" text;
            ALTER TABLE ""SalesContracts"" ADD COLUMN IF NOT EXISTS ""EInvoiceUuid"" text;
            ALTER TABLE ""SalesContracts"" ADD COLUMN IF NOT EXISTS ""EInvoiceError"" text;
        ");
        Log.Information("تم التحقق من أعمدة الفاتورة الإلكترونية والربط الضريبي في قاعدة البيانات.");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "تعذر تعديل الجداول لإضافة أعمدة الفاتورة الإلكترونية.");
    }

    // إنشاء جدول مستخدمي تسجيل الدخول عبر Google (تطبيق الموبايل) إذا لم يكن موجوداً
    try
    {
        await context.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""AppUsers"" (
                ""Id"" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                ""GoogleId"" text NOT NULL DEFAULT '',
                ""Email"" text NOT NULL DEFAULT '',
                ""Name"" text NOT NULL DEFAULT '',
                ""PhotoUrl"" text,
                ""LinkedCustomerId"" uuid REFERENCES ""Customers""(""Id"") ON DELETE SET NULL,
                ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT NOW()
            );
            CREATE UNIQUE INDEX IF NOT EXISTS ""IX_AppUsers_GoogleId"" ON ""AppUsers"" (""GoogleId"");
        ");
        Log.Information("تم التحقق من جدول AppUsers أو إنشاؤه.");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "تعذر إنشاء جدول AppUsers.");
    }

    // إنشاء جداول محادثات ورسائل الموبايل حول السيارات إذا لم تكن موجودة
    try
    {
        await context.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""Conversations"" (
                ""Id"" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                ""VehicleId"" uuid NOT NULL REFERENCES ""Vehicles""(""Id"") ON DELETE CASCADE,
                ""CustomerId"" uuid REFERENCES ""Customers""(""Id"") ON DELETE CASCADE,
                ""AppUserId"" uuid REFERENCES ""AppUsers""(""Id"") ON DELETE CASCADE,
                ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT NOW(),
                ""LastMessageAt"" timestamp with time zone NOT NULL DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS ""Messages"" (
                ""Id"" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                ""ConversationId"" uuid NOT NULL REFERENCES ""Conversations""(""Id"") ON DELETE CASCADE,
                ""SenderType"" text NOT NULL DEFAULT 'Customer',
                ""SenderName"" text NOT NULL DEFAULT '',
                ""Body"" text NOT NULL DEFAULT '',
                ""IsRead"" boolean NOT NULL DEFAULT false,
                ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS ""IX_Conversations_CustomerId"" ON ""Conversations"" (""CustomerId"");
            CREATE INDEX IF NOT EXISTS ""IX_Conversations_AppUserId"" ON ""Conversations"" (""AppUserId"");
            CREATE INDEX IF NOT EXISTS ""IX_Messages_ConversationId"" ON ""Messages"" (""ConversationId"");
        ");
        Log.Information("تم التحقق من جداول Conversations وMessages أو إنشاؤها.");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "تعذر إنشاء جداول Conversations وMessages.");
    }

    // ─── Soft Delete — إضافة أعمدة الحذف الناعم لجميع الجداول القابلة للحذف ────────
    try
    {
        await context.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE ""Customers""      ADD COLUMN IF NOT EXISTS ""IsDeleted""  boolean                  NOT NULL DEFAULT false;
            ALTER TABLE ""Customers""      ADD COLUMN IF NOT EXISTS ""DeletedAt""  timestamp with time zone;
            ALTER TABLE ""Customers""      ADD COLUMN IF NOT EXISTS ""DeletedBy""  text;
            ALTER TABLE ""Vehicles""       ADD COLUMN IF NOT EXISTS ""IsDeleted""  boolean                  NOT NULL DEFAULT false;
            ALTER TABLE ""Vehicles""       ADD COLUMN IF NOT EXISTS ""DeletedAt""  timestamp with time zone;
            ALTER TABLE ""Vehicles""       ADD COLUMN IF NOT EXISTS ""DeletedBy""  text;
            ALTER TABLE ""Employees""      ADD COLUMN IF NOT EXISTS ""IsDeleted""  boolean                  NOT NULL DEFAULT false;
            ALTER TABLE ""Employees""      ADD COLUMN IF NOT EXISTS ""DeletedAt""  timestamp with time zone;
            ALTER TABLE ""Employees""      ADD COLUMN IF NOT EXISTS ""DeletedBy""  text;
            ALTER TABLE ""Suppliers""      ADD COLUMN IF NOT EXISTS ""IsDeleted""  boolean                  NOT NULL DEFAULT false;
            ALTER TABLE ""Suppliers""      ADD COLUMN IF NOT EXISTS ""DeletedAt""  timestamp with time zone;
            ALTER TABLE ""Suppliers""      ADD COLUMN IF NOT EXISTS ""DeletedBy""  text;
            ALTER TABLE ""Purchases""      ADD COLUMN IF NOT EXISTS ""SourceType"" integer NOT NULL DEFAULT 1;
            ALTER TABLE ""Purchases""      ADD COLUMN IF NOT EXISTS ""CustomerId"" uuid;
            ALTER TABLE ""Purchases""      ALTER COLUMN ""SupplierId"" DROP NOT NULL;
            UPDATE ""Purchases"" SET ""SourceType"" = 1 WHERE ""SourceType"" IS NULL OR ""SourceType"" = 0;
            ALTER TABLE ""Purchases""      ADD COLUMN IF NOT EXISTS ""IsDeleted""  boolean                  NOT NULL DEFAULT false;
            ALTER TABLE ""Purchases""      ADD COLUMN IF NOT EXISTS ""DeletedAt""  timestamp with time zone;
            ALTER TABLE ""Purchases""      ADD COLUMN IF NOT EXISTS ""DeletedBy""  text;
            ALTER TABLE ""SalesContracts"" ADD COLUMN IF NOT EXISTS ""IsDeleted""  boolean                  NOT NULL DEFAULT false;
            ALTER TABLE ""SalesContracts"" ADD COLUMN IF NOT EXISTS ""DeletedAt""  timestamp with time zone;
            ALTER TABLE ""SalesContracts"" ADD COLUMN IF NOT EXISTS ""DeletedBy""  text;
            ALTER TABLE ""Expenses""       ADD COLUMN IF NOT EXISTS ""IsDeleted""  boolean                  NOT NULL DEFAULT false;
            ALTER TABLE ""Expenses""       ADD COLUMN IF NOT EXISTS ""DeletedAt""  timestamp with time zone;
            ALTER TABLE ""Expenses""       ADD COLUMN IF NOT EXISTS ""DeletedBy""  text;
            ALTER TABLE ""Accounts""                  ADD COLUMN IF NOT EXISTS ""IsDeleted""  boolean                  NOT NULL DEFAULT false;
            ALTER TABLE ""Accounts""                  ADD COLUMN IF NOT EXISTS ""DeletedAt""  timestamp with time zone;
            ALTER TABLE ""Accounts""                  ADD COLUMN IF NOT EXISTS ""DeletedBy""  text;
            ALTER TABLE ""JournalEntries""            ADD COLUMN IF NOT EXISTS ""IsDeleted""  boolean                  NOT NULL DEFAULT false;
            ALTER TABLE ""JournalEntries""            ADD COLUMN IF NOT EXISTS ""DeletedAt""  timestamp with time zone;
            ALTER TABLE ""JournalEntries""            ADD COLUMN IF NOT EXISTS ""DeletedBy""  text;
            ALTER TABLE ""Payments""                  ADD COLUMN IF NOT EXISTS ""IsDeleted""  boolean                  NOT NULL DEFAULT false;
            ALTER TABLE ""Payments""                  ADD COLUMN IF NOT EXISTS ""DeletedAt""  timestamp with time zone;
            ALTER TABLE ""Payments""                  ADD COLUMN IF NOT EXISTS ""DeletedBy""  text;
            ALTER TABLE ""InstallmentPlans""          ADD COLUMN IF NOT EXISTS ""IsDeleted""  boolean                  NOT NULL DEFAULT false;
            ALTER TABLE ""InstallmentPlans""          ADD COLUMN IF NOT EXISTS ""DeletedAt""  timestamp with time zone;
            ALTER TABLE ""InstallmentPlans""          ADD COLUMN IF NOT EXISTS ""DeletedBy""  text;
            ALTER TABLE ""Installments""              ADD COLUMN IF NOT EXISTS ""IsDeleted""  boolean                  NOT NULL DEFAULT false;
            ALTER TABLE ""Installments""              ADD COLUMN IF NOT EXISTS ""DeletedAt""  timestamp with time zone;
            ALTER TABLE ""Installments""              ADD COLUMN IF NOT EXISTS ""DeletedBy""  text;
            ALTER TABLE ""CrmInteractions""           ADD COLUMN IF NOT EXISTS ""IsDeleted""  boolean                  NOT NULL DEFAULT false;
            ALTER TABLE ""CrmInteractions""           ADD COLUMN IF NOT EXISTS ""DeletedAt""  timestamp with time zone;
            ALTER TABLE ""CrmInteractions""           ADD COLUMN IF NOT EXISTS ""DeletedBy""  text;
            ALTER TABLE ""Deals""                     ADD COLUMN IF NOT EXISTS ""IsDeleted""  boolean                  NOT NULL DEFAULT false;
            ALTER TABLE ""Deals""                     ADD COLUMN IF NOT EXISTS ""DeletedAt""  timestamp with time zone;
            ALTER TABLE ""Deals""                     ADD COLUMN IF NOT EXISTS ""DeletedBy""  text;
            ALTER TABLE ""FiscalYears""               ADD COLUMN IF NOT EXISTS ""IsDeleted""  boolean                  NOT NULL DEFAULT false;
            ALTER TABLE ""FiscalYears""               ADD COLUMN IF NOT EXISTS ""DeletedAt""  timestamp with time zone;
            ALTER TABLE ""FiscalYears""               ADD COLUMN IF NOT EXISTS ""DeletedBy""  text;
            ALTER TABLE ""RecurringJournalTemplates"" ADD COLUMN IF NOT EXISTS ""IsDeleted""  boolean                  NOT NULL DEFAULT false;
            ALTER TABLE ""RecurringJournalTemplates"" ADD COLUMN IF NOT EXISTS ""DeletedAt""  timestamp with time zone;
            ALTER TABLE ""RecurringJournalTemplates"" ADD COLUMN IF NOT EXISTS ""DeletedBy""  text;
            ALTER TABLE ""EmployeeCommissions""       ADD COLUMN IF NOT EXISTS ""IsDeleted""  boolean                  NOT NULL DEFAULT false;
            ALTER TABLE ""EmployeeCommissions""       ADD COLUMN IF NOT EXISTS ""DeletedAt""  timestamp with time zone;
            ALTER TABLE ""EmployeeCommissions""       ADD COLUMN IF NOT EXISTS ""DeletedBy""  text;
            ALTER TABLE ""EmployeeTargets""           ADD COLUMN IF NOT EXISTS ""IsDeleted""  boolean                  NOT NULL DEFAULT false;
            ALTER TABLE ""EmployeeTargets""           ADD COLUMN IF NOT EXISTS ""DeletedAt""  timestamp with time zone;
            ALTER TABLE ""EmployeeTargets""           ADD COLUMN IF NOT EXISTS ""DeletedBy""  text;
        ");
        Log.Information("تم إضافة أعمدة الحذف الناعم (Soft Delete) بنجاح.");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "تعذر إضافة أعمدة الحذف الناعم.");
    }

    // ─── تقييم الائتمان — Customer Credit Rating ─────────────────────────────────
    try
    {
        await context.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE ""Customers"" ADD COLUMN IF NOT EXISTS ""CreditRating""    integer NOT NULL DEFAULT 5;
            ALTER TABLE ""Customers"" ADD COLUMN IF NOT EXISTS ""IsBlacklisted""   boolean NOT NULL DEFAULT false;
            ALTER TABLE ""Customers"" ADD COLUMN IF NOT EXISTS ""BlacklistReason"" text;
        ");
        Log.Information("تم إضافة أعمدة تقييم الائتمان بنجاح.");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "تعذر إضافة أعمدة تقييم الائتمان.");
    }

    // ─── VehicleStatusHistory — سجل تاريخ تغيير حالة السيارات ───────────────────
    try
    {
        await context.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""VehicleStatusHistories"" (
                ""Id""         uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
                ""VehicleId""  uuid                     NOT NULL REFERENCES ""Vehicles""(""Id"") ON DELETE CASCADE,
                ""OldStatus""  text,
                ""NewStatus""  text                     NOT NULL DEFAULT '',
                ""ChangedBy""  text,
                ""ChangedAt""  timestamp with time zone NOT NULL DEFAULT NOW(),
                ""Notes""      text,
                ""BranchId""   uuid                     NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
            );
            CREATE INDEX IF NOT EXISTS ""IX_VehicleStatusHistories_VehicleId"" ON ""VehicleStatusHistories"" (""VehicleId"");
            CREATE INDEX IF NOT EXISTS ""IX_VehicleStatusHistories_ChangedAt""  ON ""VehicleStatusHistories"" (""ChangedAt"");
        ");
        Log.Information("تم إنشاء جدول VehicleStatusHistories بنجاح.");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "تعذر إنشاء جدول VehicleStatusHistories.");
    }

    // ─── VehicleCostAccountMappings — ربط نوع مصروف السيارة بحساب محاسبي ─────────
    try
    {
        await context.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""VehicleCostAccountMappings"" (
                ""Id""             uuid                     PRIMARY KEY DEFAULT gen_random_uuid(),
                ""CostType""       text                     NOT NULL,
                ""AccountId""      uuid                     NOT NULL REFERENCES ""Accounts""(""Id"") ON DELETE RESTRICT,
                ""BranchId""       uuid                     NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
                ""CreatedAt""      timestamp with time zone NOT NULL DEFAULT NOW(),
                ""CreatedBy""      text,
                ""LastModifiedAt"" timestamp with time zone,
                ""LastModifiedBy"" text,
                ""IsDeleted""      boolean                  NOT NULL DEFAULT false,
                ""DeletedAt""      timestamp with time zone,
                ""DeletedBy""      text,
                UNIQUE (""CostType"", ""BranchId"")
            );
        ");
        Log.Information("تم إنشاء جدول VehicleCostAccountMappings بنجاح.");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "تعذر إنشاء جدول VehicleCostAccountMappings.");
    }

    // ─── Performance Indexes — فهارس الأداء ──────────────────────────────────────
    try
    {
        await context.Database.ExecuteSqlRawAsync(@"
            CREATE INDEX IF NOT EXISTS ""IX_Customers_Phone""         ON ""Customers""      (""Phone"");
            CREATE INDEX IF NOT EXISTS ""IX_Customers_Name""          ON ""Customers""      (""Name"");
            CREATE INDEX IF NOT EXISTS ""IX_Customers_IsDeleted""     ON ""Customers""      (""IsDeleted"") WHERE ""IsDeleted"" = false;
            CREATE INDEX IF NOT EXISTS ""IX_Customers_IsBlacklisted"" ON ""Customers""      (""IsBlacklisted"") WHERE ""IsBlacklisted"" = true;
            CREATE INDEX IF NOT EXISTS ""IX_Vehicles_Status""         ON ""Vehicles""       (""Status"");
            CREATE INDEX IF NOT EXISTS ""IX_Vehicles_PlateNumber""    ON ""Vehicles""       (""PlateNumber"");
            CREATE INDEX IF NOT EXISTS ""IX_Vehicles_IsDeleted""      ON ""Vehicles""       (""IsDeleted"") WHERE ""IsDeleted"" = false;
            CREATE INDEX IF NOT EXISTS ""IX_Vehicles_Brand_Model_Year"" ON ""Vehicles""     (""Brand"", ""Model"", ""Year"");
            CREATE INDEX IF NOT EXISTS ""IX_Installments_DueDate_Status"" ON ""Installments"" (""DueDate"", ""Status"");
            CREATE INDEX IF NOT EXISTS ""IX_Installments_Status""     ON ""Installments""   (""Status"");
            CREATE INDEX IF NOT EXISTS ""IX_Payments_CreatedAt""      ON ""Payments""       (""CreatedAt"");
            CREATE INDEX IF NOT EXISTS ""IX_SalesContracts_SaleDate"" ON ""SalesContracts"" (""SaleDate"");
            CREATE INDEX IF NOT EXISTS ""IX_Employees_IsDeleted""     ON ""Employees""      (""IsDeleted"") WHERE ""IsDeleted"" = false;
            CREATE INDEX IF NOT EXISTS ""IX_Suppliers_IsDeleted""     ON ""Suppliers""      (""IsDeleted"") WHERE ""IsDeleted"" = false;
        ");
        Log.Information("تم إنشاء فهارس الأداء بنجاح.");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "تعذر إنشاء فهارس الأداء.");
    }

    // Reporting views (vw_OverdueInstallments, vw_VehicleSummary, vw_CustomerSummary) are
    // now owned by the AddReportingViews EF migration (applied above via MigrateAsync),
    // not created here — see that migration for the view SQL and the TotalCost fix.
}
