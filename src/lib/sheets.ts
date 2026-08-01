import { createLead, createProject, listLeads } from './api'
import { downloadCsv, parseCsv, pick, toCsv } from './csv'
import {
  EMPTY_LEAD,
  EMPTY_PROJECT,
  PIPELINE_STAGES,
  PROJECT_STATUSES,
  type Lead,
  type LeadInput,
  type PipelineStage,
  type Profile,
  type Project,
  type ProjectInput,
  type ProjectStatus,
} from '../types'

const LEAD_HEADERS = [
  'company_name',
  'contact_name',
  'job_title',
  'email',
  'phone',
  'website',
  'industry',
  'city',
  'country',
  'lead_source',
  'website_platform',
  'status',
  'mockup_link',
  'portfolio_sent',
  'outreach_date',
  'last_follow_up',
  'next_follow_up',
  'deal_amount',
  'assigned_email',
  'created_by_email',
  'created_at',
  'notes',
] as const

const PROJECT_HEADERS = [
  'name',
  'client_company',
  'status',
  'deal_amount',
  'assigned_email',
  'start_date',
  'due_date',
  'next_meeting_date',
  'next_meeting_about',
  'notes',
  'meeting_notes',
] as const

function stageFromValue(value: string): PipelineStage {
  const raw = value.trim().toLowerCase().replace(/\s+/g, '_')
  const byId = PIPELINE_STAGES.find((s) => s.id === raw)
  if (byId) return byId.id
  const byLabel = PIPELINE_STAGES.find((s) => s.label.toLowerCase() === value.trim().toLowerCase())
  return byLabel?.id ?? 'new_lead'
}

function projectStatusFromValue(value: string): ProjectStatus {
  const raw = value.trim().toLowerCase().replace(/\s+/g, '_')
  const byId = PROJECT_STATUSES.find((s) => s.id === raw)
  if (byId) return byId.id
  const byLabel = PROJECT_STATUSES.find((s) => s.label.toLowerCase() === value.trim().toLowerCase())
  return byLabel?.id ?? 'not_started'
}

function yesNo(value: string) {
  const v = value.trim().toLowerCase()
  return v === 'yes' || v === 'true' || v === '1' || v === 'y'
}

function amountOrNull(value: string) {
  if (!value.trim()) return null
  const n = Number(value.replace(/[$,]/g, ''))
  return Number.isFinite(n) ? n : null
}

function findProfileId(profiles: Profile[], emailOrName: string) {
  const q = emailOrName.trim().toLowerCase()
  if (!q) return null
  return (
    profiles.find((p) => p.email.toLowerCase() === q)?.id ??
    profiles.find((p) => p.full_name.toLowerCase() === q)?.id ??
    null
  )
}

export function downloadLeadsCsv(leads: Lead[], profiles: Profile[]) {
  const rows = leads.map((lead) => [
    lead.company_name,
    lead.contact_name,
    lead.job_title ?? '',
    lead.email,
    lead.phone ?? '',
    lead.website,
    lead.industry,
    lead.city ?? '',
    lead.country,
    lead.lead_source,
    lead.website_platform ?? '',
    PIPELINE_STAGES.find((s) => s.id === lead.status)?.label ?? lead.status,
    lead.mockup_link ?? '',
    lead.portfolio_sent ? 'Yes' : 'No',
    lead.outreach_date ?? '',
    lead.last_follow_up ?? '',
    lead.next_follow_up ?? '',
    lead.deal_amount ?? '',
    profiles.find((p) => p.id === lead.assigned_to)?.email ?? '',
    profiles.find((p) => p.id === lead.created_by)?.email ?? '',
    lead.created_at,
    lead.notes,
  ])
  downloadCsv(`creative-tugs-leads-${stamp()}.csv`, toCsv([...LEAD_HEADERS], rows))
}

export function downloadLeadsTemplate() {
  const sample = [[
    'Melissa Wellness',
    'Melissa Brown',
    'Owner',
    'melissa@example.com',
    '+1 555-123-4567',
    'https://example.com',
    'Coach',
    'Madison, WI',
    'USA',
    'Google',
    'WordPress',
    'New Lead',
    '',
    'No',
    '2026-08-01',
    '',
    '2026-08-08',
    '',
    '',
    '',
    '',
    'Website is outdated',
  ]]
  downloadCsv('creative-tugs-leads-template.csv', toCsv([...LEAD_HEADERS], sample))
}

export async function importLeadsFromCsv(
  text: string,
  userId: string,
  profiles: Profile[],
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const rows = parseCsv(text)
  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const company = pick(row, ['company_name', 'company'])
    const contact = pick(row, ['contact_name', 'contact', 'name'])
    const email = pick(row, ['email'])
    const website = pick(row, ['website', 'website_url', 'url'])
    const industry = pick(row, ['industry'])
    const leadSource = pick(row, ['lead_source', 'source'])
    const notes = pick(row, ['notes']) || 'Imported from sheet'

    if (!company || !contact || !email || !website || !industry || !leadSource) {
      skipped++
      errors.push(`Row ${i + 2}: need company, contact, email, website, industry, lead_source`)
      continue
    }

    const input: LeadInput = {
      ...EMPTY_LEAD,
      company_name: company,
      contact_name: contact,
      job_title: pick(row, ['job_title', 'title']) || '',
      email,
      phone: pick(row, ['phone']) || '',
      website,
      industry,
      city: pick(row, ['city']) || '',
      country: pick(row, ['country']) || 'USA',
      lead_source: leadSource,
      website_platform: pick(row, ['website_platform', 'platform']) || '',
      status: stageFromValue(pick(row, ['status', 'current_status'])),
      mockup_link: pick(row, ['mockup_link', 'mockup']) || '',
      portfolio_sent: yesNo(pick(row, ['portfolio_sent'])),
      outreach_date: pick(row, ['outreach_date']) || new Date().toISOString().slice(0, 10),
      last_follow_up: pick(row, ['last_follow_up']) || '',
      next_follow_up: pick(row, ['next_follow_up']) || '',
      deal_amount: amountOrNull(pick(row, ['deal_amount', 'amount', 'closed_amount'])),
      notes,
      assigned_to: findProfileId(profiles, pick(row, ['assigned_email', 'assigned_to', 'owner'])),
    }

    try {
      await createLead(input, userId)
      imported++
    } catch (err) {
      skipped++
      errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : 'failed'}`)
    }
  }

  return { imported, skipped, errors }
}

export function downloadProjectsCsv(
  projects: Project[],
  leads: Lead[],
  profiles: Profile[],
) {
  const rows = projects.map((project) => [
    project.name,
    leads.find((l) => l.id === project.lead_id)?.company_name ?? '',
    PROJECT_STATUSES.find((s) => s.id === project.status)?.label ?? project.status,
    project.deal_amount ?? '',
    profiles.find((p) => p.id === project.assigned_to)?.email ?? '',
    project.start_date ?? '',
    project.due_date ?? '',
    project.next_meeting_date ?? '',
    project.next_meeting_about ?? '',
    project.notes,
    project.meeting_notes,
  ])
  downloadCsv(`creative-tugs-projects-${stamp()}.csv`, toCsv([...PROJECT_HEADERS], rows))
}

export function downloadProjectsTemplate() {
  const sample = [[
    'Money Sense website',
    'Money Sen$e',
    'In Progress',
    '2500',
    '',
    '2026-08-01',
    '2026-08-20',
    '2026-08-05',
    'Graphics upsell',
    'Base website package',
    '',
  ]]
  downloadCsv('creative-tugs-projects-template.csv', toCsv([...PROJECT_HEADERS], sample))
}

export async function importProjectsFromCsv(
  text: string,
  userId: string,
  profiles: Profile[],
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const rows = parseCsv(text)
  const leads = await listLeads()
  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const name = pick(row, ['name', 'project_name', 'project'])
    if (!name) {
      skipped++
      errors.push(`Row ${i + 2}: need project name`)
      continue
    }

    const client = pick(row, ['client_company', 'company', 'company_name', 'client'])
    const lead = client
      ? leads.find((l) => l.company_name.toLowerCase() === client.toLowerCase())
      : null

    const input: ProjectInput = {
      ...EMPTY_PROJECT,
      name,
      lead_id: lead?.id ?? null,
      status: projectStatusFromValue(pick(row, ['status'])),
      deal_amount: amountOrNull(pick(row, ['deal_amount', 'amount'])),
      assigned_to: findProfileId(profiles, pick(row, ['assigned_email', 'assigned_to', 'owner'])),
      start_date: pick(row, ['start_date']) || '',
      due_date: pick(row, ['due_date']) || '',
      next_meeting_date: pick(row, ['next_meeting_date']) || '',
      next_meeting_about: pick(row, ['next_meeting_about']) || '',
      notes: pick(row, ['notes']) || '',
      meeting_notes: pick(row, ['meeting_notes']) || '',
    }

    try {
      await createProject(input, userId)
      imported++
    } catch (err) {
      skipped++
      errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : 'failed'}`)
    }
  }

  return { imported, skipped, errors }
}

function stamp() {
  return new Date().toISOString().slice(0, 10)
}
