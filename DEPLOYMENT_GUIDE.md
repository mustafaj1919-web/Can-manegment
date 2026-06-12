# دليل نشر النظام لبيئات الإنتاج والمؤسسات (Enterprise Deployment Guide)

يوضح هذا الدليل الخطوات اللازمة لنشر وإعداد "نظام إدارة معرض السيارات" في بيئة إنتاجية حقيقية تدعم المؤسسات، باستخدام التقنيات الحديثة وقاعدة بيانات PostgreSQL وحاويات Docker.

---

## 1. المتطلبات التقنية الأساسية (Prerequisites)

قبل البدء بعملية النشر، يجب التأكد من توفر المتطلبات التالية على خادم الإنتاج (VPS / Cloud VM - Linux Ubuntu 22.04 LTS يوصى به):

- **Docker**: الإصدار 24.0.0 أو أحدث.
- **Docker Compose**: الإصدار 2.20.0 أو أحدث.
- **PostgreSQL**: (مدمج تلقائياً عبر Docker Compose، أو خادم خارجي مدار مثل AWS RDS).
- **RAM**: 2 جيجابايت كحد أدنى (يفضل 4 جيجابايت لتشغيل الحاويات بسلاسة).
- **مساحة تخزين**: 20 جيجابايت على الأقل (SSD) مع مراعاة مساحة كافية للنسخ الاحتياطي وصور السيارات.

---

## 2. تهيئة المتغيرات البيئية بأمان (Environment Variables)

قم بإنشاء ملف `.env` في المجلد الرئيسي للمشروع وتجهيز القيم الخاصة به.
> [!WARNING]
> لا تقم مطلقاً بمشاركة ملف `.env` أو رفعه على مستودعات الأكواد العامة (مثل GitHub).

### هيكل ملف `.env` الموصى به للإنتاج:

```env
# ── إعدادات قاعدة البيانات ──────────────────────────────────────────
POSTGRES_USER=showroom_prod_admin
POSTGRES_PASSWORD=SecurePassword_ChangeMe_123!
POSTGRES_DB=showroom_production

# ── إعدادات خادم الـ Backend (Flask) ──────────────────────────────
SECRET_KEY=5f4dcc3b5aa765d61d8327deb882cf99a167a1c1d42898cde72186851f5c6b84  # قم بتوليد مفتاح عشوائي قوي
CLOUD_MODE=1
ALLOWED_ORIGINS=https://showroom.yourdomain.com,https://api.showroom.yourdomain.com
UPLOAD_FOLDER=/app/static/uploads
PRIVATE_STORAGE_FOLDER=/app/storage/private
BACKUP_FOLDER=/app/data/backups

# ── إعدادات خادم الـ Frontend (Next.js) ─────────────────────────────
PORT=3000
FLASK_BACKEND_URL=http://backend:5000
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=production
```

لتوليد مفتاح سري عشوائي وآمن لـ `SECRET_KEY` في بيئة لينكس، قم بتشغيل الأمر:
```bash
openssl rand -hex 32
```

---

## 3. خطوات تشغيل الحاويات (Docker Compose Run)

بمجرد تجهيز ملفات `Dockerfile` وملف `.env` و `docker-compose.yml` في مجلد المشروع، اتبع الخطوات التالية:

### أ. بناء وتشغيل الحاويات في الخلفية:
```bash
docker compose up -d --build
```

### ب. التحقق من حالة الحاويات النشطة:
```bash
docker compose ps
```

يجب أن ترى 3 خدمات تعمل بنجاح:
1. `car-showroom-db` (PostgreSQL)
2. `car-showroom-backend` (Flask Server)
3. `car-showroom-frontend` (Next.js Node Server)

### ج. فحص سجلات التشغيل للتأكد من السلامة:
```bash
docker compose logs -f
```

---

## 4. هجرة ونقل البيانات من SQLite إلى PostgreSQL

إذا كان لديك نظام قائم مسبقاً وتعمل على قاعدة بيانات SQLite وترغب في ترحيل كافة البيانات (مثل القيود المحاسبية، السيارات، والعملاء) إلى PostgreSQL في الإنتاج:

1. تأكد من أن حاوية PostgreSQL تعمل بنجاح.
2. قم بنسخ ملف قاعدة البيانات القديمة `showroom.db` ووضعه في مسار المجلد الرئيسي للإنتاج تحت المسار المخصص: `database/showroom.db`.
3. قم بتشغيل سكربت الهجرة التلقائي داخل حاوية الـ backend باستخدام الأمر التالي:
```bash
docker compose exec backend python migrate_to_pg.py
```
يقوم هذا السكربت تلقائياً بـ:
- فحص الجداول وترتيبها حسب الاعتمادية (Topological Sort).
- تفريغ الجداول في PostgreSQL بأمان.
- نقل البيانات وتحويل التنسيقات (مثل التواريخ والقيم المنطقية).
- إعادة ضبط تسلسلات المعرفات التلقائية (Sequences reset) لتفادي أي أخطاء مستقبلية عند الإدخال.

---

## 5. تأمين النشر والربط الخارجي (Nginx & SSL Setup)

لحماية حركة المرور وتوفير اتصال آمن للمستخدمين (HTTPS)، يوصى بتركيب خادم `Nginx` على الآلة المستضيفة وتأمينها بشهادة `Let's Encrypt`.

### أ. تكوين خادم Nginx (`/etc/nginx/sites-available/showroom`):

```nginx
server {
    listen 80;
    server_name showroom.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name showroom.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/showroom.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/showroom.yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;  # تحويل الطلبات إلى Next.js
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # مجلد الملفات المرفوعة المباشرة لتقليل الحمل على الخادم
    location /static/uploads/ {
        alias /var/lib/docker/volumes/car_showroom_management_customer_uploads/_data/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

### ب. تفعيل شهادات SSL مجاناً عبر Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d showroom.yourdomain.com
```

---

## 6. استكشاف الأخطاء وحلها (Troubleshooting)

| المشكلة | السبب المحتمل | الحل |
| :--- | :--- | :--- |
| **خطأ 502 Bad Gateway** | خادم Next.js أو Flask متوقف أو قيد التشغيل. | قم بفحص الحاويات وتشغيل `docker compose restart`. |
| **فشل الاتصال بقاعدة البيانات** | كلمة المرور أو اسم المستخدم غير صحيح بملف `.env`. | راجع بيانات الاتصال في `.env` وقم بـ `docker compose down` ثم تشغيل مجدداً. |
| **تعذر رفع صور السيارات** | الصلاحيات البرمجية للمجلدات داخل الحاوية غير مهيأة. | يتم إعداد الصلاحيات تلقائياً في Dockerfile للمستخدم غير المسؤول، تأكد من عدم تعديل ملكية الـ Volumes خارجياً. |
| **امتلاء السجلات و logs** | حجم ملف السجلات كبير جداً. | السجلات مهيأة بوضعية التدوير الدائري التلقائي (Rotating log max 1MB) مع 3 نسخ احتياطية كحد أقصى لمنع استهلاك مساحة القرص. |
