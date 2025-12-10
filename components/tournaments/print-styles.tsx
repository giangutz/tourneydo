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
          background: white !important;
        }
        
        /* Force color printing */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        
        /* Enforce CR80 standard ID card size: 85.6mm x 54mm (3.375" x 2.125") */
        .w-\\[85\\.6mm\\] {
          width: 85.6mm !important;
          min-width: 85.6mm !important;
          max-width: 85.6mm !important;
        }
        
        .h-\\[54mm\\] {
          height: 54mm !important;
          min-height: 54mm !important;
          max-height: 54mm !important;
        }
        
        /* Ensure photo dimensions are exact */
        .w-\\[72px\\] {
          width: 72px !important;
          min-width: 72px !important;
          max-width: 72px !important;
        }
        
        .h-\\[72px\\] {
          height: 72px !important;
          min-height: 72px !important;
          max-height: 72px !important;
        }
        
        /* Ensure backgrounds and borders print */
        .bg-\\[\\#003366\\],
        [style*="backgroundColor: '#003366'"] {
          background-color: #003366 !important;
        }
        
        .bg-gradient-to-r {
          background-image: linear-gradient(to right, var(--tw-gradient-stops)) !important;
        }
        
        .from-yellow-400 {
          --tw-gradient-from: #facc15 !important;
          --tw-gradient-to: rgb(250 204 21 / 0) !important;
          --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;
        }
        
        .to-yellow-500 {
          --tw-gradient-to: #eab308 !important;
        }
        
        .border-yellow-600 {
          border-color: #ca8a04 !important;
        }
        
        .bg-gray-50 {
          background-color: #f9fafb !important;
        }
        
        .bg-gray-100 {
          background-color: #f3f4f6 !important;
        }
        
        .bg-white {
          background-color: #ffffff !important;
        }
        
        .text-white {
          color: #ffffff !important;
        }
        
        .text-black {
          color: #000000 !important;
        }
        
        .text-gray-400 {
          color: #9ca3af !important;
        }
        
        .text-gray-600 {
          color: #4b5563 !important;
        }
        
        .text-gray-700 {
          color: #374151 !important;
        }
        
        .text-\\[\\#003366\\] {
          color: #003366 !important;
        }
        
        .border-gray-100 {
          border-color: #f3f4f6 !important;
        }
        
        .border-gray-300 {
          border-color: #d1d5db !important;
        }
        
        .border-gray-400 {
          border-color: #9ca3af !important;
        }
        
        /* Ensure rounded corners print */
        .rounded-lg {
          border-radius: 0.5rem !important;
        }
        
        .rounded-md {
          border-radius: 0.375rem !important;
        }
        
        .rounded-full {
          border-radius: 9999px !important;
        }
        
        .rounded {
          border-radius: 0.25rem !important;
        }
        
        /* Ensure shadows are removed for print */
        .shadow-sm {
          box-shadow: none !important;
        }
        
        /* Ensure borders print with correct width */
        .border {
          border-width: 1px !important;
        }
        
        .border-2 {
          border-width: 2px !important;
        }
        
        .border-t {
          border-top-width: 1px !important;
        }
      }
    `}</style>
  )
}
