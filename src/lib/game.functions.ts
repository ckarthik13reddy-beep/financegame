import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  ASSET_KEYS,
  DEFAULT_CREDENTIALS,
  EMAIL_DOMAIN,
  MAX_MOVE_PER_ASSET,
  START_CAPITAL,
  TOTAL_ROUNDS,
} from "./game-constants";

type Amounts = Record<string, number>;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function equalSplit(total: number): Amounts {
  const each = Math.round((total / ASSET_KEYS.length) * 100) / 100;
  const out: Amounts = {};
  ASSET_KEYS.forEach((k, i) => {
    out[k] = i === ASSET_KEYS.length - 1 ? Math.round((total - each * (ASSET_KEYS.length - 1)) * 100) / 100 : each;
  });
  return out;
}

/** Creates the 4 team logins + host login and their starting positions. Idempotent. */
export const seedGame = createServerFn({ method: "POST" }).handler(async () => {
  const db = await admin();

  const { data: existing } = await db.from("profiles").select("username");
  const have = new Set((existing ?? []).map((p) => p.username));

  for (const cred of DEFAULT_CREDENTIALS) {
    if (have.has(cred.username)) continue;
    const email = `${cred.username}@${EMAIL_DOMAIN}`;
    const created = await db.auth.admin.createUser({
      email,
      password: cred.password,
      email_confirm: true,
    });
    let userId = created.data.user?.id;
    if (!userId) {
      const list = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
      userId = list.data.users.find((u) => u.email === email)?.id;
    }
    if (!userId) continue;

    const isHost = cred.username === "host";
    const teamNumber = isHost ? null : Number(cred.username.replace("team", ""));

    await db.from("profiles").upsert({
      id: userId,
      username: cred.username,
      role: isHost ? "host" : "team",
      team_number: teamNumber,
      display_name: cred.label,
    });

    if (!isHost && teamNumber) {
      await db.from("teams").upsert({ id: userId, team_number: teamNumber, name: cred.label });
      const split = equalSplit(START_CAPITAL);
      await db
        .from("allocations")
        .upsert(ASSET_KEYS.map((k) => ({ team_id: userId!, asset_key: k, amount: split[k]! })));
      await db
        .from("round_snapshots")
        .upsert({ team_id: userId, round: 0, total_value: START_CAPITAL, allocation: split });
    }
  }

  // Benchmark starting book from its fixed weights
  const { data: bench } = await db.from("benchmark_snapshots").select("round").eq("round", 0);
  if (!bench || bench.length === 0) {
    const { data: assets } = await db.from("assets").select("key, benchmark_weight");
    const alloc: Amounts = {};
    for (const a of assets ?? []) alloc[a.key] = (START_CAPITAL * Number(a.benchmark_weight)) / 100;
    await db
      .from("benchmark_snapshots")
      .upsert({ round: 0, total_value: START_CAPITAL, allocation: alloc });
  }

  return { ok: true };
});

async function assertHost(userId: string) {
  const db = await admin();
  const { data } = await db.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (data?.role !== "host") throw new Error("Host access required");
  return db;
}

/** ---------------- Team: submit allocation ---------------- */

export const submitAllocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { amounts: Amounts }) => input)
  .handler(async ({ data, context }) => {
    const db = await admin();
    const teamId = context.userId;

    const { data: team } = await db.from("teams").select("*").eq("id", teamId).maybeSingle();
    if (!team) throw new Error("Only team accounts can submit allocations");

    const { data: state } = await db.from("game_state").select("*").eq("id", 1).maybeSingle();
    if (!state) throw new Error("Game state missing");
    const round = state.current_round;

    if (state.status !== "open") throw new Error("The round is not open for trading");
    if (round >= TOTAL_ROUNDS) throw new Error("Positions are frozen for the surprise round");
    if (state.timer_ends_at && new Date(state.timer_ends_at).getTime() < Date.now())
      throw new Error("Time is up for this round");

    const { data: already } = await db
      .from("submissions")
      .select("round")
      .eq("team_id", teamId)
      .eq("round", round)
      .maybeSingle();
    if (already) throw new Error("You already submitted this round");

    const { data: base } = await db
      .from("round_snapshots")
      .select("total_value, allocation")
      .eq("team_id", teamId)
      .eq("round", round - 1)
      .maybeSingle();
    if (!base) throw new Error("No opening position found for this round");

    const baseline = base.allocation as Amounts;
    const targetTotal = Number(base.total_value);

    let sum = 0;
    for (const key of ASSET_KEYS) {
      const v = Number(data.amounts[key] ?? 0);
      if (!Number.isFinite(v) || v < 0) throw new Error(`Invalid amount for ${key}`);
      sum += v;
    }
    if (Math.abs(sum - targetTotal) > 1)
      throw new Error("Total allocation must equal your portfolio value");

    let bondsChanged = false;
    for (const key of ASSET_KEYS) {
      const next = Number(data.amounts[key] ?? 0);
      const prev = Number(baseline[key] ?? 0);
      const delta = next - prev;
      if (Math.abs(delta) > MAX_MOVE_PER_ASSET + 1)
        throw new Error(`Cannot move more than $10M in or out of ${key} in one round`);
      if (key === "bonds" && Math.abs(delta) > 1) bondsChanged = true;
    }

    if (bondsChanged && round > 1) {
      if (team.bonds_locked) throw new Error("Bonds are permanently locked for your team");
    }

    const rows = ASSET_KEYS.map((k) => ({
      team_id: teamId,
      asset_key: k,
      amount: Number(data.amounts[k] ?? 0),
      updated_at: new Date().toISOString(),
    }));
    await db.from("allocations").upsert(rows);

    const logs = ASSET_KEYS.map((k) => ({
      team_id: teamId,
      round,
      asset_key: k,
      delta: Number(data.amounts[k] ?? 0) - Number(baseline[k] ?? 0),
    })).filter((l) => Math.abs(l.delta) > 0.5);
    if (logs.length) await db.from("change_log").insert(logs);

    if (bondsChanged && round > 1) {
      await db
        .from("teams")
        .update({ bonds_locked: true, bonds_change_round: round })
        .eq("id", teamId);
    }

    await db.from("submissions").insert({ team_id: teamId, round });

    return { ok: true, bondsLocked: bondsChanged && round > 1 };
  });

/** ---------------- Host controls ---------------- */

export const hostSetStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { status: "setup" | "open" | "frozen" | "complete" }) => input)
  .handler(async ({ data, context }) => {
    const db = await assertHost(context.userId);
    const patch: Record<string, unknown> = { status: data.status, updated_at: new Date().toISOString() };
    if (data.status !== "open") patch["timer_ends_at"] = null;
    await db.from("game_state").update(patch).eq("id", 1);
    return { ok: true };
  });

export const hostStartTimer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { seconds: number }) => input)
  .handler(async ({ data, context }) => {
    const db = await assertHost(context.userId);
    const seconds = Math.max(10, Math.min(3600, Math.round(data.seconds)));
    await db
      .from("game_state")
      .update({
        timer_seconds: seconds,
        timer_ends_at: new Date(Date.now() + seconds * 1000).toISOString(),
        status: "open",
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    return { ok: true };
  });

export const hostPostNews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { round: number; headline: string; body: string; imageUrl?: string }) => input)
  .handler(async ({ data, context }) => {
    const db = await assertHost(context.userId);
    await db.from("news").upsert({
      round: data.round,
      headline: data.headline,
      body: data.body,
      image_url: data.imageUrl || null,
      posted_at: new Date().toISOString(),
    });
    return { ok: true };
  });

export const hostSetPriceMoves = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { round: number; moves: Record<string, number> }) => input)
  .handler(async ({ data, context }) => {
    const db = await assertHost(context.userId);
    const rows = Object.entries(data.moves)
      .filter(([k]) => ASSET_KEYS.includes(k as never))
      .map(([asset_key, pct]) => ({ round: data.round, asset_key, pct: Number(pct) || 0 }));
    if (rows.length) await db.from("price_moves").upsert(rows);
    return { ok: true };
  });

export const hostSetBenchmarkWeights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { weights: Record<string, number> }) => input)
  .handler(async ({ data, context }) => {
    const db = await assertHost(context.userId);
    const total = Object.values(data.weights).reduce((a, b) => a + (Number(b) || 0), 0);
    if (Math.abs(total - 100) > 0.05) throw new Error("Benchmark weights must total 100%");

    for (const [key, w] of Object.entries(data.weights)) {
      if (!ASSET_KEYS.includes(key as never)) continue;
      await db.from("assets").update({ benchmark_weight: Number(w) }).eq("key", key);
    }

    const { data: settled } = await db.from("benchmark_snapshots").select("round").gt("round", 0);
    if (!settled || settled.length === 0) {
      const alloc: Amounts = {};
      for (const [key, w] of Object.entries(data.weights)) alloc[key] = (START_CAPITAL * Number(w)) / 100;
      await db
        .from("benchmark_snapshots")
        .upsert({ round: 0, total_value: START_CAPITAL, allocation: alloc });
    }
    return { ok: true };
  });

export const hostSetBasePrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string; basePrice: number }) => input)
  .handler(async ({ data, context }) => {
    const db = await assertHost(context.userId);
    await db.from("assets").update({ base_price: Number(data.basePrice) }).eq("key", data.key);
    return { ok: true };
  });

async function settleRound(round: number) {
  const db = await admin();

  const { data: done } = await db.from("benchmark_snapshots").select("round").eq("round", round);
  if (done && done.length > 0) return false;

  const { data: moves } = await db.from("price_moves").select("asset_key, pct").eq("round", round);
  const pct: Record<string, number> = {};
  for (const m of moves ?? []) pct[m.asset_key] = Number(m.pct);

  const revalue = (alloc: Amounts) => {
    const next: Amounts = {};
    let total = 0;
    for (const k of ASSET_KEYS) {
      const v = Number(alloc[k] ?? 0) * (1 + (pct[k] ?? 0) / 100);
      next[k] = Math.round(v * 100) / 100;
      total += next[k]!;
    }
    return { next, total: Math.round(total * 100) / 100 };
  };

  const { data: teams } = await db.from("teams").select("id");
  for (const team of teams ?? []) {
    const { data: live } = await db.from("allocations").select("asset_key, amount").eq("team_id", team.id);
    const current: Amounts = {};
    for (const row of live ?? []) current[row.asset_key] = Number(row.amount);
    const { next, total } = revalue(current);
    await db
      .from("allocations")
      .upsert(ASSET_KEYS.map((k) => ({ team_id: team.id, asset_key: k, amount: next[k]! })));
    await db
      .from("round_snapshots")
      .upsert({ team_id: team.id, round, total_value: total, allocation: next });
  }

  const { data: prevBench } = await db
    .from("benchmark_snapshots")
    .select("allocation")
    .eq("round", round - 1)
    .maybeSingle();
  if (prevBench) {
    const { next, total } = revalue(prevBench.allocation as Amounts);
    await db
      .from("benchmark_snapshots")
      .upsert({ round, total_value: total, allocation: next });
  }
  return true;
}

export const hostSettleRound = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertHost(context.userId);
    const { data: state } = await db.from("game_state").select("*").eq("id", 1).maybeSingle();
    if (!state) throw new Error("Game state missing");
    await settleRound(state.current_round);
    await db
      .from("game_state")
      .update({ status: "frozen", timer_ends_at: null, updated_at: new Date().toISOString() })
      .eq("id", 1);
    return { ok: true };
  });

export const hostAdvanceRound = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertHost(context.userId);
    const { data: state } = await db.from("game_state").select("*").eq("id", 1).maybeSingle();
    if (!state) throw new Error("Game state missing");
    const round = state.current_round;

    await settleRound(round);

    if (round >= TOTAL_ROUNDS) {
      await db
        .from("game_state")
        .update({ status: "complete", timer_ends_at: null, updated_at: new Date().toISOString() })
        .eq("id", 1);
      return { ok: true, round };
    }

    await db
      .from("game_state")
      .update({
        current_round: round + 1,
        status: "setup",
        timer_ends_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    return { ok: true, round: round + 1 };
  });

export const hostTriggerShock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { moves: Record<string, number> }) => input)
  .handler(async ({ data, context }) => {
    const db = await assertHost(context.userId);
    const { data: state } = await db.from("game_state").select("*").eq("id", 1).maybeSingle();
    if (!state) throw new Error("Game state missing");
    const round = state.current_round;

    const rows = Object.entries(data.moves)
      .filter(([k]) => ASSET_KEYS.includes(k as never))
      .map(([asset_key, pct]) => ({ round, asset_key, pct: Number(pct) || 0 }));
    if (rows.length) await db.from("price_moves").upsert(rows);

    await settleRound(round);
    await db
      .from("game_state")
      .update({ status: "frozen", timer_ends_at: null, updated_at: new Date().toISOString() })
      .eq("id", 1);
    return { ok: true };
  });

export const hostResetGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertHost(context.userId);
    await db.from("change_log").delete().gte("round", 0);
    await db.from("submissions").delete().gte("round", 0);
    await db.from("round_snapshots").delete().gt("round", 0);
    await db.from("benchmark_snapshots").delete().gt("round", 0);
    await db.from("news").delete().gte("round", 0);
    await db.from("price_moves").update({ pct: 0 }).gte("round", 0);

    const split = equalSplit(START_CAPITAL);
    const { data: teams } = await db.from("teams").select("id");
    for (const team of teams ?? []) {
      await db
        .from("allocations")
        .upsert(ASSET_KEYS.map((k) => ({ team_id: team.id, asset_key: k, amount: split[k]! })));
      await db
        .from("round_snapshots")
        .upsert({ team_id: team.id, round: 0, total_value: START_CAPITAL, allocation: split });
      await db.from("teams").update({ bonds_locked: false, bonds_change_round: null }).eq("id", team.id);
    }
    await db
      .from("game_state")
      .update({
        current_round: 1,
        status: "setup",
        timer_ends_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    return { ok: true };
  });
