'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { TournamentRole } from "@/types/models"
import { updateStaffRole } from "@/lib/actions/staff"
import { useTransition } from "react"
import { toast } from "sonner"

interface EditRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tournamentId: string
  staffId: string
  currentRole: TournamentRole
  email: string
}

export function EditRoleDialog({ 
  open, 
  onOpenChange, 
  tournamentId, 
  staffId, 
  currentRole,
  email
}: EditRoleDialogProps) {
  const [role, setRole] = useState<TournamentRole>(currentRole)
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateStaffRole(staffId, role, tournamentId)
      if (result.success) {
        toast.success(`Updated role for ${email}`)
        onOpenChange(false)
      } else {
        toast.error(result.error || "Failed to update role")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Staff Role</DialogTitle>
          <DialogDescription>
            Change the access level for {email}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              Role
            </Label>
            <Select 
                value={role} 
                onValueChange={(val) => setRole(val as TournamentRole)}
                disabled={isPending}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                    <div className="flex flex-col">
                        <span>Admin</span>
                        <span className="text-xs text-muted-foreground">Full access only to this tournament</span>
                    </div>
                </SelectItem>
                <SelectItem value="staff">
                    <div className="flex flex-col">
                        <span>General Staff</span>
                        <span className="text-xs text-muted-foreground">Manage participants & brackets</span>
                    </div>
                </SelectItem>
                 <SelectItem value="bracket_manager">
                    <div className="flex flex-col">
                        <span>Bracket Manager</span>
                        <span className="text-xs text-muted-foreground">Manage brackets & matches only</span>
                    </div>
                </SelectItem>
                 <SelectItem value="registration_manager">
                    <div className="flex flex-col">
                        <span>Registration Manager</span>
                        <span className="text-xs text-muted-foreground">Manage participants only</span>
                    </div>
                </SelectItem>
                 <SelectItem value="weigh_in_staff">
                    <div className="flex flex-col">
                        <span>Weigh-In Staff</span>
                        <span className="text-xs text-muted-foreground">Weigh-ion only</span>
                    </div>
                </SelectItem>
                <SelectItem value="official">
                    <div className="flex flex-col">
                        <span>Official</span>
                        <span className="text-xs text-muted-foreground">Score matches & weigh-ins only</span>
                    </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending || role === currentRole}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
