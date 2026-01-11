'use client'

import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function HeroSearchMobile() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/tournaments?search=${encodeURIComponent(query)}`)
    } else {
      router.push('/tournaments')
    }
  }

  return (
    <form onSubmit={handleSearch} className="relative w-full mt-6 md:hidden">
      <div className="flex flex-col gap-3">
        <div className="relative">
             <div className="absolute left-3 top-3.5 text-muted-foreground pointer-events-none">
                <Search className="h-5 w-5" />
             </div>
            <Input 
            type="text" 
            placeholder="Search tournaments..." 
            className="pl-10 h-12 rounded-xl border border-slate-200 shadow-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            />
        </div>
        <Button size="lg" type="submit" className="w-full h-12 rounded-xl bg-indigo-600 text-white font-medium shadow-md">
            Find Tournament
        </Button>
      </div>
    </form>
  )
}
