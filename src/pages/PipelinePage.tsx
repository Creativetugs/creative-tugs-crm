import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listLeads, updateLeadStatus } from '../lib/api'
import { PIPELINE_STAGES, type Lead, type PipelineStage } from '../types'
import { PageHeader } from '../components/ui'
import { useAuth } from '../context/AuthContext'

export function PipelinePage() {
  const { userId } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  async function refresh() {
    const rows = await listLeads()
    setLeads(rows)
  }

  useEffect(() => {
    void refresh().finally(() => setLoading(false))
  }, [])

  async function moveLead(leadId: string, status: PipelineStage) {
    if (!userId) return
    const lead = leads.find((l) => l.id === leadId)
    if (!lead || lead.status === status) return
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l)))
    try {
      await updateLeadStatus(leadId, status, userId, lead.status)
    } catch {
      await refresh()
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading pipeline…</p>

  return (
    <div>
      <PageHeader
        title="Pipeline"
        subtitle="Drag to any stage — skipping is OK. Typical path: New Lead → Mockup → Outreach → Meeting → Won/Lost."
        actions={
          <Link
            to="/leads/new"
            className="rounded-lg bg-sea px-4 py-2.5 text-sm font-semibold text-white hover:bg-sea-deep"
          >
            Add lead
          </Link>
        }
      />

      <div className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => {
          const cards = leads.filter((l) => l.status === stage.id)
          return (
            <div
              key={stage.id}
              className="w-64 shrink-0 rounded-xl border border-line bg-panel/70"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggingId) void moveLead(draggingId, stage.id)
                setDraggingId(null)
              }}
            >
              <div className="flex items-center justify-between border-b border-line px-3 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <h2 className="text-sm font-semibold">{stage.label}</h2>
                </div>
                <span className="text-xs text-muted">{cards.length}</span>
              </div>
              <div className="space-y-2 p-2 min-h-40">
                {cards.map((lead) => (
                  <article
                    key={lead.id}
                    draggable
                    onDragStart={() => setDraggingId(lead.id)}
                    onDragEnd={() => setDraggingId(null)}
                    className="cursor-grab rounded-lg border border-line bg-panel p-3 active:cursor-grabbing"
                  >
                    <Link to={`/leads/${lead.id}`} className="font-medium text-ink hover:text-sea">
                      {lead.company_name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">{lead.contact_name}</p>
                    {lead.next_follow_up && (
                      <p className="mt-2 text-[11px] text-coral">Next: {lead.next_follow_up}</p>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
