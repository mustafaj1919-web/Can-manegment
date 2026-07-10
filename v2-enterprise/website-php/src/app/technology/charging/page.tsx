import type { Metadata } from "next";
import PageHero from "@/components/shared/PageHero";
import { Container, Section, Eyebrow } from "@/components/ui/Container";
import CtaBanner from "@/components/shared/CtaBanner";
import LocationsMini from "@/components/shared/LocationsMini";
import { Home, Zap, MapPinned } from "lucide-react";

export const metadata: Metadata = {
  title: "Charging Solutions",
  description: "Home, public, and DC fast charging options for BYD owners in Iraq.",
};

const OPTIONS = [
  { icon: Home, t: "Home AC Charging", d: "Install a home charging point and wake up to a full battery every morning. Standard 7kW installation available through our partner electricians." },
  { icon: Zap, t: "DC Fast Charging", d: "Available at every Al-Sadaka Motors showroom, delivering 30–80% charge in as little as 26 minutes depending on the model." },
  { icon: MapPinned, t: "Growing Public Network", d: "We're expanding fast-charging infrastructure across Baghdad, Erbil, and Basra in partnership with local energy providers." },
];

export default function ChargingSolutionsPage() {
  return (
    <>
      <PageHero
        eyebrow={{ en: "Charging Solutions", ar: "حلول الشحن" }}
        title={{ en: "Charging made simple", ar: "الشحن بكل بساطة" }}
        description={{
          en: "From home charging to our showroom fast-charge stations, keeping your BYD powered has never been easier.",
          ar: "من الشحن المنزلي إلى محطات الشحن السريع في معارضنا، أصبح الحفاظ على شحن سيارتك أسهل من أي وقت مضى.",
        }}
      />
      <Section className="pt-0">
        <Container>
          <div className="grid gap-5 md:grid-cols-3">
            {OPTIONS.map((o) => (
              <div key={o.t} className="card-elevated rounded-2xl p-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <o.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-base font-extrabold">{o.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{o.d}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>
      <Section className="bg-bg-subtle">
        <Container>
          <Eyebrow>Fast-Charge Locations</Eyebrow>
          <h2 className="mt-3 text-balance text-3xl font-black tracking-tight sm:text-4xl">
            DC fast chargers at every showroom
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <LocationsMini />
          </div>
        </Container>
      </Section>
      <CtaBanner />
    </>
  );
}
