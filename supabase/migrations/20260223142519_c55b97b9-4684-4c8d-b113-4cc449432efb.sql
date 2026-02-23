
-- ============================================
-- 1. Fix RLS: Drop overly permissive policies
-- ============================================

-- api_settings: drop public policies
DROP POLICY IF EXISTS "Allow read api_settings" ON public.api_settings;
DROP POLICY IF EXISTS "Allow insert api_settings" ON public.api_settings;
DROP POLICY IF EXISTS "Allow update api_settings" ON public.api_settings;

-- quotations: drop public policies
DROP POLICY IF EXISTS "Allow read quotations" ON public.quotations;
DROP POLICY IF EXISTS "Allow insert quotations" ON public.quotations;
DROP POLICY IF EXISTS "Allow update quotations" ON public.quotations;

-- webhook_logs: drop public policies
DROP POLICY IF EXISTS "Allow read webhook_logs" ON public.webhook_logs;
DROP POLICY IF EXISTS "Allow insert webhook_logs" ON public.webhook_logs;

-- ============================================
-- 2. Create strict RLS policies (authenticated only)
-- ============================================

-- api_settings: only authenticated users
CREATE POLICY "Authenticated users can read api_settings"
  ON public.api_settings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert api_settings"
  ON public.api_settings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update api_settings"
  ON public.api_settings FOR UPDATE
  USING (auth.role() = 'authenticated');

-- quotations: authenticated users can read; service role (edge function) can write
CREATE POLICY "Authenticated users can read quotations"
  ON public.quotations FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert quotations"
  ON public.quotations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update quotations"
  ON public.quotations FOR UPDATE
  USING (auth.role() = 'authenticated');

-- webhook_logs: authenticated users can read; service role (edge function) can write
CREATE POLICY "Authenticated users can read webhook_logs"
  ON public.webhook_logs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert webhook_logs"
  ON public.webhook_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- 3. Smart categorization trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.derive_work_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_name IS NOT NULL THEN
    IF NEW.project_name ILIKE '%ล้าง%' OR NEW.project_name ILIKE '%Cleaning%' THEN
      NEW.work_type := 'งานล้างแอร์';
    ELSIF NEW.project_name ILIKE '%PM%' THEN
      NEW.work_type := 'งาน PM';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_derive_work_type ON public.quotations;
CREATE TRIGGER trigger_derive_work_type
  BEFORE INSERT OR UPDATE ON public.quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.derive_work_type();

-- ============================================
-- 4. Update existing records' work_type
-- ============================================
UPDATE public.quotations
SET work_type = 'งานล้างแอร์'
WHERE (project_name ILIKE '%ล้าง%' OR project_name ILIKE '%Cleaning%')
  AND (work_type IS NULL OR work_type != 'งานล้างแอร์');

UPDATE public.quotations
SET work_type = 'งาน PM'
WHERE project_name ILIKE '%PM%'
  AND (work_type IS NULL OR work_type != 'งาน PM');
