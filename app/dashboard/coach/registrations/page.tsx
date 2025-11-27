import { getCoachRegistrations } from '@/app/actions/registrations'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function RegistrationsPage() {
  const { data: registrations, error } = await getCoachRegistrations()

  if (error) return <div className="p-4 text-red-500">Error: {error}</div>

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">My Registrations</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Registered Athletes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tournament</TableHead>
                <TableHead>Athlete</TableHead>
                <TableHead>Division</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No registrations found.
                  </TableCell>
                </TableRow>
              )}
              {registrations?.map((reg: any) => (
                <TableRow key={reg.id}>
                  <TableCell className="font-medium">{reg.tournaments.title}</TableCell>
                  <TableCell>
                    <div>{reg.athletes.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {reg.athletes.belt_level} • {reg.athletes.weight}kg
                    </div>
                  </TableCell>
                  <TableCell>{reg.divisions?.name || 'Unassigned'}</TableCell>
                  <TableCell>
                    <Badge variant={reg.cleared ? 'default' : 'secondary'}>
                      {reg.cleared ? 'Cleared' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(reg.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
