'use client'

import { Button } from '@/components/ui/button'
import { ArrowRight, Play } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export function HeroSection() {
  const [showVideo, setShowVideo] = useState(false)

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:50px_50px]" />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-blue-900/50 to-transparent" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Trusted by Tournament Organizers Worldwide
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
            Tournament Management
            <br />
            <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              Made Simple
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-blue-100 max-w-2xl mx-auto">
            The Complete Platform for World Taekwondo Federation Competitions
          </p>

          {/* Description */}
          <p className="text-lg text-blue-200 max-w-2xl mx-auto">
            From registration to championship rounds, TourneyDo handles everything. 
            Focus on the competition, not the paperwork.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button 
              size="lg" 
              className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8 py-6 rounded-full shadow-xl hover:shadow-2xl transition-all"
              asChild
            >
              <Link href="/sign-up">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            
            <Button 
              size="lg" 
              variant="outline" 
              className="bg-white/10 backdrop-blur-sm text-white border-white/20 hover:bg-white/20 text-lg px-8 py-6 rounded-full"
              onClick={() => setShowVideo(true)}
            >
              <Play className="mr-2 h-5 w-5" />
              Watch Demo
            </Button>
          </div>

          {/* Trust Signals */}
          <div className="pt-8 flex flex-wrap justify-center gap-8 text-blue-200 text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              14-day free trial
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Cancel anytime
            </div>
          </div>
        </div>

        {/* Floating Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
            { value: '10,000+', label: 'Matches Managed' },
            { value: '500+', label: 'Tournaments' },
            { value: '50+', label: 'Schools' },
            { value: '99.9%', label: 'Uptime' },
          ].map((stat, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-3xl md:text-4xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-blue-200 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Modal */}
      {showVideo && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowVideo(false)}
        >
          <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden">
            <button 
              className="absolute top-4 right-4 z-10 text-white hover:text-gray-300"
              onClick={() => setShowVideo(false)}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* Placeholder for video */}
            <div className="w-full h-full flex items-center justify-center text-white">
              <p>Demo video would go here</p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
