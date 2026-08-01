import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  EMPTY_LEAD,
  createLead,
  deleteLead,
  getLead,
  updateLead,
} from '../lib/api'
import { PIPELINE_STAGES, type LeadInput } from '../types'
import { PageHeader } from '../components/ui'
import { useAuth } from '../context/AuthContext'

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

const inputClass =
  'w-full rounded-lg border border-line bg-panel px-3 py-2 outline-none focus:border-sea'

export function LeadFormPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const { userId, profiles, profile } = useAuth()
  const [form, setForm] = useState<LeadInput>({
    ...EMPTY_LEAD,
    assigned_to: profile?.id ?? null,
  })
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isNew || !id) return
    void getLead(id)
      .then((lead) => {
        if (!lead) {
          setError('Lead not found')
          return
        }
        setForm({
          company_name: lead.company_name,
          contact_name: lead.contact_name,
          job_title: lead.job_title ?? '',
          email: lead.email,
          phone: lead.phone ?? '',
          website: lead.website,
          industry: lead.industry,
          city: lead.city ?? '',
          country: lead.country,
          lead_source: lead.lead_source,
          website_platform: lead.website_platform ?? '',
          status: lead.status,
          mockup_link: lead.mockup_link ?? '',
          portfolio_sent: lead.portfolio_sent,
          outreach_date: lead.outreach_date ?? '',
          last_follow_up: lead.last_follow_up ?? '',
          next_follow_up: lead.next_follow_up ?? '',
          notes: lead.notes,
          deal_amount: lead.deal_amount,
          assigned_to: lead.assigned_to,
        })
      })
      .finally(() => setLoading(false))
  }, [id, isNew])

  function set<K extends keyof LeadInput>(key: K, value: LeadInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    setError('')
    try {
      if (isNew) {
        const lead = await createLead(form, userId)
        navigate(`/leads/${lead.id}`)
      } else if (id) {
        await updateLead(id, form)
        navigate(`/leads/${id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save lead')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!id || isNew) return
    if (!confirm('Delete this lead and its activity history?')) return
    await deleteLead(id)
    navigate('/leads')
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={isNew ? 'New lead' : 'Edit lead'}
        subtitle="Required fields match your Creative Tugs intake sheet. New leads start at New Lead — advance as you work (mockup, email, meeting)."
        actions={
          <Link to={isNew ? '/leads' : `/leads/${id}`} className="text-sm text-sea hover:underline">
            Cancel
          </Link>
        }
      />

      <form onSubmit={onSubmit} className="space-y-6 rounded-xl border border-line bg-panel p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" required>
            <input required className={inputClass} value={form.company_name} onChange={(e) => set('company_name', e.target.value)} />
          </Field>
          <Field label="Contact name" required>
            <input required className={inputClass} value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} />
          </Field>
          <Field label="Job title">
            <input className={inputClass} value={form.job_title ?? ''} onChange={(e) => set('job_title', e.target.value)} />
          </Field>
          <Field label="Email" required>
            <input required type="email" className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className={inputClass} value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label="Website" required>
            <input required className={inputClass} value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://" />
          </Field>
          <Field label="Industry" required>
            <input required className={inputClass} value={form.industry} onChange={(e) => set('industry', e.target.value)} placeholder="Coach, Law Firm…" />
          </Field>
          <Field label="City">
            <input className={inputClass} value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} />
          </Field>
          <Field label="Country" required>
            <input required className={inputClass} value={form.country} onChange={(e) => set('country', e.target.value)} />
          </Field>
          <Field label="Lead source" required>
            <input required className={inputClass} value={form.lead_source} onChange={(e) => set('lead_source', e.target.value)} placeholder="Google, LinkedIn, Referral" />
          </Field>
          <Field label="Website platform">
            <input className={inputClass} value={form.website_platform ?? ''} onChange={(e) => set('website_platform', e.target.value)} placeholder="WordPress, Wix…" />
          </Field>
          <Field label="Current status" required>
            <select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value as LeadInput['status'])}>
              {PIPELINE_STAGES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Mockup link">
            <input className={inputClass} value={form.mockup_link ?? ''} onChange={(e) => set('mockup_link', e.target.value)} />
          </Field>
          <Field label="Assigned to">
            <select
              className={inputClass}
              value={form.assigned_to ?? ''}
              onChange={(e) => set('assigned_to', e.target.value || null)}
            >
              <option value="">Unassigned</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </Field>
          <Field label="Outreach date" required>
            <input required type="date" className={inputClass} value={form.outreach_date ?? ''} onChange={(e) => set('outreach_date', e.target.value)} />
          </Field>
          <Field label="Last follow-up">
            <input type="date" className={inputClass} value={form.last_follow_up ?? ''} onChange={(e) => set('last_follow_up', e.target.value)} />
          </Field>
          <Field label="Next follow-up">
            <input type="date" className={inputClass} value={form.next_follow_up ?? ''} onChange={(e) => set('next_follow_up', e.target.value)} />
          </Field>
          <Field label="Portfolio sent">
            <select
              className={inputClass}
              value={form.portfolio_sent ? 'yes' : 'no'}
              onChange={(e) => set('portfolio_sent', e.target.value === 'yes')}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </Field>
          <Field label="Deal / closed amount ($)">
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
        </div>

        <Field label="Notes" required>
          <textarea
            required
            rows={4}
            className={inputClass}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Website is outdated, needs faster navigation…"
          />
        </Field>

        {error && <p className="text-sm text-lost">{error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-sea px-4 py-2.5 text-sm font-semibold text-white hover:bg-sea-deep disabled:opacity-60"
          >
            {saving ? 'Saving…' : isNew ? 'Create lead' : 'Save changes'}
          </button>
          {!isNew && (
            <button
              type="button"
              onClick={() => void onDelete()}
              className="rounded-lg border border-lost/30 px-4 py-2.5 text-sm font-medium text-lost hover:bg-lost/5"
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
