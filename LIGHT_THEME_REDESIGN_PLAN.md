# خطة إعادة التصميم الشاملة للوضع الأبيض (LIGHT_THEME_REDESIGN_PLAN)

يهدف هذا المشروع إلى تحويل وتطوير الواجهة الرسومية للوضع الأبيض (Light Theme) في نظام إدارة معرض السيارات لتصبح بمستوى الأنظمة العالمية الراقية مثل Odoo Enterprise و Stripe Dashboard و Notion و Linear، بالاعتماد على تصميم ناعم ونظيف ومحترف وخالٍ من المبالغات البصرية.

---

## 1. المشاكل الحالية في التصميم الحالي (Current Problems)
> [!WARNING]
> يعاني التصميم الحالي للوضع الأبيض من المشاكل التالية:
> - **ألوان داكنة صلبة وثابتة (Hardcoded Hex Colors)**: وجود خلفيات سوداء ثابتة مثل `#070707` و `#0e0e0e` داخل البطاقات واللوحات مما يجعلها تبدو ككتل سوداء عند الانتقال للوضع الأبيض.
> - **نصوص بيضاء على خلفيات بيضاء**: بسبب الألوان الثابتة، تفقد بعض النصوص تباينها وتتحول إلى نصوص بيضاء بالكامل على خلفية بيضاء مما يجعلها غير مرئية.
> - **ضعف الخطوط وهيكل العناوين**: غياب التناسق المنظم للخطوط وتداخل خطوط العناوين مع نصوص الجسم دون تدرج واضح في الحجم والوزن.
> - **جداول ونماذج غير مرنة**: تفتقر الجداول إلى ميزات التحكم المتقدمة مثل التحكم في ظهور الأعمدة وإعادة تحجيمها، وتفتقر النماذج إلى تصاميم تفاعلية حديثة مثل العناوين العائمة (Floating Labels).
> - **عناصر زجاجية وتوهج مفرط (Glassmorphism / Glow)**: استخدام غير متناسق للتوهج الخلفي الأحمر المخصص للوضع الداكن مما يؤثر سلباً على التباين في الوضع الأبيض.

---

## 2. التصور البصري والذهني للتصميم الجديد (Visual Design Concept)
> [!TIP]
> سنعتمد الفلسفة التالية في التصميم الجديد للوضع الأبيض:
> - **لوحة ألوان مستوحاة من Stripe & Linear**:
>   - لون الخلفية الأساسي: أبيض نظيف وناعم للغاية (`#F8FAFC` أو `#FFFFFF`).
>   - ألوان الحدود: ناعمة وذات تباين دقيق (`#E5E7EB`).
>   - اللون الأساسي (Teal): لون هادئ وراقٍ للمؤسسات (`#0F766E`) يحل محل الأحمر اللامع.
> - **الخطوط المنظمة (Typography)**:
>   - خط العناوين: **Cairo** (أوزان 600، 700، 800) لإضفاء هوية عربية قوية واحترافية.
>   - خط النصوص والبيانات: **IBM Plex Sans Arabic** لضمان القراءة المريحة للبيانات والتقارير المالية.
>   - مقاسات الخطوط: H1 = 32px, H2 = 24px, H3 = 20px, Body = 14px-16px.
> - **البطاقات والظلال (Cards & Shadows)**:
>   - بطاقات بيضاء تماماً بجوانب مستديرة ناعمة (`rounded-xl` أو `rounded-2xl`).
>   - ظلال خفيفة جداً وعميقة (`shadow-sm` أو `shadow-[0_2px_8px_rgba(0,0,0,0.04)]`).
>   - إزالة كافة تأثيرات الـ Blur والـ Glassmorphism المفرطة وتجنب التوهج الأحمر في الوضع الأبيض.

---

## 3. أسئلة مفتوحة للمستخدم (Open Questions)
> [!IMPORTANT]
> يرجى مراجعة الأسئلة التالية وإفادتنا برأيك:
> 1. **هل ترغب في تطبيق اللون الأساسي الجديد (Teal - `#0F766E`) على الوضع الداكن أيضاً لتوحيد الهوية البصرية، أم يقتصر فقط على الوضع الأبيض ويبقى الوضع الداكن بلونه الأحمر الرياضي؟**
> 2. **بالنسبة لتصدير الـ PDF في الجداول، هل تفضل الاعتماد على خيار الطباعة المنسق للورق (A4 Landscape Print Layout) كخيار افتراضي متكامل لحفظه كـ PDF عبر المتصفح، أم تفضل دمج مكتبة تصدير PDF مخصصة؟**

---

## 4. الملفات التي ستتغير (Proposed Changes)

### [Design System & Styling]
#### [MODIFY] [globals.css](file:///d:/System/car_showroom_management/frontend/src/styles/globals.css)
- تحديث جميع متغيرات الـ HSL الخاصة بالوضع الأبيض للالتزام بلوحة الألوان الجديدة.
- إضافة إعدادات الخطوط (Cairo للعناوين و IBM Plex Sans Arabic للنصوص) تحت الطبقة `@layer base`.
- ضبط تنسيقات المدخلات الفردية والنماذج والجداول والبطاقات لتطبيق الأنماط الجديدة تلقائياً.

### [Components - Tables & Filters]
#### [NEW] [AdvancedTable.tsx](file:///d:/System/car_showroom_management/frontend/src/components/shared/AdvancedTable.tsx)
- إنشاء مكون جدول متقدم وقابل لإعادة الاستخدام يدعم:
  - Sticky Headers.
  - Column Resize (تغيير حجم الأعمدة).
  - Column Hide/Show (إخفاء وإظهار الأعمدة) عبر قائمة منسدلة جانبية.
  - Row Selection (تحديد الصفوف بالكامل).
  - تصدير البيانات إلى Excel و PDF مدمج.
  - Pagination (تنقل احترافي) و Search (بحث فوري).

### [Components - Navigation & Sidebar]
#### [MODIFY] [Sidebar.tsx](file:///d:/System/car_showroom_management/frontend/src/components/layout/Sidebar.tsx)
- تعديل تصميم الشريط الجانبي ليماثل شريط Linear: خلفية بيضاء في الوضع الأبيض مع حدود ناعمة ومؤشر نشط دقيق باللون الـ Teal وتأثيرات Hover ناعمة.

### [Components - Dashboard & KPIs]
#### [MODIFY] [KpiCards.tsx](file:///d:/System/car_showroom_management/frontend/src/components/dashboard/KpiCards.tsx)
- إعادة تصميم بطاقات الـ KPI لتكون مسطحة (Minimalist) وتحتوي على مؤشر Trend، مع إيقونات هادئة وتأثيرات Hover ناعمة بدون تدرجات لونية صاخبة.
#### [MODIFY] [ManagementPanel.tsx](file:///d:/System/car_showroom_management/frontend/src/components/dashboard/ManagementPanel.tsx)
- تعديل اللوحة الإدارية لتطابق التصميم النظيف والتدرج الحجمي واللوني الجديد.

### [Forms & Validation]
#### [NEW] [ModernInput.tsx](file:///d:/System/car_showroom_management/frontend/src/components/ui/ModernInput.tsx)
- إنشاء حقول مدخلات بتأثير العناوين العائمة (Floating Labels) وتنسيقات متقدمة لحالات الخطأ والنجاح والتركيز.

### [Pages - Refactoring to use AdvancedTable & Modern Forms]
#### [MODIFY] [inventory/page.tsx](file:///d:/System/car_showroom_management/frontend/src/app/inventory/page.tsx)
#### [MODIFY] [sales/page.tsx](file:///d:/System/car_showroom_management/frontend/src/app/sales/page.tsx)
#### [MODIFY] [purchases/page.tsx](file:///d:/System/car_showroom_management/frontend/src/app/purchases/page.tsx)
#### [MODIFY] [expenses/page.tsx](file:///d:/System/car_showroom_management/frontend/src/app/expenses/page.tsx)
#### [MODIFY] [customers/page.tsx](file:///d:/System/car_showroom_management/frontend/src/app/customers/page.tsx)

---

## 5. مراحل التنفيذ (Implementation Phases)

### المرحلة الأولى: تعديل البنية الأساسية لنظام التصميم (CSS & Tokens)
- تحديث التوكنز والمتغيرات الأساسية في `globals.css` لتعريف لوحة الألوان والخطوط والأبعاد وحجم العناوين القياسي.

### المرحلة الثانية: بناء المكونات المشتركة المتقدمة
- بناء مكون الجدول المتقدم `AdvancedTable.tsx` ومكون المدخلات الحديثة `ModernInput.tsx`.

### المرحلة الثالثة: إعادة تصميم الشريط الجانبي والتنقل
- تعديل الشريط الجانبي وجعله متجاوباً بالكامل ومتناسقاً مع واجهة Linear.

### المرحلة الرابعة: تطوير لوحة التحكم الرئيسية والـ KPI Cards
- تعديل الـ KPI Cards واللوحة الإدارية لتعرض البيانات بشكل Odoo/Stripe دقيق ومحترف مع مؤشرات الاتجاه والأيقونات والظلال الناعمة.

### المرحلة الخامسة: ترقية الجداول والنماذج في الصفحات الرئيسية
- استبدال الجداول القديمة والنماذج في صفحات السيارات والمبيعات والمشتريات والعملاء والمصاريف بالمكونات الجديدة.

---

## 6. خطة التحقق والتدقيق (Verification Plan)

### الاختبارات التلقائية
- تشغيل فحص الأنواع الصارم للتأكد من عدم وجود أي مشاكل:
  `npm run type-check`
- تشغيل بناء المشروع النهائي للتأكد من جاهزيته للإنتاج:
  `npm run build`

### التحقق اليدوي البصري
- فحص جميع الصفحات المعدلة للتأكد من توافق اتجاهات الـ RTL بنسبة 100% وعدم وجود عناصر مكسورة أو متداخلة.
- اختبار التحويل بين الوضع الداكن والوضع الأبيض والتأكد من وضوح وقراءة كافة النصوص والجداول.
