'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Trash2, Shield, User, Gavel, Mail } from 'lucide-react'
import { TournamentStaff } from "@/types/models"
import { removeStaff, resendStaffInvitation } from "@/lib/actions/staff"
import { toast } from "sonner"
import { formatShortDate } from "@/lib/utils"
import { success } from 'zod'

interface StaffListProps {
  staff: TournamentStaff[]
  tournamentId: string
}

export function StaffList({ staff, tournamentId }: StaffListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleResend = async (staffId: string) => {
    setLoadingId(staffId)
    try {
        const result = await resendStaffInvitation(staffId, tournamentId)
        if (result.success) {
            toast.success("Invitation resent.")
        } else {
            toast.error(result.error)
        }
    } catch (error) {
        toast.error("Failed to resend.")
    } finally {
        setLoadingId(null)
    }
  }

  const handleRemove = async (staffId: string) => {
    setLoadingId(staffId)
    try {
      const result = await removeStaff(staffId, tournamentId)
      if (result.success) {
        toast.success("Staff member removed.")
      } else {
        toast.error(result.error)
      }
    } catch (error) {
       toast.error("Failed to remove staff.")
    } finally {
      setLoadingId(null)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4 text-purple-500" />
      case 'official': return <Gavel className="h-4 w-4 text-orange-500" />
      default: return <User className="h-4 w-4 text-blue-500" />
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User / Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Invited At</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                No staff members found.
              </TableCell>
            </TableRow>
          ) : (
            staff.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                    <div className="font-medium">{member.email}</div>
                    {member.user_id && <div className="text-xs text-muted-foreground">Registered User</div>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 capitalize">
                    {getRoleIcon(member.role)}
                    {member.role}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                    {member.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm" suppressHydrationWarning>
                    {formatShortDate(member.created_at)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                       <DropdownMenuItem 
                        className="cursor-pointer"
                        onClick={() => handleResend(member.id)}
                        disabled={loadingId === member.id}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Resend Invitation
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive cursor-pointer"
                        onClick={() => handleRemove(member.id)}
                        disabled={loadingId === member.id}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Access
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
