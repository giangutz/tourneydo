'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PlacementGroup } from '@/lib/db/queries/placements'

interface PlacementsViewProps {
  groups: PlacementGroup[]
}

const MEDAL_CONFIG = {
  gold:   { label: '1st', bg: 'bg-yellow-500', text: 'text-yellow-50', ring: 'ring-yellow-400', emoji: '🥇' },
  silver: { label: '2nd', bg: 'bg-slate-400',  text: 'text-slate-50',  ring: 'ring-slate-300',  emoji: '🥈' },
  bronze: { label: '3rd', bg: 'bg-amber-700',  text: 'text-amber-50',  ring: 'ring-amber-600',  emoji: '🥉' },
} as const

function MedalSlot({ medal, names }: { medal: keyof typeof MEDAL_CONFIG; names: string[] }) {
  if (names.length === 0) return null
  const cfg = MEDAL_CONFIG[medal]
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ring-2 ${cfg.bg} ${cfg.text} ${cfg.ring}`}>
        {cfg.label}
      </div>
      <div className="text-center space-y-0.5">
        {names.map((name, i) => (
          <div key={i} className="text-sm font-medium leading-tight">{name}</div>
        ))}
      </div>
    </div>
  )
}

function PodiumCard({ group }: { group: PlacementGroup }) {
  const goldNames  = group.gold.map(p => `${p.player_first_name} ${p.player_last_name}`)
  const silverNames = group.silver.map(p => `${p.player_first_name} ${p.player_last_name}`)
  const bronzeNames = group.bronze.map(p => `${p.player_first_name} ${p.player_last_name}`)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3 px-4 bg-muted/30 border-b">
        <CardTitle className="text-sm font-semibold">{group.label}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Podium: silver | gold | bronze */}
        <div className="flex items-end justify-center gap-6 py-2">
          {/* Silver — left pillar */}
          <div className="flex flex-col items-center gap-2">
            <MedalSlot medal="silver" names={silverNames} />
            <div className="w-20 h-16 bg-slate-200 dark:bg-slate-700 rounded-t flex items-center justify-center">
              <span className="text-2xl">🥈</span>
            </div>
          </div>

          {/* Gold — tallest / centre */}
          <div className="flex flex-col items-center gap-2">
            <MedalSlot medal="gold" names={goldNames} />
            <div className="w-20 h-24 bg-yellow-200 dark:bg-yellow-800 rounded-t flex items-center justify-center">
              <span className="text-3xl">🥇</span>
            </div>
          </div>

          {/* Bronze — right, dual */}
          <div className="flex flex-col items-center gap-2">
            <MedalSlot medal="bronze" names={bronzeNames} />
            <div className="w-20 h-12 bg-amber-200 dark:bg-amber-800 rounded-t flex items-center justify-center">
              <span className="text-2xl">🥉</span>
            </div>
          </div>
        </div>

        {bronzeNames.length === 2 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Both semi-final losers receive bronze (WT rules — no 3rd-place match)
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function PlacementsView({ groups }: PlacementsViewProps) {
  if (groups.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">🏆</span>
        <h3 className="text-lg font-semibold">Medal Standings</h3>
        <Badge variant="secondary" className="text-xs">{groups.length} division{groups.length !== 1 ? 's' : ''}</Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map(g => (
          <PodiumCard key={`${g.divisionId ?? '_'}|${g.categoryId ?? '_'}`} group={g} />
        ))}
      </div>
    </div>
  )
}
