-- Drop the old trigger that overwrites work_type on every UPDATE
DROP TRIGGER IF EXISTS trigger_derive_work_type ON public.quotations;

-- Recreate the function to only derive work_type when it's NULL (i.e., not manually set)
CREATE OR REPLACE FUNCTION public.derive_work_type()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only auto-derive on INSERT, or if work_type is explicitly NULL
  -- This allows manual overrides via the Edit dialog to persist
  IF TG_OP = 'INSERT' OR NEW.work_type IS NULL THEN
    IF NEW.project_name IS NOT NULL THEN
      IF NEW.project_name ~* '(Hood|ดูดควัน|ปะเก็นเชือก|Exhaust|ฮู้ด|ระบบดูดควัน|ท่อลม|Ventilation|Gasket)' THEN
        NEW.work_type := 'งานระบบ Hood';
      ELSIF NEW.project_name ~* '(ล้าง|Cleaning)' THEN
        NEW.work_type := 'งานล้างแอร์';
      ELSIF NEW.project_name ~* '(PM|Preventive|สัญญาบำรุงรักษา)' THEN
        NEW.work_type := 'งาน PM';
      ELSIF NEW.project_name ~* '(ซ่อม|Repair|แก้ไข|เปลี่ยนอะไหล่)' THEN
        NEW.work_type := 'งานซ่อมแอร์';
      ELSIF NEW.project_name ~* '(ติดตั้ง|Install|ย้าย)' THEN
        NEW.work_type := 'งานติดตั้ง';
      ELSE
        NEW.work_type := 'งานอื่นๆ';
      END IF;
    ELSE
      NEW.work_type := 'งานอื่นๆ';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Re-create trigger on INSERT only (not UPDATE) to prevent overwriting manual edits
CREATE TRIGGER trigger_derive_work_type
  BEFORE INSERT ON public.quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.derive_work_type();