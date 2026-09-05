CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  username text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('team','host')),
  team_number int,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_host(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND role = 'host')
$$;

CREATE POLICY "profiles_select_self_or_host" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_host(auth.uid()));

CREATE TABLE public.teams (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_number int NOT NULL UNIQUE,
  name text NOT NULL,
  bonds_locked boolean NOT NULL DEFAULT false,
  bonds_change_round int,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teams_select" ON public.teams FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_host(auth.uid()));
CREATE POLICY "teams_update_host" ON public.teams FOR UPDATE TO authenticated
  USING (public.is_host(auth.uid())) WITH CHECK (public.is_host(auth.uid()));

CREATE TABLE public.game_state (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_round int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'setup' CHECK (status IN ('setup','open','frozen','complete')),
  timer_ends_at timestamptz,
  timer_seconds int NOT NULL DEFAULT 300,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.game_state TO authenticated;
GRANT ALL ON public.game_state TO service_role;
ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "game_state_select" ON public.game_state FOR SELECT TO authenticated USING (true);
INSERT INTO public.game_state (id) VALUES (1);

CREATE TABLE public.assets (
  key text PRIMARY KEY,
  name text NOT NULL,
  base_price numeric(18,4) NOT NULL DEFAULT 100,
  benchmark_weight numeric(9,4) NOT NULL DEFAULT 16.6667,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.assets TO authenticated;
GRANT ALL ON public.assets TO service_role;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assets_select" ON public.assets FOR SELECT TO authenticated USING (true);
INSERT INTO public.assets (key, name, base_price, benchmark_weight, sort_order) VALUES
  ('gold','Gold',2350.00,16.6667,1),
  ('bonds','Bonds',98.5000,16.6667,2),
  ('energy','Energy',82.4000,16.6667,3),
  ('crypto','Crypto',64000.00,16.6667,4),
  ('emerging','Emerging Markets',1120.00,16.6667,5),
  ('tech','Tech Stocks',4800.00,16.6665,6);

CREATE TABLE public.price_moves (
  round int NOT NULL,
  asset_key text NOT NULL REFERENCES public.assets(key) ON DELETE CASCADE,
  pct numeric(9,4) NOT NULL DEFAULT 0,
  PRIMARY KEY (round, asset_key)
);
GRANT SELECT ON public.price_moves TO authenticated;
GRANT ALL ON public.price_moves TO service_role;
ALTER TABLE public.price_moves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "price_moves_select" ON public.price_moves FOR SELECT TO authenticated USING (true);
INSERT INTO public.price_moves (round, asset_key, pct)
SELECT r, a.key, 0 FROM generate_series(1,4) r CROSS JOIN public.assets a;

CREATE TABLE public.news (
  round int PRIMARY KEY,
  headline text NOT NULL,
  body text NOT NULL DEFAULT '',
  image_url text,
  posted_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.news TO authenticated;
GRANT ALL ON public.news TO service_role;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "news_select" ON public.news FOR SELECT TO authenticated USING (true);

CREATE TABLE public.allocations (
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  asset_key text NOT NULL REFERENCES public.assets(key) ON DELETE CASCADE,
  amount numeric(20,4) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, asset_key)
);
GRANT SELECT ON public.allocations TO authenticated;
GRANT ALL ON public.allocations TO service_role;
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allocations_select" ON public.allocations FOR SELECT TO authenticated
  USING (team_id = auth.uid() OR public.is_host(auth.uid()));

CREATE TABLE public.submissions (
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  round int NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, round)
);
GRANT SELECT ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "submissions_select" ON public.submissions FOR SELECT TO authenticated
  USING (team_id = auth.uid() OR public.is_host(auth.uid()));

CREATE TABLE public.round_snapshots (
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  round int NOT NULL,
  total_value numeric(20,4) NOT NULL,
  allocation jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, round)
);
GRANT SELECT ON public.round_snapshots TO authenticated;
GRANT ALL ON public.round_snapshots TO service_role;
ALTER TABLE public.round_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "round_snapshots_select" ON public.round_snapshots FOR SELECT TO authenticated
  USING (team_id = auth.uid() OR public.is_host(auth.uid()));

CREATE TABLE public.benchmark_snapshots (
  round int PRIMARY KEY,
  total_value numeric(20,4) NOT NULL,
  allocation jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.benchmark_snapshots TO authenticated;
GRANT ALL ON public.benchmark_snapshots TO service_role;
ALTER TABLE public.benchmark_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "benchmark_snapshots_select" ON public.benchmark_snapshots FOR SELECT TO authenticated USING (true);

CREATE TABLE public.change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  round int NOT NULL,
  asset_key text NOT NULL,
  delta numeric(20,4) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.change_log TO authenticated;
GRANT ALL ON public.change_log TO service_role;
ALTER TABLE public.change_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "change_log_select" ON public.change_log FOR SELECT TO authenticated
  USING (team_id = auth.uid() OR public.is_host(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.game_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.news;
ALTER PUBLICATION supabase_realtime ADD TABLE public.price_moves;
ALTER PUBLICATION supabase_realtime ADD TABLE public.allocations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.round_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.benchmark_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assets;