import { getTournaments } from '@/app/actions/tournaments'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarDays, MapPin } from 'lucide-react'
import Link from 'next/link'
import { AppShell } from '@/components/layout/app-shell'

export default async function TournamentsPage() {
  const { data: tournaments, error } = await getTournaments()

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Upcoming Tournaments</h1>
            <p className="text-muted-foreground mt-2">
              Register for the latest Taekwondo championships.
            </p>
          </div>
          <Link href="/dashboard/coach">
            <Button variant="outline">Coach Dashboard</Button>
          </Link>
        </div>

        {error && <div className="text-red-500">Error loading tournaments: {error}</div>}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tournaments?.map((tournament) => (
            <Card key={tournament.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant={tournament.status === 'registration_open' ? 'default' : 'secondary'}>
                    {tournament.status.replace('_', ' ')}
                  </Badge>
                  <span className="font-bold text-lg">${tournament.fees}</span>
                </div>
                <CardTitle className="line-clamp-2">{tournament.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {new Date(tournament.date).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="mr-2 h-4 w-4" />
                  {tournament.venue}
                </div>
              </CardContent>
              <CardFooter>
                <Link href={`/dashboard/coach/register/${tournament.id}`} className="w-full">
                  <Button className="w-full" disabled={tournament.status !== 'registration_open'}>
                    {tournament.status === 'registration_open' ? 'Register Team' : 'Details'}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
