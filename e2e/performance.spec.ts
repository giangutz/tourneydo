/**
 * End-to-End Performance Tests using Playwright
 * 
 * Tests complete user journeys for:
 * - Page load times
 * - Interaction responsiveness (click → visual feedback)
 * - Memory growth during extended use
 * - Resource utilization (CSS, JavaScript, images)
 * 
 * Run: npx playwright test e2e/performance.spec.ts
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

/**
 * Configure browser to capture performance metrics
 */
test.beforeEach(async ({ page }) => {
  // Enable performance monitoring
  await page.addInitScript(() => {
    // Store performance marks for later analysis
    (window as any).performanceMarks = []
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        ; (window as any).performanceMarks.push({
          name: entry.name,
          duration: (entry as any).duration,
          startTime: entry.startTime,
        })
      }
    })
    observer.observe({ entryTypes: ['measure', 'mark', 'navigation'] })
  })

  // Clear browser cache for consistent results
  await page.context().clearCookies()
})

/**
 * Test: Landing Page Load Performance
 */
test.describe('Performance: Landing Page', () => {
  test('landing page should load in under 3 seconds', async ({ page }) => {
    const startTime = Date.now()

    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })

    const loadTime = Date.now() - startTime

    console.log(`Landing page loaded in ${loadTime}ms`)
    expect(loadTime).toBeLessThan(3000)

    // Check Core Web Vitals
    const metrics = await page.evaluate(() => {
      return {
        fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
        lcp: 0, // Will be measured via PerformanceObserver
      }
    })

    console.log('Core Web Vitals:', metrics)
  })

  test('landing page should have no layout shifts', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })

    const cls = await page.evaluate(() => {
      return new Promise<number>(resolve => {
        let clsValue = 0
        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if ((entry as any).hadRecentInput) continue
            clsValue += (entry as any).value
          }
        })
        observer.observe({ entryTypes: ['layout-shift'] })

        // Wait a bit then resolve
        setTimeout(() => {
          observer.disconnect()
          resolve(clsValue)
        }, 3000)
      })
    })

    console.log(`Cumulative Layout Shift: ${cls.toFixed(3)}`)
    expect(cls).toBeLessThan(0.1) // CLS should be < 0.1 for good experience
  })

  test('landing page resources should load efficiently', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })

    // Get resource timing data
    const resources = await page.evaluate(() => {
      return performance
        .getEntriesByType('resource')
        .map(r => ({
          name: r.name,
          duration: (r as any).duration,
          size: (r as any).transferSize,
          type: r.initiatorType,
        }))
        .sort((a, b) => b.duration - a.duration)
    })

    console.log('Top 5 slowest resources:')
    resources.slice(0, 5).forEach(r => {
      console.log(`  ${r.name.substring(BASE_URL.length)}: ${r.duration.toFixed(2)}ms (${r.size} bytes)`)
    })

    // Check for large uncompressed resources
    const largeResources = resources.filter(r => r.size > 500000)
    console.log(`Large uncompressed resources: ${largeResources.length}`)
    expect(largeResources.length).toBeLessThan(3)
  })
})

/**
 * Test: Tournament Creation Flow Performance
 */
test.describe('Performance: Tournament Creation Flow', () => {
  test('tournament creation form should be interactive within 2 seconds', async ({ page, context }) => {
    // Login first (assume we have auth setup)
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' })

    const startTime = Date.now()
    const navigationPromise = page.waitForNavigation()

    // Click "New Tournament" button
    await page.click('button:has-text("New Tournament")')

    await navigationPromise
    const timeToInteractive = Date.now() - startTime

    console.log(`Form became interactive in ${timeToInteractive}ms`)
    expect(timeToInteractive).toBeLessThan(2000)

    // Measure form field responsiveness
    const fieldStartTime = Date.now()
    await page.fill('input[name="tournamentName"]', 'Performance Test Tournament')
    const fieldInputTime = Date.now() - fieldStartTime

    console.log(`Form input feedback in ${fieldInputTime}ms`)
    expect(fieldInputTime).toBeLessThan(50) // Should feel instant
  })

  test('form submission should complete within 5 seconds', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/new-tournament`, { waitUntil: 'networkidle' })

    // Fill out form
    await page.fill('input[name="tournamentName"]', `Perf Test ${Date.now()}`)
    await page.fill('input[name="date"]', '2025-06-01')
    await page.fill('input[name="location"]', 'Test Location')
    await page.selectOption('select[name="sport"]', 'judo')

    // Measure submission time
    const startTime = Date.now()
    const navigationPromise = page.waitForNavigation()

    await page.click('button:has-text("Create Tournament")')

    await navigationPromise
    const submissionTime = Date.now() - startTime

    console.log(`Form submission completed in ${submissionTime}ms`)
    expect(submissionTime).toBeLessThan(5000)
  })

  test('multiple form interactions should not cause lag', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/new-tournament`, { waitUntil: 'networkidle' })

    const interactions = [
      { selector: 'input[name="tournamentName"]', value: 'Test Tournament' },
      { selector: 'input[name="date"]', value: '2025-06-01' },
      { selector: 'input[name="location"]', value: 'Test Location' },
      { selector: 'select[name="sport"]', value: 'judo' },
    ]

    const timings: number[] = []

    for (const interaction of interactions) {
      const startTime = Date.now()
      if (interaction.selector.startsWith('select')) {
        await page.selectOption(interaction.selector, interaction.value)
      } else {
        await page.fill(interaction.selector, interaction.value)
      }
      timings.push(Date.now() - startTime)
    }

    console.log('Form interaction timings (ms):', timings)

    // No single interaction should take > 200ms
    expect(Math.max(...timings)).toBeLessThan(200)

    // Average should be < 100ms
    const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length
    expect(avgTiming).toBeLessThan(100)
  })
})

/**
 * Test: Participant Registration Flow Performance
 */
test.describe('Performance: Participant Registration', () => {
  test('participant list should load and display quickly', async ({ page }) => {
    const startTime = Date.now()

    await page.goto(`${BASE_URL}/dashboard/tournament/[id]/participants`, {
      waitUntil: 'networkidle',
    })

    const loadTime = Date.now() - startTime

    // Wait for participant list to render
    await page.waitForSelector('table tbody tr', { timeout: 5000 })

    console.log(`Participant list loaded in ${loadTime}ms`)
    expect(loadTime).toBeLessThan(2000)
  })

  test('add participant modal should open and respond instantly', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/tournament/[id]/participants`, {
      waitUntil: 'networkidle',
    })

    const startTime = Date.now()
    await page.click('button:has-text("Add Participant")')

    // Wait for modal to appear
    await page.waitForSelector('[role="dialog"]', { timeout: 1000 })

    const modalOpenTime = Date.now() - startTime

    console.log(`Modal opened in ${modalOpenTime}ms`)
    expect(modalOpenTime).toBeLessThan(500)
  })

  test('participant search should respond in < 300ms', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/tournament/[id]/participants`, {
      waitUntil: 'networkidle',
    })

    const startTime = Date.now()

    // Type in search field
    await page.fill('input[placeholder="Search participants"]', 'John')

    // Wait for results
    await page.waitForTimeout(100) // Debounce
    await page.waitForSelector('[data-testid="participant-row"]')

    const searchTime = Date.now() - startTime

    console.log(`Search results received in ${searchTime}ms`)
    expect(searchTime).toBeLessThan(300)
  })

  test('participant pagination should be smooth', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/tournament/[id]/participants`, {
      waitUntil: 'networkidle',
    })

    // Get initial row count
    const initialRows = await page.locator('table tbody tr').count()

    const pageStartTime = Date.now()

    // Click next page
    await page.click('button:has-text("Next")')

    // Wait for new rows to load
    await page.waitForFunction(
      () => document.querySelectorAll('table tbody tr').length > 0,
      { timeout: 2000 }
    )

    const pageLoadTime = Date.now() - pageStartTime

    console.log(`Page navigation completed in ${pageLoadTime}ms`)
    expect(pageLoadTime).toBeLessThan(1000)
  })
})

/**
 * Test: Bracket Generation Performance
 */
test.describe('Performance: Bracket Generation', () => {
  test('bracket generation with 16 participants should complete within 2 seconds', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/dashboard/tournament/[id]/bracket`, {
      waitUntil: 'networkidle',
    })

    const startTime = Date.now()

    // Click generate bracket button
    await page.click('button:has-text("Generate Bracket")')

    // Wait for bracket to render
    await page.waitForSelector('[data-testid="bracket-match"]', { timeout: 3000 })

    const generationTime = Date.now() - startTime

    console.log(`Bracket generation completed in ${generationTime}ms`)
    expect(generationTime).toBeLessThan(2000)

    // Check that bracket is visible
    const matchCount = await page.locator('[data-testid="bracket-match"]').count()
    console.log(`Bracket contains ${matchCount} matches`)
    expect(matchCount).toBeGreaterThan(0)
  })

  test('bracket rendering should not cause layout shifts', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/tournament/[id]/bracket`, {
      waitUntil: 'networkidle',
    })

    const cls = await page.evaluate(() => {
      return new Promise<number>(resolve => {
        let clsValue = 0
        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if ((entry as any).hadRecentInput) continue
            clsValue += (entry as any).value
          }
        })
        observer.observe({ entryTypes: ['layout-shift'] })

        // Monitor during bracket generation
        setTimeout(() => {
          observer.disconnect()
          resolve(clsValue)
        }, 5000)
      })
    })

    console.log(`Layout Shift during bracket generation: ${cls.toFixed(3)}`)
    expect(cls).toBeLessThan(0.15)
  })

  test('bracket with 64 participants should remain interactive', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/tournament/[id]/bracket?size=64`, {
      waitUntil: 'networkidle',
    })

    // Bracket should still be interactive
    const startTime = Date.now()

    // Click on a match to view details
    const firstMatch = await page.locator('[data-testid="bracket-match"]').first()
    await firstMatch.click()

    const interactionTime = Date.now() - startTime

    console.log(`Interaction on large bracket took ${interactionTime}ms`)
    expect(interactionTime).toBeLessThan(200)
  })
})

/**
 * Test: Match Update Performance (Real-time)
 */
test.describe('Performance: Real-time Match Updates', () => {
  test('match score update should reflect within 500ms', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/tournament/[id]/match/[matchId]`, {
      waitUntil: 'networkidle',
    })

    // Simulate score update
    const startTime = Date.now()

    await page.click('button[data-score-action="addPoint"][data-player="1"]')

    // Wait for UI update
    await page.waitForFunction(
      () => document.querySelector('[data-player="1"][data-score]')?.textContent?.includes('1'),
      { timeout: 1000 }
    )

    const updateTime = Date.now() - startTime

    console.log(`Score update reflected in UI in ${updateTime}ms`)
    expect(updateTime).toBeLessThan(500)
  })

  test('rapid score updates should not cause lag', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/tournament/[id]/match/[matchId]`, {
      waitUntil: 'networkidle',
    })

    const updateTimes: number[] = []

    // Simulate 5 rapid score updates
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now()

      await page.click('button[data-score-action="addPoint"][data-player="1"]')

      // Brief wait for next update
      await page.waitForTimeout(100)

      updateTimes.push(Date.now() - startTime)
    }

    console.log('Rapid update timings (ms):', updateTimes)

    // No update should lag
    expect(Math.max(...updateTimes)).toBeLessThan(800)

    // Average should be smooth
    const avgUpdate = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length
    expect(avgUpdate).toBeLessThan(400)
  })
})

/**
 * Test: Navigation Performance
 */
test.describe('Performance: Navigation', () => {
  test('navigation between pages should be smooth', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' })

    const navigationTimes: { from: string; to: string; time: number }[] = []

    const routes = [
      '/dashboard',
      '/dashboard/tournaments',
      '/dashboard/teams',
      '/dashboard/settings',
      '/dashboard',
    ]

    for (let i = 0; i < routes.length - 1; i++) {
      const startTime = Date.now()

      await page.goto(`${BASE_URL}${routes[i + 1]}`, { waitUntil: 'networkidle' })

      const navTime = Date.now() - startTime

      navigationTimes.push({
        from: routes[i],
        to: routes[i + 1],
        time: navTime,
      })

      console.log(`Navigation ${routes[i]} → ${routes[i + 1]}: ${navTime}ms`)
    }

    // All navigations should complete within 2 seconds
    navigationTimes.forEach(nav => {
      expect(nav.time).toBeLessThan(2000)
    })

    const avgNavTime =
      navigationTimes.reduce((sum, nav) => sum + nav.time, 0) / navigationTimes.length
    console.log(`Average navigation time: ${avgNavTime.toFixed(0)}ms`)
  })
})

/**
 * Test: Memory Usage
 */
test.describe('Performance: Memory Usage', () => {
  test('memory should not grow unbounded during extended use', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' })

    const memoryReadings: { timestamp: number; used: number }[] = []

    // Get initial memory
    const initialMemory = await page.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize
      }
      return 0
    })

    // Simulate various interactions
    const interactions = [
      { action: () => page.click('a:has-text("Tournaments")') },
      { action: () => page.goto(`${BASE_URL}/dashboard/tournaments`, { waitUntil: 'networkidle' }) },
      { action: () => page.click('a:has-text("Teams")') },
      { action: () => page.goto(`${BASE_URL}/dashboard/teams`, { waitUntil: 'networkidle' }) },
      { action: () => page.click('a:has-text("Settings")') },
      { action: () => page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: 'networkidle' }) },
    ]

    for (const interaction of interactions) {
      try {
        await interaction.action()
      } catch (e) {
        // Navigation might fail if page doesn't exist
      }

      const memory = await page.evaluate(() => {
        if ((performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize
        }
        return 0
      })

      memoryReadings.push({
        timestamp: Date.now(),
        used: memory,
      })

      console.log(`Memory usage: ${(memory / 1024 / 1024).toFixed(2)}MB`)
    }

    // Check memory doesn't grow more than 50% from initial
    const finalMemory = memoryReadings[memoryReadings.length - 1].used
    const memoryGrowth = (finalMemory / initialMemory - 1) * 100

    console.log(`Memory growth: ${memoryGrowth.toFixed(1)}%`)
    expect(memoryGrowth).toBeLessThan(50)
  })
})

/**
 * Test: Mobile Performance (Simulated)
 */
test.describe('Performance: Mobile', () => {
  test.use({
    viewport: { width: 375, height: 667 },
  })

  test('mobile landing page should load efficiently', async ({ page }) => {
    const startTime = Date.now()

    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })

    const loadTime = Date.now() - startTime

    console.log(`Mobile landing page loaded in ${loadTime}ms`)
    expect(loadTime).toBeLessThan(4000) // Slower on mobile
  })

  test('mobile form interactions should be responsive', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/new-tournament`, { waitUntil: 'networkidle' })

    const startTime = Date.now()

    // Fill form
    await page.fill('input[name="tournamentName"]', 'Mobile Test')

    const interactionTime = Date.now() - startTime

    console.log(`Mobile form interaction took ${interactionTime}ms`)
    expect(interactionTime).toBeLessThan(300) // More lenient on mobile
  })
})
