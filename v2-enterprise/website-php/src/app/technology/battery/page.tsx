import type { Metadata } from "next";
import PageHero from "@/components/shared/PageHero";
import { Container, Section, Eyebrow } from "@/components/ui/Container";
import CtaBanner from "@/components/shared/CtaBanner";
import { Flame, Shield, Layers, Recycle } from "lucide-react";

export const metadata: Metadata = {
  title: "Battery Technology",
  description: "BYD's Blade Battery: LFP chemistry, Cell-to-Body construction, and industry-leading safety testing.",
};

const FEATURES = [
  { icon: Flame, t: "Passes the Nail Penetration Test", d: "The Blade Battery is famously demonstrated by driving a steel nail through a fully charged cell — with no fire, no smoke, and only a mild surface temperature rise." },
  { icon: Layers, t: "Cell-to-Body Construction", d: "On models like the Seal, battery cells are integrated directly into the vehicle chassis, improving structural rigidity by up to 70% while freeing up cabin space." },
  { icon: Shield, t: "Lithium Iron Phosphate (LFP) Chemistry", d: "LFP cells are inherently more thermally stable than traditional NMC batteries, virtually eliminating the risk of thermal runaway." },
  { icon: Recycle, t: "8-Year / 1.6 Million KM Warranty", d: "Every Blade Battery is backed by an industry-leading warranty, reflecting BYD's confidence in its longevity and degradation resistance." },
];

export default function BatteryTechnologyPage() {
  return (
    <>
      <PageHero
        eyebrow={{ en: "Battery Technology", ar: "تقنية البطاريات" }}
        title={{ en: "The safest battery on the road", ar: "أكثر بطارية أماناً على الطريق" }}
        description={{
          en: "The Blade Battery reimagines cell chemistry and structure to eliminate thermal runaway risk entirely.",
          ar: "تعيد بطارية Blade تصميم كيمياء وهيكل الخلايا للقضاء تماماً على خطر الانفجار الحراري.",
        }}
      />
      <Section className="pt-0">
        <Container>
          <div className="grid gap-5 md:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.t} className="card-elevated flex gap-4 rounded-2xl p-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold">{f.t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>
      <Section className="bg-bg-subtle">
        <Container className="max-w-3xl text-center">
          <Eyebrow className="justify-center">Battery Capacity</Eyebrow>
          <h2 className="mx-auto mt-3 max-w-xl text-balance text-3xl font-black tracking-tight sm:text-4xl">
            38.8 to 108.8 kWh across the lineup
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-fg-muted">
            From the efficient Seagull to the spacious Tang 7-seater, every Blade Battery pack is engineered for real-world Iraqi conditions.
          </p>
        </Container>
      </Section>
      <CtaBanner />
    </>
  );
}
