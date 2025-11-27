import { getAthletes, deleteAthlete } from '@/app/actions/athletes'
import { AthleteDialog } from '@/components/coach/athlete-dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Edit, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { revalidatePath } from 'next/cache'

export default async function TeamPage() {
  const { data: athletes, error } = await getAthletes()

  if (error) {
    return <div className="p-4 text-red-500">Error loading athletes: {error}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Team</h1>
          <p className="text-muted-foreground">
            Manage your athlete roster for upcoming tournaments.
          </p>
        </div>
        <AthleteDialog
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Athlete
            </Button>
          }
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Belt</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {athletes?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No athletes found. Add your first athlete to get started.
                </TableCell>
              </TableRow>
            )}
            {athletes?.map((athlete) => (
              <TableRow key={athlete.id}>
                <TableCell className="font-medium">{athlete.name}</TableCell>
                <TableCell>{athlete.age}</TableCell>
                <TableCell>{athlete.weight}kg</TableCell>
                <TableCell className="capitalize">{athlete.gender}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {athlete.belt_level}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <AthleteDialog
                      athlete={athlete}
                      trigger={
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <form action={async () => {
                      'use server'
                      await deleteAthlete(athlete.id)
                    }}>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
