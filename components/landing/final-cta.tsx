'use client'

import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function FinalCTA() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden bg-primary">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/80" />
      
      {/* Animated Blobs */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[500px] h-[500px] bg-white/10 rounded-full blur-[120px] animate-pulse-slow pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[400px] h-[400px] bg-secondary/30 rounded-full blur-[100px] animate-pulse-slow animation-delay-2000 pointer-events-none" />

      <div className="container relative mx-auto px-4 z-10">
        <div className="max-w-4xl mx-auto text-center space-y-10">
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-white leading-[1.1]">
            Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">Transform</span> <br/>
            Your Tournaments?
          </h2>
          
          <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            Join hundreds of organizers who have upgraded from spreadsheets to our complete competition operating system.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-8">
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-white/90 hover:scale-105 transition-all duration-300 text-lg px-10 py-7 rounded-full shadow-2xl shadow-black/20 font-bold"
              asChild
            >
              <Link href="/sign-up">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            
            <Button 
                variant="outline" 
                size="lg" 
                className="bg-primary/20 hover:bg-primary/30 text-white border-white/20 hover:border-white/40 text-lg px-10 py-7 rounded-full backdrop-blur-sm transition-all"
                asChild
            >
                <Link href="/about">
                    View Features
                </Link>
            </Button>
          </div>

          <div className="pt-8 flex flex-wrap justify-center gap-x-8 gap-y-4 text-white/90 text-sm font-medium">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1 rounded-full"><div className="w-1.5 h-1.5 bg-green-400 rounded-full" /></div>
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1 rounded-full"><div className="w-1.5 h-1.5 bg-green-400 rounded-full" /></div>
              14-day free trial
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1 rounded-full"><div className="w-1.5 h-1.5 bg-green-400 rounded-full" /></div>
              Cancel anytime
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
