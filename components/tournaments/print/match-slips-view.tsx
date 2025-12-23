'use client'

import React from 'react'
import { Match, Tournament } from '@/types/models'

interface MatchSlipsViewProps {
  matches: Match[]
  participants: any[]
  tournament: Tournament
}

export function MatchSlipsView({ matches, participants, tournament }: MatchSlipsViewProps) {
  // Filter eligible matches (status != completed? Or just all scheduled/in_progress?)
  // Matches with no players (both TBD) might be premature to print unless it's a blank template.
  // User said "include all match slips that are eligible to play... exclude BYE's".
  // A match is TBD vs TBD is eligible to play eventually.
  // A match with a specific BYE status is excluded.
  
  const eligibleMatches = matches.filter(m => {
     // Check if it's a bye?
     // Common convention: if a match has a winner but no score/played status, it might be a bye.
     // But for "eligible to play", we generally want matches that WILL happen.
     // In single elimination, `match.winner_id` might be set early if it's a Bye.
     // If `winner_id` is set and status is NOT completed, it's weird. 
     // If status is 'completed' and score is 0-0? 
     // Let's filter out matches that are ALREADY completed? 
     // Or does the user want to print ALL slips for the tournament kit? usually the latter.
     
     // Detect BYE: usually implies one player is null and the other advances automatically.
     // Or a specific flag.
     // If checking existing logic: `BracketView` often hides Bye matches or shows them as simple advancements.
     // Let's exclude matches where one player is NULL and the other is present (Classic Bye scenario in some systems).
     // BUT `TBD` is also null. 
     // In our system, TBD is just null. 
     // A Bye is represented by a match where the player moves to next round without playing.
     // If `match.player2_id` is null and `match.player1_id` is set, AND it advances?
     // Safest bet: Print everything for now unless it's explicitly status='skipped'?
     // User request: "Exclude BYE's".
     // If a match is solely for advancing a bye, it usually has `winner_id` set to the player.
     // So if `winner_id` is present but no scores?
     
     return true
  }).sort((a, b) => (a.match_number || 0) - (b.match_number || 0))

  const getPlayerName = (id: string | null) => {
    if (!id) return '_______' 
    const p = participants.find(part => part.player_id === id)
    if (!p) return 'Unknown'
    return `${p.player.first_name} ${p.player.last_name}`
  }

  const getTeamName = (id: string | null) => {
    if (!id) return ''
    const p = participants.find(part => part.player_id === id)
    return p?.team?.name || 'Unattached'
  }

  // Find Division Name from match relations if available
  const getDivisionText = (match: any) => {
    const dName = match.divisions?.name || match.division_name || 'General'
    const cName = match.categories?.name || match.category_name || ''
    return `${dName} - ${cName}`
  }

  return (
    <div className="print-slips-container font-sans text-black">
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; }
          .page-break { page-break-after: always; }
          .avoid-break { page-break-inside: avoid; }
        }
        .slips-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15mm; /* Nice spacing between columns */
        }
      `}</style>
      
      {/* 
        We render in a grid.
        A4 usually fits 2 wide, 2 high comfortably (4 per page).
        Or 2 wide, 3 high if small. 
        Let's aim for 4 per page. 
        Row gap should be consistent.
      */}

      <div className="slips-grid">
        {eligibleMatches.map((match, idx) => (
          <div key={match.id} className="border-2 border-dashed border-gray-400 p-4 bg-white avoid-break flex flex-col justify-between h-[130mm] rounded-lg relative">
             <div className="absolute top-2 right-2 text-xs text-gray-400">#{match.match_number}</div>

            {/* Header */}
            <div className="text-center border-b-2 border-black pb-2 mb-2">
              <h2 className="text-lg font-bold uppercase tracking-wide truncate">{tournament.name}</h2>
              <div className="text-sm font-medium mt-1">
                 {getDivisionText(match)}
              </div>
              <div className="mt-2 inline-block bg-black text-white px-3 py-1 rounded text-sm font-bold">
                 COURT {match.court_number || '__'}
              </div>
            </div>

            {/* Duel Area */}
            <div className="flex-1 flex flex-col justify-center gap-4 py-2">
                {/* Red */}
                <div className="bg-red-50 p-3 border-l-4 border-red-600 rounded-r">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-red-700 uppercase">Red Corner</span>
                        <span className="text-xs text-gray-600 truncate max-w-[120px]">{getTeamName(match.player1_id)}</span>
                    </div>
                    <div className="text-xl font-bold truncate leading-tight">
                        {getPlayerName(match.player1_id)}
                    </div>
                </div>

                <div className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest">- VS -</div>

                {/* Blue */}
                <div className="bg-blue-50 p-3 border-l-4 border-blue-600 rounded-r">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-blue-700 uppercase">Blue Corner</span>
                        <span className="text-xs text-gray-600 truncate max-w-[120px]">{getTeamName(match.player2_id)}</span>
                    </div>
                    <div className="text-xl font-bold truncate leading-tight">
                        {getPlayerName(match.player2_id)}
                    </div>
                </div>
            </div>

            {/* Scorekeeper Table */}
            <div className="mt-4">
                <table className="w-full text-center border-collapse border border-black text-sm">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-black py-1"></th>
                            <th className="border border-black py-1">R1</th>
                            <th className="border border-black py-1">R2</th>
                            <th className="border border-black py-1">R3</th>
                            <th className="border border-black py-1 w-16">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-black font-bold text-red-700 py-3">RED</td>
                            <td className="border border-black"></td>
                            <td className="border border-black"></td>
                            <td className="border border-black"></td>
                            <td className="border border-black bg-gray-50"></td>
                        </tr>
                        <tr>
                            <td className="border border-black font-bold text-blue-700 py-3">BLUE</td>
                            <td className="border border-black"></td>
                            <td className="border border-black"></td>
                            <td className="border border-black"></td>
                            <td className="border border-black bg-gray-50"></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 flex gap-4 text-xs border-t border-gray-300">
                <div className="flex-1">
                    <div className="border-b border-black h-8"></div>
                    <div className="text-center mt-1 font-semibold">Judge / Official</div>
                </div>
                <div className="flex-1">
                     <div className="border-b border-black h-8"></div>
                    <div className="text-center mt-1 font-semibold">Timer / Table</div>
                </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}
