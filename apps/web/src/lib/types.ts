export type AttackDomain = 'enterprise-attack' | 'mobile-attack' | 'ics-attack'

export interface DomainStats {
  tactics: number
  techniques: number
  subtechniques: number
  groups: number
  software: number
  campaigns: number
  mitigations: number
  detection_strategies: number
  analytics: number
  data_components: number
  assets: number
}

export interface DomainVersionStatus {
  domain: AttackDomain
  current_version: string | null
  mitre_latest_version: string | null
  has_update: boolean
  released_at: string | null
  synced_at: string | null
  stats: Partial<DomainStats>
  available_diff_versions: string[]
}

export interface SyncRunRecord {
  id: string
  started_at: string
  finished_at: string | null
  status: 'queued' | 'running' | 'success' | 'error'
  trigger_source: string
  domain: string
  version: string | null
  counts: Partial<DomainStats>
  added: number
  updated: number
  removed: number
  db_size_bytes: number | null
  log: string
}

export interface VersionsResponse {
  has_update: boolean
  domains: DomainVersionStatus[]
  recent_sync_runs: SyncRunRecord[]
}

export interface MatrixSubtechniqueItem {
  attack_id: string
  name: string
  platforms: string[]
  usage_count: number
  is_new: boolean
  is_changed: boolean
}

export interface MatrixTechniqueItem {
  attack_id: string
  name: string
  platforms: string[]
  usage_count: number
  direct_usage_count: number
  is_new: boolean
  is_changed: boolean
  subtechnique_count: number
  subtechniques: MatrixSubtechniqueItem[]
}

export interface MatrixTacticColumn {
  attack_id: string
  shortname: string
  name: string
  order: number
  technique_count: number
  techniques: MatrixTechniqueItem[]
}

export interface MatrixPayload {
  domain: AttackDomain
  version: string
  compared_to_version?: string
  released_at: string | null
  stats: DomainStats
  platforms: string[]
  tactics: MatrixTacticColumn[]
}

export interface ProcedureItem {
  attack_id: string
  name: string
  type: string
  description: string
  action_vi?: string
  is_auto?: boolean
}

export interface AnalyticLogSource {
  name: string
  channel: string
  data_component: {
    attack_id: string
    name: string
    description: string
  } | null
}

export interface DetectionAnalyticItem {
  attack_id: string
  name: string
  description: string
  platforms: string[]
  url: string
  mutable_elements: Array<{ field: string; description: string }>
  log_sources: AnalyticLogSource[]
}

export interface DetectionStrategyItem {
  attack_id: string
  name: string
  url: string
  analytics: DetectionAnalyticItem[]
}

export interface TechniqueDetail {
  domain: AttackDomain
  attack_id: string
  name: string
  description: string
  platforms: string[]
  tactics: string[]
  is_subtechnique: boolean
  parent: { attack_id: string; name: string } | null
  subtechniques: MatrixSubtechniqueItem[]
  revoked: boolean
  deprecated: boolean
  replaced_by: { attack_id: string; name: string; domain: string } | null
  usage_count: number
  is_new: boolean
  is_changed: boolean
  metadata: {
    url?: string
    version?: string
    created?: string
    modified?: string
  }
  procedures: {
    groups: ProcedureItem[]
    software: ProcedureItem[]
    campaigns: ProcedureItem[]
  }
  mitigations: ProcedureItem[]
  detection_strategies: DetectionStrategyItem[]
  ics_assets: Array<{
    attack_id: string
    name: string
    description: string
    rel_description?: string
    data?: { sectors?: string[] }
  }>
  fast_card?: {
    what: string
    sign: string
    mitigate: string
  }
  metaphor_vi?: string
  metaphor_status?: string
  metaphor_title?: string
  tactical_insight?: string
  horizon?: {
    boundary_type: 'pre' | 'cross' | 'internal'
    stage1: string
    stage2: string
    stage3: string
    insight: string
  }
}

export interface SearchResultItem {
  domain: AttackDomain
  type: string
  attack_id: string
  name: string
  is_subtechnique: boolean
  tactics: string[]
  platforms: string[]
  revoked: boolean
  deprecated: boolean
  replaced_by_attack_id: string | null
  usage_count: number
}


export interface CaseStudySummary {
  slug: string
  title: string
  subtitle: string
  domain: AttackDomain
  source_type: 'campaign' | 'group' | 'software' | 'scenario'
  lookup_name: string
  entity_attack_id: string | null
  entity_name: string
  year_label: string
  difficulty: string
  is_hypothetical: boolean
  disclaimer_vi?: string | null
  tags: string[]
  summary_vi: string
  why_it_matters_vi: string
  step_count: number
}

export interface CaseStepDetectionStrategy {
  attack_id: string
  name: string
  url?: string
  analytics: Array<{
    attack_id: string
    name: string
    description: string
    platforms: string[]
    log_sources: Array<{
      name: string
      channel: string
      data_component_id: string | null
      data_component_name: string | null
    }>
  }>
}

export interface CaseStudyStep {
  step_order: number
  stage_title_vi: string
  plain_vi: string
  telemetry_vi: string
  defender_vi: string
  resolved: boolean
  attack_id: string
  technique_name: string
  tactic_shortname: string
  tactic_name: string
  tactic_id: string
  tactic_order: number
  platforms: string[]
  is_subtechnique: boolean
  is_new: boolean
  revoked: boolean
  deprecated: boolean
  replaced_by_attack_id: string | null
  mitre_url?: string | null
  mitre_procedure?: string | null
  detection_strategies: CaseStepDetectionStrategy[]
  mitigations: Array<{
    attack_id: string
    name: string
    description: string
  }>
}

export interface CaseStudyDetail {
  slug: string
  title: string
  subtitle: string
  domain: AttackDomain
  attack_version: string
  source_type: 'campaign' | 'group' | 'software' | 'scenario'
  lookup_name: string
  year_label: string
  difficulty: string
  is_hypothetical: boolean
  disclaimer_vi?: string | null
  tags: string[]
  summary_vi: string
  why_it_matters_vi: string
  entity: {
    attack_id: string
    name: string
    type: string
    description: string
    url?: string
  } | null
  steps: CaseStudyStep[]
  navigator_layer: Record<string, unknown>
}


export interface GlossaryTerm {
  key: string
  term: string
  vi_short: string
  definition_vi: string
  example_vi: string
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correct_index: number
  explanation_vi: string
}

export interface LessonItem {
  slug: string
  order: number
  title: string
  reading_minutes: number
  badge_label: string
  interactive_widget: 'pyramid' | 'hierarchy' | 'det-tree' | 'version-slider' | 'none'
  body_md: string
  try_technique: {
    domain: AttackDomain
    attack_id: string
    name: string
    tactics: string[]
    revoked: boolean
    deprecated: boolean
  } | null
  quiz: QuizQuestion[]
}

export interface CurriculumResponse {
  count: number
  lessons: LessonItem[]
  glossary: GlossaryTerm[]
}

export interface DiffChangeItem {
  stix_id: string
  type: string
  attack_id: string
  name: string
  is_subtechnique?: boolean
  replaced_by_attack_id?: string | null
  previous_name?: string
}

export interface VersionDiffResponse {
  domain: AttackDomain
  from_version: string
  to_version: string
  available_versions: string[]
  counts: {
    added: number
    modified: number
    deprecated: number
    revoked: number
    removed: number
  }
  added: DiffChangeItem[]
  modified: DiffChangeItem[]
  deprecated: DiffChangeItem[]
  revoked: DiffChangeItem[]
  removed: DiffChangeItem[]
}


export interface EntityListItem {
  domain: AttackDomain
  type?: string
  attack_id: string
  name: string
  platforms?: string[]
  summary: string
  data?: {
    aliases?: string[]
    first_seen?: string
    last_seen?: string
    url?: string
  }
}

export interface EntityDetailTechnique {
  attack_id: string
  name: string
  tactics: string[]
  platforms: string[]
  is_subtechnique: boolean
  procedure_description: string
}

export interface EntityDetailResponse {
  domain: AttackDomain
  type: string
  attack_id: string
  name: string
  description: string
  platforms: string[]
  metadata: {
    aliases?: string[]
    first_seen?: string
    last_seen?: string
    url?: string
  }
  technique_count: number
  techniques: EntityDetailTechnique[]
  techniques_by_tactic: Array<{
    attack_id: string
    shortname: string
    name: string
    order: number
    techniques: EntityDetailTechnique[]
  }>
  related_software: Array<{
    attack_id: string
    name: string
    type: string
    description: string
  }>
  attributed_groups: Array<{
    attack_id: string
    name: string
    description: string
  }>
}

export interface AdminHealthResponse {
  content_health: {
    total_references: number
    healthy_count: number
    issue_count: number
    cases_checked: number
    lessons_checked: number
    issues: Array<{
      source_kind: string
      source_slug: string
      source_title: string
      domain: string
      technique_ref: string
      issue_type: string
      attack_id: string | null
      replaced_by_attack_id: string | null
      message: string
    }>
  }
  db_storage: {
    database_bytes?: number
    database_pretty?: string
    limit_bytes?: number
    tables?: Record<string, { bytes: number; pretty: string }>
  }
  allowed_emails: Array<{
    email: string
    role: 'admin' | 'member'
    note: string
    created_at: string
  }>
}

export interface CollectorEventSchema {
  field: string
  label: string
  desc: string
}

export interface CollectorEvent {
  id: string
  collector_id: string
  event_code: string
  event_name: string
  description: string
  sample_payload: Record<string, any>
  fields_schema: CollectorEventSchema[]
}

export interface TelemetryCollector {
  id: string
  name: string
  os: 'windows' | 'linux' | 'macos' | 'cloud' | 'network' | 'multi'
  category: 'host_endpoint' | 'network_sensor' | 'cloud_audit' | 'identity'
  is_agentless: boolean
  description: string
  doc_url: string
  events_count: number
  techniques_covered_count: number
  events?: CollectorEvent[]
}

export interface GreedyGain {
  collector_id: string
  collector_name: string
  os: string
  additional_techniques: number
  marginal_gain_pct: number
  key_unlocked_capabilities: string[]
}

export interface TacticCoverage {
  covered: number
  total: number
  percentage: number
}

export interface TelemetryPlanResponse {
  covered_techniques_count: number
  total_techniques_count: number
  coverage_percentage: number
  tactics_coverage: Record<string, TacticCoverage>
  greedy_recommendations: GreedyGain[]
  uncovered_techniques_sample: Array<{
    technique_id: string
    technique_name: string
    tactics: string[]
    platforms: string[]
    capable_collectors: string[]
  }>
}

export interface AnnotatedLogSample {
  id: string
  technique_id: string
  technique_name: string
  collector_id: string
  collector_name: string
  collector_os: string
  scenario_title: string
  scenario_description: string
  raw_log: Record<string, any>
  annotations: Record<string, string>
  created_at: string
}

