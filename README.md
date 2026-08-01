# Creative Tugs CRM

Lightweight CRM for a small agency team (3–8 people): lead database, deal pipeline, follow-ups, and a manual email/WhatsApp activity log. Code lives on GitHub; the app deploys to **GitHub Pages**; shared data uses **Supabase** free tier.

## Why this stack

| Piece | Role | Cost |
|-------|------|------|
| GitHub Pages | Hosts the CRM UI | Free |
| Supabase | Login + shared database for the whole team | Free tier is enough for ~8 users |
| Hostinger mail | Keep sending email as you do today | Already paid |

Without HubSpot. Without a VPS. Scales when you hire.

## Pipeline stages

New Lead → Website Reviewed → Mockup Created → Outreach Sent → Interested → Meeting Scheduled → Proposal Sent → Negotiation → **Closed Won** / **Closed Lost**

## Quick start (demo on your laptop)

```bash
npm install
npm run dev
```

Open the URL Vite prints. **Demo mode** stores data in the browser until you connect Supabase — fine for trying the UI, not for a real team.

## Team setup (recommended)

1. Create a free project at [supabase.com](https://supabase.com).
2. In Supabase → **SQL Editor**, run `supabase/schema.sql`.
3. Copy Project URL + anon key into `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

4. Push this repo to GitHub.
5. Repo **Settings → Secrets and variables → Actions**, add the same two values as secrets.
6. **Settings → Pages → Source: GitHub Actions**.
7. Push to `main` (or run the workflow manually). Your CRM URL will look like:

`https://YOUR_USERNAME.github.io/CRM/`

8. Each employee opens the site → **Join team** with their work email.

## Email & WhatsApp

Keep using Hostinger inboxes. On each lead, use **Log activity** (Email / WhatsApp / Call / Note) so the team shares a touch history. Auto-sync of Hostinger mailboxes is intentionally out of v1.

## Scripts

- `npm run dev` — local development
- `npm run build` — production build into `dist/`
- `npm run preview` — preview the production build

## Roadmap (later)

- Browser reminders / email digests for overdue follow-ups
- Proposal file attachments
- Optional IMAP sync if volume justifies it
