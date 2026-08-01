import {
  PIPELINE_STAGES,
  PROJECT_STATUSES,
  type PipelineStage,
  type ProjectStatus,
} from '../types'

export function StageBadge({ status }: { status: PipelineStage }) {
  const stage = PIPELINE_STAGES.find((s) => s.id === status)
  if (!stage) return null
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: stage.color }}
    >
      {stage.label}
    </span>
  )
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const stage = PROJECT_STATUSES.find((s) => s.id === status)
  if (!stage) return null
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: stage.color }}
    >
      {stage.label}
    </span>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-panel/60 px-6 py-12 text-center">
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  )
}
