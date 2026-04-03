-- Add salesperson, customer contact, and category fields to quotations
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS salesperson_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS customer_category TEXT;

-- customer_category values: 'Food', 'CO', 'รายย่อย'
