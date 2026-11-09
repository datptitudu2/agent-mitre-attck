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
