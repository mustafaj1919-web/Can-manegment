import type { Metadata } from "next";
import PageHero from "@/components/shared/PageHero";
import { Container, Section, Eyebrow } from "@/components/ui/Container";
import CtaBanner from "@/components/shared/CtaBanner";
import { Cpu, Radar, Gauge, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Electric Technology",
  description: "BYD's e-Platform 3.0 architecture and DiPilot intelligent driving assistance.",
};

const FEATURES = [
  { icon: Cpu, en: { t: "e-Platform 3.0", d: "A ground-up EV architecture that integrates the motor, gearbox, and electronic control unit into a single 8-in-1 module, reducing weight and boosting efficiency by up to 10%." }, ar: { t: "منصة e-Platform 3.0", d: "بنية كهربائية مبنية من الصفر تدمج المحرك وناقل الحركة ووحدة التحكم الإلكترونية في وحدة واحدة بثمانية عناصر، ما يقلل الوزن ويرفع الكفاءة حتى 10%." } },
  { icon: Radar, en: { t: "DiPilot Driver Assistance", d: "A radar and camera suite delivering adaptive cruise control, automatic emergency braking, and lane-centering across highway and city driving." }, ar: { t: "نظام DiPilot لمساعدة السائق", d: "حزمة رادار وكاميرات توفر تثبيت سرعة تكيفي وفرملة طوارئ تلقائية وتوسيط في الحارة على الطرق السريعة والمدينة." } },
  { icon: Gauge, en: { t: "Instant Torque Delivery", d: "Electric motors deliver 100% torque from a standstill, giving BYD models their signature immediate, silent acceleration." }, ar: { t: "عزم دوران فوري", d: "توفر المحركات الكهربائية 100% من عزم الدوران من السكون، ما يمنح سيارات BYD تسارعاً فورياً وهادئاً مميزاً." } },
  { icon: ShieldCheck, en: { t: "Intelligent Torque Adaptation", d: "iTAC continuously adjusts torque distribution per wheel in milliseconds to maintain traction on any road surface." }, ar: { t: "التحكم الذكي بعزم الدوران", d: "يعدّل نظام iTAC توزيع العزم على كل عجلة خلال أجزاء من الثانية للحفاظ على الثبات على أي سطح طريق." } },
];

export default function ElectricTechnologyPage() {
  return (
    <>
      <PageHero
        eyebrow={{ en: "Electric Technology", ar: "التقنية الكهربائية" }}
        title={{ en: "A drivetrain engineered for the future", ar: "نظام دفع مصمم للمستقبل" }}
        description={{
          en: "BYD's e-Platform 3.0 unifies every electric component into one efficient, intelligent system.",
          ar: "توحّد منصة e-Platform 3.0 من BYD كل مكون كهربائي في نظام واحد ذكي وفعّال.",
        }}
      />
      <Section className="pt-0">
        <Container>
          <div className="grid gap-5 md:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.en.t} className="card-elevated flex gap-4 rounded-2xl p-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold">{f.en.t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{f.en.d}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>
      <Section className="bg-bg-subtle">
        <Container className="max-w-3xl text-center">
          <Eyebrow className="justify-center">{"Performance"}</Eyebrow>
          <h2 className="mx-auto mt-3 max-w-xl text-balance text-3xl font-black tracking-tight sm:text-4xl">
            Up to 517 HP and 3.9s to 100 km/h
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-fg-muted">
            The e-Platform 3.0 architecture powers everything from the efficient Seagull city car to the flagship Han performance sedan.
          </p>
        </Container>
      </Section>
      <CtaBanner />
    </>
  );
}
