import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  addProjectAsset,
  addProjectService,
  deleteProjectAsset,
  deleteProjectService,
  getProject,
  listLeads,
  listProjectAssets,
  listProjectServices,
  projectMoneyTotal,
  updateProject,
  updateProjectService,
  updateProjectStatus,
} from '../lib/api'
import {
  PROJECT_STATUSES,
  SERVICE_STATUSES,
  formatMoney,
  type Lead,
  type Project,
  type ProjectAsset,
  type ProjectService,
  type ProjectStatus,
  type ServiceStatus,
} from '../types'
import { PageHeader, ProjectStatusBadge } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const QUICK_LABELS = ['Website', 'Graphics', 'Logo', 'Branding', 'Hosting', 'SEO', 'Other']

export function ProjectDetailPage() {
  const { id } = useParams()
  const { profiles } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [lead, setLead] = useState<Lead | null>(null)
  const [assets, setAssets] = useState<ProjectAsset[]>([])
  const [services, setServices] = useState<ProjectService[]>([])
  const [loading, setLoading] = useState(true)
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [savingAsset, setSavingAsset] = useState(false)

  const [svcLabel, setSvcLabel] = useState('Website')
  const [svcAmount, setSvcAmount] = useState('')
  const [svcStatus, setSvcStatus] = useState<ServiceStatus>('sold')
  const [savingSvc, setSavingSvc] = useState(false)

  const [meetingDate, setMeetingDate] = useState('')
  const [meetingAbout, setMeetingAbout] = useState('')
  const [logText, setLogText] = useState('')
  const [savingMeeting, setSavingMeeting] = useState(false)
  const [meetingError, setMeetingError] = useState('')
  const [meetingSaved, setMeetingSaved] = useState(false)

  async function refresh() {
    if (!id) return
    const row = await getProject(id)
    setProject(row)
    setMeetingDate(row?.next_meeting_date ?? '')
    setMeetingAbout(row?.next_meeting_about ?? '')
    if (row?.lead_id) {
      const leads = await listLeads()
      setLead(leads.find((l) => l.id === row.lead_id) ?? null)
    } else {
      setLead(null)
    }
    const [assetRows, serviceRows] = await Promise.all([
      listProjectAssets(id),
      listProjectServices(id),
    ])
    setAssets(assetRows)
    setServices(serviceRows)
  }

  useEffect(() => {
    void refresh().finally(() => setLoading(false))
  }, [id])

  const money = useMemo(
    () => (project ? projectMoneyTotal(project, services) : { base: 0, upsells: 0, total: 0 }),
    [project, services],
  )

  async function onStatus(status: ProjectStatus) {
    if (!project) return
    const updated = await updateProjectStatus(project.id, status)
    setProject(updated)
  }

  async function onAddAsset(e: React.FormEvent) {
    e.preventDefault()
    if (!project || !label.trim() || !url.trim()) return
    setSavingAsset(true)
    try {
      await addProjectAsset(project.id, label, url)
      setLabel('')
      setUrl('')
      setAssets(await listProjectAssets(project.id))
    } finally {
      setSavingAsset(false)
    }
  }

  async function onRemoveAsset(assetId: string) {
    if (!confirm('Remove this asset link?')) return
    await deleteProjectAsset(assetId)
    if (project) setAssets(await listProjectAssets(project.id))
  }

  async function onAddService(e: React.FormEvent) {
    e.preventDefault()
    if (!project || !svcLabel.trim()) return
    setSavingSvc(true)
    try {
      await addProjectService(project.id, {
        label: svcLabel,
        amount: Number(svcAmount) || 0,
        status: svcStatus,
      })
      setSvcAmount('')
      setSvcStatus('sold')
      setServices(await listProjectServices(project.id))
    } finally {
      setSavingSvc(false)
    }
  }

  async function onServiceStatus(serviceId: string, status: ServiceStatus) {
    await updateProjectService(serviceId, { status })
    if (project) setServices(await listProjectServices(project.id))
  }

  async function onRemoveService(serviceId: string) {
    if (!confirm('Remove this service / upsell?')) return
    await deleteProjectService(serviceId)
    if (project) setServices(await listProjectServices(project.id))
  }

  async function saveMeetingSchedule() {
    if (!project) return
    if (!meetingDate) {
      setMeetingError('Pick a meeting date first.')
      return
    }
    setSavingMeeting(true)
    setMeetingError('')
    setMeetingSaved(false)
    try {
      const updated = await updateProject(project.id, {
        next_meeting_date: meetingDate,
        next_meeting_about: meetingAbout || null,
      })
      setProject(updated)
      setMeetingSaved(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save meeting'
      setMeetingError(
        msg.includes('next_meeting') || msg.includes('column')
          ? 'Database missing meeting columns. Run supabase/migration_meetings.sql in Supabase SQL Editor, then try again.'
          : msg,
      )
    } finally {
      setSavingMeeting(false)
    }
  }

  async function logUpsellMeeting(e: React.FormEvent) {
    e.preventDefault()
    if (!project || !logText.trim()) return
    setSavingMeeting(true)
    setMeetingError('')
    try {
      const stamp = new Date().toLocaleString()
      const about = meetingAbout || project.next_meeting_about || 'Upsell meeting'
      const entry = `[${stamp}] ${about}: ${logText.trim()}`
      const updated = await updateProject(project.id, {
        meeting_notes: project.meeting_notes
          ? `${entry}\n\n${project.meeting_notes}`
          : entry,
        next_meeting_date: null,
        next_meeting_about: null,
      })
      setProject(updated)
      setMeetingDate('')
      setMeetingAbout('')
      setLogText('')
      setMeetingSaved(false)
    } catch (err) {
      setMeetingError(err instanceof Error ? err.message : 'Could not log meeting')
    } finally {
      setSavingMeeting(false)
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading project…</p>
  if (!project) return <p className="text-sm text-lost">Project not found.</p>

  const owner = profiles.find((p) => p.id === project.assigned_to)

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={project.name}
        subtitle={lead ? `Client: ${lead.company_name}` : 'No linked lead'}
        actions={
          <Link
            to={`/projects/${project.id}/edit`}
            className="rounded-lg border border-line bg-panel px-4 py-2.5 text-sm font-medium hover:border-sea"
          >
            Edit
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ProjectStatusBadge status={project.status} />
        <select
          className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"
          value={project.status}
          onChange={(e) => void onStatus(e.target.value as ProjectStatus)}
        >
          {PROJECT_STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted">Who’s doing it: {owner?.full_name ?? 'Unassigned'}</span>
        <span className="rounded-md bg-sea/10 px-2.5 py-1 text-sm font-semibold text-sea">
          Total {formatMoney(money.total)}
        </span>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-panel px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted">Base package</p>
          <p className="mt-1 text-xl font-semibold">{formatMoney(money.base)}</p>
        </div>
        <div className="rounded-xl border border-line bg-panel px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted">Upsells</p>
          <p className="mt-1 text-xl font-semibold text-coral">{formatMoney(money.upsells)}</p>
        </div>
        <div className="rounded-xl border border-line bg-panel px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted">Client total</p>
          <p className="mt-1 text-xl font-semibold text-won">{formatMoney(money.total)}</p>
        </div>
      </div>

      <section className="mb-6 rounded-xl border border-line bg-panel p-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">
          Upsell / next meeting
        </h2>
        <p className="mb-4 text-xs text-muted">
          Example: Money Sense — Graphics upsell. Use <strong>Save meeting</strong> to put it on
          the Dashboard. Use <strong>Log meeting</strong> only after the call (that clears the
          date on purpose).
        </p>

        <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto]">
          <input
            type="date"
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
            className="rounded-lg border border-line px-3 py-2 text-sm"
          />
          <input
            value={meetingAbout}
            onChange={(e) => setMeetingAbout(e.target.value)}
            placeholder="Graphics upsell"
            className="rounded-lg border border-line px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void saveMeetingSchedule()}
            disabled={savingMeeting}
            className="rounded-lg border border-line px-3 py-2 text-sm font-medium hover:border-sea disabled:opacity-60"
          >
            Save meeting
          </button>
        </div>
        {meetingError && <p className="mt-2 text-sm text-lost">{meetingError}</p>}
        {meetingSaved && !meetingError && (
          <p className="mt-2 text-sm text-won">
            Meeting saved — it will show on the Dashboard under Upcoming upsell meetings.
          </p>
        )}

        <form onSubmit={logUpsellMeeting} className="mt-4 space-y-2 border-t border-line pt-4">
          <p className="text-xs font-medium text-ink-soft">Log upsell meeting (after the call)</p>
          <textarea
            required
            rows={2}
            value={logText}
            onChange={(e) => setLogText(e.target.value)}
            placeholder="Interested in brand kit + 5 social templates. Sending quote Monday."
            className="w-full rounded-lg border border-line px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={savingMeeting}
            className="rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-paper disabled:opacity-60"
          >
            {savingMeeting ? 'Saving…' : 'Log meeting & clear date'}
          </button>
        </form>

        {project.meeting_notes && (
          <div className="mt-4 rounded-lg bg-paper px-3 py-3 text-sm whitespace-pre-wrap text-ink-soft">
            {project.meeting_notes}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <div className="rounded-xl border border-line bg-panel p-5">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">
              Services & upsells
            </h2>
            <p className="mb-4 text-xs text-muted">
              Start with Website, then add Graphics, Logo, etc. when you upsell.
            </p>

            <form onSubmit={onAddService} className="mb-4 grid gap-2 sm:grid-cols-[1fr_110px_140px_auto]">
              <div>
                <input
                  list="service-labels"
                  required
                  value={svcLabel}
                  onChange={(e) => setSvcLabel(e.target.value)}
                  placeholder="Website, Graphics…"
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm"
                />
                <datalist id="service-labels">
                  {QUICK_LABELS.map((q) => (
                    <option key={q} value={q} />
                  ))}
                </datalist>
              </div>
              <input
                type="number"
                min="0"
                step="1"
                value={svcAmount}
                onChange={(e) => setSvcAmount(e.target.value)}
                placeholder="$"
                className="rounded-lg border border-line px-3 py-2 text-sm"
              />
              <select
                value={svcStatus}
                onChange={(e) => setSvcStatus(e.target.value as ServiceStatus)}
                className="rounded-lg border border-line px-3 py-2 text-sm"
              >
                {SERVICE_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={savingSvc}
                className="rounded-lg bg-sea px-3 py-2 text-sm font-semibold text-white hover:bg-sea-deep disabled:opacity-60"
              >
                {savingSvc ? '…' : 'Add'}
              </button>
            </form>

            <div className="space-y-2">
              {services.length === 0 && (
                <p className="text-sm text-muted">
                  No services yet — add Website first, then Graphics when they buy more.
                </p>
              )}
              {services.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-paper px-3 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium">{s.label}</p>
                    <p className="text-xs text-muted">{formatMoney(s.amount)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={s.status}
                      onChange={(e) =>
                        void onServiceStatus(s.id, e.target.value as ServiceStatus)
                      }
                      className="rounded-md border border-line bg-panel px-2 py-1 text-xs"
                    >
                      {SERVICE_STATUSES.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void onRemoveService(s.id)}
                      className="text-xs text-lost hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-panel p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Details</h2>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs text-muted">Start</dt>
                <dd className="mt-0.5 font-medium">{project.start_date ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Due</dt>
                <dd className="mt-0.5 font-medium">{project.due_date ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Linked lead</dt>
                <dd className="mt-0.5 font-medium">
                  {lead ? (
                    <Link to={`/leads/${lead.id}`} className="text-sea hover:underline">
                      {lead.company_name}
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Base package amount</dt>
                <dd className="mt-0.5 font-medium">{formatMoney(project.deal_amount)}</dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-xs text-muted">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                {project.notes || 'No notes yet.'}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-panel p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
            Assets
          </h2>
          <p className="mb-3 text-xs text-muted">
            Paste links — Figma, Drive, GitHub Pages, Hostinger, contracts.
          </p>

          <form onSubmit={onAddAsset} className="mb-4 space-y-2">
            <input
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (e.g. Figma mockup)"
              className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            />
            <input
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={savingAsset}
              className="w-full rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-paper hover:bg-ink-soft disabled:opacity-60"
            >
              {savingAsset ? 'Adding…' : 'Add asset link'}
            </button>
          </form>

          <div className="space-y-2">
            {assets.length === 0 && <p className="text-sm text-muted">No assets yet.</p>}
            {assets.map((a) => (
              <div
                key={a.id}
                className="flex items-start justify-between gap-2 rounded-lg bg-paper px-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">{a.label}</p>
                  <a
                    href={a.url.startsWith('http') ? a.url : `https://${a.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-xs text-sea hover:underline"
                  >
                    {a.url}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => void onRemoveAsset(a.id)}
                  className="shrink-0 text-xs text-lost hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
