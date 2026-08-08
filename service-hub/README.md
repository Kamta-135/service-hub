# Service.Hub — Frontend

**Trusted Local Help. When You Need It.**

Next.js 15 (App Router) + TypeScript + Tailwind CSS frontend, wired to the
FastAPI backend (`service-hub-backend`).

## Getting started

```bash
cp .env.local.example .env.local     # point this at your running backend
npm install
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login) — that's the
real entry point now (root `/` is still the marketing landing page).

Make sure the backend is running first (`uvicorn app.main:app --reload` from
the `service-hub-backend` project) and that `NEXT_PUBLIC_API_URL` in
`.env.local` points at it.

> Note: `app/layout.tsx` loads Sora / Inter / IBM Plex Mono via
> `next/font/google`, which needs internet access the first time it builds.

## Auth flow (new)

- `/login` — phone number entry, with a Customer / Provider toggle. Submits
  to `POST /auth/otp/request`, then routes to `/verify-otp`.
- `/verify-otp` — 6-digit OTP input (auto-advancing boxes), resend with a
  30s cooldown. Submits to `POST /auth/otp/verify`, stores the returned
  tokens + user in `useAuthStore` (persisted to `localStorage`), then
  redirects to `/dashboard`.
- `/dashboard` — route-guarded: redirects to `/login` if there's no session.
  Greets the logged-in user by name, has a working logout.

This was verified end-to-end against the real backend (not just typed
against the API shape) — OTP request → verify → token issuance → creating a
service request, all confirmed to match exactly what `lib/api/*.ts` expects.

## API layer

```
lib/api/
  client.ts       Shared fetch wrapper — JSON headers, bearer token, throws
                  ApiError(status, detail) on non-2xx.
  authApi.ts       requestOtp, verifyOtp, refreshToken, getMe
  requestsApi.ts   createRequest, listRequests, getRequest, acceptRequest,
                   rejectRequest, updateRequestStatus

store/
  authStore.ts    Zustand store (persisted): accessToken, refreshToken,
                  user, setAuth(), logout()
```

Every function's return type matches the backend's Pydantic response model
field-for-field — see `service-hub-backend/app/schemas.py` if you add new
endpoints and need to extend these.

## Design system

- **Current brand direction (orange)** — `brand` color tokens
  (`#FF7A1A` / `#FFC15C` / `#E0650A`) on a light `canvas` (`#F7F7F5`)
  background with bold, high-contrast black text. Used by `/login`,
  `/verify-otp`, `/dashboard`.
- **Legacy tokens** (`trust`, `marigold`, `paper`) — still used by the
  original landing page (`app/page.tsx` and `components/landing/*`), which
  predates the orange direction. That page still works but visually doesn't
  match the newer screens yet — worth a restyle pass before shipping.

## What's included

```
app/
  page.tsx                     Landing page (legacy indigo/marigold theme)
  layout.tsx, globals.css
  (auth)/
    login/page.tsx             Phone entry + role toggle
    verify-otp/page.tsx        OTP entry, resend, verify
  (customer)/
    dashboard/page.tsx         Auth-protected dashboard (orange theme)

components/
  ui/                          button, badge, card, input, trust-stamp
  landing/                     navbar, hero, ai-finder-demo, category-grid,
                                how-it-works, trust-section, emergency-band,
                                testimonials, footer

lib/
  utils.ts                     cn() class-merging helper
  api/                         client.ts, authApi.ts, requestsApi.ts

store/
  authStore.ts                 Persisted Zustand auth store
```

## Next steps

- Restyle the landing page (`app/page.tsx`) to the current orange/canvas
  direction, or decide it stays legacy for now.
- Wire the dashboard's "Nearby & available" / "Recent requests" sections to
  `requestsApi.ts` instead of the mock arrays currently in
  `app/(customer)/dashboard/page.tsx`.
- Provider-side screens (accept/reject requests, status updates) — the API
  client already has `acceptRequest`, `rejectRequest`, `updateRequestStatus`
  ready to use.
- Token refresh: `refreshToken()` exists in `authApi.ts` but nothing calls it
  yet on 401 — worth adding to `client.ts` so expired access tokens
  auto-refresh instead of bouncing the user to `/login`.

## Deploying (Vercel)

1. Import this repo into Vercel.
2. Set environment variable `NEXT_PUBLIC_API_URL` to your deployed backend
   URL (e.g. `https://service-hub-backend.onrender.com`) — not `localhost`.
3. Deploy. No other config needed for Next.js on Vercel.

See `service-hub-backend/README.md` for the full backend deployment guide
(Render + Turso) and the pre-launch checklist — both projects need to go
live together for login to work.
