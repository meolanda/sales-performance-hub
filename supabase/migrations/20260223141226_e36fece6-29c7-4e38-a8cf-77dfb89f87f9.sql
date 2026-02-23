
-- Quotations table
CREATE TABLE public.quotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_number TEXT NOT NULL UNIQUE,
  document_date DATE,
  customer_name TEXT,
  project_name TEXT,
  work_type TEXT,
  amount NUMERIC(12,2) DEFAULT 0,
  vat NUMERIC(12,2) DEFAULT 0,
  net_total NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- Public read for now (no auth yet)
CREATE POLICY "Allow public read quotations"
  ON public.quotations FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert quotations"
  ON public.quotations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update quotations"
  ON public.quotations FOR UPDATE
  USING (true);

-- API Settings table
CREATE TABLE public.api_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'flowaccount',
  client_id TEXT,
  client_secret TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read api_settings"
  ON public.api_settings FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert api_settings"
  ON public.api_settings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update api_settings"
  ON public.api_settings FOR UPDATE
  USING (true);

-- Webhook logs table
CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT,
  payload JSONB,
  status TEXT DEFAULT 'received',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read webhook_logs"
  ON public.webhook_logs FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert webhook_logs"
  ON public.webhook_logs FOR INSERT
  WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_quotations_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_api_settings_updated_at
  BEFORE UPDATE ON public.api_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
