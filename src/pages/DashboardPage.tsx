import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, isBefore, parseISO, startOfDay } from 'date-fns'
import { listLeads, listProjects } from '../lib/api'
import {
  PIPELINE_STAGES,
  PROJECT_STATUSES,
  formatMoney,
  type Lead,
  type Project,
} from '../types'
import { EmptyState, PageHeader, ProjectStatusBadge, StageBadge } from '../components/ui'
import { useAuth } from '../context/AuthContext'

export function DashboardPage() {
  const { profiles, profile } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [personFilter, setPersonFilter] = useState<'all' | string>('all')

  useEffect(() => {
    void Promise.all([listLeads(), listProjects()])
      .then(([l, p]) => {
        setLeads(l)
        setProjects(p)
        setLoadError('')
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      })
      .finally(() => setLoading(false))
  }, [])

  const today = startOfDay(new Date())
  const todayKey = format(today, 'yyyy-MM-dd')
  const isOwner = profile?.role === 'admin'

  const scopedLeads = useMemo(() => {
    if (personFilter === 'all') return leads
    return leads.filter((l) => l.assigned_to === personFilter)
  }, [leads, personFilter])

  const scopedProjects = useMemo(() => {
    if (personFilter === 'all') return projects
    return projects.filter((p) => p.assigned_to === personFilter)
  }, [projects, personFilter])

  const stats = useMemo(() => {
    const open = scopedLeads.filter((l) => l.status !== 'closed_won' && l.status !== 'closed_lost')
    const won = scopedLeads.filter((l) => l.status === 'closed_won')
    const wonRevenue = won.reduce((sum, l) => sum + (Number(l.deal_amount) || 0), 0)
    const projectRevenue = scopedProjects.reduce(
      (sum, p) => sum + (Number(p.deal_amount) || 0),
      0,
    )
    const overdue = open.filter(
      (l) => l.next_follow_up && isBefore(parseISO(l.next_follow_up), today),
    )
    const dueSoon = open.filter((l) => {
      if (!l.next_follow_up) return false
      const d = parseISO(l.next_follow_up)
      return !isBefore(d, today) && d.getTime() - today.getTime() <= 3 * 86400000
    })
    const byStage = PIPELINE_STAGES.map((stage) => ({
      ...stage,
      count: scopedLeads.filter((l) => l.status === stage.id).length,
    }))
    const byOwner = profiles.map((p) => ({
      ...p,
      count: leads.filter(
        (l) =>
          l.assigned_to === p.id &&
          l.status !== 'closed_won' &&
          l.status !== 'closed_lost',
      ).length,
      wonAmount: leads
        .filter((l) => l.assigned_to === p.id && l.status === 'closed_won')
        .reduce((sum, l) => sum + (Number(l.deal_amount) || 0), 0),
      createdCount: leads.filter((l) => l.created_by === p.id).length,
    }))
    const recentLeads = [...scopedLeads]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 12)
    const activeProjects = scopedProjects.filter(
      (p) => p.status !== 'delivered' || Boolean(p.next_meeting_date),
    )
    const byProjectStatus = PROJECT_STATUSES.map((s) => ({
      ...s,
      count: scopedProjects.filter((p) => p.status === s.id).length,
    }))
    // Date-only compare so timezone doesn't drop "today" meetings
    const upcomingMeetings = scopedProjects
      .filter((p) => Boolean(p.next_meeting_date))
      .sort((a, b) =>
        (a.next_meeting_date ?? '').localeCompare(b.next_meeting_date ?? ''),
      )
    const overdueMeetings = upcomingMeetings.filter(
      (p) => (p.next_meeting_date ?? '') < todayKey,
    )
    const soonMeetings = upcomingMeetings.filter(
      (p) => (p.next_meeting_date ?? '') >= todayKey,
    )
    return {
      open,
      won,
      wonRevenue,
      projectRevenue,
      overdue,
      dueSoon,
      byStage,
      byOwner,
      activeProjects,
      byProjectStatus,
      upcomingMeetings: [...overdueMeetings, ...soonMeetings],
      overdueMeetingCount: overdueMeetings.length,
      totalLeads: scopedLeads.length,
      recentLeads,
    }
  }, [scopedLeads, scopedProjects, leads, profiles, today, todayKey])

  if (loading) return <p className="text-sm text-muted">Loading dashboard…</p>
  if (loadError) {
    return (
      <div className="rounded-xl border border-lost/30 bg-panel p-5 text-sm text-lost">
        <p className="font-semibold">Dashboard could not load</p>
        <p className="mt-1">{loadError}</p>
        <p className="mt-2 text-ink-soft">
          If this mentions missing columns/tables, run the SQL files in{' '}
          <code className="rounded bg-paper px-1">supabase/</code> (projects → upsells → meetings).
        </p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={
          isOwner
            ? 'Owner view — all leads, revenue, and projects across the team.'
            : 'Follow-ups, pipeline, and project status.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"
            >
              <option value="all">Everyone</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
            <Link
              to="/leads/new"
              className="rounded-lg bg-sea px-4 py-2.5 text-sm font-semibold text-white hover:bg-sea-deep"
            >
              Add lead
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          { label: 'Total leads', value: String(stats.totalLeads) },
          { label: 'Open deals', value: String(stats.open.length) },
          { label: 'Closed won', value: String(stats.won.length) },
          { label: 'Won revenue', value: formatMoney(stats.wonRevenue) },
          { label: 'Upsell meetings', value: String(stats.upcomingMeetings.length), alert: stats.overdueMeetingCount > 0 },
          { label: 'Active projects', value: String(stats.activeProjects.length) },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-line bg-panel px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-muted">{card.label}</p>
            <p
              className={`mt-2 text-2xl font-semibold ${
                card.alert ? 'text-coral' : 'text-ink'
              }`}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Lead tracker
          </h2>
          <Link to="/leads" className="text-xs text-sea hover:underline">
            Full list
          </Link>
        </div>
        {stats.recentLeads.length === 0 ? (
          <EmptyState title="No leads yet" body="Add a lead to start tracking stage and owner." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-panel">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-paper text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Created by</th>
                  <th className="px-4 py-3 font-medium">Assigned</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentLeads.map((lead) => (
                  <tr key={lead.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <Link
                        to={`/leads/${lead.id}`}
                        className="font-medium text-sea hover:underline"
                      >
                        {lead.company_name}
                      </Link>
                      <p className="text-xs text-muted">{lead.contact_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StageBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-soft">
                      {format(parseISO(lead.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      {profiles.find((p) => p.id === lead.created_by)?.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {profiles.find((p) => p.id === lead.assigned_to)?.full_name ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Upcoming upsell meetings
        </h2>
        {stats.upcomingMeetings.length === 0 ? (
          <EmptyState
            title="No upsell meetings set"
            body="Open a project → Upsell / next meeting → pick date + “Graphics upsell” → Save meeting. Also run migration_meetings.sql in Supabase if Save fails."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-panel">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Project / client</th>
                  <th className="px-4 py-3 font-medium">About</th>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Who</th>
                </tr>
              </thead>
              <tbody>
                {stats.upcomingMeetings.map((project) => {
                  const overdue = (project.next_meeting_date ?? '') < todayKey
                  return (
                    <tr key={project.id} className="border-t border-line">
                      <td className="px-4 py-3">
                        <Link
                          to={`/projects/${project.id}`}
                          className="font-medium text-sea hover:underline"
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {project.next_meeting_about || 'Upsell'}
                      </td>
                      <td className={`px-4 py-3 ${overdue ? 'font-semibold text-coral' : ''}`}>
                        {project.next_meeting_date
                          ? format(parseISO(project.next_meeting_date), 'MMM d, yyyy')
                          : '—'}
                        {overdue ? ' · overdue' : ''}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {profiles.find((p) => p.id === project.assigned_to)?.full_name ??
                          'Unassigned'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-line bg-panel p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Pipeline mix
          </h2>
          <div className="space-y-2">
            {stats.byStage.map((stage) => (
              <div key={stage.id} className="flex items-center gap-3">
                <div className="w-36 shrink-0 text-sm text-ink-soft">{stage.label}</div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${scopedLeads.length ? (stage.count / scopedLeads.length) * 100 : 0}%`,
                      backgroundColor: stage.color,
                      minWidth: stage.count ? '6px' : 0,
                    }}
                  />
                </div>
                <span className="w-6 text-right text-sm font-medium">{stage.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-line bg-panel p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Team load
          </h2>
          <div className="space-y-2">
            {stats.byOwner.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg bg-paper px-3 py-2 text-sm"
              >
                <span>{p.full_name}</span>
                <span className="text-ink-soft">
                  {p.createdCount} created · {p.count} open · {formatMoney(p.wonAmount)} won
                </span>
              </div>
            ))}
            {!stats.byOwner.length && (
              <p className="text-sm text-muted">No team profiles yet.</p>
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Needs follow-up
            </h2>
          </div>
          {stats.overdue.length === 0 && stats.dueSoon.length === 0 ? (
            <EmptyState title="You're clear" body="No overdue or near-term follow-ups." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-line bg-panel">
              <table className="w-full text-left text-sm">
                <thead className="bg-paper text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Next</th>
                    <th className="px-4 py-3 font-medium">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {[...stats.overdue, ...stats.dueSoon].map((lead) => (
                    <tr key={lead.id} className="border-t border-line">
                      <td className="px-4 py-3">
                        <Link
                          to={`/leads/${lead.id}`}
                          className="font-medium text-sea hover:underline"
                        >
                          {lead.company_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <StageBadge status={lead.status} />
                      </td>
                      <td className="px-4 py-3">
                        {lead.next_follow_up
                          ? format(parseISO(lead.next_follow_up), 'MMM d, yyyy')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {profiles.find((p) => p.id === lead.assigned_to)?.full_name ??
                          'Unassigned'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Active projects
            </h2>
            <Link to="/projects" className="text-xs text-sea hover:underline">
              View all
            </Link>
          </div>
          {stats.activeProjects.length === 0 ? (
            <EmptyState
              title="No active projects"
              body="Create a project when a deal closes. Delivered projects still appear here if they have an upsell meeting set."
            />
          ) : (
            <div className="space-y-2 rounded-xl border border-line bg-panel p-3">
              {stats.activeProjects.slice(0, 6).map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="flex items-center justify-between rounded-lg bg-paper px-3 py-2.5 text-sm hover:bg-paper/80"
                >
                  <div>
                    <p className="font-medium text-ink">{project.name}</p>
                    <p className="text-xs text-muted">
                      {profiles.find((p) => p.id === project.assigned_to)?.full_name ??
                        'Unassigned'}{' '}
                      · {formatMoney(project.deal_amount)}
                    </p>
                  </div>
                  <ProjectStatusBadge status={project.status} />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
