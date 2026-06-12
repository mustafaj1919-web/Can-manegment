# هندسة البنية التحتية للمؤسسات (Infrastructure & Architecture Design)

يوضح هذا المستند التصميم الهيكلي للبنية التحتية ونظام الحاويات والشبكات والتدفقات الأمنية وتخزين البيانات لنظام إدارة معرض السيارات في بيئة الإنتاج.

---

## 1. مخطط هندسة النظام (Architecture Diagram)

يوضح المخطط التالي تدفق طلبات المستخدمين والربط البيني بين حاويات Docker المختلفة والشبكات والـ Volumes:

```mermaid
graph TD
    User([المستخدم / متصفح الويب]) -->|HTTPS / Port 443| Nginx[Nginx Reverse Proxy & SSL]
    
    subgraph Private Docker Network (showroom-network)
        Nginx -->|Proxy Requests / Port 3000| Frontend[Next.js Frontend Container]
        Nginx -->|API Requests / Port 5000| Backend[Flask Backend Container]
        Frontend -->|Server-side Rewrites / Requests| Backend
        Backend -->|SQL Queries / Port 5432| DB[(PostgreSQL Database Container)]
    end

    subgraph Persistent Storage Volumes (Local Host Drivers)
        DB-Volume[(postgres_data)] <---> DB
        Public-Uploads[(customer_uploads)] <---> Backend
        Private-Storage[(private_storage)] <---> Backend
        App-Backups[(app_backups)] <---> Backend
        App-Logs[(app_logs)] <---> Backend
    end

    classDef container fill:#f9f,stroke:#333,stroke-width:2px;
    classDef database fill:#9f9,stroke:#333,stroke-width:2px;
    classDef volume fill:#ff9,stroke:#333,stroke-width:1px;
    class Frontend,Backend container;
    class DB database;
    class DB-Volume,Public-Uploads,Private-Storage,App-Backups,App-Logs volume;
```

---

## 2. تفصيل مكونات البنية التحتية (Services Breakdown)

### أ. خادم الويب والبروكسي العكسي (Nginx Server)
- **الدور**: استقبال طلبات المستخدمين الخارجية وفك تشفير شهادات الأمان (SSL Termination) وتحويل حركة المرور بالتساوي إلى الحاويات الداخلية.
- **الأمان**:
  - تفعيل بروتوكولات التشفير الحديثة (TLS 1.2 & TLS 1.3) وتعطيل التشفير الضعيف.
  - تحديد أقصى حجم للرفع بـ 10 ميجابايت لمنع هجمات الحرمان من الخدمة (DDoS via Large Payloads).
  - تمرير ترويسات العميل الحقيقية مثل (`X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`) إلى Flask لمعالجة السجلات وتدقيق الأمان بدقة.

### ب. حاوية الواجهة الأمامية (Next.js Frontend)
- **اسم الحاوية**: `car-showroom-frontend`
- **المنفذ الداخلي**: `3000`
- **التصميم**: تعتمد على بناء Next.js المستقل (`standalone`) لتقليص مساحة التشغيل وحذف اعتمادات التطوير غير الضرورية، وتعمل تحت مستخدم نظام غير مسؤول (`nextjs`).
- **وظيفة البروكسي الداخلي**: يتم إعادة توجيه مسارات الـ API تلقائياً (`/api/*` و `/static/*`) داخلياً إلى حاوية الـ Backend لتجنب مشاكل مشاركة الموارد بين المواقع (CORS) وتأمين نقاط النهاية.

### ج. حاوية الخادم الخلفي (Flask Backend)
- **اسم الحاوية**: `car-showroom-backend`
- **المنفذ الداخلي**: `5000`
- **خادم الويب**: خادم `Gunicorn` الموصى به لبيئات الإنتاج لينكس، ويعمل بوضعية العمل المتوازي (4 Workers) لتغطية الأحمال وضمان سرعة الاستجابة.
- **المستخدم البرمجي**: يعمل تحت مستخدم آمن `appuser` تم إنشاؤه مسبقاً وتخويله فقط للمسارات المطلوبة داخل الحاوية دون صلاحيات Root.
- **التخزين المؤقت والتحميل**:
  - يتصل مباشرة بالمجلدات الثابتة الخاصة بالملفات المرفوعة والمستندات والنسخ الاحتياطية.

### د. حاوية قاعدة البيانات (PostgreSQL DB)
- **اسم الحاوية**: `car-showroom-db`
- **المنفذ الداخلي**: `5432`
- **الصورة البرمجية**: `postgres:16-alpine` لضمان خفة حجم الحاوية والسرعة العالية.
- **الفحص الدوري (Healthcheck)**: تقوم الحاوية بتشغيل فحص سلامة تلقائي كل 10 ثوانٍ للتأكد من استجابة قاعدة البيانات وموثوقيتها.

---

## 3. تصميم وهندسة التخزين والمجلدات (Persistent Storage Design)

تم تصميم التخزين بشكل يفصل بين أنواع البيانات المختلفة لضمان سرعة النسخ الاحتياطي والأمان التام:

1. **`postgres_data`**:
   - **نوع البيانات**: ملفات قاعدة البيانات الحية والـ Tables والمحاسبة والعملاء والسيارات.
   - **السرية**: مشفرة ومحفوظة بالكامل داخل الحاوية وغير قابلة للوصول الخارجي نهائياً إلا من خلال اتصالات مصادق عليها.
2. **`customer_uploads`**:
   - **نوع البيانات**: صور السيارات المرفوعة والمستندات العامة المتاحة للمستخدمين.
   - **المسار**: `/app/static/uploads`
   - **طريقة الوصول**: يمكن لخادم Nginx قراءة هذا المجلد مباشرة وعرض الصور لتسريع استجابة تصفح الصور وتخفيف الضغط عن تطبيق Flask.
3. **`private_storage`**:
   - **نوع البيانات**: مستندات الهويات للعملاء، جوازات السفر، العقود الحساسة، والمرفقات الرسمية.
   - **المسار**: `/app/storage/private`
   - **الأمان**: **ممنوع تماماً الوصول المباشر عبر الويب**. يتم الوصول للملفات وتنزيلها فقط من خلال مسار محمي وموثق بالصلاحيات بـ API الخلفي ويتحقق من ملكية المستخدم وصلاحياته قبل التنزيل.
4. **`app_backups`**:
   - **نوع البيانات**: ملفات النسخ الاحتياطي الدورية المولدة بصيغة ZIP مضغوطة.
   - **المسار**: `/app/data/backups`
5. **`app_logs`**:
   - **نوع البيانات**: سجلات الأخطاء والإنتاج المهيكلة بصيغة JSON.
   - **المسار**: `/app/logs`

---

## 4. تدفق الاتصال الشبكي والأمان (Network Security Flow)

- **الشبكة المعزولة (`showroom-network`)**:
  - يتم استخدام شبكة Docker داخلية بنوع `bridge`.
  - لا يتم كشف منفذ قاعدة البيانات (5432) أو خادم Flask (5000) للإنترنت الخارجي. المنفذ الوحيد المفتوح للإنترنت الخارجي هو منفذ الـ Frontend (3000) ومنفذ Nginx بروكسي (443).
  - يتم عزل قاعدة البيانات بشكل يمنع الوصول إليها إلا من خلال حاوية الـ Backend فقط لتعزيز الحماية ضد الاختراقات الخارجية.
