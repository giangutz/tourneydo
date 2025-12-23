import { HeroSection } from '@/components/landing/hero-section'
import { ProblemStatement } from '@/components/landing/problem-statement'
import { SolutionOverview } from '@/components/landing/solution-overview'
import { FeatureShowcase } from '@/components/landing/feature-showcase'
import { PricingSection } from '@/components/landing/pricing-section'
import { FinalCTA } from '@/components/landing/final-cta'
import { LandingFooter } from '@/components/landing/landing-footer'

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <ProblemStatement />
      <SolutionOverview />
      <FeatureShowcase />
      <PricingSection />
      <FinalCTA />
      <LandingFooter />
    </main>
  )
}
