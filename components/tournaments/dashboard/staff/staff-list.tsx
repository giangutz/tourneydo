'use client'

import { useState, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
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
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { MoreHorizontal, Trash2, Shield, User, Gavel, Mail, Search, ChevronLeft, ChevronRight, Scale, Trophy, Users } from 'lucide-react'
import { TournamentStaff } from "@/types/models"
import { removeStaff, resendStaffInvitation } from "@/lib/actions/staff"
import { toast } from "sonner"
import { formatShortDate } from "@/lib/utils"
import { EditRoleDialog } from "./edit-role-dialog"
import { useDebouncedCallback } from 'use-debounce'

interface StaffListProps {
  staff: TournamentStaff[]
  tournamentId: string
  totalPages: number
  currentPage: number
}

export function StaffList({ staff, tournamentId, totalPages, currentPage }: StaffListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editingStaff, setEditingStaff] = useState<TournamentStaff | null>(null)
  
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(name, value)
      } else {
        params.delete(name)
      }
      return params.toString()
    },
    [searchParams]
  )

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (term) {
      params.set('search', term)
    } else {
      params.delete('search')
    }
    params.set('page', '1') // Reset to page 1 on search
    router.replace(`${pathname}?${params.toString()}`)
  }, 300)

  const handleRoleFilter = (role: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (role && role !== 'all') {
      params.set('role', role)
    } else {
      params.delete('role')
    }
    params.set('page', '1') // Reset to page 1 on filter
    router.push(`${pathname}?${params.toString()}`)
  }

  const handlePageChange = (page: number) => {
    router.push(`${pathname}?${createQueryString('page', page.toString())}`)
  }

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
      case 'bracket_manager': return <Trophy className="h-4 w-4 text-yellow-500" />
      case 'registration_manager': return <Users className="h-4 w-4 text-green-500" />
      case 'weigh_in_staff': return <Scale className="h-4 w-4 text-blue-500" />
      default: return <User className="h-4 w-4 text-slate-500" />
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Search staff..."
                className="pl-8"
                defaultValue={searchParams.get('search')?.toString()}
                onChange={(e) => handleSearch(e.target.value)}
            />
        </div>
        <Select 
            defaultValue={searchParams.get('role')?.toString() || "all"}
            onValueChange={handleRoleFilter}
        >
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Role" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="bracket_manager">Bracket Manager</SelectItem>
                <SelectItem value="registration_manager">Registration Manager</SelectItem>
                <SelectItem value="weigh_in_staff">Weigh-in Staff</SelectItem>
                <SelectItem value="official">Official</SelectItem>
            </SelectContent>
        </Select>
      </div>

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
                      {member.role.replace('_', ' ')}
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
                              onClick={() => setEditingStaff(member)}
                          >
                              <Shield className="mr-2 h-4 w-4" />
                              Change Role
                          </DropdownMenuItem>
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="text-sm font-medium">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {editingStaff && (
        <EditRoleDialog
            open={!!editingStaff}
            onOpenChange={(open) => !open && setEditingStaff(null)}
            tournamentId={tournamentId}
            staffId={editingStaff.id}
            currentRole={editingStaff.role}
            email={editingStaff.email}
        />
      )}
    </div>
  )
}
