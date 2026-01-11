'use client'

import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function HeroSearch() {
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
    <form onSubmit={handleSearch} className="relative w-full max-w-lg mt-8 hidden md:block">
      <div className="relative flex items-center">
        <div className="absolute left-3 text-muted-foreground pointer-events-none">
          <Search className="h-5 w-5" />
        </div>
        <Input 
          type="text" 
          placeholder="Search for tournaments near you..." 
          className="pl-10 pr-32 h-14 rounded-full border-2 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500 text-base shadow-sm bg-white/80 backdrop-blur-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="absolute right-2">
            <Button size="lg" type="submit" className="rounded-full px-6 h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
                Find Event
            </Button>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-500 pl-4">
        Popular: <span className="text-indigo-600 cursor-pointer hover:underline" onClick={() => router.push('/tournaments?search=National')}>Nationals</span>, <span className="text-indigo-600 cursor-pointer hover:underline" onClick={() => router.push('/tournaments?search=Sparring')}>Sparring</span>, <span className="text-indigo-600 cursor-pointer hover:underline" onClick={() => router.push('/tournaments?search=Poomsae')}>Poomsae</span>
      </p>
    </form>
  )
}
