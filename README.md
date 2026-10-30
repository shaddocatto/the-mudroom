# The Mudroom

> Come in messy, before you're presentable.

A gentle, highly-moderated online on-ramp for people who are isolated and live
primarily online — helping them build enough confidence to eventually meet
someone in person. Starting at Central Church, with room to grow to the
broader local faith community.

Full design rationale lives in the project's living design doc (decisions on
philosophy, onboarding, signals/nudging, meetup flow, identity reveal, and
moderation). This README covers setup only.

## Stack

- **Backend:** Node.js + Express
- **Database / auth / storage:** Supabase (Postgres, row-level security)
- **Moderation:** OpenAI's moderation endpoint (free)
- **Hosting:** existing cPanel plan via "Setup Node.js App", not Vercel — no added monthly cost
- **Deploy:** GitHub Actions → SSH into cPanel on every push to `main`

## Local setup

```bash
npm install
cp .env.example .env
# fill in SUPABASE_SERVICE_ROLE_KEY (Supabase dashboard → Settings → API)
# and OPENAI_API_KEY (platform.openai.com — moderation endpoint is free to use)
npm run dev
```

Server runs on `http://localhost:3000`. Health check at `/health`.

## Database

Schema lives in `supabase/migrations/`. The current schema is already applied
to the live Supabase project (`the-mudroom`, project ref `tjdgxzaubrvzkennlcdk`).
To apply future migrations, use the Supabase dashboard's SQL editor, or the
Supabase CLI once you have it linked locally:

```bash
supabase link --project-ref tjdgxzaubrvzkennlcdk
supabase db push
```

## Deploying to cPanel

The GitHub Actions workflow (`.github/workflows/deploy.yml`) SSHes into
cPanel and runs `git pull` + `npm ci` + a Passenger restart on every push to
`main`. It needs these repo secrets set under **Settings → Secrets and
variables → Actions**:

| Secret | What it is |
|---|---|
| `CPANEL_HOST` | Your server's hostname or IP |
| `CPANEL_USERNAME` | cPanel SSH username |
| `CPANEL_SSH_KEY` | Private key for SSH (add the matching public key in cPanel → SSH Access) |
| `CPANEL_APP_PATH` | Absolute path to the Node.js app folder (e.g. `/home/youruser/the-mudroom`) |
| `CPANEL_SSH_PORT` | Optional, defaults to 22 |

This mirrors the auto-deploy pattern already in use on other projects — adjust
the activation path if your cPanel's Node.js virtualenv layout differs
(`cPanel → Setup Node.js App` shows the exact path for this app).

## API overview

| Route | Purpose |
|---|---|
| `POST/GET /api/profiles/me` | Onboarding + profile |
| `GET /api/conversations` | List your conversations |
| `POST /api/conversations/:id/messages` | Send a message (also triggers the nudge check) |
| `GET /api/conversations/:id/planning-status` | "Any update?" — pending/unlocked/resolved |
| `POST /api/planning/:conversationId/confirm-identity` | Step 1 of identity reveal |
| `POST /api/planning/:conversationId/activity-choices` | Step 2 — first/second choice, overlap resolved automatically |
| `GET/POST /api/posts` | Community wall, AI pre-screened |
| `DELETE /api/posts/:id/undo` | Undo window before a "confident clean" post goes fully live |
| `GET /api/moderation/queue` | Human review queue (reviewer auth not yet wired up — see TODO in code) |
| `POST /api/moderation/:postId/decide` | Approve/block a queued post |
| `POST /api/moderation/:postId/appeal` | Appeal requires added context |
| `POST /api/feedback/:conversationId` | Post-meetup feedback, scoped to the app's own performance only |
| `POST /api/feedback/:conversationId/reopen-to-new-signals` | User-confirmed reset (not automatic) |

## Known gaps / next steps

- **Reviewer role**: `requireReviewer` in `src/routes/moderation.js` is a stub
  that always fails closed — there's no `role` column on `profiles` yet to
  distinguish Kristin + the other reviewer from everyone else.
- **Appeals**: currently just recorded; re-running the appeal through AI
  moderation with the added context (per the design doc) isn't wired up yet.
- **SLA tracking**: the 24-hour moderation SLA from the design doc isn't
  enforced or even measured yet — no timestamps/alerts for queue age.
- **Auth/signup UI**: this is backend-only so far; no frontend exists yet.
- **"Kindred Spirits" discovery section**: the suggested-matches surfacing
  logic (who gets shown to whom) isn't built — only the conversation/signal
  layer that kicks in once two people are already talking.
