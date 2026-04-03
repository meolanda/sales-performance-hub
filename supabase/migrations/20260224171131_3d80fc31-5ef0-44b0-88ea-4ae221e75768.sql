-- Schedule daily wrapup at 17:30 Bangkok time (10:30 UTC)
SELECT cron.schedule(
  'telegram-daily-wrapup',
  '30 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://katxpagyuglxooftmbnu.supabase.co/functions/v1/telegram-daily-wrapup',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthdHhwYWd5dWdseG9vZnRtYm51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NDgwMDEsImV4cCI6MjA4NzQyNDAwMX0.JdYzLMguAriiakbECe-KSLeGwW91l_B2nAKuuqc_RSM"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  ) AS request_id;
  $$
);