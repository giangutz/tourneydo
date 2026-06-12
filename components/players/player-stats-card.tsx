'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GAM_JEOM_CATEGORY_LABELS } from '@/lib/constants/wt-rules'
import type { PlayerCareerStats, PenaltyStat } from '@/lib/db/queries/player-stats'
import { Trophy, Zap, Activity } from 'lucide-react'

interface PlayerStatsCardProps {
  stats: PlayerCareerStats
  label?: string
}

function PercentBar({ value, color = 'bg-primary' }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  )
}

export function PlayerStatsCard({ stats, label = 'Career Stats' }: PlayerStatsCardProps) {
  const { matchRecord, techniques, penalties } = stats

  if (!stats.hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No match data recorded yet. Stats will appear once matches with technique and penalty data are completed.
          </p>
        </CardContent>
      </Card>
    )
  }

  const techniqueRows = [
    { label: 'Punch (trunk)', count: techniques.punch, color: 'bg-blue-400' },
    { label: 'Kick (trunk)', count: techniques.body_kick, color: 'bg-sky-500' },
    { label: 'Kick (head)', count: techniques.head_kick, color: 'bg-violet-500' },
    { label: 'Turning kick (trunk)', count: techniques.spin_body_kick, color: 'bg-amber-500' },
    { label: 'Turning kick (head)', count: techniques.spin_head_kick, color: 'bg-rose-500' },
  ]

  const categories = Object.entries(GAM_JEOM_CATEGORY_LABELS) as [keyof typeof GAM_JEOM_CATEGORY_LABELS, string][]

  return (
    <div className="space-y-4">
      {/* Match Record */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{matchRecord.played}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Matches</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{matchRecord.wins}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Wins</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-500">{matchRecord.losses}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Losses</div>
            </div>
            <div className="ml-auto">
              <Badge
                variant={matchRecord.winRate >= 50 ? 'default' : 'secondary'}
                className="text-sm px-3 py-1"
              >
                {matchRecord.winRate}% win rate
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technique Breakdown */}
      {techniques.total > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Technique Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-4 text-xs text-muted-foreground mb-1">
              <span>Head kick rate: <span className="font-semibold text-foreground">{techniques.headKickRate}%</span></span>
              <span>Spin kick rate: <span className="font-semibold text-foreground">{techniques.spinKickRate}%</span></span>
              <span>Total: <span className="font-semibold text-foreground">{techniques.total}</span></span>
            </div>
            {techniqueRows.map((t) => {
              const pct = techniques.total > 0 ? Math.round((t.count / techniques.total) * 100) : 0
              return (
                <div key={t.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t.label}</span>
                    <span className="font-medium tabular-nums">{t.count} <span className="text-muted-foreground">({pct}%)</span></span>
                  </div>
                  <PercentBar value={pct} color={t.color} />
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Penalty Breakdown */}
      {penalties.total > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              Gam-Jeom (Penalties)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Total: <span className="font-semibold text-foreground">{penalties.total}</span></span>
              <span>Per match: <span className="font-semibold text-foreground">{penalties.perMatch}</span></span>
            </div>

            {/* Category summary */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {categories.map(([key, label]) => (
                <div key={key} className="p-2 rounded-lg bg-muted/40">
                  <div className="font-semibold text-base">{penalties.byCategory[key]}</div>
                  <div className="text-muted-foreground leading-tight mt-0.5">{label.split(' ')[0]}</div>
                </div>
              ))}
            </div>

            {/* Top violations */}
            {penalties.byType.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Most common</div>
                {penalties.byType.slice(0, 5).map((p: PenaltyStat) => {
                  const pct = penalties.total > 0 ? Math.round((p.count / penalties.total) * 100) : 0
                  return (
                    <div key={p.value} className="space-y-0.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground truncate max-w-[200px]">{p.label}</span>
                        <span className="font-medium tabular-nums ml-2">{p.count} <span className="text-muted-foreground">({pct}%)</span></span>
                      </div>
                      <PercentBar value={pct} color="bg-destructive/60" />
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
