import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui'

export function SetupPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title="Setup for your team"
        subtitle="GitHub Pages for the app · Supabase free tier for shared data (fits 8 people easily)."
      />

      <ol className="space-y-6 text-sm leading-relaxed text-ink-soft">
        <li className="rounded-xl border border-line bg-panel p-5">
          <p className="font-semibold text-ink">1. Create a free Supabase project</p>
          <p className="mt-2">
            Go to{' '}
            <a className="text-sea underline" href="https://supabase.com" target="_blank" rel="noreferrer">
              supabase.com
            </a>
            , create a project, open <strong>SQL Editor</strong>, paste and run{' '}
            <code className="rounded bg-paper px-1">supabase/schema.sql</code>.
          </p>
        </li>
        <li className="rounded-xl border border-line bg-panel p-5">
          <p className="font-semibold text-ink">2. Add secrets to the repo</p>
          <p className="mt-2">Copy Project URL and anon public key into a <code className="rounded bg-paper px-1">.env</code> file:</p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-ink p-4 text-xs text-paper">{`VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key`}</pre>
          <p className="mt-2 text-muted">
            For GitHub Pages, also add these as GitHub Actions secrets:{' '}
            <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.
          </p>
        </li>
        <li className="rounded-xl border border-line bg-panel p-5">
          <p className="font-semibold text-ink">3. Push to GitHub and enable Pages</p>
          <p className="mt-2">
            Push this repo, then Settings → Pages → Source: <strong>GitHub Actions</strong>.
            The included workflow builds and deploys on every push to <code>main</code>.
          </p>
        </li>
        <li className="rounded-xl border border-line bg-panel p-5">
          <p className="font-semibold text-ink">4. Invite employees</p>
          <p className="mt-2">
            Each person opens the CRM URL → <strong>Join team</strong> with their Hostinger/work email.
            First account becomes admin. Keep using Hostinger for sending email; log outreach in each lead’s activity.
          </p>
        </li>
      </ol>

      <p className="mt-8">
        <Link to="/login" className="text-sea hover:underline">
          ← Back to login
        </Link>
      </p>
    </div>
  )
}
