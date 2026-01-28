'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Check } from 'lucide-react'
import Link from 'next/link'

export function PricingSection() {
  const tiers = [
    {
      name: 'Free Trial',
      price: 'Free',
      period: '14 days',
      description: 'Perfect for trying out TourneyDo',
      features: [
        '1 tournament',
        'Up to 50 participants',
        'All core features',
        'Email support',
        'No credit card required'
      ],
      cta: 'Start Free Trial',
      href: '/sign-up',
      popular: false
    },
    {
      name: 'Pro',
      price: '$49',
      period: 'per tournament',
      description: 'For professional tournament organizers',
      features: [
        'Unlimited tournaments',
        'Unlimited participants',
        'All features included',
        'Priority support',
        'Advanced analytics',
        'Custom branding'
      ],
      cta: 'Get Started',
      href: '/sign-up',
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'contact us',
      description: 'For organizations and federations',
      features: [
        'Everything in Pro',
        'White-label option',
        'Dedicated support',
        'Custom integrations',
        'Training included',
        'SLA guarantee'
      ],
      cta: 'Contact Sales',
      href: '/contact',
      popular: false
    }
  ]

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Simple, Transparent <span className="text-primary">Pricing</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Choose the plan that fits your needs. No hidden fees.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier, index) => (
            <Card 
              key={index} 
              className={`relative bg-card ${
                tier.popular 
                  ? 'border-2 border-primary shadow-xl scale-105' 
                  : 'border'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {tier.name}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {tier.description}
                </p>
                
                <div className="mb-6">
                  <span className="text-5xl font-bold text-foreground">
                    {tier.price}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    / {tier.period}
                  </span>
                </div>

                <Button 
                  className={`w-full mb-8 ${
                    tier.popular 
                      ? 'shadow-lg hover:shadow-xl transition-all' 
                      : ''
                  }`}
                  variant={tier.popular ? 'default' : 'outline'}
                  size="lg"
                  asChild
                >
                  <Link href={tier.href}>
                    {tier.cta}
                  </Link>
                </Button>

                <ul className="space-y-3">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-muted-foreground mt-12">
          All plans include 14-day money-back guarantee
        </p>
      </div>
    </section>
  )
}
