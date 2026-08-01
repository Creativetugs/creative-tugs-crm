export const PIPELINE_STAGES = [
  { id: 'new_lead', label: 'New Lead', color: '#5b7c8a' },
  { id: 'website_reviewed', label: 'Website Reviewed', color: '#4a7c59' },
  { id: 'mockup_created', label: 'Mockup Created', color: '#2f6f6a' },
  { id: 'outreach_sent', label: 'Outreach Sent', color: '#0f6b5c' },
  { id: 'interested', label: 'Interested', color: '#c45c26' },
  { id: 'meeting_scheduled', label: 'Meeting Scheduled', color: '#b45309' },
  { id: 'proposal_sent', label: 'Proposal Sent', color: '#8b5e34' },
  { id: 'negotiation', label: 'Negotiation', color: '#7a4f2e' },
  { id: 'closed_won', label: 'Closed Won', color: '#1f7a4d' },
  { id: 'closed_lost', label: 'Closed Lost', color: '#a33b3b' },
] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]['id']

export const PROJECT_STATUSES = [
  { id: 'not_started', label: 'Not Started', color: '#5b7c8a' },
  { id: 'in_progress', label: 'In Progress', color: '#0f6b5c' },
  { id: 'in_review', label: 'In Review', color: '#b45309' },
  { id: 'delivered', label: 'Delivered', color: '#1f7a4d' },
  { id: 'on_hold', label: 'On Hold', color: '#a33b3b' },
] as const

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]['id']

export type ActivityType = 'email' | 'whatsapp' | 'call' | 'note' | 'status_change'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'member'
  created_at: string
}

export interface Lead {
  id: string
  company_name: string
  contact_name: string
  job_title: string | null
  email: string
  phone: string | null
  website: string
  industry: string
  city: string | null
  country: string
  lead_source: string
  website_platform: string | null
  status: PipelineStage
  mockup_link: string | null
  portfolio_sent: boolean
  outreach_date: string | null
  last_follow_up: string | null
  next_follow_up: string | null
  notes: string
  deal_amount: number | null
  assigned_to: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Activity {
  id: string
  lead_id: string
  type: ActivityType
  content: string
  created_by: string | null
  created_at: string
}

export interface Project {
  id: string
  name: string
  lead_id: string | null
  status: ProjectStatus
  assigned_to: string | null
  deal_amount: number | null
  start_date: string | null
  due_date: string | null
  notes: string
  next_meeting_date: string | null
  next_meeting_about: string | null
  meeting_notes: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ProjectAsset {
  id: string
  project_id: string
  label: string
  url: string
  created_at: string
}

export const SERVICE_STATUSES = [
  { id: 'planned', label: 'Planned / pitch' },
  { id: 'sold', label: 'Sold' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'done', label: 'Done' },
] as const

export type ServiceStatus = (typeof SERVICE_STATUSES)[number]['id']

/** Website, graphics, logo, hosting — base work + upsells */
export interface ProjectService {
  id: string
  project_id: string
  label: string
  amount: number
  status: ServiceStatus
  notes: string
  created_at: string
}

export type LeadInput = Omit<
  Lead,
  'id' | 'created_at' | 'updated_at' | 'created_by'
> & {
  created_by?: string | null
}

export type ProjectInput = Omit<
  Project,
  'id' | 'created_at' | 'updated_at' | 'created_by'
> & {
  created_by?: string | null
}

export const EMPTY_LEAD: LeadInput = {
  company_name: '',
  contact_name: '',
  job_title: '',
  email: '',
  phone: '',
  website: '',
  industry: '',
  city: '',
  country: 'USA',
  lead_source: '',
  website_platform: '',
  status: 'new_lead',
  mockup_link: '',
  portfolio_sent: false,
  outreach_date: new Date().toISOString().slice(0, 10),
  last_follow_up: '',
  next_follow_up: '',
  notes: '',
  deal_amount: null,
  assigned_to: null,
}

export const EMPTY_PROJECT: ProjectInput = {
  name: '',
  lead_id: null,
  status: 'not_started',
  assigned_to: null,
  deal_amount: null,
  start_date: '',
  due_date: '',
  notes: '',
  next_meeting_date: '',
  next_meeting_about: '',
  meeting_notes: '',
}

export function formatMoney(amount: number | null | undefined, currency = 'USD') {
  if (amount == null || Number.isNaN(Number(amount))) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount))
}
