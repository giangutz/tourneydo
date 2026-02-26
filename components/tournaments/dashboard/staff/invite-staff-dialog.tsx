'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { inviteStaff } from "@/lib/actions/staff"
import { Loader2, UserPlus } from 'lucide-react'
import { TournamentRole } from '@/types/models'

const ROLE_OPTIONS: { value: TournamentRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full access to this tournament' },
  { value: 'staff', label: 'General Staff', description: 'Participants, brackets, matches & weigh-in' },
  { value: 'bracket_manager', label: 'Bracket Manager', description: 'Brackets & matches only' },
  { value: 'registration_manager', label: 'Registration Manager', description: 'Participants only' },
  { value: 'weigh_in_staff', label: 'Weigh-In Staff', description: 'Weigh-in only' },
  { value: 'official', label: 'Table Official', description: 'Score matches & weigh-ins only' },
]

interface InviteStaffDialogProps {
  tournamentId: string
  triggerClassName?: string
}

export function InviteStaffDialog({ tournamentId, triggerClassName }: InviteStaffDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<TournamentRole[]>(['staff'])

  const toggleRole = (role: TournamentRole) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedRoles.length === 0) {
      toast.error("Please select at least one role.")
      return
    }
    setLoading(true)

    try {
      const result = await inviteStaff(tournamentId, email, selectedRoles)

      if (result.success) {
        if (result.warning) {
          toast.warning(result.warning)
        } else {
          toast.success(`Invited ${email} successfully.`)
        }
        setOpen(false)
        setEmail('')
        setSelectedRoles(['staff'])
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={triggerClassName}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Staff
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleInvite}>
          <DialogHeader>
            <DialogTitle>Invite Staff Member</DialogTitle>
            <DialogDescription>
              Invite a user to help manage this tournament. They will be auto-accepted if they already have an account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
                placeholder="colleague@example.com"
                required
              />
            </div>
            <div>
              <Label className="mb-3 block">Roles</Label>
              <div className="space-y-3">
                {ROLE_OPTIONS.map(({ value, label, description }) => (
                  <div key={value} className="flex items-start gap-3">
                    <Checkbox
                      id={`invite-role-${value}`}
                      checked={selectedRoles.includes(value)}
                      onCheckedChange={() => toggleRole(value)}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor={`invite-role-${value}`}
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
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || selectedRoles.length === 0}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
