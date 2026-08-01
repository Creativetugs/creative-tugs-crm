import { PIPELINE_STAGES, type PipelineStage } from '../types'

/** Full path is optional — you can skip stages. Auto-advance only moves forward. */
export const STAGE_ORDER = PIPELINE_STAGES.map((s) => s.id)

export function stageIndex(status: PipelineStage) {
  return STAGE_ORDER.indexOf(status)
}

export function isClosed(status: PipelineStage) {
  return status === 'closed_won' || status === 'closed_lost'
}

/** Move forward to target if current is behind. Never moves backward. Won't leave closed. */
export function advanceAtLeast(
  current: PipelineStage,
  target: PipelineStage,
): PipelineStage {
  if (isClosed(current)) return current
  if (isClosed(target)) return target
  return stageIndex(current) < stageIndex(target) ? target : current
}

export const PROGRESS_STEPS: Array<{
  id: string
  label: string
  stage: PipelineStage
  hint: string
}> = [
  {
    id: 'reviewed',
    label: 'Website reviewed',
    stage: 'website_reviewed',
    hint: 'You looked at their site',
  },
  {
    id: 'mockup',
    label: 'Mockup ready',
    stage: 'mockup_created',
    hint: 'Figma / concept done',
  },
  {
    id: 'outreach',
    label: 'Outreach sent',
    stage: 'outreach_sent',
    hint: 'Email or WhatsApp sent',
  },
  {
    id: 'interested',
    label: 'They replied',
    stage: 'interested',
    hint: 'Positive reply',
  },
  {
    id: 'meeting',
    label: 'Meeting booked',
    stage: 'meeting_scheduled',
    hint: 'Discovery call set',
  },
  {
    id: 'proposal',
    label: 'Proposal sent',
    stage: 'proposal_sent',
    hint: 'Quote delivered',
  },
  {
    id: 'negotiation',
    label: 'In negotiation',
    stage: 'negotiation',
    hint: 'Scope / budget talk',
  },
  {
    id: 'won',
    label: 'Closed won',
    stage: 'closed_won',
    hint: 'Signed / paid',
  },
  {
    id: 'lost',
    label: 'Closed lost',
    stage: 'closed_lost',
    hint: 'Did not move forward',
  },
]
