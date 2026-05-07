# Personal Financial Planner

## Local development
1. Clone the repo
2. In `/backend`: `cp .env.example .env` → fill `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, set `CLIENT_ORIGIN=http://localhost:5173`
3. In `/frontend`: `cp .env.example .env` → fill `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, set `VITE_API_BASE_URL=http://localhost:4000`
4. Run: `cd backend && npm install && npm run dev`
5. Run: `cd frontend && npm install && npm run dev`
6. Open http://localhost:5173

## Deploy to production (free)
### Backend (Render):
- Connect `/backend` to a new Render Web Service
- Set env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CLIENT_ORIGIN` (your Vercel URL), `PORT=4000`
- Note your Render URL (e.g. `https://pf-planner-api.onrender.com`)
- Free tier sleeps after 15 min idle; first wake ~30s

### Frontend (Vercel):
- Connect `/frontend` to a new Vercel project
- Set root directory to `/frontend`
- Set `VITE_API_BASE_URL` to your Render URL
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Supabase Auth setup:
- Enable Google OAuth in Authentication → Providers
- Set Site URL to your Vercel URL
- Add Vercel URL + `/auth/callback` to Redirect URLs
