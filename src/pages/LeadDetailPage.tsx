import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  addActivity,
  advanceLeadAtLeast,
  getLead,
  listActivities,
  updateLead,
  updateLeadStatus,
} from '../lib/api'
import { PROGRESS_STEPS, isClosed, stageIndex } from '../lib/pipeline'
import {
  PIPELINE_STAGES,
  formatMoney,
  type Activity,
  type ActivityType,
  type Lead,
  type PipelineStage,
} from '../types'
import { PageHeader, StageBadge } from '../components/ui'
import { useAuth } from '../context/AuthContext'

export function LeadDetailPage() {
  const { id } = useParams()
  const { userId, profiles } = useAuth()
  const [lead, setLead] = useState<Lead | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [noteType, setNoteType] = useState<ActivityType>('email')
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [amountDraft, setAmountDraft] = useState('')
  const [savingAmount, setSavingAmount] = useState(false)
  const [meetingDate, setMeetingDate] = useState('')
  const [advancing, setAdvancing] = useState(false)

  async function refresh() {
    if (!id) return
    const [leadRow, activityRows] = await Promise.all([getLead(id), listActivities(id)])
    setLead(leadRow)
    setActivities(activityRows)
    setAmountDraft(leadRow?.deal_amount != null ? String(leadRow.deal_amount) : '')
    setMeetingDate(leadRow?.next_follow_up ?? '')
  }

  useEffect(() => {
    void refresh().finally(() => setLoading(false))
  }, [id])

  async function onStatusChange(status: PipelineStage) {
    if (!lead || !userId) return
    const updated = await updateLeadStatus(lead.id, status, userId, lead.status)
    setLead(updated)
    setActivities(await listActivities(lead.id))
  }

  async function runProgress(stage: PipelineStage, also?: Partial<Lead>) {
    if (!lead || !userId || advancing) return
    setAdvancing(true)
    try {
      if (also && Object.keys(also).length) {
        await updateLead(lead.id, also)
      }
      const updated = await advanceLeadAtLeast(lead.id, stage, userId, lead.status)
      setLead(updated)
      setActivities(await listActivities(lead.id))
    } finally {
      setAdvancing(false)
    }
  }

  async function bookMeeting() {
    if (!lead || !userId) return
    const date = meetingDate || new Date().toISOString().slice(0, 10)
    await runProgress('meeting_scheduled', { next_follow_up: date })
    setMeetingDate(date)
  }

  async function saveAmount() {
    if (!lead || !userId) return
    setSavingAmount(true)
    try {
      let updated = await updateLead(lead.id, {
        deal_amount: amountDraft === '' ? null : Number(amountDraft),
      })
      if (amountDraft !== '' && !isClosed(lead.status)) {
        updated = await advanceLeadAtLeast(lead.id, 'negotiation', userId, updated.status)
      }
      setLead(updated)
      setActivities(await listActivities(lead.id))
    } finally {
      setSavingAmount(false)
    }
  }

  async function logActivity(e: React.FormEvent) {
    e.preventDefault()
    if (!lead || !userId || !note.trim()) return
    setSavingNote(true)
    try {
      await addActivity(lead.id, noteType, note, userId)
      const today = new Date().toISOString().slice(0, 10)
      if (noteType === 'email' || noteType === 'whatsapp' || noteType === 'call') {
        await updateLead(lead.id, { last_follow_up: today })
      }

      if (noteType === 'email' || noteType === 'whatsapp') {
        await advanceLeadAtLeast(lead.id, 'outreach_sent', userId, lead.status)
      } else if (noteType === 'call') {
        await advanceLeadAtLeast(lead.id, 'interested', userId, lead.status)
      }

      setLead(await getLead(lead.id))
      setNote('')
      setActivities(await listActivities(lead.id))
    } finally {
      setSavingNote(false)
    }
  }

  function openEmail() {
    if (!lead) return
    const subject = encodeURIComponent(`Creative Tugs — ${lead.company_name}`)
    const body = encodeURIComponent(
      `Hi ${lead.contact_name.split(' ')[0] || lead.contact_name},\n\n`,
    )
    window.location.href = `mailto:${lead.email}?subject=${subject}&body=${body}`
  }

  if (loading) return <p className="text-sm text-muted">Loading lead…</p>
  if (!lead) return <p className="text-sm text-lost">Lead not found.</p>

  const owner = profiles.find((p) => p.id === lead.assigned_to)
  const currentIdx = stageIndex(lead.status)

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={lead.company_name}
        subtitle={`${lead.contact_name} · ${lead.email}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openEmail}
              className="rounded-lg border border-line bg-panel px-4 py-2.5 text-sm font-medium hover:border-sea"
            >
              Email (Hostinger / Outlook)
            </button>
            <Link
              to={`/leads/${lead.id}/edit`}
              className="rounded-lg border border-line bg-panel px-4 py-2.5 text-sm font-medium hover:border-sea"
            >
              Edit
            </Link>
            <a
              href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-sea px-4 py-2.5 text-sm font-semibold text-white hover:bg-sea-deep"
            >
              Open website
            </a>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StageBadge status={lead.status} />
        <select
          className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"
          value={lead.status}
          onChange={(e) => void onStatusChange(e.target.value as PipelineStage)}
        >
          {PIPELINE_STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted">Owner: {owner?.full_name ?? 'Unassigned'}</span>
        <span className="text-sm text-muted">
          Created {format(parseISO(lead.created_at), 'MMM d, yyyy')} by{' '}
          {profiles.find((p) => p.id === lead.created_by)?.full_name ?? '—'}
        </span>
        <span className="text-sm font-semibold">{formatMoney(lead.deal_amount)}</span>
        {lead.status === 'closed_won' && (
          <Link
            to={`/projects/new?lead=${lead.id}`}
            className="rounded-lg bg-won/10 px-3 py-1.5 text-sm font-medium text-won hover:bg-won/15"
          >
            Create project
          </Link>
        )}
      </div>

      <section className="mb-6 rounded-xl border border-line bg-panel p-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">
          Progress path
        </h2>
        <p className="mb-4 text-xs text-muted">
          New leads start at New Lead. Tap what you did — you can skip steps. Example: add Nancy →
          Mockup ready → Outreach sent → Meeting booked → Closed won/lost.
        </p>

        <div className="flex flex-wrap gap-2">
          {PROGRESS_STEPS.map((step) => {
            const done = !isClosed(lead.status) && currentIdx >= stageIndex(step.stage)
            const isCurrent = lead.status === step.stage
            const isLost = step.stage === 'closed_lost'
            const isWon = step.stage === 'closed_won'
            return (
              <button
                key={step.id}
                type="button"
                disabled={advancing}
                title={step.hint}
                onClick={() => {
                  if (step.stage === 'meeting_scheduled') {
                    void bookMeeting()
                    return
                  }
                  void runProgress(step.stage)
                }}
                className={[
                  'rounded-lg border px-3 py-2 text-left text-sm transition',
                  isCurrent
                    ? 'border-sea bg-sea text-white'
                    : done
                      ? 'border-sea/30 bg-sea/10 text-sea'
                      : isWon
                        ? 'border-won/40 text-won hover:bg-won/10'
                        : isLost
                          ? 'border-lost/40 text-lost hover:bg-lost/10'
                          : 'border-line bg-paper text-ink-soft hover:border-sea',
                  advancing ? 'opacity-60' : '',
                ].join(' ')}
              >
                <span className="block font-medium">{step.label}</span>
                <span className={`block text-[11px] ${isCurrent ? 'text-white/80' : 'text-muted'}`}>
                  {step.hint}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted">Meeting date (for Meeting booked)</span>
            <input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={advancing}
            onClick={() => void bookMeeting()}
            className="rounded-lg bg-sea px-3 py-2 text-sm font-semibold text-white hover:bg-sea-deep disabled:opacity-60"
          >
            Book meeting → move stage
          </button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-4">
          <div className="rounded-xl border border-line bg-panel p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Details</h2>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              {[
                ['Phone', lead.phone || '—'],
                ['Industry', lead.industry],
                ['City', lead.city || '—'],
                ['Country', lead.country],
                ['Lead source', lead.lead_source],
                ['Platform', lead.website_platform || '—'],
                ['Job title', lead.job_title || '—'],
                ['Portfolio sent', lead.portfolio_sent ? 'Yes' : 'No'],
                ['Outreach date', lead.outreach_date || '—'],
                ['Last follow-up', lead.last_follow_up || '—'],
                ['Next follow-up', lead.next_follow_up || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="mt-0.5 font-medium">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 rounded-lg border border-line bg-paper p-3">
              <p className="text-xs text-muted">Deal / closed amount ($)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={amountDraft}
                  onChange={(e) => setAmountDraft(e.target.value)}
                  className="w-40 rounded-lg border border-line bg-panel px-3 py-2 text-sm"
                  placeholder="2500"
                />
                <button
                  type="button"
                  onClick={() => void saveAmount()}
                  disabled={savingAmount}
                  className="rounded-lg bg-ink px-3 py-2 text-sm font-medium text-paper disabled:opacity-60"
                >
                  {savingAmount ? 'Saving…' : 'Save amount'}
                </button>
              </div>
            </div>

            {lead.mockup_link && (
              <p className="mt-4 text-sm">
                Mockup:{' '}
                <a
                  className="text-sea hover:underline"
                  href={lead.mockup_link}
                  target="_blank"
                  rel="noreferrer"
                >
                  {lead.mockup_link}
                </a>
              </p>
            )}
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-xs text-muted">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{lead.notes}</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-panel p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Email / WhatsApp log
          </h2>
          <p className="mb-3 text-xs text-muted">
            Logging Email/WhatsApp moves the lead to <strong>Outreach Sent</strong> if it was still earlier.
          </p>

          <form onSubmit={logActivity} className="mb-4 space-y-2">
            <select
              className="w-full rounded-lg border border-line px-3 py-2 text-sm"
              value={noteType}
              onChange={(e) => setNoteType(e.target.value as ActivityType)}
            >
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="call">Call</option>
              <option value="note">Note</option>
            </select>
            <textarea
              required
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Sent intro + mockup link via email…"
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-sea"
            />
            <button
              type="submit"
              disabled={savingNote}
              className="w-full rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-paper hover:bg-ink-soft disabled:opacity-60"
            >
              {savingNote ? 'Saving…' : 'Log activity'}
            </button>
          </form>

          <div className="space-y-3">
            {activities.length === 0 && <p className="text-sm text-muted">No activity yet.</p>}
            {activities.map((a) => {
              const author = profiles.find((p) => p.id === a.created_by)
              return (
                <article key={a.id} className="rounded-lg bg-paper px-3 py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-sea">
                      {a.type.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-muted">
                      {format(parseISO(a.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-ink-soft">{a.content}</p>
                  {author && <p className="mt-1 text-[11px] text-muted">{author.full_name}</p>}
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
