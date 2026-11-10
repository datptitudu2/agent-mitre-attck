
-- ==============================================================================
-- PHASE 2 & 3: SIGMA RULES & ML FEATURE RECIPES (0003_sigma_and_ml.sql)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.sigma_rules (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'stable',
    description TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT 'SigmaHQ Community',
    references_list TEXT[] NOT NULL DEFAULT '{}',
    tags TEXT[] NOT NULL DEFAULT '{}',
    techniques TEXT[] NOT NULL DEFAULT '{}',
    logsource JSONB NOT NULL DEFAULT '{}'::jsonb,
    detection JSONB NOT NULL DEFAULT '{}'::jsonb,
    raw_yaml TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('low', 'medium', 'high', 'critical')),
    falsepositives TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ml_feature_recipes (
    id TEXT PRIMARY KEY,
    technique_id TEXT NOT NULL,
    technique_name TEXT NOT NULL,
    feature_name TEXT NOT NULL,
    feature_formula TEXT NOT NULL,
    extraction_logic_sql TEXT NOT NULL DEFAULT '',
    extraction_logic_python TEXT NOT NULL DEFAULT '',
    intuition_vietnamese TEXT NOT NULL,
    expected_tp_signal TEXT NOT NULL,
    expected_fp_noise TEXT NOT NULL,
    colab_notebook_url TEXT NOT NULL DEFAULT '',
    difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Telemetry OS mapping table for side-by-side comparison (Phase 4)
CREATE TABLE IF NOT EXISTS public.os_telemetry_matrix (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_category TEXT NOT NULL,
    behavior_description TEXT NOT NULL,
    windows_source TEXT NOT NULL,
    windows_event TEXT NOT NULL,
    windows_fields TEXT NOT NULL,
    linux_source TEXT NOT NULL,
    linux_event TEXT NOT NULL,
    linux_fields TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT ''
);

-- RLS policies
ALTER TABLE public.sigma_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_feature_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_telemetry_matrix ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS p_select_sigma ON public.sigma_rules;
    CREATE POLICY p_select_sigma ON public.sigma_rules FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS p_select_ml ON public.ml_feature_recipes;
    CREATE POLICY p_select_ml ON public.ml_feature_recipes FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS p_select_os_matrix ON public.os_telemetry_matrix;
    CREATE POLICY p_select_os_matrix ON public.os_telemetry_matrix FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
