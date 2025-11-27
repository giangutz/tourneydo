'use client'

import { getTournament } from '@/app/actions/tournaments'
import { getAthletes } from '@/app/actions/athletes'
import { registerAthletes } from '@/app/actions/registrations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner' // Assuming sonner is installed or use alert

// Helper to match athlete to divisions
function getEligibleDivisions(athlete: any, divisions: any[]) {
  return divisions.filter(div => 
    athlete.age >= div.age_min &&
    athlete.age <= div.age_max &&
    athlete.weight >= div.weight_min &&
    athlete.weight <= div.weight_max &&
    athlete.belt_level === div.belt_level &&
    athlete.gender === div.gender
  )
}

export default function RegisterPage({ params }: { params: { tournamentId: string } }) {
  const [tournament, setTournament] = useState<any>(null)
  const [athletes, setAthletes] = useState<any[]>([])
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set())
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function loadData() {
      const [tRes, aRes] = await Promise.all([
        getTournament(params.tournamentId),
        getAthletes()
      ])
      
      if (tRes.data) setTournament(tRes.data)
      if (aRes.data) setAthletes(aRes.data)
      setLoading(false)
    }
    loadData()
  }, [params.tournamentId])

  const handleToggleAthlete = (athleteId: string) => {
    const newSelected = new Set(selectedAthletes)
    if (newSelected.has(athleteId)) {
      newSelected.delete(athleteId)
      const newAssignments = { ...assignments }
      delete newAssignments[athleteId]
      setAssignments(newAssignments)
    } else {
      newSelected.add(athleteId)
      // Auto-select first eligible division
      const athlete = athletes.find(a => a.id === athleteId)
      const eligible = getEligibleDivisions(athlete, tournament?.divisions || [])
      if (eligible.length > 0) {
        setAssignments(prev => ({ ...prev, [athleteId]: eligible[0].id }))
      }
    }
    setSelectedAthletes(newSelected)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    const registrations = Array.from(selectedAthletes).map(athleteId => ({
      athleteId,
      divisionId: assignments[athleteId]
    })).filter(r => r.divisionId) // Ensure division is selected

    if (registrations.length === 0) {
      alert('Please select at least one athlete with a valid division.')
      setSubmitting(false)
      return
    }

    const res = await registerAthletes(params.tournamentId, registrations)
    if (res.error) {
      alert(res.error)
    } else {
      router.push('/dashboard/coach/registrations')
    }
    setSubmitting(false)
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>
  if (!tournament) return <div className="p-8">Tournament not found</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Register for {tournament.title}</h1>
        <p className="text-muted-foreground">Select athletes to register.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Athletes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {athletes.map(athlete => {
            const eligibleDivisions = getEligibleDivisions(athlete, tournament.divisions)
            const isSelected = selectedAthletes.has(athlete.id)

            return (
              <div key={athlete.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={() => handleToggleAthlete(athlete.id)}
                  />
                  <div>
                    <div className="font-medium">{athlete.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {athlete.age} yrs • {athlete.weight}kg • {athlete.belt_level} • {athlete.gender}
                    </div>
                  </div>
                </div>
                
                {isSelected && (
                  <div className="w-[300px]">
                    <Select 
                      value={assignments[athlete.id] || ''} 
                      onValueChange={(val) => setAssignments(prev => ({ ...prev, [athlete.id]: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Division" />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibleDivisions.length === 0 && (
                          <SelectItem value="none" disabled>No eligible divisions</SelectItem>
                        )}
                        {eligibleDivisions.map(div => (
                          <SelectItem key={div.id} value={div.id}>
                            {div.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {eligibleDivisions.length === 0 && (
                      <p className="text-xs text-red-500 mt-1">No matching division found</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={handleSubmit} disabled={submitting || selectedAthletes.size === 0}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Registration ({selectedAthletes.size} Athletes)
        </Button>
      </div>
    </div>
  )
}
