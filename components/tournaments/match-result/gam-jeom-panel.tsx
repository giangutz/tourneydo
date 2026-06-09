'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import {
  GAM_JEOM_TYPES,
  GAM_JEOM_CATEGORY_LABELS,
  DEFAULT_WT_RULES,
  type GamJeomCategory,
} from '@/lib/constants/wt-rules'
import type { GamJeomInput } from '@/lib/validations/match-scores'

interface GamJeomPanelProps {
  roundNumber: number
  player1Id: string | null
  player2Id: string | null
  name1: string
  name2: string
  gamJeoms: GamJeomInput[]
  onAdd: (playerId: string, type: string) => void
  onRemove: (playerId: string, type: string) => void
}

const LIMIT = DEFAULT_WT_RULES.gamJeomRoundLossLimit
const CATEGORIES: GamJeomCategory[] = ['boundary_position', 'combat_contact', 'match_management']

function countFor(gamJeoms: GamJeomInput[], roundNumber: number, playerId: string | null, type?: string) {
  if (!playerId) return 0
  return gamJeoms.filter(
    g => g.roundNumber === roundNumber && g.playerId === playerId && (type === undefined || g.type === type)
  ).length
}

function CounterLabel({ count }: { count: number }) {
  const cls = count >= LIMIT
    ? 'text-destructive font-bold'
    : count >= LIMIT - 1
    ? 'text-amber-500 font-semibold'
    : 'text-muted-foreground'
  return (
    <span className={`text-xs font-mono ${cls}`}>
      {count}/{LIMIT}
      {count >= LIMIT && <AlertTriangle className="inline h-3 w-3 ml-0.5 -mt-0.5" />}
    </span>
  )
}

export function GamJeomPanel({
  roundNumber, player1Id, player2Id, name1, name2, gamJeoms, onAdd, onRemove,
}: GamJeomPanelProps) {
  const roundGJ = gamJeoms.filter(g => g.roundNumber === roundNumber)
  const total1 = countFor(roundGJ, roundNumber, player1Id)
  const total2 = countFor(roundGJ, roundNumber, player2Id)

  return (
    <div className="mt-3 border rounded-lg text-sm">
      <div className="px-3 py-2 bg-muted/30 rounded-t-lg flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gam-jeom Penalties</span>
        <div className="flex gap-4">
          <span className="text-xs text-muted-foreground">
            {name1.split(' ')[0]}: <CounterLabel count={total1} />
          </span>
          <span className="text-xs text-muted-foreground">
            {name2.split(' ')[0]}: <CounterLabel count={total2} />
          </span>
        </div>
      </div>

      <div className="p-2 space-y-1">
        {CATEGORIES.map(cat => {
          const violations = GAM_JEOM_TYPES.filter(g => g.category === cat)
          return (
            <details key={cat} className="group">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground py-1 px-1 hover:text-foreground list-none flex items-center gap-1 select-none">
                <span className="inline-block transition-transform group-open:rotate-90">▶</span>
                {GAM_JEOM_CATEGORY_LABELS[cat]}
              </summary>
              <div className="mt-0.5 space-y-0.5 pl-4">
                {violations.map(v => {
                  const c1 = countFor(gamJeoms, roundNumber, player1Id, v.value)
                  const c2 = countFor(gamJeoms, roundNumber, player2Id, v.value)
                  return (
                    <div key={v.value} className="flex items-center gap-2 py-0.5">
                      <span className="flex-1 text-[11px] text-muted-foreground truncate">{v.label}</span>
                      {player1Id && (
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-xs font-bold"
                            onClick={() => onRemove(player1Id, v.value)} disabled={c1 === 0}>−</Button>
                          <span className={`w-4 text-center text-xs font-mono ${c1 > 0 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>{c1}</span>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-xs font-bold"
                            onClick={() => onAdd(player1Id, v.value)}>+</Button>
                        </div>
                      )}
                      <span className="text-muted-foreground/40 text-[10px] w-3 text-center">|</span>
                      {player2Id && (
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-xs font-bold"
                            onClick={() => onRemove(player2Id, v.value)} disabled={c2 === 0}>−</Button>
                          <span className={`w-4 text-center text-xs font-mono ${c2 > 0 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>{c2}</span>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-xs font-bold"
                            onClick={() => onAdd(player2Id, v.value)}>+</Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}
