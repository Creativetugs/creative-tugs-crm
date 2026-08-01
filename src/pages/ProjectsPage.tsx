import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatMoney, PROJECT_STATUSES, type Lead, type Project } from '../types'
import { EmptyState, PageHeader, ProjectStatusBadge } from '../components/ui'
import { SheetActions } from '../components/SheetActions'
import { listLeads, listProjects } from '../lib/api'
import {
  downloadProjectsCsv,
  downloadProjectsTemplate,
  importProjectsFromCsv,
} from '../lib/sheets'
import { useAuth } from '../context/AuthContext'

export function ProjectsPage() {
  const { profiles, userId } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'all' | Project['status']>('all')
  const [owner, setOwner] = useState<'all' | string>('all')
  const [importNote, setImportNote] = useState('')

  async function refresh() {
    const [p, l] = await Promise.all([listProjects(), listLeads()])
    setProjects(p)
    setLeads(l)
  }

  useEffect(() => {
    void refresh().finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (status !== 'all' && p.status !== status) return false
      if (owner !== 'all' && p.assigned_to !== owner) return false
      return true
    })
  }, [projects, status, owner])

  if (loading) return <p className="text-sm text-muted">Loading projects…</p>

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Where work stands after a deal. Upload/download CSV for bulk move."
        actions={
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex flex-wrap justify-end gap-2">
              <SheetActions
                label="projects"
                onTemplate={downloadProjectsTemplate}
                onDownload={() =>
                  downloadProjectsCsv(filtered.length ? filtered : projects, leads, profiles)
                }
                onUploadText={async (text) => {
                  if (!userId) throw new Error('Not signed in')
                  const result = await importProjectsFromCsv(text, userId, profiles)
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
                to="/projects/new"
                className="rounded-lg bg-sea px-4 py-2.5 text-sm font-semibold text-white hover:bg-sea-deep"
              >
                Add project
              </Link>
            </div>
            {importNote && <p className="text-xs text-muted">{importNote}</p>}
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"
        >
          <option value="all">Everyone</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No projects yet"
          body="When a lead closes won, add a project — or upload a CSV."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-panel">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-paper text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Who’s doing it</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Next meeting</th>
                <th className="px-4 py-3 font-medium">Due</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => {
                const lead = leads.find((l) => l.id === project.lead_id)
                return (
                  <tr key={project.id} className="border-t border-line hover:bg-paper/60">
                    <td className="px-4 py-3">
                      <Link
                        to={`/projects/${project.id}`}
                        className="font-medium text-sea hover:underline"
                      >
                        {project.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {lead ? lead.company_name : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <ProjectStatusBadge status={project.status} />
                    </td>
                    <td className="px-4 py-3">
                      {profiles.find((p) => p.id === project.assigned_to)?.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3">{formatMoney(project.deal_amount)}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      {project.next_meeting_date ? (
                        <>
                          <span>{project.next_meeting_date}</span>
                          {project.next_meeting_about && (
                            <p className="text-xs text-muted">{project.next_meeting_about}</p>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">{project.due_date ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
