# Service.Hub — Monorepo

Both the frontend and backend now live in **one repository**, in their own
subfolders. Nothing about how they run changed — only where the files sit.

```
service-hub/
├── app/, components/, lib/, hooks/, store/, public/   <- frontend (Next.js)
├── backend/                                            <- backend (FastAPI)
│   ├── app/, tests/, requirements.txt
│   └── README.md    <- full backend setup/deploy guide, unchanged
└── render.yaml       <- tells Render to build only the backend/ folder
```

## Local development

**Frontend** (from the repo root, same as before):
```powershell
npm install
npm run dev
```

**Backend** (now one level deeper, everything else identical):
```powershell
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Deployment — what changes, what doesn't

- **Vercel**: nothing changes. It still builds from the repo root, and the
  frontend files are still at the repo root.
- **Render**: it now needs to build only the `backend/` folder. This repo's
  `render.yaml` already has `rootDir: backend` set for exactly this. If
  Render was previously connected to the separate `service-hub-backend`
  repo, reconnect its Blueprint to this repo instead (Render → your
  service → Settings → Git → Change Repo, or delete and recreate via
  "New +" → "Blueprint" pointing at this repo).
- The old `service-hub-backend` repo on GitHub can be archived/deleted
  once Render is confirmed working from this repo — nothing further
  depends on it.

See `backend/README.md` for everything backend-specific (Turso, SMS,
security checklist) — none of that changed, it just moved folders.
