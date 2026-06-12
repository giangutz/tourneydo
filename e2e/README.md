# TourneyDo — End-to-End Tests

This project has **two** test layers for the tournament lifecycle. They are
complementary: the first is your always-green safety net, the second proves the
real browser path once auth is configured.

| Layer | Runner | Auth | Runs in CI today? | File |
|-------|--------|------|-------------------|------|
| **Integration lifecycle** | Jest | mocked | ✅ yes | `__tests__/integration/tournament-lifecycle.test.ts` |
| **Real-browser lifecycle** | Playwright | real Clerk session | ⚠️ needs setup | `e2e/organizer-lifecycle.spec.ts` |

---

## 1. Integration lifecycle (no setup — just run it)

Drives the **real** server actions through the full organizer journey
(`createTournament → addParticipant → bulkWeighIn → generateTournamentBracket`)
with only the database layer faked in memory. Auth is mocked, so there is **no
sign-in blocker**. It encodes the field bugs we hit:

- a tournament must not be created until the wizard is explicitly submitted;
- adding a participant must actually create a verified registration;
- the bracket refuses to generate when participants are unweighed or too few.

```bash
npm test -- tournament-lifecycle
```

The wizard's "no premature create" behavior is additionally locked down at the
component level in `__tests__/components/tournaments/tournament-create-wizard.test.tsx`.

---

## 2. Real-browser lifecycle (Playwright + Clerk)

Runs the same journey in a real browser against the running app. Clerk blocks
automated sign-in (bot protection) — **that is the blocker that made the old
specs silently skip**. We solve it the supported way, with
[`@clerk/testing`](https://clerk.com/docs/testing/playwright/overview).

### One-time setup

1. **Install the Clerk testing helper**
   ```bash
   npm i -D @clerk/testing
   ```

2. **Create a test organizer account** (in your Clerk **development** instance):
   - email + password sign-in enabled,
   - `publicMetadata.role = "tournament-organizer"`,
   - `publicMetadata.onboardingComplete = true`.

   > This is the part I need from you. Once the account exists, everything below
   > is automated — no manual sign-in, no captcha.

3. **Configure env** — copy the example and fill it in:
   ```bash
   cp .env.e2e.example .env.e2e
   ```
   Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (dev/test keys),
   and `E2E_CLERK_ORGANIZER_EMAIL` / `E2E_CLERK_ORGANIZER_PASSWORD`.

4. **(Recommended) Point at a throwaway Supabase project.** These specs create
   real tournaments/participants. Use a dev database you can wipe, not prod.

### Run

```bash
# Boots `npm run dev` automatically (or reuses a running one) and runs the suite.
npm run e2e            # headless
npm run e2e:ui         # interactive UI mode
npm run e2e:report     # open the last HTML report
```

### How the auth wiring works

```
clerk setup (global.setup.ts)   →  fetches a Clerk Testing Token
        ↓
organizer auth (auth.setup.ts)  →  signs in the test organizer, saves
        ↓                           e2e/.auth/organizer.json (gitignored)
organizer (organizer-lifecycle.spec.ts)  →  reuses that session
```

If `E2E_CLERK_ORGANIZER_EMAIL`/`PASSWORD` are **not** set, the authenticated lane
is disabled automatically and only the public `spectator.spec.ts` runs — so the
config never hard-fails for someone without the test account.

---

## Notes / housekeeping

- **Legacy specs** (`organizer.spec.ts`, `coach.spec.ts`, `performance.spec.ts`)
  predate this setup, use stale routes, and are no longer wired into any
  Playwright project (so they don't run) and are ignored by Jest. They can be
  ported onto the authenticated lane or deleted; `organizer-lifecycle.spec.ts`
  supersedes the organizer one.
- Artifacts (`playwright-report/`, `test-results/`, `e2e/.auth/`) are gitignored.
- Selectors in `organizer-lifecycle.spec.ts` track the real components; if the
  markup changes, adjust there. The Jest integration test is the deterministic
  guarantee.
