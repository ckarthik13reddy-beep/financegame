ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS cash_balance numeric(20,4) NOT NULL DEFAULT 100000000;

ALTER TABLE public.round_snapshots
  ADD COLUMN IF NOT EXISTS cash_balance numeric(20,4) NOT NULL DEFAULT 0;

-- Start every classroom team with a cash wallet. Their representatives choose
-- the opening asset book during setup instead of receiving an equal split.
UPDATE public.teams SET cash_balance = 100000000;
UPDATE public.allocations SET amount = 0;
UPDATE public.round_snapshots
SET allocation = '{}'::jsonb, total_value = 100000000, cash_balance = 100000000
WHERE round = 0;