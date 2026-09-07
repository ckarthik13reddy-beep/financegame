ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS bonds_sell_used boolean NOT NULL DEFAULT false;

ALTER TABLE public.teams
  ALTER COLUMN cash_balance SET DEFAULT 0;

UPDATE public.teams
SET cash_balance = 0,
    bonds_sell_used = false;

UPDATE public.allocations
SET amount = CASE asset_key
  WHEN 'gold' THEN 30000000
  WHEN 'bonds' THEN 10000000
  WHEN 'energy' THEN 10000000
  WHEN 'crypto' THEN 10000000
  WHEN 'emerging' THEN 20000000
  WHEN 'tech' THEN 20000000
  ELSE 0
END;

UPDATE public.round_snapshots
SET total_value = 100000000,
    cash_balance = 0,
    allocation = jsonb_build_object(
      'gold', 30000000,
      'bonds', 10000000,
      'energy', 10000000,
      'crypto', 10000000,
      'emerging', 20000000,
      'tech', 20000000
    )
WHERE round = 0;

CREATE OR REPLACE FUNCTION public.bootstrap_demo_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  account_email text := lower(auth.jwt() ->> 'email');
  account_username text := split_part(account_email, '@', 1);
  account_role text;
  account_team_number int;
  allocation jsonb := jsonb_build_object(
    'gold', 30000000,
    'bonds', 10000000,
    'energy', 10000000,
    'crypto', 10000000,
    'emerging', 20000000,
    'tech', 20000000
  );
BEGIN
  IF account_email NOT IN (
    'team1@tradingfloor.app', 'team2@tradingfloor.app',
    'team3@tradingfloor.app', 'team4@tradingfloor.app',
    'host@tradingfloor.app'
  ) THEN
    RAISE EXCEPTION 'Only the fixed classroom accounts may be bootstrapped';
  END IF;

  account_role := CASE WHEN account_username = 'host' THEN 'host' ELSE 'team' END;
  account_team_number := CASE WHEN account_role = 'team' THEN right(account_username, 1)::int ELSE NULL END;

  INSERT INTO public.profiles (id, username, role, team_number, display_name)
  VALUES (auth.uid(), account_username, account_role, account_team_number,
    CASE WHEN account_role = 'host' THEN 'Host' ELSE 'Team ' || account_team_number::text END)
  ON CONFLICT (id) DO NOTHING;

  IF account_role = 'team' THEN
    INSERT INTO public.teams (id, team_number, name, cash_balance, bonds_sell_used)
    VALUES (auth.uid(), account_team_number, 'Team ' || account_team_number::text, 0, false)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.allocations (team_id, asset_key, amount)
    SELECT auth.uid(), key, value::numeric FROM jsonb_each_text(allocation)
    ON CONFLICT (team_id, asset_key) DO NOTHING;

    INSERT INTO public.round_snapshots (team_id, round, total_value, cash_balance, allocation)
    VALUES (auth.uid(), 0, 100000000, 0, allocation)
    ON CONFLICT (team_id, round) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('ok', true, 'username', account_username, 'role', account_role);
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_demo_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_demo_profile() TO authenticated;