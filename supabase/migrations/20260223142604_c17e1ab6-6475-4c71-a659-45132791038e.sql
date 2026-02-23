
-- Drop old permissive public policies that still exist
DROP POLICY IF EXISTS "Allow public read api_settings" ON public.api_settings;
DROP POLICY IF EXISTS "Allow public insert api_settings" ON public.api_settings;
DROP POLICY IF EXISTS "Allow public update api_settings" ON public.api_settings;

DROP POLICY IF EXISTS "Allow public read quotations" ON public.quotations;
DROP POLICY IF EXISTS "Allow public insert quotations" ON public.quotations;
DROP POLICY IF EXISTS "Allow public update quotations" ON public.quotations;

DROP POLICY IF EXISTS "Allow public read webhook_logs" ON public.webhook_logs;
DROP POLICY IF EXISTS "Allow public insert webhook_logs" ON public.webhook_logs;
