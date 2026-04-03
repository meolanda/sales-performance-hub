
-- Add sales tracking columns to quotations table
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS follow_up_status text,
  ADD COLUMN IF NOT EXISTS sales_priority text,
  ADD COLUMN IF NOT EXISTS next_follow_up_date date,
  ADD COLUMN IF NOT EXISTS internal_notes text;

-- Update the derive_work_type trigger to include refined keywords
CREATE OR REPLACE FUNCTION public.derive_work_type()
RETURNS trigger AS $$
BEGIN
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
