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
  allocation jsonb;
  UPDATE auth.users
SET
  email_confirmed_at = now(),
  confirmed_at = now()
WHERE email IN (
  'team1@tradingfloor.app',
  'team2@tradingfloor.app',
  'team3@tradingfloor.app',
  'team4@tradingfloor.app',
  'host@tradingfloor.app'
);
BEGIN
  IF account_email NOT IN (
    'team1@tradingfloor.app',
    'team2@tradingfloor.app',
    'team3@tradingfloor.app',
    'team4@tradingfloor.app',
    'host@tradingfloor.app'
  ) THEN
    RAISE EXCEPTION 'Only the fixed classroom accounts may be bootstrapped';
  END IF;

  account_role := CASE WHEN account_username = 'host' THEN 'host' ELSE 'team' END;
  account_team_number := CASE WHEN account_role = 'team' THEN right(account_username, 1)::int ELSE NULL END;

  INSERT INTO public.profiles (id, username, role, team_number, display_name)
  VALUES (
    auth.uid(),
    account_username,
    account_role,
    account_team_number,
    CASE WHEN account_role = 'host' THEN 'Host' ELSE 'Team ' || account_team_number::text END
  )
  ON CONFLICT (id) DO NOTHING;

  IF account_role = 'team' THEN
    INSERT INTO public.teams (id, team_number, name)
    VALUES (auth.uid(), account_team_number, 'Team ' || account_team_number::text)
    ON CONFLICT (id) DO NOTHING;

    SELECT jsonb_object_agg(key, amount)
    INTO allocation
    FROM (
      SELECT key, CASE WHEN key = 'tech' THEN 100000000 - 16666666.666666 * 5 ELSE 16666666.666666 END AS amount
      FROM unnest(ARRAY['gold', 'bonds', 'energy', 'crypto', 'emerging', 'tech']) AS key
    ) initial_book;

    INSERT INTO public.allocations (team_id, asset_key, amount)
    SELECT auth.uid(), key, value::numeric
    FROM jsonb_each_text(allocation)
    ON CONFLICT (team_id, asset_key) DO NOTHING;

    INSERT INTO public.round_snapshots (team_id, round, total_value, allocation)
    VALUES (auth.uid(), 0, 100000000, allocation)
    ON CONFLICT (team_id, round) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('ok', true, 'username', account_username, 'role', account_role);
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_demo_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_demo_profile() TO authenticated;