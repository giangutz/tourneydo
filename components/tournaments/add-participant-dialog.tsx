'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Team } from '@/types/models'
import { PlayerFormDialog, type PlayerFormData } from '@/components/players/player-form-dialog'
import { useRouter } from 'next/navigation'
import { routes } from '@/config/routes'

interface AddParticipantDialogProps {
  tournamentId: string
  teams: Team[]
}

export function AddParticipantDialog({ tournamentId, teams }: AddParticipantDialogProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  async function handleSubmit(data: PlayerFormData) {
    try {
      const response = await fetch('/api/participants/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId,
          ...data,
          weight: data.weight ? parseFloat(data.weight) : null,
          height: data.height ? parseFloat(data.height) : null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to add participant')
      }

      toast.success('Participant added successfully')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add participant')
      throw error
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add Participant
      </Button>
      
      <PlayerFormDialog
        open={open}
        onOpenChange={setOpen}
        mode="add"
        title="Add Participant"
        description="Manually add a player to this tournament. They will be assigned to the selected team."
        teams={teams}
        showTeamSelector={true}
        onSubmit={handleSubmit}
        submitButtonText="Add Participant"
      />
    </>
  )
}
