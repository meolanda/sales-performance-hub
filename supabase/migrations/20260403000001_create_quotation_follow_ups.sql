-- Follow-up history log for each quotation
CREATE TABLE public.quotation_follow_ups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  follow_date DATE NOT NULL DEFAULT CURRENT_DATE,
  followed_by TEXT,
  result TEXT NOT NULL,
  next_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quotation_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read quotation_follow_ups"
  ON public.quotation_follow_ups FOR SELECT USING (true);

CREATE POLICY "Allow public insert quotation_follow_ups"
  ON public.quotation_follow_ups FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public delete quotation_follow_ups"
  ON public.quotation_follow_ups FOR DELETE USING (true);

CREATE INDEX idx_quotation_follow_ups_quotation_id
  ON public.quotation_follow_ups(quotation_id);
