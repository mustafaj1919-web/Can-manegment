"use client";

import { useI18n } from "@/lib/i18n/context";
import { BRAND } from "@/lib/data/locations";

const PRIVACY_EN = [
  { h: "1. Information We Collect", p: "We collect information you provide directly — such as your name, phone number, email, and vehicle preferences — when you book a test drive, apply for financing, submit a trade-in, or contact us." },
  { h: "2. How We Use Your Information", p: "Your information is used to respond to inquiries, process financing and service applications, schedule test drives, and — with your consent — send you offers and updates about new models." },
  { h: "3. Sharing With Third Parties", p: "We share financing applications with our partner banks solely to process credit approval. We do not sell your personal data to advertisers or unrelated third parties." },
  { h: "4. Data Security", p: "We apply reasonable administrative and technical safeguards to protect your data. No method of transmission over the internet is 100% secure, and we continually work to improve our protections." },
  { h: "5. Your Rights", p: "You may request access to, correction of, or deletion of your personal data at any time by contacting us at " + BRAND.email + "." },
  { h: "6. Updates to This Policy", p: "We may update this policy periodically. Material changes will be reflected on this page with an updated revision date." },
];

const PRIVACY_AR = [
  { h: "١. المعلومات التي نجمعها", p: "نجمع المعلومات التي تقدمها مباشرة — مثل اسمك ورقم هاتفك وبريدك الإلكتروني وتفضيلات السيارة — عند حجز تجربة قيادة أو التقديم لتمويل أو استبدال سيارة أو التواصل معنا." },
  { h: "٢. كيفية استخدام معلوماتك", p: "تُستخدم معلوماتك للرد على استفساراتك، ومعالجة طلبات التمويل والصيانة، وجدولة تجارب القيادة، وبموافقتك، إرسال عروض وتحديثات عن الطرازات الجديدة." },
  { h: "٣. المشاركة مع أطراف ثالثة", p: "نشارك طلبات التمويل مع المصارف الشريكة فقط لمعالجة الموافقة الائتمانية. نحن لا نبيع بياناتك الشخصية للمعلنين أو أطراف ثالثة غير ذات صلة." },
  { h: "٤. أمان البيانات", p: "نطبق إجراءات حماية إدارية وتقنية معقولة لحماية بياناتك. لا توجد طريقة نقل عبر الإنترنت آمنة بنسبة 100%، ونعمل باستمرار على تحسين حمايتنا." },
  { h: "٥. حقوقك", p: "يمكنك طلب الوصول إلى بياناتك الشخصية أو تصحيحها أو حذفها في أي وقت عبر التواصل معنا على " + BRAND.email + "." },
  { h: "٦. تحديثات هذه السياسة", p: "قد نحدّث هذه السياسة دورياً. سيتم إظهار أي تغييرات جوهرية على هذه الصفحة مع تاريخ مراجعة محدث." },
];

const TERMS_EN = [
  { h: "1. Acceptance of Terms", p: "By using this website or purchasing a vehicle from Al-Sadaka Motors, you agree to these terms of service." },
  { h: "2. Vehicle Pricing & Availability", p: "Prices displayed are indicative and subject to change without notice. Final pricing, taxes, and availability are confirmed at the point of sale." },
  { h: "3. Financing Terms", p: "Financing approval is subject to the credit policies of our partner banks. Al-Sadaka Motors does not guarantee approval or specific financing terms." },
  { h: "4. Test Drives", p: "Test drives require a valid driver's license and are subject to showroom availability. Drivers must be 21 years or older." },
  { h: "5. Warranty", p: "All new vehicles include the manufacturer's warranty as described at the point of sale. Extended warranty terms are available separately." },
  { h: "6. Limitation of Liability", p: "Al-Sadaka Motors is not liable for indirect damages arising from use of this website, to the fullest extent permitted by applicable law." },
];

const TERMS_AR = [
  { h: "١. قبول الشروط", p: "باستخدامك لهذا الموقع أو شرائك سيارة من الأصدقاء للسيارات، فإنك توافق على شروط الخدمة هذه." },
  { h: "٢. أسعار وتوفر السيارات", p: "الأسعار المعروضة استرشادية وقابلة للتغيير دون إشعار مسبق. يتم تأكيد السعر النهائي والضرائب والتوفر عند نقطة البيع." },
  { h: "٣. شروط التمويل", p: "تخضع الموافقة على التمويل لسياسات الائتمان الخاصة بالمصارف الشريكة. لا تضمن الأصدقاء للسيارات الموافقة أو شروط تمويل محددة." },
  { h: "٤. تجارب القيادة", p: "تتطلب تجربة القيادة رخصة قيادة سارية وتخضع لتوفر المعرض. يجب أن يكون عمر السائق 21 عاماً أو أكثر." },
  { h: "٥. الضمان", p: "تشمل جميع السيارات الجديدة ضمان الشركة المصنّعة كما هو موضح عند نقطة البيع. تتوفر شروط ضمان ممتد بشكل منفصل." },
  { h: "٦. حدود المسؤولية", p: "لا تتحمل الأصدقاء للسيارات مسؤولية الأضرار غير المباشرة الناتجة عن استخدام هذا الموقع، إلى أقصى حد يسمح به القانون المعمول به." },
];

export default function LegalContent({ type }: { type: "privacy" | "terms" }) {
  const { locale } = useI18n();
  const sections =
    type === "privacy" ? (locale === "ar" ? PRIVACY_AR : PRIVACY_EN) : locale === "ar" ? TERMS_AR : TERMS_EN;

  return (
    <div className="prose-legal">
      <p className="text-sm text-fg-subtle">
        {locale === "ar" ? "آخر تحديث: 9 يوليو 2026" : "Last updated: July 9, 2026"}
      </p>
      <div className="mt-8 space-y-8">
        {sections.map((s) => (
          <div key={s.h}>
            <h2 className="text-lg font-extrabold">{s.h}</h2>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">{s.p}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
