-- 1. site_settings: restrict public read to public keys only
DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;

CREATE POLICY "Public can read public site settings"
ON public.site_settings FOR SELECT
TO anon, authenticated
USING (setting_key IN ('home_sections', 'sitemap_entries', 'seo_settings'));

-- 2. visitor_logs: prevent spoofed ownership
DROP POLICY IF EXISTS "Anyone can insert visitor logs" ON public.visitor_logs;

CREATE POLICY "Visitors can log their own visits"
ON public.visitor_logs FOR INSERT
TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL)
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

-- 3. Lock down SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_assign_admin() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM anon;

-- 4. Forecasts
CREATE TABLE public.forecasts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dataset_name text NOT NULL,
  model text NOT NULL,
  forecast_horizon integer NOT NULL DEFAULT 30,
  frequency text NOT NULL DEFAULT 'daily',
  confidence_interval integer NOT NULL DEFAULT 95,
  accuracy numeric,
  rmse numeric,
  mae numeric,
  mape numeric,
  r2_score numeric,
  training_time_ms integer,
  status text NOT NULL DEFAULT 'completed',
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.forecasts TO authenticated;
GRANT ALL ON public.forecasts TO service_role;

ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own forecasts" ON public.forecasts
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own forecasts" ON public.forecasts
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own forecasts" ON public.forecasts
FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own forecasts" ON public.forecasts
FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_forecasts_updated_at
BEFORE UPDATE ON public.forecasts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_forecasts_user_created ON public.forecasts (user_id, created_at DESC);