import { HeroSection } from '@/components/landing/hero-section'
import { ProblemStatement } from '@/components/landing/problem-statement'
import { SolutionOverview } from '@/components/landing/solution-overview'
import { FeatureShowcase } from '@/components/landing/feature-showcase'
import { PricingSection } from '@/components/landing/pricing-section'
import { FinalCTA } from '@/components/landing/final-cta'
import { LandingFooter } from '@/components/landing/landing-footer'
import { StatsTicker } from '@/components/landing/stats-ticker'
import { SiteHeader } from '@/components/layouts/site-header'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />
        <StatsTicker />
        <ProblemStatement />
        <SolutionOverview />
        <FeatureShowcase />
        <PricingSection />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  )
}
