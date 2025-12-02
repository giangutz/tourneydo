'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { PlayerFormDialog, type PlayerFormData } from '@/components/players/player-form-dialog'
import { useRouter } from 'next/navigation'

interface EditParticipantDialogProps {
  participant: {
    id: string
    player: {
      id: string
      first_name: string
      last_name: string
      email: string | null
      belt_level: string | null
      weight: number | null
      height: number | null
      dob: string | null
      gender: 'male' | 'female' | null
    }
  }
  tournamentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditParticipantDialog({ participant, tournamentId, open, onOpenChange }: EditParticipantDialogProps) {
  const router = useRouter()

  async function handleSubmit(data: PlayerFormData) {
    try {
      const response = await fetch('/api/participants/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: participant.player.id,
          tournamentId,
          ...data,
          weight: data.weight ? parseFloat(data.weight) : null,
          height: data.height ? parseFloat(data.height) : null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update participant')
      }

      toast.success('Participant updated successfully')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update participant')
      throw error
    }
  }

  return (
    <PlayerFormDialog
      open={open}
      onOpenChange={onOpenChange}
      mode="edit"
      title="Edit Participant"
      description={`Update the details for ${participant.player.first_name} ${participant.player.last_name}.`}
      player={{
        ...participant.player,
        coach_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any}
      onSubmit={handleSubmit}
      submitButtonText="Update Participant"
    />
  )
}
