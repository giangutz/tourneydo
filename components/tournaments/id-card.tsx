import React from 'react'
import Image from 'next/image'
import { formatShortDate } from '@/lib/utils'

interface IDCardProps {
  name: string
  role: 'Coach' | 'Athlete'
  teamName: string
  tournamentName: string
  division?: string
  category?: string
  date?: string
  photoUrl?: string
  uniqueId?: string
}

export function IDCard({
  name,
  role,
  teamName,
  tournamentName,
  division,
  category,
  date,
  photoUrl,
  uniqueId
}: IDCardProps) {
  return (
    <div className="w-[85.6mm] h-[54mm] bg-white border border-gray-200 rounded-lg overflow-hidden relative flex flex-col shadow-sm print:shadow-none print:border-gray-300 page-break-inside-avoid">
      {/* Header */}
      <div className="bg-[#003366] text-white p-2 flex items-center justify-between h-12">
        <div className="flex items-center gap-2">
          <div className="bg-white p-0.5 rounded-full h-8 w-8 flex items-center justify-center">
             <Image src="/td-blue.svg" alt="Logo" width={24} height={24} className="w-6 h-6" />
          </div>
          <span className="font-bold text-[10px] leading-tight max-w-[140px] truncate">
            {tournamentName}
          </span>
        </div>
        <div className="text-[8px] font-mono opacity-80">
          {date && formatShortDate(date)}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-3 flex gap-3">
        {/* Photo Area */}
        <div className="w-20 h-24 bg-gray-100 border border-gray-200 rounded-md flex items-center justify-center shrink-0">
          {photoUrl ? (
            <Image src={photoUrl} alt={name} width={80} height={96} className="w-full h-full object-cover rounded-md" />
          ) : (
            <div className="text-gray-300 text-xs text-center px-1">
              Photo
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col justify-center min-w-0 flex-1">
          <h2 className="font-bold text-lg leading-tight truncate text-black mb-1">
            {name}
          </h2>
          
          <div className="inline-block bg-black text-white text-xs font-bold px-2 py-0.5 rounded mb-2 self-start uppercase tracking-wider">
            {role}
          </div>

          <div className="text-xs font-semibold text-gray-700 truncate">
            {teamName}
          </div>

          {(division || category) && (
            <div className="text-[10px] text-gray-500 mt-1 leading-tight">
              {division} {category && `• ${category}`}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-100 p-1.5 flex justify-between items-center text-[8px] text-gray-400">
        <span className="font-mono truncate max-w-[150px]">{uniqueId}</span>
        <span className="font-bold text-[#003366]">TourneyDo</span>
      </div>
    </div>
  )
}
