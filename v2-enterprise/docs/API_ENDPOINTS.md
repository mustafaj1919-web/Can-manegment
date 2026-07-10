# نقاط الاتصال البرمجية للمؤسسة (V2 API Endpoints Audit)

يوضح هذا الملف تفاصيل نقاط الاتصال (API Endpoints) المتوفرة في خادم الخلفية الجديد (ASP.NET Core API) والمرتبطة بالواجهة الأمامية للمؤسسة.

---

## 1. نقاط اتصال المصادقة (Auth Endpoints)
* **المسار الأساسي**: `/api/Auth`
* **المتحكم**: `AuthController.cs`

| الطريقة | المسار الفرعي | الوصف | البيانات المرسلة (Body/Form) | البيانات المرجعة (JSON) | الحماية |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **POST** | `/login` | تسجيل الدخول وتوليد رمز JWT | `Username`, `Password` (JSON) | `token`, `user` object, `branches` list, `active_branch` | مفتوح |
| **GET** | `/me` | جلب بيانات جلسة المستخدم الحالي | بلا | `user` object, `branches` list, `active_branch` | يتطلب JWT |
| **POST** | `/switch-branch` | تبديل الفرع النشط وتوليد رمز JWT جديد | `branch_id` (Form URL-Encoded) | `token`, `user` object, `branches` list, `active_branch` | يتطلب JWT |

---

## 2. نقاط اتصال العملاء (Customers Endpoints)
* **المسار الأساسي**: `/api/Customers`
* **المتحكم**: `CustomersController.cs`

| الطريقة | المسار الفرعي | الوصف | البيانات المرسلة | البيانات المرجعة | الحماية |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **POST** | `/` | تسجيل عميل جديد | `CreateCustomerCommand` (JSON) | `success`, `customerId`, `message` | يتطلب JWT |
| **GET** | `/` | قائمة كافة العملاء في نفس الفرع | بلا | `success`, `data` (List) | يتطلب JWT |
| **GET** | `/{id}/ledger` | كشف حساب الأستاذ المساعد للعميل | `startDate`, `endDate` (Query) | `success`, `data` (Ledger DTO) | يتطلب JWT |
| **GET** | `/{id}/statement` | ملخص كشف الحساب المالي للعميل | `startDate`, `endDate` (Query) | `success`, `data` (Statement DTO) | يتطلب JWT |
| **POST** | `/{id}/documents` | رفع مستند للعميل (وجه الهوية/السكن) | `documentType`, `file` (Form Data) | `success`, `documentId`, `message` | يتطلب JWT |
| **GET** | `/documents/{fileName}` | تحميل مستند عميل معزول ومحمي بالفرع | بلا | Physical File (PDF/Image) | يتطلب JWT |

---

## 3. نقاط اتصال الموردين (Suppliers Endpoints)
* **المسار الأساسي**: `/api/Suppliers`
* **المتحكم**: `SuppliersController.cs`

| الطريقة | المسار الفرعي | الوصف | البيانات المرسلة | البيانات المرجعة | الحماية |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **POST** | `/` | تسجيل مورد جديد | `CreateSupplierCommand` (JSON) | `success`, `supplierId`, `message` | يتطلب JWT |
| **POST** | `/{id}/pay` | صرف دفعة مالية للمورد وتوليد القيد وسند الصرف | `PaySupplierCommand` (JSON) | `success`, `paymentId`, `message` | يتطلب JWT |

---

## 4. نقاط اتصال المخزون والسيارات (Inventory Endpoints)
* **المسار الأساسي**: `/api/Inventory`
* **المتحكم**: `InventoryController.cs`

| الطريقة | المسار الفرعي | الوصف | البيانات المرسلة | البيانات المرجعة | الحماية |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **POST** | `/` | تسجيل شراء سيارة جديدة | `CreateVehicleCommand` (JSON) | `success`, `vehicleId`, `message` | يتطلب JWT |
| **GET** | `/` | قائمة السيارات المتاحة والمباعة بالفرع | `status` (Query) | `success`, `data` (List) | يتطلب JWT |
| **GET** | `/report` | تقرير ملخص المخزون العام | بلا | `success`, `data` (Summary) | يتطلب JWT |
| **GET** | `/{id}` | تفاصيل سيارة محددة وتكاليفها | بلا | `success`, `data` (VehicleDetails) | يتطلب JWT |
| **POST** | `/{id}/costs` | إضافة تكلفة إضافية للسيارة (صيانة/شحن) | `AddVehicleCostCommand` (JSON) | `success`, `vehicleCostId`, `message` | يتطلب JWT |
| **POST** | `/{id}/images` | رفع صورة للسيارة وحفظها بالقرص | `file` (Form Data) | `success`, `vehicleImageId`, `message` | يتطلب JWT |

---

## 5. نقاط اتصال المبيعات (Sales Endpoints)
* **المسار الأساسي**: `/api/Sales`
* **المتحكم**: `SalesController.cs`

| الطريقة | المسار الفرعي | الوصف | البيانات المرسلة | البيانات المرجعة | الحماية |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **POST** | `/` | إنشاء عقد بيع جديد (نقدي/تقسيط) مع القيود | `CreateSaleContractCommand` (JSON) | `success`, `contractId`, `message` | يتطلب JWT |
| **POST** | `/{id}/cancel` | إلغاء وعكس عقد بيع قائم محاسبياً (Reversal) | بلا | `success`, `message` | يتطلب JWT |
| **GET** | `/report` | تقرير ملخص المبيعات والمشتريات الأساسي | بلا | `success`, `data` (Report) | يتطلب JWT |

---

## 6. نقاط اتصال المشتريات (Purchases Endpoints)
* **المسار الأساسي**: `/api/Purchases`
* **المتحكم**: `PurchasesController.cs`

| الطريقة | المسار الفرعي | الوصف | البيانات المرسلة | البيانات المرجعة | الحماية |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **POST** | `/` | تسجيل فاتورة شراء جديدة والقيود المرتبطة بها | `CreatePurchaseCommand` (JSON) | `success`, `purchaseId`, `message` | يتطلب JWT |

---

## 7. نقاط اتصال الأقساط (Installments Endpoints)
* **المسار الأساسي**: `/api/Installments`
* **المتحكم**: `InstallmentsController.cs`

| الطريقة | المسار الفرعي | الوصف | البيانات المرسلة | البيانات المرجعة | الحماية |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **POST** | `/{id}/pay` | سداد قسط وتوليد سند القبض والقيد اليومي | `PayInstallmentCommand` (JSON) | `success`, `paymentId`, `message` | يتطلب JWT |
| **GET** | `/schedule/{contractId}` | جلب جدول سداد الأقساط لعقد مبيعات محدد | بلا | `success`, `data` (Schedule) | يتطلب JWT |
| **GET** | `/overdue` | قائمة الأقساط المتأخرة بالفرع حالياً | بلا | `success`, `data` (List) | يتطلب JWT |

---

## 8. نقاط اتصال التقارير واللوحات المحاسبية (Accounting Endpoints)
* **المسار الأساسي**: `/api/Accounting`
* **المتحكم**: `AccountingController.cs`

| الطريقة | المسار الفرعي | الوصف | معايير الفرز والبحث (Query) | البيانات المرجعة (JSON) | الحماية |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **POST** | `/journal-entry` | تسجيل وترحيل قيد محاسبي يدوي متوازن | `CreateJournalEntryCommand` (JSON) | `success`, `journalEntryId`, `message` | يتطلب JWT |
| **GET** | `/trial-balance` | ميزان المراجعة متوازن ومقسم مدين ودائن | `fromDate`, `toDate` | `success`, `data` (TrialBalance) | يتطلب JWT |
| **GET** | `/profit-loss` | قائمة الأرباح والخسائر وحساب صافي الربح | `fromDate`, `toDate` | `success`, `data` (ProfitAndLoss) | يتطلب JWT |
| **GET** | `/balance-sheet` | الميزانية العمومية (الأصول = الالتزامات + الملكية) | `toDate` | `success`, `data` (BalanceSheet) | يتطلب JWT |
| **GET** | `/customer-ledger` | كشف حساب عميل تفصيلي مرقم و Running Balance | `customerId`, `fromDate`, `toDate`, `page`, `pageSize` | `success`, `data` (Ledger) | يتطلب JWT |
| **GET** | `/supplier-ledger` | كشف حساب مورد تفصيلي مرقم و Running Balance | `supplierId`, `fromDate`, `toDate`, `page`, `pageSize` | `success`, `data` (Ledger) | يتطلب JWT |
| **GET** | `/inventory-valuation` | تقرير تقييم القيمة الدفترية لمخزون السيارات المتاحة | `asOfDate` | `success`, `data` (Valuation) | يتطلب JWT |
| **GET** | `/installments-aging` | تقرير تحليل أعمار الأقساط (مسدد/مستحق/متأخر) | `asOfDate` | `success`, `data` (Aging) | يتطلب JWT |
| **GET** | `/sales-profit` | تقرير أرباح مبيعات السيارات (الإيراد المحقق والمؤجل) | `fromDate`, `toDate` | `success`, `data` (SalesReport) | يتطلب JWT |
