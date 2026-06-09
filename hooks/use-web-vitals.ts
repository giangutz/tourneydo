'use client'

import { useEffect } from 'react'
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals'

/**
 * Reports Core Web Vitals metrics.
 * Call this in your root layout or main client component.
 * 
 * In production, you can send these to your analytics:
 * - Sentry Performance (already integrated)
 * - Custom endpoint
 * - Console for debugging
 */
export function useWebVitals() {
  useEffect(() => {
    // Only report in production to reduce noise
    const reportMetric = (metric: { name: string; value: number; id: string }) => {
      if (process.env.NODE_ENV === 'development') {
      }

      // In production, Sentry automatically captures these via its integration
      // You can also send to a custom endpoint:
      // fetch('/api/analytics', { method: 'POST', body: JSON.stringify(metric) })
    }

    // Core Web Vitals
    onCLS(reportMetric)   // Cumulative Layout Shift
    onFCP(reportMetric)   // First Contentful Paint
    onINP(reportMetric)   // Interaction to Next Paint
    onLCP(reportMetric)   // Largest Contentful Paint
    onTTFB(reportMetric)  // Time to First Byte
  }, [])
}
