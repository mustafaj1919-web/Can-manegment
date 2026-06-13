# دليل التشغيل والصيانة لبيئة الإنتاج (V2 Production Runbook)

يغطي هذا الدليل تفاصيل تشغيل وإدارة وصيانة نظام إدارة معارض السيارات الإصدار الثاني (V2 Enterprise) في بيئة الإنتاج الفعلي باستخدام الحاويات (Docker).

---

## 1. الهيكل العام للبنية التحتية (Architecture Overview)

يعمل النظام في بيئة معزولة بالكامل خلف خادم موازنة الحمل وتوجيه حركة المرور **Nginx Proxy**:

```
[مستخدم المتصفح] ----(المنفذ 80)----> [Nginx Proxy]
                                            |
                         +------------------+------------------+
                         | (توجيه /api/*)                      | (توجيه /)
                         v                                     v
             [v2-enterprise-api]                      [v2-enterprise-frontend]
                (ASP.NET Core)                             (Next.js Node)
                         |
               +---------+---------+
               |                   |
               v                   v
      [v2-postgres-db]     [v2-redis-cache]
        (PostgreSQL)            (Redis)
```

---

## 2. النشر الأولي والتشغيل (Deployment Steps)

لإعداد وتشغيل النظام لأول مرة في بيئة الإنتاج:

1. **نسخ ملف المتغيرات البيئية وتعديله**:
   ```bash
   cp .env.production.example .env
   ```
2. **تعديل الملف `.env`**:
   * قم بتوليد كلمة مرور قوية جداً لقاعدة البيانات وتعيينها في `POSTGRES_PASSWORD`.
   * قم بتوليد مفتاح أمان عشوائي طويل (مشفّر 256 بت) وتعيينه في `JWT_SECRET`.
   * قم بتحديث سلسلة اتصال قاعدة البيانات `CONNECTION_STRING` بكلمة المرور الجديدة.
3. **بناء وتشغيل الحاويات**:
   ```bash
   docker compose -f docker-compose.prod.yml up --build -d
   ```
4. **التحقق من حالة الحاويات**:
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```

---

## 3. الفحوصات الصحية والمراقبة (Health Monitoring)

يحتوي النظام على فحوصات صحة تلقائية مدمجة (Healthchecks) للتأكد من سلامة الخدمات:

* **خادم Nginx**: يفحص محلياً سلامة التخديم عبر المسار الاستدلالي `/nginx-health`.
* **الخلفية (API)**: يفحص حالة الاتصال بقاعدة البيانات والنظام عبر الاستدعاء المباشر لـ `/healthz` (على المنفذ 8080 داخلياً).
* **قاعدة البيانات (PostgreSQL)**: تستخدم الأداة القياسية `pg_isready`.
* **الذاكرة المؤقتة (Redis)**: تستخدم الأداة القياسية `redis-cli ping`.

عناوين الفحص الخارجي عبر المتصفح:
* واجهة الـ API والتحقق من صحتها: `http://localhost/healthz`
* واجهة التوثيق البرمجي (Swagger): `http://localhost/swagger/`
* الواجهة الأمامية: `http://localhost/`

---

## 4. النسخ الاحتياطي لقاعدة البيانات (Database Backup)

تُخزن النسخ الاحتياطية تلقائياً في المجلد المستضاف محلياً `v2-enterprise/backups/`.

### أ. التشغيل على بيئات Linux/macOS
قم بتشغيل سكربت Bash:
```bash
cd scripts/
chmod +x backup-db.sh
./backup-db.sh
```

### ب. التشغيل على بيئات Windows (PowerShell)
قم بتشغيل سكربت PowerShell بصلاحيات مناسبة:
```powershell
cd scripts\
.\backup-db.ps1
```

---

## 5. التعافي الكارثي والاستعادة (Disaster Recovery & Restore)

لاستعادة حالة قاعدة البيانات بالكامل من ملف نسخة احتياطية محدد (على سبيل المثال: `backup_CarShowroomV2_20260611_120000.dump`):

> [!WARNING]
> عملية الاستعادة ستقوم بقطع كافة الاتصالات النشطة بقاعدة البيانات الحالية، وحذف قاعدة البيانات القديمة وإعادة إنشائها بالكامل قبل ترحيل البيانات المحفوظة.

### أ. التشغيل على بيئات Linux/macOS
```bash
cd scripts/
chmod +x restore-db.sh
./restore-db.sh backup_CarShowroomV2_20260611_120000.dump
```

### ب. التشغيل على بيئات Windows (PowerShell)
```powershell
cd scripts\
.\restore-db.ps1 -BackupFile backup_CarShowroomV2_20260611_120000.dump
```

---

## 6. استكشاف الأخطاء وإصلاحها (Troubleshooting)

* **عرض سجلات الأخطاء الحية (Logs)**:
  ```bash
  docker compose -f docker-compose.prod.yml logs -f
  ```
* **فحص سجلات خدمة معينة (مثل الـ API)**:
  ```bash
  docker compose -f docker-compose.prod.yml logs v2-enterprise-api -f
  ```
* **إعادة تشغيل خدمة واحدة فقط**:
  ```bash
  docker compose -f docker-compose.prod.yml restart v2-enterprise-api
  ```
* **الدخول المباشر لقاعدة البيانات للمراجعة**:
  ```bash
  docker exec -it v2-postgres-db psql -U postgres -d CarShowroomV2
  ```
