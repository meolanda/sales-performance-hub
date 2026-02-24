
-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Create trigger function that calls the edge function on quotation update
CREATE OR REPLACE FUNCTION public.notify_telegram_closed_won()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  payload jsonb;
BEGIN
  -- Only fire when follow_up_status changes TO 'ปิดการขายได้'
  IF (OLD.follow_up_status IS DISTINCT FROM 'ปิดการขายได้') 
     AND (NEW.follow_up_status = 'ปิดการขายได้') THEN
    
    payload := jsonb_build_object(
      'type', 'UPDATE',
      'table', 'quotations',
      'record', row_to_json(NEW)::jsonb,
      'old_record', row_to_json(OLD)::jsonb
    );

    PERFORM net.http_post(
      url := 'https://katxpagyuglxooftmbnu.supabase.co/functions/v1/telegram-alert-closed-won',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthdHhwYWd5dWdseG9vZnRtYm51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NDgwMDEsImV4cCI6MjA4NzQyNDAwMX0.JdYzLMguAriiakbECe-KSLeGwW91l_B2nAKuuqc_RSM'
      ),
      body := payload
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on quotations table
DROP TRIGGER IF EXISTS trigger_telegram_closed_won ON public.quotations;
CREATE TRIGGER trigger_telegram_closed_won
  AFTER UPDATE ON public.quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_telegram_closed_won();

-- Schedule morning briefing at 08:30 Bangkok time (01:30 UTC)
SELECT cron.schedule(
  'telegram-morning-briefing',
  '30 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://katxpagyuglxooftmbnu.supabase.co/functions/v1/telegram-morning-briefing',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthdHhwYWd5dWdseG9vZnRtYm51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NDgwMDEsImV4cCI6MjA4NzQyNDAwMX0.JdYzLMguAriiakbECe-KSLeGwW91l_B2nAKuuqc_RSM"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  ) AS request_id;
  $$
);
