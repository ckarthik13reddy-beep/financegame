import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { ASSET_KEYS, START_CAPITAL } from "@/lib/game-constants";

export type Amounts = Record<string, number>;

export type GameState = {
  current_round: number;
  status: "setup" | "open" | "frozen" | "complete";
  timer_ends_at: string | null;
  timer_seconds: number;
};

export type Profile = {
  id: string;
  username: string;
  role: "team" | "host";
  team_number: number | null;
  display_name: string;
};

export type Team = {
  id: string;
  team_number: number;
  name: string;
  bonds_locked: boolean;
  bonds_change_round: number | null;
};

export type Snapshot = { team_id: string; round: number; total_value: number; allocation: Amounts };

const num = (v: unknown) => Number(v ?? 0);

export function useSession() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUserId(data.session?.user.id ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
      setReady(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { userId, ready };
}

export function useProfile(userId: string | null) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useGameState() {
  return useQuery({
    queryKey: ["game_state"],
    queryFn: async (): Promise<GameState> => {
      const { data, error } = await supabase.from("game_state").select("*").eq("id", 1).single();
      if (error) throw error;
      return {
        current_round: data.current_round,
        status: data.status as GameState["status"],
        timer_ends_at: data.timer_ends_at,
        timer_seconds: data.timer_seconds,
      };
    },
  });
}

export function useAssets() {
  return useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("assets").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []).map((a) => ({
        key: a.key,
        name: a.name,
        base_price: num(a.base_price),
        benchmark_weight: num(a.benchmark_weight),
        sort_order: a.sort_order,
      }));
    },
  });
}

export function usePriceMoves() {
  return useQuery({
    queryKey: ["price_moves"],
    queryFn: async () => {
      const { data, error } = await supabase.from("price_moves").select("*");
      if (error) throw error;
      const map: Record<number, Record<string, number>> = {};
      for (const row of data ?? []) {
        map[row.round] = map[row.round] ?? {};
        map[row.round]![row.asset_key] = num(row.pct);
      }
      return map;
    },
  });
}

export function useNews() {
  return useQuery({
    queryKey: ["news"],
    queryFn: async () => {
      const { data, error } = await supabase.from("news").select("*").order("round", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: async (): Promise<Team[]> => {
      const { data, error } = await supabase.from("teams").select("*").order("team_number");
      if (error) throw error;
      return (data ?? []) as Team[];
    },
  });
}

export function useAllocations() {
  return useQuery({
    queryKey: ["allocations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("allocations").select("*");
      if (error) throw error;
      const byTeam: Record<string, Amounts> = {};
      for (const row of data ?? []) {
        byTeam[row.team_id] = byTeam[row.team_id] ?? {};
        byTeam[row.team_id]![row.asset_key] = num(row.amount);
      }
      return byTeam;
    },
  });
}

export function useSnapshots() {
  return useQuery({
    queryKey: ["round_snapshots"],
    queryFn: async (): Promise<Snapshot[]> => {
      const { data, error } = await supabase.from("round_snapshots").select("*").order("round");
      if (error) throw error;
      return (data ?? []).map((s) => ({
        team_id: s.team_id,
        round: s.round,
        total_value: num(s.total_value),
        allocation: (s.allocation ?? {}) as Amounts,
      }));
    },
  });
}

export function useBenchmark() {
  return useQuery({
    queryKey: ["benchmark_snapshots"],
    queryFn: async () => {
      const { data, error } = await supabase.from("benchmark_snapshots").select("*").order("round");
      if (error) throw error;
      return (data ?? []).map((b) => ({
        round: b.round,
        total_value: num(b.total_value),
        allocation: (b.allocation ?? {}) as Amounts,
      }));
    },
  });
}

export function useSubmissions() {
  return useQuery({
    queryKey: ["submissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("submissions").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useChangeLog() {
  return useQuery({
    queryKey: ["change_log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("change_log")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((c) => ({ ...c, delta: num(c.delta) }));
    },
  });
}

const REALTIME_TABLES: Array<[string, string]> = [
  ["game_state", "game_state"],
  ["news", "news"],
  ["price_moves", "price_moves"],
  ["allocations", "allocations"],
  ["submissions", "submissions"],
  ["round_snapshots", "round_snapshots"],
  ["benchmark_snapshots", "benchmark_snapshots"],
  ["teams", "teams"],
  ["assets", "assets"],
];

/** Keeps every game query in sync live, without refreshes. */
export function useRealtimeGame() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase.channel("trading-game");
    for (const [table, key] of REALTIME_TABLES) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        qc.invalidateQueries({ queryKey: [key] });
        if (table === "round_snapshots" || table === "allocations") {
          qc.invalidateQueries({ queryKey: ["change_log"] });
        }
      });
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}

/** Live countdown, driven by the shared DB deadline. */
export function useCountdown(endsAt: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return { seconds: null as number | null, expired: false };
  const seconds = Math.max(0, (new Date(endsAt).getTime() - now) / 1000);
  return { seconds, expired: seconds <= 0 };
}

export function sumAmounts(a: Amounts) {
  return ASSET_KEYS.reduce((acc, k) => acc + num(a[k]), 0);
}

export type TeamSeries = {
  teamId: string;
  values: Array<{ round: number; value: number }>;
};

/** Portfolio value series per team, plus the benchmark, indexed by round. */
export function usePerformance() {
  const snapshots = useSnapshots();
  const benchmark = useBenchmark();

  return useMemo(() => {
    const byTeam: Record<string, Array<{ round: number; value: number }>> = {};
    for (const s of snapshots.data ?? []) {
      byTeam[s.team_id] = byTeam[s.team_id] ?? [];
      byTeam[s.team_id]!.push({ round: s.round, value: s.total_value });
    }
    const bench = (benchmark.data ?? []).map((b) => ({ round: b.round, value: b.total_value }));
    const settledRounds = bench.filter((b) => b.round > 0).map((b) => b.round);
    const latestBench = bench.length ? bench[bench.length - 1]!.value : START_CAPITAL;
    return { byTeam, bench, settledRounds, latestBench, loading: snapshots.isLoading || benchmark.isLoading };
  }, [snapshots.data, benchmark.data, snapshots.isLoading, benchmark.isLoading]);
}
