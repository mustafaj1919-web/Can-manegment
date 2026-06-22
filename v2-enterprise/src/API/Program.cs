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

// Static files must run before routing so they are never subject to auth or rate-limiting
var vehicleImagesPath = Path.Combine(Directory.GetCurrentDirectory(), "storage", "vehicles");
Directory.CreateDirectory(vehicleImagesPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(vehicleImagesPath),
    RequestPath = "/static/uploads/vehicles",
    ServeUnknownFileTypes = false,
});

app.UseRateLimiter();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers().RequireRateLimiting("GlobalPolicy");
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
        new Permission { Name = "manage_settings", Description = "إدارة إعدادات النظام والنسخ الاحتياطي" }
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
        var hasAnyPermissions = await context.RolePermissions.AnyAsync(rp => rp.RoleId == role.Id);
        if (!hasAnyPermissions)
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

            foreach (var permName in allowedPermNames)
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
}
