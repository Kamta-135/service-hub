import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { CategoryGrid } from "@/components/landing/category-grid";
import { HowItWorks } from "@/components/landing/how-it-works";
import { TrustSection } from "@/components/landing/trust-section";
import { EmergencyBand } from "@/components/landing/emergency-band";
import { Testimonials } from "@/components/landing/testimonials";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <Hero />
      <CategoryGrid />
      <HowItWorks />
      <TrustSection />
      <EmergencyBand />
      <Testimonials />
      <Footer />
    </main>
  );
}
