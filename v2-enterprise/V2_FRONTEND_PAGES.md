# صفحات شاشة المستخدم ونظام الصلاحيات والربط (V2 Frontend Pages Audit)

يوضح هذا الملف جميع صفحات واجهة المستخدم لبرنامج Next.js داخل المجلد `v2-enterprise/frontend` ومساراتها، والـ API المستدعى من كل صفحة، والصلاحيات المطلوبة للعرض، وحالة اكتمالها الفنية.

---

## 1. الصفحات الأساسية واللوحات (Core Dashboards)

| اسم الصفحة | مسار الصفحة (Route Path) | الـ API المستدعى | الصلاحيات المطلوبة | الحالة الفنية |
| :--- | :--- | :--- | :--- | :--- |
| **لوحة التحكم الرئيسية** | `/` | `/api/dashboard`, `/api/notifications` | بلا (متاح لكافة المسجلين) | مكتملة (Completed) |
| **صفحة تسجيل الدخول** | `/login` | `/api/auth/login` | بلا (مفتوحة للجميع) | مكتملة (Completed) |

---

## 2. إدارة العمليات التشغيلية (Operations)

| اسم الصفحة | مسار الصفحة (Route Path) | الـ API المستدعى | الصلاحيات المطلوبة | الحالة الفنية |
| :--- | :--- | :--- | :--- | :--- |
| **قائمة عقود المبيعات** | `/sales` | `/api/Sales` | `Owner`, `Admin`, `Sales`, `Accountant` | مكتملة (Completed) |
| **عقد مبيعات محدد** | `/sales/[id]/contract` | `/api/Sales/{id}` | `Owner`, `Admin`, `Sales`, `Accountant` | مكتملة (Completed) |
| **سند بيع سيارة (إيصال)** | `/sales/[id]/receipt` | `/api/Sales/{id}` | `Owner`, `Admin`, `Sales`, `Accountant` | مكتملة (Completed) |
| **عقد بيع جديد (نقدي/تقسيط)** | `/sales/new` | `/api/Sales` (POST) | `Owner`, `Admin`, `Sales`, `Accountant` | مكتملة (Completed) |
| **قائمة المشتريات** | `/purchases` | `/api/Purchases` | `Owner`, `Admin`, `Accountant` | مكتملة (Completed) |
| **فاتورة شراء محددة** | `/purchases/[id]/contract` | `/api/Purchases/{id}` | `Owner`, `Admin`, `Accountant` | مكتملة (Completed) |
| **فاتورة شراء جديدة** | `/purchases/new` | `/api/Purchases` (POST) | `Owner`, `Admin`, `Accountant` | مكتملة (Completed) |
| **قائمة الأقساط وجدولتها** | `/installments` | `/api/Installments/overdue` | `Owner`, `Admin`, `Accountant` | مكتملة (Completed) |
| **تفاصيل قسط وسداد مالي** | `/installments/[id]` | `/api/Installments/{id}/pay` | `Owner`, `Admin`, `Accountant` | مكتملة (Completed) |
| **جدولة أقساط عقد مبيعات** | `/installments/[id]/schedule` | `/api/Installments/schedule/{contractId}` | `Owner`, `Admin`, `Accountant` | مكتملة (Completed) |

---

## 3. إدارة مخزون السيارات (Inventory)

| اسم الصفحة | مسار الصفحة (Route Path) | الـ API المستدعى | الصلاحيات المطلوبة | الحالة الفنية |
| :--- | :--- | :--- | :--- | :--- |
| **قائمة مخزون السيارات** | `/inventory` | `/api/Inventory` | بلا (العرض متاح للجميع بحدود الفروع) | مكتملة (Completed) |
| **تفاصيل السيارة وتكاليفها** | `/inventory/[id]` | `/api/Inventory/{id}` | `Owner`, `Admin`, `Sales`, `Accountant`, `Viewer` | مكتملة (Completed) |
| **تعديل بيانات سيارة** | `/inventory/[id]/edit` | `/api/Inventory/{id}` (PUT) | `Owner`, `Admin`, `Sales`, `Accountant` | مكتملة (Completed) |
| **المواصفات الفنية للسيارة** | `/inventory/[id]/specification` | `/api/Inventory/{id}` | بلا | مكتملة (Completed) |
| **تسجيل سيارة جديدة** | `/inventory/new` | `/api/Inventory` (POST) | `Owner`, `Admin`, `Accountant` | مكتملة (Completed) |

---

## 4. العملاء والموردين و CRM (CRM & Customers)

| اسم الصفحة | مسار الصفحة (Route Path) | الـ API المستدعى | الصلاحيات المطلوبة | الحالة الفنية |
| :--- | :--- | :--- | :--- | :--- |
| **إدارة العملاء والموردين** | `/customers` | `/api/Customers` | `Owner`, `Admin`, `Sales`, `Accountant` | مكتملة (Completed) |
| **ملف العميل والمستندات** | `/customers/[id]` | `/api/Customers/{id}` | `Owner`, `Admin`, `Sales`, `Accountant` | مكتملة (Completed) |
| **تعديل بيانات عميل/مورد** | `/customers/[id]/edit` | `/api/Customers/{id}` (PUT) | `Owner`, `Admin`, `Sales`, `Accountant` | مكتملة (Completed) |
| **كشف حساب مالي تفصيلي** | `/customers/[id]/statement` | `/api/Customers/{id}/statement` | `Owner`, `Admin`, `Sales`, `Accountant` | مكتملة (Completed) |
| **تسجيل عميل/مورد جديد** | `/customers/new` | `/api/Customers` (POST) | `Owner`, `Admin`, `Sales`, `Accountant` | مكتملة (Completed) |
| **سجل التفاعلات CRM** | `/crm` | `/api/crm` | `Owner`, `Admin`, `Sales` | مكتملة (Completed) |
| **خط أنابيب المبيعات** | `/pipeline` | `/api/pipeline` | `Owner`, `Admin`, `Sales` | مكتملة (Completed) |
| **إدارة الموظفين** | `/employees` | `/api/employees` | `Owner`, `Admin` | مكتملة (Completed) |
| **أداء الموظفين** | `/employees/performance` | `/api/employees/performance` | `Owner`, `Admin` | مكتملة (Completed) |

---

## 5. المالية والنقدية (Financial & Cashbox)

| اسم الصفحة | مسار الصفحة (Route Path) | الـ API المستدعى | الصلاحيات المطلوبة | الحالة الفنية |
| :--- | :--- | :--- | :--- | :--- |
| **حالة الصندوق اليومي** | `/cashbox` | `/api/cashbox` | `Owner`, `Admin`, `Accountant` | مكتملة (Completed) |
| **إقفال الصندوق وترحيله** | `/cashbox/close` | `/api/cashbox/close` (POST) | `Owner`, `Admin`, `Accountant` | مكتملة (Completed) |
| **سندات القبض والصرف** | `/vouchers` | `/api/vouchers` | `Owner`, `Admin`, `Accountant` | مكتملة (Completed) |
| **إدارة المصاريف** | `/expenses` | `/api/expenses` | `Owner`, `Admin`, `Accountant` | مكتملة (Completed) |
| **سعر الصرف المالي** | `/exchange-rate` | `/api/exchange-rate` | `Owner`, `Admin`, `Accountant` | مكتملة (Completed) |

---

## 6. النظام والمحاسبة الإدارية (Accounting & System Settings)

| اسم الصفحة | مسار الصفحة (Route Path) | الـ API المستدعى | الصلاحيات المطلوبة | الحالة الفنية |
| :--- | :--- | :--- | :--- | :--- |
| **شجرة الحسابات الأولية** | `/chart-of-accounts` | `/api/Accounting/chart-of-accounts` | `Owner`, `Admin`, `Accountant` | مكتملة (Completed) |
| **سجل القيود اليومية** | `/journal-entries` | `/api/Accounting/journal-entry` | `Owner`, `Admin`, `Accountant` | مكتملة (Completed) |
| **ميزان المراجعة** | `/trial-balance` | `/api/Accounting/trial-balance` | `Owner`, `Admin`, `Accountant` | مكتملة (Completed) |
| **لوحة التقارير والتحليلات** | `/reports` | بلا | `Owner`, `Admin`, `Accountant` | مكتملة (Completed) |
| **قائمة الأرباح والخسائر** | `/reports/monthly-profit` | `/api/Accounting/profit-loss` | `Owner`, `Admin`, `Accountant` | مكتملة (Completed) |
| **الميزانية العمومية للفترة** | `/reports/balance-sheet` | `/api/Accounting/balance-sheet` | `Owner`, `Admin`, `Accountant` | مكتملة (Completed) |
| **تقرير ربحية مبيعات السيارات**| `/reports/vehicle-profitability` | `/api/Accounting/sales-profit` | `Owner`, `Admin`, `Accountant` | مكتملة (Completed) |
| **أعمار ذمم العملاء والأقساط**| `/reports/ar-aging` | `/api/Accounting/installments-aging` | `Owner`, `Admin`, `Accountant` | مكتملة (Completed) |
| **تقرير مقارنة أداء الفروع** | `/reports/branch-comparison` | `/api/Accounting/branch-comparison` | `Owner`, `Admin` | مكتملة (Completed) |
| **تقرير مراكز التكلفة** | `/reports/cost-center` | `/api/Accounting/cost-center` | `Owner`, `Admin`, `Accountant` | مكتملة (Completed) |
| **تقرير حركة الصندوق** | `/reports/cashbox-movement` | `/api/Accounting/cashbox-movement` | `Owner`, `Admin`, `Accountant` | مكتملة (Completed) |
| **تقرير حركة البنك** | `/reports/bank-movement` | `/api/Accounting/bank-movement` | `Owner`, `Admin`, `Accountant` | مكتملة (Completed) |
| **تقرير فحص سلامة الحسابات** | `/reports/accounting-rules` | `/api/Accounting/integrity-rules` | `Owner`, `Admin` | مكتملة (Completed) |
| **قائمة مستخدمي النظام** | `/users` | `/api/users` | `Owner`, `Admin` | مكتملة (Completed) |
| **تعديل مستخدم نشط** | `/users/[id]/edit` | `/api/users/{id}` (PUT) | `Owner`, `Admin` | مكتملة (Completed) |
| **إضافة مستخدم جديد** | `/users/new` | `/api/users` (POST) | `Owner`, `Admin` | مكتملة (Completed) |
| **إدارة وتوزيع أذونات الأدوار**| `/roles` | `/api/roles` | `Owner`, `Admin` | مكتملة (Completed) |
| **مراقبة صحة النظام وأدائه** | `/system-health` | `/api/system-health` | `Owner`, `Admin` | مكتملة (Completed) |
| **النسخ الاحتياطي والاستعادة** | `/backup` | `/api/backup` | `Owner`, `Admin` | مكتملة (Completed) |
