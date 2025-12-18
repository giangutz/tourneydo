'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { generateWeighInList } from '@/lib/actions/weigh-in'
import { toast } from 'sonner'
import { Dna, Shuffle } from 'lucide-react'

interface WeighInGeneratorProps {
  tournamentId: string
  disabled?: boolean
}

export function WeighInGenerator({ tournamentId, disabled }: WeighInGeneratorProps) {
  const [isPending, startTransition] = useTransition()

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateWeighInList(tournamentId)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Button 
      onClick={handleGenerate} 
      disabled={disabled || isPending}
      variant="secondary"
    >
      {isPending ? (
        <Dna className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Shuffle className="mr-2 h-4 w-4" />
      )}
      Generate Surprise Check List
    </Button>
  )
}
