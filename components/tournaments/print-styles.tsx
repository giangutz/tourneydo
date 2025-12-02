'use client'

export function PrintStyles() {
  return (
    <style jsx global>{`
      @media print {
        @page {
          margin: 10mm;
          size: A4;
        }
        body {
          background: white;
        }
      }
    `}</style>
  )
}
