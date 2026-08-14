# 1. مرحلة بناء الكود (Build Stage)
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine3.19 AS build
WORKDIR /src

# Disable telemetry
ENV DOTNET_CLI_TELEMETRY_OPTOUT=1

# نسخ ملفات المشاريع واستعادة الاعتمادات لتسريع التخزين المؤقت
COPY ["src/Domain/Domain.csproj", "src/Domain/"]
COPY ["src/Application/Application.csproj", "src/Application/"]
COPY ["src/Infrastructure/Infrastructure.csproj", "src/Infrastructure/"]
COPY ["src/API/API.csproj", "src/API/"]
RUN dotnet restore "src/API/API.csproj"

# نسخ باقي الأكواد وبناء المشروع
COPY . .
WORKDIR "/src/src/API"
RUN dotnet build "API.csproj" -c Release -o /app/build

# 2. مرحلة النشر (Publish Stage)
FROM build AS publish
RUN dotnet publish "API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# 3. مرحلة التشغيل النهائية (Runtime Stage)
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine3.19 AS final
WORKDIR /app

# Disable telemetry and diagnostics for security hardening
ENV DOTNET_CLI_TELEMETRY_OPTOUT=1
ENV COMPlus_EnableDiagnostics=0

# إنشاء مستخدم أمني غير مسؤول لتشغيل الحاوية بأمان
# تثبيت su-exec لتبديل المستخدم بأمان بعد إصلاح صلاحيات الـ volumes
RUN addgroup -g 10001 -S appgroup && \
    adduser -u 10001 -S appuser -G appgroup && \
    apk add --no-cache su-exec postgresql16-client

# إنشاء جميع مجلدات التخزين مع الصلاحيات الصحيحة
RUN mkdir -p /app/logs /app/storage/vehicles /app/storage/private/customers /app/storage/customers /app/backups /app/backups/archive && \
    chown -R appuser:appgroup /app

COPY --chown=appuser:appgroup --from=publish /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

# الـ entrypoint يصلح صلاحيات الـ volumes (root بالافتراضي) ثم يشغل التطبيق كـ appuser
COPY src/API/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
