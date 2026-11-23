ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS possible_duplicate boolean NOT NULL DEFAULT false;