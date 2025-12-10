import Image from 'next/image'

interface IDCardProps {
  name: string
  role: 'Coach' | 'Athlete'
  teamName: string
  tournamentName: string
  division?: string
  photoUrl?: string
  uniqueId?: string
}

export function IDCard({
  name,
  role,
  teamName,
  tournamentName,
  division,
  photoUrl,
  uniqueId
}: IDCardProps) {
  return (
    <div className="w-[85.6mm] h-[54mm] bg-white border-2 border-gray-300 rounded-lg overflow-hidden relative flex flex-col shadow-sm print:shadow-none print:border-gray-400 page-break-inside-avoid">
      {/* Header */}
      <div className="bg-[#003366] text-white p-2 flex items-center gap-2 h-12 print:bg-[#003366]" style={{ backgroundColor: '#003366' }}>
        <div className="bg-white p-0.5 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
           <Image src="/td-blue.svg" alt="Logo" width={24} height={24} className="w-6 h-6" />
        </div>
        <span className="font-bold text-[11px] leading-tight line-clamp-2">
          {tournamentName}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 p-3 flex gap-3">
        {/* Photo Area - 1x1 aspect ratio */}
        <div className="w-[72px] h-[72px] bg-gray-100 border-2 border-gray-300 rounded-md flex items-center justify-center shrink-0">
          {photoUrl ? (
            <Image src={photoUrl} alt={name} width={72} height={72} className="w-full h-full object-cover rounded-md" />
          ) : (
            <div className="text-gray-400 text-[10px] text-center px-1 font-medium">
              1x1
              <br />
              Photo
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col justify-center min-w-0 flex-1">
          <h2 className="font-bold text-base leading-tight line-clamp-2 text-black mb-1.5">
            {name}
          </h2>
          
          {/* Highlighted Role Badge */}
          <div className="inline-block bg-gradient-to-r from-yellow-400 to-yellow-500 text-black text-xs font-black px-2.5 py-1 rounded mb-2 self-start uppercase tracking-wider shadow-sm border border-yellow-600">
            {role}
          </div>

          <div className="text-xs font-semibold text-gray-700 truncate mb-1">
            {teamName}
          </div>

          {division && (
            <div className="text-[10px] text-gray-600 font-medium leading-tight line-clamp-2">
              {division}
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
