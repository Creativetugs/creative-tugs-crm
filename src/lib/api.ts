import type {
  Activity,
  Lead,
  LeadInput,
  PipelineStage,
  Profile,
  Project,
  ProjectAsset,
  ProjectInput,
  ProjectService,
  ProjectStatus,
  ServiceStatus,
} from '../types'
import { EMPTY_LEAD, EMPTY_PROJECT } from '../types'
import { advanceAtLeast } from './pipeline'
import { isSupabaseConfigured, supabase } from './supabase'

const STORAGE_KEY = 'ct_crm_local_v2'

interface LocalDb {
  profiles: Profile[]
  leads: Lead[]
  activities: Activity[]
  projects: Project[]
  project_assets: ProjectAsset[]
  project_services: ProjectService[]
  sessionUserId: string | null
}

function uid() {
  return crypto.randomUUID()
}

function now() {
  return new Date().toISOString()
}

function loadLocal(): LocalDb {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    const parsed = JSON.parse(raw) as LocalDb
    parsed.projects ??= []
    parsed.project_assets ??= []
    parsed.project_services ??= []
    parsed.leads = parsed.leads.map((l) => ({
      ...l,
      deal_amount: l.deal_amount ?? null,
    }))
    parsed.projects = parsed.projects.map((p) => ({
      ...p,
      next_meeting_date: p.next_meeting_date ?? null,
      next_meeting_about: p.next_meeting_about ?? null,
      meeting_notes: p.meeting_notes ?? '',
    }))
    return parsed
  }

  const adminId = uid()
  const db: LocalDb = {
    profiles: [
      {
        id: adminId,
        full_name: 'Demo Admin',
        email: 'demo@creativetugs.io',
        role: 'admin',
        created_at: now(),
      },
      {
        id: uid(),
        full_name: 'Alex Rivera',
        email: 'alex@creativetugs.io',
        role: 'member',
        created_at: now(),
      },
      {
        id: uid(),
        full_name: 'Sam Chen',
        email: 'sam@creativetugs.io',
        role: 'member',
        created_at: now(),
      },
    ],
    leads: [
      {
        id: uid(),
        company_name: 'Melissa Wellness',
        contact_name: 'Melissa Brown',
        job_title: 'Owner',
        email: 'melissa@example.com',
        phone: '+1 555-123-4567',
        website: 'https://example.com',
        industry: 'Coach',
        city: 'Madison, WI',
        country: 'USA',
        lead_source: 'Google',
        website_platform: 'WordPress',
        status: 'mockup_created',
        mockup_link: 'https://figma.com',
        portfolio_sent: false,
        outreach_date: '2026-08-01',
        last_follow_up: null,
        next_follow_up: '2026-08-08',
        notes: 'Website is outdated, needs faster navigation.',
        deal_amount: null,
        assigned_to: adminId,
        created_by: adminId,
        created_at: now(),
        updated_at: now(),
      },
    ],
    activities: [],
    projects: [],
    project_assets: [],
    project_services: [],
    sessionUserId: adminId,
  }
  saveLocal(db)
  return db
}

function saveLocal(db: LocalDb) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

function blankToNull(value: string | null | undefined) {
  if (value == null || value === '') return null
  return value
}

function toAmount(value: number | string | null | undefined): number | null {
  if (value === '' || value == null) return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function normalizeLeadInput(
  input: LeadInput,
  createdBy?: string | null,
): Omit<Lead, 'id' | 'created_at' | 'updated_at'> {
  return {
    company_name: input.company_name.trim(),
    contact_name: input.contact_name.trim(),
    job_title: blankToNull(input.job_title),
    email: input.email.trim(),
    phone: blankToNull(input.phone),
    website: input.website.trim(),
    industry: input.industry.trim(),
    city: blankToNull(input.city),
    country: input.country.trim() || 'USA',
    lead_source: input.lead_source.trim(),
    website_platform: blankToNull(input.website_platform),
    status: input.status,
    mockup_link: blankToNull(input.mockup_link),
    portfolio_sent: Boolean(input.portfolio_sent),
    outreach_date: blankToNull(input.outreach_date),
    last_follow_up: blankToNull(input.last_follow_up),
    next_follow_up: blankToNull(input.next_follow_up),
    notes: input.notes.trim(),
    deal_amount: toAmount(input.deal_amount),
    assigned_to: input.assigned_to || null,
    created_by: createdBy ?? input.created_by ?? null,
  }
}

function normalizeProjectInput(
  input: ProjectInput,
  createdBy?: string | null,
): Omit<Project, 'id' | 'created_at' | 'updated_at'> {
  return {
    name: input.name.trim(),
    lead_id: input.lead_id || null,
    status: input.status,
    assigned_to: input.assigned_to || null,
    deal_amount: toAmount(input.deal_amount),
    start_date: blankToNull(input.start_date),
    due_date: blankToNull(input.due_date),
    notes: input.notes.trim(),
    next_meeting_date: blankToNull(input.next_meeting_date),
    next_meeting_about: blankToNull(input.next_meeting_about),
    meeting_notes: (input.meeting_notes ?? '').trim(),
    created_by: createdBy ?? input.created_by ?? null,
  }
}

export async function listProfiles(): Promise<Profile[]> {
  if (!isSupabaseConfigured || !supabase) return loadLocal().profiles
  const { data, error } = await supabase.from('profiles').select('*').order('full_name')
  if (error) throw error
  return data as Profile[]
}

export async function listLeads(): Promise<Lead[]> {
  if (!isSupabaseConfigured || !supabase) {
    return loadLocal().leads.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  }
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data as Lead[]
}

export async function getLead(id: string): Promise<Lead | null> {
  if (!isSupabaseConfigured || !supabase) {
    return loadLocal().leads.find((l) => l.id === id) ?? null
  }
  const { data, error } = await supabase.from('leads').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as Lead | null
}

export async function createLead(input: LeadInput, userId: string): Promise<Lead> {
  const payload = normalizeLeadInput(input, userId)
  if (!isSupabaseConfigured || !supabase) {
    const db = loadLocal()
    const lead: Lead = { ...payload, id: uid(), created_at: now(), updated_at: now() }
    db.leads.unshift(lead)
    saveLocal(db)
    return lead
  }
  const { data, error } = await supabase.from('leads').insert(payload).select().single()
  if (error) throw error
  return data as Lead
}

export async function updateLead(id: string, input: Partial<LeadInput>): Promise<Lead> {
  const patch: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue
    if (key === 'deal_amount') {
      patch[key] = toAmount(value as number | string | null)
      continue
    }
    if (
      typeof value === 'string' &&
      [
        'job_title',
        'phone',
        'city',
        'website_platform',
        'mockup_link',
        'outreach_date',
        'last_follow_up',
        'next_follow_up',
        'assigned_to',
      ].includes(key)
    ) {
      patch[key] = blankToNull(value)
    } else {
      patch[key] = value
    }
  }

  if (!isSupabaseConfigured || !supabase) {
    const db = loadLocal()
    const idx = db.leads.findIndex((l) => l.id === id)
    if (idx < 0) throw new Error('Lead not found')
    db.leads[idx] = { ...db.leads[idx], ...(patch as Partial<Lead>), updated_at: now() }
    saveLocal(db)
    return db.leads[idx]
  }

  const { data, error } = await supabase.from('leads').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as Lead
}

export async function updateLeadStatus(
  id: string,
  status: PipelineStage,
  userId: string,
  previousStatus?: PipelineStage,
): Promise<Lead> {
  const lead = await updateLead(id, { status })
  if (previousStatus && previousStatus !== status) {
    await addActivity(id, 'status_change', `Moved to ${status.replaceAll('_', ' ')}`, userId)
  }
  return lead
}

/** Only moves the lead forward in the pipeline (skips are fine). */
export async function advanceLeadAtLeast(
  id: string,
  target: PipelineStage,
  userId: string,
  currentStatus: PipelineStage,
): Promise<Lead> {
  const next = advanceAtLeast(currentStatus, target)
  if (next === currentStatus) {
    const existing = await getLead(id)
    if (!existing) throw new Error('Lead not found')
    return existing
  }
  return updateLeadStatus(id, next, userId, currentStatus)
}

export async function deleteLead(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const db = loadLocal()
    db.leads = db.leads.filter((l) => l.id !== id)
    db.activities = db.activities.filter((a) => a.lead_id !== id)
    db.projects = db.projects.map((p) =>
      p.lead_id === id ? { ...p, lead_id: null } : p,
    )
    saveLocal(db)
    return
  }
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) throw error
}

export async function listActivities(leadId: string): Promise<Activity[]> {
  if (!isSupabaseConfigured || !supabase) {
    return loadLocal()
      .activities.filter((a) => a.lead_id === leadId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  }
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Activity[]
}

export async function addActivity(
  leadId: string,
  type: Activity['type'],
  content: string,
  userId: string,
): Promise<Activity> {
  const payload = {
    lead_id: leadId,
    type,
    content: content.trim(),
    created_by: userId,
  }
  if (!isSupabaseConfigured || !supabase) {
    const db = loadLocal()
    const activity: Activity = { ...payload, id: uid(), created_at: now() }
    db.activities.unshift(activity)
    saveLocal(db)
    return activity
  }
  const { data, error } = await supabase.from('activities').insert(payload).select().single()
  if (error) throw error
  return data as Activity
}

export async function listProjects(): Promise<Project[]> {
  if (!isSupabaseConfigured || !supabase) {
    return loadLocal().projects.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  }
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data as Project[]).map((p) => ({
    ...p,
    next_meeting_date: p.next_meeting_date ?? null,
    next_meeting_about: p.next_meeting_about ?? null,
    meeting_notes: p.meeting_notes ?? '',
  }))
}

export async function getProject(id: string): Promise<Project | null> {
  if (!isSupabaseConfigured || !supabase) {
    return loadLocal().projects.find((p) => p.id === id) ?? null
  }
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as Project | null
}

export async function createProject(input: ProjectInput, userId: string): Promise<Project> {
  const payload = normalizeProjectInput(input, userId)
  if (!isSupabaseConfigured || !supabase) {
    const db = loadLocal()
    const project: Project = { ...payload, id: uid(), created_at: now(), updated_at: now() }
    db.projects.unshift(project)
    saveLocal(db)
    return project
  }
  const { data, error } = await supabase.from('projects').insert(payload).select().single()
  if (error) throw error
  return data as Project
}

export async function updateProject(id: string, input: Partial<ProjectInput>): Promise<Project> {
  const patch: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue
    if (key === 'deal_amount') {
      patch[key] = toAmount(value as number | string | null)
      continue
    }
    if (
      typeof value === 'string' &&
      ['lead_id', 'assigned_to', 'start_date', 'due_date', 'next_meeting_date', 'next_meeting_about'].includes(key)
    ) {
      patch[key] = blankToNull(value)
    } else {
      patch[key] = value
    }
  }

  if (!isSupabaseConfigured || !supabase) {
    const db = loadLocal()
    const idx = db.projects.findIndex((p) => p.id === id)
    if (idx < 0) throw new Error('Project not found')
    db.projects[idx] = {
      ...db.projects[idx],
      ...(patch as Partial<Project>),
      updated_at: now(),
    }
    saveLocal(db)
    return db.projects[idx]
  }

  const { data, error } = await supabase
    .from('projects')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Project
}

export async function updateProjectStatus(id: string, status: ProjectStatus): Promise<Project> {
  return updateProject(id, { status })
}

export async function deleteProject(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const db = loadLocal()
    db.projects = db.projects.filter((p) => p.id !== id)
    db.project_assets = db.project_assets.filter((a) => a.project_id !== id)
    db.project_services = db.project_services.filter((s) => s.project_id !== id)
    saveLocal(db)
    return
  }
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}

export async function listProjectAssets(projectId: string): Promise<ProjectAsset[]> {
  if (!isSupabaseConfigured || !supabase) {
    return loadLocal().project_assets.filter((a) => a.project_id === projectId)
  }
  const { data, error } = await supabase
    .from('project_assets')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as ProjectAsset[]
}

export async function addProjectAsset(
  projectId: string,
  label: string,
  url: string,
): Promise<ProjectAsset> {
  const payload = {
    project_id: projectId,
    label: label.trim(),
    url: url.trim(),
  }
  if (!isSupabaseConfigured || !supabase) {
    const db = loadLocal()
    const asset: ProjectAsset = { ...payload, id: uid(), created_at: now() }
    db.project_assets.unshift(asset)
    saveLocal(db)
    return asset
  }
  const { data, error } = await supabase.from('project_assets').insert(payload).select().single()
  if (error) throw error
  return data as ProjectAsset
}

export async function deleteProjectAsset(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const db = loadLocal()
    db.project_assets = db.project_assets.filter((a) => a.id !== id)
    saveLocal(db)
    return
  }
  const { error } = await supabase.from('project_assets').delete().eq('id', id)
  if (error) throw error
}

export async function listProjectServices(projectId: string): Promise<ProjectService[]> {
  if (!isSupabaseConfigured || !supabase) {
    return loadLocal().project_services.filter((s) => s.project_id === projectId)
  }
  const { data, error } = await supabase
    .from('project_services')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as ProjectService[]
}

export async function listAllProjectServices(): Promise<ProjectService[]> {
  if (!isSupabaseConfigured || !supabase) {
    return loadLocal().project_services
  }
  const { data, error } = await supabase.from('project_services').select('*')
  if (error) throw error
  return data as ProjectService[]
}

export async function addProjectService(
  projectId: string,
  input: {
    label: string
    amount: number
    status?: ServiceStatus
    notes?: string
  },
): Promise<ProjectService> {
  const payload = {
    project_id: projectId,
    label: input.label.trim(),
    amount: Number(input.amount) || 0,
    status: input.status ?? 'sold',
    notes: (input.notes ?? '').trim(),
  }
  if (!isSupabaseConfigured || !supabase) {
    const db = loadLocal()
    const service: ProjectService = { ...payload, id: uid(), created_at: now() }
    db.project_services.push(service)
    saveLocal(db)
    return service
  }
  const { data, error } = await supabase.from('project_services').insert(payload).select().single()
  if (error) throw error
  return data as ProjectService
}

export async function updateProjectService(
  id: string,
  input: Partial<Pick<ProjectService, 'label' | 'amount' | 'status' | 'notes'>>,
): Promise<ProjectService> {
  if (!isSupabaseConfigured || !supabase) {
    const db = loadLocal()
    const idx = db.project_services.findIndex((s) => s.id === id)
    if (idx < 0) throw new Error('Service not found')
    db.project_services[idx] = { ...db.project_services[idx], ...input }
    saveLocal(db)
    return db.project_services[idx]
  }
  const { data, error } = await supabase
    .from('project_services')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as ProjectService
}

export async function deleteProjectService(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const db = loadLocal()
    db.project_services = db.project_services.filter((s) => s.id !== id)
    saveLocal(db)
    return
  }
  const { error } = await supabase.from('project_services').delete().eq('id', id)
  if (error) throw error
}

export function projectMoneyTotal(
  project: Project,
  services: ProjectService[],
): { base: number; upsells: number; total: number } {
  const base = Number(project.deal_amount) || 0
  const upsells = services.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
  return { base, upsells, total: base + upsells }
}

export function getLocalSessionUserId(): string | null {
  return loadLocal().sessionUserId
}

export function setLocalSessionUserId(userId: string | null) {
  const db = loadLocal()
  db.sessionUserId = userId
  saveLocal(db)
}

export { EMPTY_LEAD, EMPTY_PROJECT }
