"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AlertCircle, Scale, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

interface ValidationParticipant {
  id: string
  name: string
  reason?: string
  currentWeight?: number
  currentHeight?: number
  age?: number
}

interface BracketValidationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  errorType: 'unweighed' | 'unassigned' | 'general' | 'invalid_belt'
  participants: ValidationParticipant[]
  tournamentId: string
}

export function BracketValidationDialog({
  open,
  onOpenChange,
  errorType,
  participants,
  tournamentId
}: BracketValidationDialogProps) {
  const router = useRouter()

  const getDialogContent = () => {
    switch (errorType) {
      case 'unweighed':
        return {
          title: "Incomplete Weigh-Ins",
          description: "The following participants have missing weigh-in data (weight or height). You can quick edit them here or manage them in the Participants page.",
          actionLabel: "Go to Participants Page",
          actionIcon: <Users className="mr-2 h-4 w-4" />,
          actionPath: `/dashboard/tournament-organizer/tournaments/${tournamentId}/participants`
        }
      case 'unassigned':
        return {
          title: "Division Assignment Failed",
          description: "The following participants could not be assigned to a valid division or weight class. Please updated their profile or check tournament division settings.",
          actionLabel: "Go to Participants Page",
          actionIcon: <Users className="mr-2 h-4 w-4" />,
          actionPath: `/dashboard/tournament-organizer/tournaments/${tournamentId}/participants`
        }
      case 'invalid_belt':
        return {
          title: "Invalid Belt Levels",
          description: "The following participants have belt levels that are not recognized by the system. Please update their profiles with a valid belt level or adding the belt to the system mapping.",
          actionLabel: "Go to Participants Page",
          actionIcon: <Users className="mr-2 h-4 w-4" />,
          actionPath: `/dashboard/tournament-organizer/tournaments/${tournamentId}/participants`
        }
      default:
        return {
          title: "Bracket Generation Failed",
          description: "An error occurred while generating brackets.",
          actionLabel: "Close",
          actionIcon: null,
          actionPath: null
        }
    }
  }

  const content = getDialogContent()



  const handleAction = () => {
    if (content.actionPath) {
      router.push(content.actionPath)
      onOpenChange(false)
    } else {
      onOpenChange(false)
    }
  }
  
  // Interactive Update Logic
  // editValues is a map of participant ID -> { weight?, height? }
  const [editValues, setEditValues] = useState<Record<string, { weight?: number, height?: number }>>({})
  // Track which IDs are being edited (visible inputs)
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set())
  const [isUpdating, setIsUpdating] = useState(false)
  
  const { updateBatchParticipantMeasurements } = require('@/lib/actions/update-batch-measurements')

  const toggleEdit = (p: ValidationParticipant) => {
    const newEditingIds = new Set(editingIds)
    if (newEditingIds.has(p.id)) {
      newEditingIds.delete(p.id)
    } else {
      newEditingIds.add(p.id)
      // Initialize values if not present
      if (!editValues[p.id]) {
        setEditValues(prev => ({
          ...prev,
          [p.id]: { weight: p.currentWeight, height: p.currentHeight }
        }))
      }
    }
    setEditingIds(newEditingIds)
  }

  const handleInputChange = (id: string, field: 'weight' | 'height', value: string) => {
    setEditValues(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value ? parseFloat(value) : undefined
      }
    }))
  }

  const saveAllChanges = async () => {
    if (editingIds.size === 0) return

    try {
      setIsUpdating(true)
      
      const updates = Array.from(editingIds).map(id => ({
        id: id,
        weight: editValues[id]?.weight,
        height: editValues[id]?.height
      }))

      await updateBatchParticipantMeasurements(updates, tournamentId)
      
      toast.success(`Updated ${updates.length} participants`)
      setEditingIds(new Set())
      setEditValues({})
      onOpenChange(false) // Close dialog immediately as requested
    } catch (e: any) {
      toast.error(`Failed to update: ${e.message}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const hasPendingChanges = editingIds.size > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertCircle className="h-6 w-6" />
            <DialogTitle className="text-xl">{content.title}</DialogTitle>
          </div>
          <DialogDescription>
            {content.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-[200px] border rounded-md my-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participant Name</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Measurements</TableHead>
                <TableHead className="w-[100px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((participant) => {
                const isEditing = editingIds.has(participant.id)
                const age = participant.age || 0
                const isHeightBased = age < 12
                
                return (
                  <TableRow key={participant.id}>
                    <TableCell className="font-medium">{participant.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{participant.reason}</TableCell>

                    <TableCell>
                      {['unassigned', 'unweighed'].includes(errorType) ? (
                        isEditing ? (
                          <div className="flex gap-2 items-center">
                            {(isHeightBased || errorType === 'unweighed') && (
                                <div className="flex flex-col gap-1 w-24">
                                    <span className="text-[10px] text-muted-foreground">Height (cm)</span>
                                    <Input 
                                      type="number" 
                                      className="h-7 text-sm" 
                                      value={editValues[participant.id]?.height ?? ''} 
                                      onChange={e => handleInputChange(participant.id, 'height', e.target.value)}
                                      placeholder={participant.currentHeight?.toString()}
                                    />
                                </div>
                            )}
                            
                            {(!isHeightBased || errorType === 'unweighed' || errorType === 'unassigned') && (
                                <div className="flex flex-col gap-1 w-24">
                                    <span className="text-[10px] text-muted-foreground">Weight (kg)</span>
                                    <Input 
                                      type="number" 
                                      className="h-7 text-sm" 
                                      value={editValues[participant.id]?.weight ?? ''} 
                                      onChange={e => handleInputChange(participant.id, 'weight', e.target.value)}
                                      placeholder={participant.currentWeight?.toString()}
                                    />
                                </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm">
                             {/* Show relevant measurements */}
                             <div className="flex gap-2">
                               {participant.currentWeight && <span>{participant.currentWeight}kg</span>}
                               {participant.currentHeight && <span>{participant.currentHeight}cm</span>}
                               {!participant.currentWeight && !participant.currentHeight && <span className="text-muted-foreground">-</span>}
                             </div>
                             <span className="text-xs text-muted-foreground">(Age: {age})</span>
                          </div>
                        )
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {/* Allow Quick Edit for both types */}
                      {['unassigned', 'unweighed'].includes(errorType) && (
                        <Button 
                          size="sm" 
                          variant={isEditing ? "secondary" : "outline"}
                          onClick={() => toggleEdit(participant)}
                        >
                          {isEditing ? "Undo" : "Quick Edit"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="flex justify-between items-center w-full sm:justify-between">
            <div className="text-sm text-muted-foreground">
                {hasPendingChanges && `${editingIds.size} participant(s) modified`}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {hasPendingChanges && (
                  <Button onClick={saveAllChanges} disabled={isUpdating}>
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </Button>
              )}
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
