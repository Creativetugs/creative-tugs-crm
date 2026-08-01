import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  EMPTY_PROJECT,
  createProject,
  deleteProject,
  getLead,
  getProject,
  listLeads,
  updateProject,
} from '../lib/api'
import { PROJECT_STATUSES, type Lead, type ProjectInput } from '../types'
import { PageHeader } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const inputClass =
  'w-full rounded-lg border border-line bg-panel px-3 py-2 outline-none focus:border-sea'

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-ink-soft">
        {label}
        {required ? ' *' : ''}
      </span>
      {children}
    </label>
  )
}

export function ProjectFormPage() {
  const { id } = useParams()
  const [search] = useSearchParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const { userId, profiles, profile } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [form, setForm] = useState<ProjectInput>({
    ...EMPTY_PROJECT,
    assigned_to: profile?.id ?? null,
    lead_id: search.get('lead') || null,
  })
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void listLeads().then(setLeads)
  }, [])

  useEffect(() => {
    if (!isNew || !form.lead_id) return
    void getLead(form.lead_id).then((lead) => {
      if (!lead) return
      setForm((prev) => ({
        ...prev,
        name: prev.name || `${lead.company_name} website`,
        deal_amount: prev.deal_amount ?? lead.deal_amount,
        assigned_to: prev.assigned_to ?? lead.assigned_to ?? profile?.id ?? null,
      }))
    })
  }, [isNew, form.lead_id, profile?.id])

  useEffect(() => {
    if (isNew || !id) return
    void getProject(id)
      .then((project) => {
        if (!project) {
          setError('Project not found')
          return
        }
        setForm({
          name: project.name,
          lead_id: project.lead_id,
          status: project.status,
          assigned_to: project.assigned_to,
          deal_amount: project.deal_amount,
          start_date: project.start_date ?? '',
          due_date: project.due_date ?? '',
          notes: project.notes,
          next_meeting_date: project.next_meeting_date ?? '',
          next_meeting_about: project.next_meeting_about ?? '',
          meeting_notes: project.meeting_notes ?? '',
        })
      })
      .finally(() => setLoading(false))
  }, [id, isNew])

  function set<K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    setError('')
    try {
      if (isNew) {
        const project = await createProject(form, userId)
        navigate(`/projects/${project.id}`)
      } else if (id) {
        await updateProject(id, form)
        navigate(`/projects/${id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save project')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!id || isNew) return
    if (!confirm('Delete this project and its assets?')) return
    await deleteProject(id)
    navigate('/projects')
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={isNew ? 'New project' : 'Edit project'}
        subtitle="Keep it light — name, status, who’s doing it, money, and notes."
        actions={
          <Link
            to={isNew ? '/projects' : `/projects/${id}`}
            className="text-sm text-sea hover:underline"
          >
            Cancel
          </Link>
        }
      />

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-line bg-panel p-5">
        <Field label="Project name" required>
          <input
            required
            className={inputClass}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Piedmont Life — website redesign"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Linked lead (optional)">
            <select
              className={inputClass}
              value={form.lead_id ?? ''}
              onChange={(e) => set('lead_id', e.target.value || null)}
            >
              <option value="">None</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.company_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status" required>
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => set('status', e.target.value as ProjectInput['status'])}
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Who’s doing it">
            <select
              className={inputClass}
              value={form.assigned_to ?? ''}
              onChange={(e) => set('assigned_to', e.target.value || null)}
            >
              <option value="">Unassigned</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Project / closed amount ($)">
            <input
              type="number"
              min="0"
              step="1"
              className={inputClass}
              value={form.deal_amount ?? ''}
              onChange={(e) =>
                set('deal_amount', e.target.value === '' ? null : Number(e.target.value))
              }
              placeholder="2500"
            />
          </Field>
          <Field label="Start date">
            <input
              type="date"
              className={inputClass}
              value={form.start_date ?? ''}
              onChange={(e) => set('start_date', e.target.value)}
            />
          </Field>
          <Field label="Due date">
            <input
              type="date"
              className={inputClass}
              value={form.due_date ?? ''}
              onChange={(e) => set('due_date', e.target.value)}
            />
          </Field>
          <Field label="Next upsell / meeting date">
            <input
              type="date"
              className={inputClass}
              value={form.next_meeting_date ?? ''}
              onChange={(e) => set('next_meeting_date', e.target.value)}
            />
          </Field>
          <Field label="Meeting about">
            <input
              className={inputClass}
              value={form.next_meeting_about ?? ''}
              onChange={(e) => set('next_meeting_about', e.target.value)}
              placeholder="Graphics upsell, branding…"
            />
          </Field>
        </div>

        <Field label="Notes">
          <textarea
            rows={4}
            className={inputClass}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Scope, pages, hosting notes…"
          />
        </Field>

        {error && <p className="text-sm text-lost">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-sea px-4 py-2.5 text-sm font-semibold text-white hover:bg-sea-deep disabled:opacity-60"
          >
            {saving ? 'Saving…' : isNew ? 'Create project' : 'Save changes'}
          </button>
          {!isNew && (
            <button
              type="button"
              onClick={() => void onDelete()}
              className="rounded-lg border border-lost/30 px-4 py-2.5 text-sm font-medium text-lost"
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
