'use client'

import { Input } from '@/components/ui/input'
import { TECHNIQUES, type TechniqueKey } from '@/lib/constants/wt-rules'
import type { TechniqueStatInput } from '@/lib/validations/match-scores'

interface TechniquePanelProps {
  roundNumber: number
  player1Id: string | null
  player2Id: string | null
  name1: string
  name2: string
  techniques: TechniqueStatInput[]
  onChange: (roundNumber: number, playerId: string, key: TechniqueKey, value: number) => void
}

function getCount(techniques: TechniqueStatInput[], roundNumber: number, playerId: string | null, key: TechniqueKey): number {
  if (!playerId) return 0
  return techniques.find(t => t.roundNumber === roundNumber && t.playerId === playerId)?.[key] ?? 0
}

export function TechniquePanel({
  roundNumber, player1Id, player2Id, name1, name2, techniques, onChange,
}: TechniquePanelProps) {
  return (
    <details className="mt-2 group">
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground py-1 hover:text-foreground list-none flex items-center gap-1 select-none">
        <span className="inline-block transition-transform group-open:rotate-90">▶</span>
        Technique breakdown (optional — for player stats)
      </summary>
      <div className="mt-1.5 border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/30">
              <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Technique</th>
              <th className="text-center px-2 py-1.5 font-medium text-muted-foreground truncate max-w-[80px]">
                {name1.split(' ')[0]}
              </th>
              <th className="text-center px-2 py-1.5 font-medium text-muted-foreground truncate max-w-[80px]">
                {name2.split(' ')[0]}
              </th>
            </tr>
          </thead>
          <tbody>
            {TECHNIQUES.map(t => (
              <tr key={t.key} className="border-t">
                <td className="px-3 py-1.5 text-muted-foreground">
                  {t.label}
                  <span className="text-[10px] ml-1 text-muted-foreground/60">({t.points}pt)</span>
                </td>
                <td className="px-2 py-1 text-center">
                  {player1Id && (
                    <Input
                      type="number" min="0"
                      className="h-7 w-14 text-center text-xs mx-auto p-1"
                      value={getCount(techniques, roundNumber, player1Id, t.key)}
                      onChange={e => onChange(roundNumber, player1Id, t.key, Math.max(0, Number(e.target.value)))}
                    />
                  )}
                </td>
                <td className="px-2 py-1 text-center">
                  {player2Id && (
                    <Input
                      type="number" min="0"
                      className="h-7 w-14 text-center text-xs mx-auto p-1"
                      value={getCount(techniques, roundNumber, player2Id, t.key)}
                      onChange={e => onChange(roundNumber, player2Id, t.key, Math.max(0, Number(e.target.value)))}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
