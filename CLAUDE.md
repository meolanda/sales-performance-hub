# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Vite)
npm run build      # Production build
npm run lint       # ESLint
npm run test       # Run tests once (Vitest)
npm run test:watch # Watch mode
```

Run a single test file:
```bash
npx vitest run src/test/example.test.ts
```

## Architecture

**Stack:** React 18 + TypeScript + Vite, shadcn/ui (Radix UI), Tailwind CSS, Supabase, TanStack Query v5, React Router v6.

**Auth flow:** `App.tsx` initializes a Supabase `onAuthStateChange` listener that sets session state. All routes under `/*` are wrapped in `<ProtectedRoute>` — unauthenticated users are redirected to `/auth`.

**Data layer:** All Supabase access goes through the `useQuotations` hook (`src/hooks/useQuotations.ts`). It fetches all records with cursor-based pagination (1000 rows/page) and stores the full dataset in local state. Filtering (year/month/work_type/customer_type) and KPI calculations (actualSales, pipelineOpportunities, hotLeads) are derived client-side via `useMemo`. There is **no server-side filtering** — all rows are fetched up front.

**Supabase tables:**
- `quotations` — main data, keyed by `document_number`
- `api_settings` — FlowAccount OAuth credentials (client_id, client_secret)
- `webhook_logs` — inbound webhook audit trail

**Status values on `quotations.status`:** `"pending"` | `"approved"` (displayed as "ปิดการขายได้")

**Customer type detection:** `isCorporate()` in `useQuotations.ts` uses a regex against `customer_name` to distinguish corporate vs. residential customers.

**Hot Lead definition:** status = pending, net_total > 100,000 THB, document age < 15 days.

**UI language:** All UI text is bilingual Thai/English. Use `font-sarabun` class for any Thai text. Currency is formatted as Thai Baht (฿).

**Import flow:** `ImportPage.tsx` uses `read-excel-file` to parse Excel uploads and upserts rows into `quotations` via Supabase.

**Supabase types:** `src/integrations/supabase/types.ts` is auto-generated — do not edit manually. Regenerate with the Supabase CLI when schema changes.
