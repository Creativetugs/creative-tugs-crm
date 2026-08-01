import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { listLeads } from '../lib/api'
import {
  downloadLeadsCsv,
  downloadLeadsTemplate,
  importLeadsFromCsv,
} from '../lib/sheets'
import { PIPELINE_STAGES, formatMoney, type Lead, type PipelineStage } from '../types'
import { EmptyState, PageHeader, StageBadge } from '../components/ui'
import { SheetActions } from '../components/SheetActions'
import { useAuth } from '../context/AuthContext'

function personName(
  profiles: { id: string; full_name: string }[],
  id: string | null,
) {
  if (!id) return '—'
  return profiles.find((p) => p.id === id)?.full_name ?? 'Unknown'
}

export function LeadsPage() {
  const { profiles, userId } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | PipelineStage>('all')
  const [owner, setOwner] = useState<'all' | string>('all')
  const [creator, setCreator] = useState<'all' | string>('all')
  const [importNote, setImportNote] = useState('')

  async function refresh() {
    const rows = await listLeads()
    setLeads(rows)
  }

  useEffect(() => {
    void refresh().finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return leads
      .filter((lead) => {
        if (status !== 'all' && lead.status !== status) return false
        if (owner !== 'all' && lead.assigned_to !== owner) return false
        if (creator !== 'all' && lead.created_by !== creator) return false
        if (!q) return true
        return [
          lead.company_name,
          lead.contact_name,
          lead.email,
          lead.website,
          lead.industry,
          lead.lead_source,
        ]
          .join(' ')
          .toLowerCase()
          .includes(q)
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [leads, query, status, owner, creator])

  const summary = useMemo(() => {
    const open = filtered.filter((l) => l.status !== 'closed_won' && l.status !== 'closed_lost')
    const won = filtered.filter((l) => l.status === 'closed_won')
    const lost = filtered.filter((l) => l.status === 'closed_lost')
    const byStage = PIPELINE_STAGES.map((stage) => ({
      ...stage,
      count: filtered.filter((l) => l.status === stage.id).length,
    })).filter((s) => s.count > 0)
    return {
      total: filtered.length,
      open: open.length,
      won: won.length,
      lost: lost.length,
      byStage,
    }
  }, [filtered])

  if (loading) return <p className="text-sm text-muted">Loading leads…</p>

  return (
    <div>
      <PageHeader
        title="Lead tracker"
        subtitle="How many leads, who created them, when, and which stage — filter and export anytime."
        actions={
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex flex-wrap justify-end gap-2">
              <SheetActions
                label="leads"
                onTemplate={downloadLeadsTemplate}
                onDownload={() => downloadLeadsCsv(filtered.length ? filtered : leads, profiles)}
                onUploadText={async (text) => {
                  if (!userId) throw new Error('Not signed in')
                  const result = await importLeadsFromCsv(text, userId, profiles)
                  await refresh()
                  setImportNote(
                    `Imported ${result.imported}. Skipped ${result.skipped}.${
                      result.errors[0] ? ` First issue: ${result.errors[0]}` : ''
                    }`,
                  )
                  if (result.imported === 0 && result.errors[0]) {
                    throw new Error(result.errors[0])
                  }
                }}
              />
              <Link
                to="/leads/new"
                className="rounded-lg bg-sea px-4 py-2.5 text-sm font-semibold text-white hover:bg-sea-deep"
              >
                Add lead
              </Link>
            </div>
            {importNote && <p className="text-xs text-muted">{importNote}</p>}
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Leads (filtered)', value: summary.total },
          { label: 'Open', value: summary.open },
          { label: 'Won', value: summary.won },
          { label: 'Lost', value: summary.lost },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-line bg-panel px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>

      {summary.byStage.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {summary.byStage.map((stage) => (
            <button
              key={stage.id}
              type="button"
              onClick={() => setStatus(stage.id)}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-1.5 text-sm hover:border-sea"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
              {stage.label}
              <span className="font-semibold">{stage.count}</span>
            </button>
          ))}
          {status !== 'all' && (
            <button
              type="button"
              onClick={() => setStatus('all')}
              className="text-sm text-sea hover:underline"
            >
              Clear stage filter
            </button>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search company, contact, email…"
          className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-sea sm:max-w-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as 'all' | PipelineStage)}
          className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"
        >
          <option value="all">All stages</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={creator}
          onChange={(e) => setCreator(e.target.value)}
          className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"
        >
          <option value="all">Created by anyone</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              Created by {p.full_name}
            </option>
          ))}
        </select>
        <select
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"
        >
          <option value="all">Assigned to anyone</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              Owned by {p.full_name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No leads match" body="Try clearing filters, add a lead, or upload a CSV." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-panel">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-paper text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Created by</th>
                <th className="px-4 py-3 font-medium">Assigned to</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Next follow-up</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id} className="border-t border-line hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link to={`/leads/${lead.id}`} className="font-medium text-sea hover:underline">
                      {lead.company_name}
                    </Link>
                    <p className="text-xs text-muted">{lead.website}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{lead.contact_name}</p>
                    <p className="text-xs text-muted">{lead.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StageBadge status={lead.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-soft">
                    {format(parseISO(lead.created_at), 'MMM d, yyyy')}
                    <p className="text-[11px] text-muted">
                      {format(parseISO(lead.created_at), 'h:mm a')}
                    </p>
                  </td>
                  <td className="px-4 py-3">{personName(profiles, lead.created_by)}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {personName(profiles, lead.assigned_to)}
                  </td>
                  <td className="px-4 py-3">{lead.lead_source}</td>
                  <td className="px-4 py-3">{formatMoney(lead.deal_amount)}</td>
                  <td className="px-4 py-3">{lead.next_follow_up ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
