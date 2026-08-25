import Hero from "@/components/home/Hero";
import FeaturedVehicles from "@/components/home/FeaturedVehicles";
import Categories from "@/components/home/Categories";
import TechnologyHighlights from "@/components/home/TechnologyHighlights";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import StatsSection from "@/components/home/StatsSection";
import FinanceTeaser from "@/components/home/FinanceTeaser";
import Testimonials from "@/components/home/Testimonials";
import AwardsPartners from "@/components/home/AwardsPartners";
import LatestNews from "@/components/home/LatestNews";
import HomeFaq from "@/components/home/HomeFaq";
import CtaBanner from "@/components/shared/CtaBanner";

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedVehicles />
      <Categories />
      <TechnologyHighlights />
      <WhyChooseUs />
      <StatsSection />
      <FinanceTeaser />
      <Testimonials />
      <AwardsPartners />
      <LatestNews />
      <HomeFaq />
      <CtaBanner />
    </>
  );
}
