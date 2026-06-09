'use client'

import React from 'react'
import { Match, Tournament } from '@/types/models'
import { GAM_JEOM_TYPES, GAM_JEOM_CATEGORY_LABELS, TECHNIQUES, WIN_METHOD_LABELS, WT_WIN_METHODS, type GamJeomCategory } from '@/lib/constants/wt-rules'
import type { WinMethod } from '@/types/models'

interface MatchSlipsViewProps {
  matches: Match[]
  participants: any[]
  tournament: Tournament
}

const SLIP_WIN_METHODS: WinMethod[] = ['PTF', 'PTG', 'GDP', 'SUP', 'RSC', 'WDR', 'DSQ', 'PUN']
const GAM_JEOM_LIMIT = 5
const CATEGORIES: GamJeomCategory[] = ['boundary_position', 'combat_contact', 'match_management']

// Abbreviated violation labels that fit a narrow print column
const SHORT_LABELS: Record<string, string> = {
  crossing_boundary: 'Boundary crossing',
  falling_down: 'Fallen',
  lifting_leg: 'Lifting leg',
  attack_below_waist: 'Below waist',
  using_knee: 'Knee strike',
  hitting_head_with_hand: 'Hand to head',
  attack_after_kalyeo: 'After Kalyeo',
  attack_fallen_opponent: 'Attack fallen',
  grabbing_pushing: 'Grab/Push',
  passivity: 'Passivity',
  misconduct: 'Misconduct',
}

/** Five small tally squares for up to 5 gam-jeoms (round-loss limit) */
function TallyBoxes() {
  return (
    <span style={{ display: 'inline-flex', gap: '1px' }}>
      {Array.from({ length: GAM_JEOM_LIMIT }).map((_, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            border: '1px solid #999',
            borderRadius: '1px',
          }}
        />
      ))}
    </span>
  )
}

export function MatchSlipsView({ matches, participants, tournament }: MatchSlipsViewProps) {
  // Build a lookup: match.id → match_number (for showing "W of Match #X" on TBD slots)
  const matchNumById = new Map(matches.map(m => [m.id, m.match_number]))

  // Only include matches that are meaningful to print:
  //   • At least one player is known (named), OR
  //   • Both slots have source match context (so we can show "W of Match #X vs W of Match #Y")
  // Skip pure placeholder nodes with no context.
  const eligibleMatches = matches
    .filter(m => {
      const p1Known = !!m.player1_id
      const p2Known = !!m.player2_id
      const sources: string[] = (m as any).source_match_ids ?? []
      const hasSources = sources.length >= 2 || (sources.length === 1 && (p1Known || p2Known))
      return p1Known || p2Known || hasSources
    })
    .sort((a, b) => (a.match_number || 0) - (b.match_number || 0))

  const getPlayerName = (id: string | null, slotIndex: 0 | 1, match: Match) => {
    if (id) {
      const p = participants.find(part => part.player_id === id)
      if (!p) return 'Unknown'
      return `${p.player.first_name} ${p.player.last_name}`
    }
    // TBD — show source match context if available
    const sources: string[] = (match as any).source_match_ids ?? []
    const sourceId = sources[slotIndex]
    if (sourceId) {
      const srcNum = matchNumById.get(sourceId)
      return srcNum ? `Winner of Match #${srcNum}` : 'TBD'
    }
    return 'TBD'
  }

  const getTeamName = (id: string | null) => {
    if (!id) return ''
    const p = participants.find(part => part.player_id === id)
    return p?.team?.name || 'Unattached'
  }

  const getDivisionText = (match: any) => {
    const dName = match.divisions?.name || match.division_name || 'General'
    const cName = match.categories?.name || match.category_name || ''
    return cName ? `${dName} — ${cName}` : dName
  }

  return (
    <div className="font-sans text-black" style={{ fontSize: '11px' }}>
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 8mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .slip-page-break { page-break-after: always; }
          .slip-avoid-break { page-break-inside: avoid; break-inside: avoid; }
        }
      `}</style>

      {eligibleMatches.map((match, idx) => (
        <div
          key={match.id}
          className="slip-avoid-break"
          style={{
            border: '2px dashed #999',
            borderRadius: '6px',
            padding: '10px 12px',
            marginBottom: '6mm',
            background: 'white',
          }}
        >
          {/* ── Header ─────────────────────────────────────────────────── */}
          <div style={{ borderBottom: '2px solid black', paddingBottom: '5px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {tournament.name}
              </div>
              <div style={{ fontSize: '11px', marginTop: '2px' }}>{getDivisionText(match)}</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px' }}>
              <span style={{ background: 'black', color: 'white', padding: '2px 8px', borderRadius: '3px', fontWeight: 'bold' }}>
                COURT {match.court_number || '___'}
              </span>
              <div style={{ marginTop: '2px', color: '#666' }}>Match #{match.match_number}</div>
            </div>
          </div>

          {/* ── Athletes ───────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div style={{ background: '#fff1f2', borderLeft: '4px solid #dc2626', borderRadius: '0 4px 4px 0', padding: '5px 7px' }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Red Corner</div>
              <div style={{ fontWeight: 'bold', fontSize: match.player1_id ? '13px' : '10px', marginTop: '1px', fontStyle: match.player1_id ? 'normal' : 'italic', color: match.player1_id ? 'inherit' : '#888' }}>
                {getPlayerName(match.player1_id, 0, match)}
              </div>
              {match.player1_id && <div style={{ color: '#666', fontSize: '9px' }}>{getTeamName(match.player1_id)}</div>}
            </div>
            <div style={{ background: '#eff6ff', borderLeft: '4px solid #2563eb', borderRadius: '0 4px 4px 0', padding: '5px 7px' }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Blue Corner</div>
              <div style={{ fontWeight: 'bold', fontSize: match.player2_id ? '13px' : '10px', marginTop: '1px', fontStyle: match.player2_id ? 'normal' : 'italic', color: match.player2_id ? 'inherit' : '#888' }}>
                {getPlayerName(match.player2_id, 1, match)}
              </div>
              {match.player2_id && <div style={{ color: '#666', fontSize: '9px' }}>{getTeamName(match.player2_id)}</div>}
            </div>
          </div>

          {/* ── Score Table ────────────────────────────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '7px' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ border: '1px solid black', padding: '3px 5px', textAlign: 'left' }}></th>
                <th style={{ border: '1px solid black', padding: '3px 5px', textAlign: 'center' }}>R1</th>
                <th style={{ border: '1px solid black', padding: '3px 5px', textAlign: 'center' }}>R2</th>
                <th style={{ border: '1px solid black', padding: '3px 5px', textAlign: 'center' }}>R3</th>
                <th style={{ border: '1px solid black', padding: '3px 5px', textAlign: 'center', fontSize: '9px' }}>R4/GP</th>
                <th style={{ border: '1px solid black', padding: '3px 5px', textAlign: 'center', background: '#e5e7eb', minWidth: '40px' }}>Total</th>
                <th style={{ border: '1px solid black', padding: '3px 5px', textAlign: 'center', fontSize: '9px' }}>Wins</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid black', padding: '6px 5px', fontWeight: 'bold', color: '#dc2626' }}>RED</td>
                <td style={{ border: '1px solid black', padding: '6px', minWidth: '28px' }}></td>
                <td style={{ border: '1px solid black', padding: '6px' }}></td>
                <td style={{ border: '1px solid black', padding: '6px' }}></td>
                <td style={{ border: '1px solid black', padding: '6px' }}></td>
                <td style={{ border: '1px solid black', padding: '6px', background: '#f9fafb' }}></td>
                <td style={{ border: '1px solid black', padding: '6px' }}></td>
              </tr>
              <tr>
                <td style={{ border: '1px solid black', padding: '6px 5px', fontWeight: 'bold', color: '#2563eb' }}>BLUE</td>
                <td style={{ border: '1px solid black', padding: '6px' }}></td>
                <td style={{ border: '1px solid black', padding: '6px' }}></td>
                <td style={{ border: '1px solid black', padding: '6px' }}></td>
                <td style={{ border: '1px solid black', padding: '6px' }}></td>
                <td style={{ border: '1px solid black', padding: '6px', background: '#f9fafb' }}></td>
                <td style={{ border: '1px solid black', padding: '6px' }}></td>
              </tr>
            </tbody>
          </table>

          {/* ── Win Method ─────────────────────────────────────────────── */}
          <div style={{ marginBottom: '7px' }}>
            <div style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555', marginBottom: '3px' }}>
              Win Method (circle one)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {SLIP_WIN_METHODS.map(m => (
                <span key={m} style={{ border: '1px solid #999', borderRadius: '999px', padding: '1px 7px', fontSize: '9px', whiteSpace: 'nowrap' }}>
                  {m} — {WIN_METHOD_LABELS[m].split(' (')[0].replace(' (WT)', '')}
                </span>
              ))}
            </div>
            <div style={{ marginTop: '4px', fontSize: '10px' }}>
              Winner: <span style={{ borderBottom: '1px solid black', display: 'inline-block', width: '100px' }}></span>
              &nbsp;&nbsp;Round: <span style={{ borderBottom: '1px solid black', display: 'inline-block', width: '20px' }}></span>
            </div>
          </div>

          {/* ── Gam-jeom Penalties ─────────────────────────────────────── */}
          <div style={{ marginBottom: '7px' }}>
            <div style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555', marginBottom: '3px' }}>
              Gam-jeom Penalties (fill ■ per penalty — 5 = round loss)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'left', width: '45%' }}>Violation</th>
                  <th style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'center', color: '#dc2626' }}>RED (max 5)</th>
                  <th style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'center', color: '#2563eb' }}>BLUE (max 5)</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map(cat => (
                  <React.Fragment key={cat}>
                    <tr>
                      <td colSpan={3} style={{ background: '#f9fafb', border: '1px solid #ccc', padding: '1px 4px', fontSize: '8px', fontWeight: 'bold', color: '#777', fontStyle: 'italic' }}>
                        {GAM_JEOM_CATEGORY_LABELS[cat]}
                      </td>
                    </tr>
                    {GAM_JEOM_TYPES.filter(v => v.category === cat).map(v => (
                      <tr key={v.value}>
                        <td style={{ border: '1px solid #ccc', padding: '2px 4px' }}>
                          {SHORT_LABELS[v.value] || v.label}
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'center' }}>
                          <TallyBoxes />
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'center' }}>
                          <TallyBoxes />
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Technique Stats ────────────────────────────────────────── */}
          <div style={{ marginBottom: '7px' }}>
            <div style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555', marginBottom: '3px' }}>
              Technique Stats (optional — for player statistics)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'left' }}>Technique</th>
                  <th style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'center', color: '#dc2626' }}>RED</th>
                  <th style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'center', color: '#2563eb' }}>BLUE</th>
                </tr>
              </thead>
              <tbody>
                {TECHNIQUES.map(t => (
                  <tr key={t.key}>
                    <td style={{ border: '1px solid #ccc', padding: '2px 4px' }}>
                      {t.label} <span style={{ color: '#999', fontSize: '8px' }}>({t.points}pt)</span>
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '4px', minWidth: '32px' }}></td>
                    <td style={{ border: '1px solid #ccc', padding: '4px', minWidth: '32px' }}></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Signatures ─────────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid #ccc', paddingTop: '6px', fontSize: '9px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ borderBottom: '1px solid black', height: '18px', marginBottom: '2px' }}></div>
              <div style={{ textAlign: 'center', fontWeight: 'bold' }}>Referee / Official</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ borderBottom: '1px solid black', height: '18px', marginBottom: '2px' }}></div>
              <div style={{ textAlign: 'center', fontWeight: 'bold' }}>Timekeeper / Table</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ borderBottom: '1px solid black', height: '18px', marginBottom: '2px' }}></div>
              <div style={{ textAlign: 'center', fontWeight: 'bold' }}>Data Entry</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
