
-- ==============================================================================
-- PHASE 1: DETECTION WORKBENCH SCHEMA (0002_detection_workbench.sql)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.telemetry_collectors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    os TEXT NOT NULL CHECK (os IN ('windows', 'linux', 'macos', 'cloud', 'network', 'multi')),
    category TEXT NOT NULL CHECK (category IN ('host_endpoint', 'network_sensor', 'cloud_audit', 'identity')),
    is_agentless BOOLEAN NOT NULL DEFAULT false,
    description TEXT NOT NULL,
    doc_url TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.collector_events (
    id TEXT PRIMARY KEY,
    collector_id TEXT NOT NULL REFERENCES public.telemetry_collectors(id) ON DELETE CASCADE,
    event_code TEXT NOT NULL,
    event_name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    sample_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    fields_schema JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.dc_event_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_component_name TEXT NOT NULL,
    collector_id TEXT NOT NULL REFERENCES public.telemetry_collectors(id) ON DELETE CASCADE,
    collector_event_id TEXT REFERENCES public.collector_events(id) ON DELETE CASCADE,
    quality TEXT NOT NULL CHECK (quality IN ('native', 'enrichment', 'partial')),
    notes TEXT NOT NULL DEFAULT '',
    UNIQUE (data_component_name, collector_id, collector_event_id)
);

CREATE TABLE IF NOT EXISTS public.technique_telemetry_matrix (
    technique_id TEXT PRIMARY KEY,
    technique_name TEXT NOT NULL,
    tactics TEXT[] NOT NULL DEFAULT '{}',
    platforms TEXT[] NOT NULL DEFAULT '{}',
    required_dcs TEXT[] NOT NULL DEFAULT '{}',
    capable_collectors TEXT[] NOT NULL DEFAULT '{}',
    analytic_count INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.annotated_log_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technique_id TEXT NOT NULL,
    technique_name TEXT NOT NULL,
    collector_id TEXT NOT NULL REFERENCES public.telemetry_collectors(id) ON DELETE CASCADE,
    scenario_title TEXT NOT NULL,
    scenario_description TEXT NOT NULL DEFAULT '',
    raw_log JSONB NOT NULL,
    annotations JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies: Public read for authenticated users, write for service_role/admin
ALTER TABLE public.telemetry_collectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collector_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dc_event_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technique_telemetry_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotated_log_samples ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS p_select_collectors ON public.telemetry_collectors;
    CREATE POLICY p_select_collectors ON public.telemetry_collectors FOR SELECT TO authenticated USING (true);
    
    DROP POLICY IF EXISTS p_select_collector_events ON public.collector_events;
    CREATE POLICY p_select_collector_events ON public.collector_events FOR SELECT TO authenticated USING (true);
    
    DROP POLICY IF EXISTS p_select_dc_map ON public.dc_event_map;
    CREATE POLICY p_select_dc_map ON public.dc_event_map FOR SELECT TO authenticated USING (true);
    
    DROP POLICY IF EXISTS p_select_matrix ON public.technique_telemetry_matrix;
    CREATE POLICY p_select_matrix ON public.technique_telemetry_matrix FOR SELECT TO authenticated USING (true);
    
    DROP POLICY IF EXISTS p_select_annotated_logs ON public.annotated_log_samples;
    CREATE POLICY p_select_annotated_logs ON public.annotated_log_samples FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
