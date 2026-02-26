'use client'

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { TournamentRole } from "@/types/models"
import { updateStaffRoles } from "@/lib/actions/staff"
import { toast } from "sonner"

const ROLE_OPTIONS: { value: TournamentRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full access to this tournament' },
  { value: 'staff', label: 'General Staff', description: 'Participants, brackets, matches & weigh-in' },
  { value: 'bracket_manager', label: 'Bracket Manager', description: 'Brackets & matches only' },
  { value: 'registration_manager', label: 'Registration Manager', description: 'Participants only' },
  { value: 'weigh_in_staff', label: 'Weigh-In Staff', description: 'Weigh-in only' },
  { value: 'official', label: 'Table Official', description: 'Score matches & weigh-ins only' },
]

interface EditRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tournamentId: string
  staffId: string
  currentRoles: TournamentRole[]
  email: string
}

export function EditRoleDialog({
  open,
  onOpenChange,
  tournamentId,
  staffId,
  currentRoles,
  email
}: EditRoleDialogProps) {
  const [selectedRoles, setSelectedRoles] = useState<TournamentRole[]>(currentRoles)
  const [isPending, startTransition] = useTransition()

  const toggleRole = (role: TournamentRole) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  const hasChanged = (
    selectedRoles.length !== currentRoles.length ||
    !selectedRoles.every(r => currentRoles.includes(r))
  )

  const handleSave = () => {
    if (selectedRoles.length === 0) {
      toast.error("Select at least one role.")
      return
    }
    startTransition(async () => {
      const result = await updateStaffRoles(staffId, selectedRoles, tournamentId)
      if (result.success) {
        toast.success(`Updated roles for ${email}`)
        onOpenChange(false)
      } else {
        toast.error(result.error || "Failed to update roles")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Staff Roles</DialogTitle>
          <DialogDescription>
            Change the access levels for {email}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label className="mb-3 block">Roles</Label>
          <div className="space-y-3">
            {ROLE_OPTIONS.map(({ value, label, description }) => (
              <div key={value} className="flex items-start gap-3">
                <Checkbox
                  id={`edit-role-${value}`}
                  checked={selectedRoles.includes(value)}
                  onCheckedChange={() => toggleRole(value)}
                  disabled={isPending}
                  className="mt-0.5"
                />
                <label
                  htmlFor={`edit-role-${value}`}
                  className="cursor-pointer leading-none"
                >
                  <div className="font-medium text-sm">{label}</div>
                  <div className="text-xs text-muted-foreground">{description}</div>
                </label>
              </div>
            ))}
          </div>
          {selectedRoles.length === 0 && (
            <p className="text-xs text-destructive mt-2">Select at least one role.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending || !hasChanged || selectedRoles.length === 0}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
