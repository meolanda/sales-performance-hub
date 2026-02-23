
-- Update derive_work_type function with expanded categories
CREATE OR REPLACE FUNCTION public.derive_work_type()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.project_name IS NOT NULL THEN
    -- Hood / Exhaust / Ventilation / Gasket
    IF NEW.project_name ILIKE '%Hood%'
       OR NEW.project_name ILIKE '%ฮู้ด%'
       OR NEW.project_name ILIKE '%Exhaust%'
       OR NEW.project_name ILIKE '%Ventilation%'
       OR NEW.project_name ILIKE '%Gasket%'
       OR NEW.project_name ILIKE '%ระบบดูดควัน%'
       OR NEW.project_name ILIKE '%ท่อลม%' THEN
      NEW.work_type := 'งานระบบ Hood';
    -- Cleaning
    ELSIF NEW.project_name ILIKE '%ล้าง%'
       OR NEW.project_name ILIKE '%Cleaning%' THEN
      NEW.work_type := 'งานล้างแอร์';
    -- PM
    ELSIF NEW.project_name ILIKE '%PM%'
       OR NEW.project_name ILIKE '%Preventive%' THEN
      NEW.work_type := 'งาน PM';
    -- Repair
    ELSIF NEW.project_name ILIKE '%ซ่อม%'
       OR NEW.project_name ILIKE '%Repair%'
       OR NEW.project_name ILIKE '%แก้ไข%' THEN
      NEW.work_type := 'งานซ่อมแอร์';
    -- Installation
    ELSIF NEW.project_name ILIKE '%ติดตั้ง%'
       OR NEW.project_name ILIKE '%Install%' THEN
      NEW.work_type := 'งานติดตั้ง';
    -- Others (has project_name but no match)
    ELSE
      NEW.work_type := 'งานอื่นๆ';
    END IF;
  ELSE
    NEW.work_type := 'งานอื่นๆ';
  END IF;
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists on quotations
DROP TRIGGER IF EXISTS trigger_derive_work_type ON public.quotations;
CREATE TRIGGER trigger_derive_work_type
  BEFORE INSERT OR UPDATE ON public.quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.derive_work_type();

-- Re-categorize all existing records by touching them
UPDATE public.quotations SET updated_at = now();
