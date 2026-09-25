import { AuroraCursor } from "@/components/landing/aurora-cursor";
import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { ProductFilm } from "@/components/landing/product-film";
import { DemoPreview } from "@/components/landing/demo-preview";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingCTA, LandingFooter } from "@/components/landing/cta";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <AuroraCursor />
      <LandingNav />
      <main className="relative z-[1]">
        <Hero />
        <Features />
        <ProductFilm />
        <DemoPreview />
        <HowItWorks />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
