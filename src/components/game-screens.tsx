import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  LockKeyhole,
  LogIn,
  Newspaper,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  hostAdvanceRound,
  hostPostNews,
  hostResetGame,
  hostSetBasePrice,
  hostSetBenchmarkWeights,
  hostSetPriceMoves,
  hostSetStatus,
  hostSettleRound,
  hostStartTimer,
  hostTriggerShock,
  submitAllocation,
} from "@/lib/game.functions";
import {
  ASSET_COLORS,
  ASSET_KEYS,
  ASSET_LABELS,
  DEFAULT_CREDENTIALS,
  MAX_MOVE_PER_ASSET,
  START_CAPITAL,
  TOTAL_ROUNDS,
  fmtMoney,
  fmtMoneyCompact,
  fmtPct,
} from "@/lib/game-constants";
import {
  useAllocations,
  useBenchmark,
  useAssets,
  useChangeLog,
  useCountdown,
  useGameState,
  useNews,
  usePerformance,
  usePriceMoves,
  useProfile,
  useSnapshots,
  useSubmissions,
  useTeams,
  useRealtimeGame,
  type Amounts,
  type Profile,
} from "@/hooks/useGame";
import {
  AssetDot,
  Countdown,
  Delta,
  Panel,
  StatusPill,
  Ticker,
  TopBar,
} from "@/components/game-ui";

const numberValue = (value: string | number | null | undefined) => Number(value ?? 0);
const emptyAmounts = () => Object.fromEntries(ASSET_KEYS.map((key) => [key, 0]));

export function LoginScreen() {
  const [username, setUsername] = useState("team1");
  const [password, setPassword] = useState(DEFAULT_CREDENTIALS[0].password);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const normalizedUsername = username.trim().toLowerCase();
    if (!["team1", "team2", "team3", "team4", "host"].includes(normalizedUsername)) {
      setBusy(false);
      setMessage("Use team1, team2, team3, team4, or host.");
      return;
    }
    const email = `${normalizedUsername}@tradingfloor.app`;
    let { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    let hasSession = !error;
    if (error?.message.toLowerCase().includes("invalid login credentials")) {
      const created = await supabase.auth.signUp({ email, password });
      error = created.error;
      hasSession = Boolean(created.data.session);
    }

    setBusy(false);
    if (error) {
      setMessage(
        error.message.toLowerCase().includes("email not confirmed")
          ? "This account exists but is still unconfirmed. In Supabase SQL Editor, run UPDATE auth.users SET email_confirmed_at = now() WHERE email IN ('team1@tradingfloor.app', 'team2@tradingfloor.app', 'team3@tradingfloor.app', 'team4@tradingfloor.app', 'host@tradingfloor.app'); Then retry login."
          : error.message,
      );
      return;
    }
    if (!hasSession) {
      setMessage(
        "The account was created, but Supabase requires email confirmation. In Supabase, open Authentication > Providers > Email, turn off Confirm email, then try again.",
      );
      return;
    }

    const bootstrapped = await supabase.rpc("bootstrap_demo_profile");
    if (bootstrapped.error) setMessage(bootstrapped.error.message);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden border border-border bg-panel shadow-panel lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative overflow-hidden border-b border-border p-8 sm:p-12 lg:border-b-0 lg:border-r">
          <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:32px_32px]" />
          <div className="relative">
            <p className="label-caps text-primary">Trading Floor / Simulation 2026</p>
            <h1 className="mt-8 max-w-lg text-4xl font-semibold leading-tight sm:text-6xl">
              Trade the signal. Defend the book.
            </h1>
            <p className="mt-6 max-w-md text-sm leading-6 text-muted-foreground">
              A live, round-based portfolio challenge. Read the tape, place your allocation, and
              outperform the market line.
            </p>
            <div className="mt-12 grid max-w-md grid-cols-3 gap-3">
              {["04", "06", "$10M"].map((value, index) => (
                <div key={value} className="border-l-2 border-primary/60 pl-3">
                  <p className="num text-xl font-semibold">{value}</p>
                  <p className="label-caps mt-1">{["Rounds", "Assets", "Move cap"][index]}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <form onSubmit={login} className="p-8 sm:p-12">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LogIn className="size-5" />
            </div>
            <div>
              <p className="label-caps">Secure access</p>
              <h2 className="text-xl font-semibold">Enter the floor</h2>
            </div>
          </div>
          <label className="label-caps mt-10 block">
            Desk ID
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-3 font-mono text-sm text-foreground outline-none focus:border-primary"
              placeholder="team1 or host"
              autoComplete="username"
            />
          </label>
          <label className="label-caps mt-5 block">
            Passcode
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-3 font-mono text-sm text-foreground outline-none focus:border-primary"
              autoComplete="current-password"
            />
          </label>
          {message && (
            <p className="mt-4 border border-loss/40 bg-loss/10 p-3 text-sm text-loss">{message}</p>
          )}
          <button
            disabled={busy}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? <RefreshCw className="size-4 animate-spin" /> : <LogIn className="size-4" />}
            {busy ? "Authenticating..." : "Enter trading floor"}
          </button>
          <div className="mt-8 border-t border-border pt-5">
            <p className="label-caps">Demo credentials</p>
            <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <span className="num">team1–team4 / T7!qL9#vR2@pX4</span>
              <span className="num">host / H4!mQ8#zR6@pL3</span>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

function AllocationDonut({ amounts, total }: { amounts: Amounts; total: number }) {
  let cursor = 0;
  const stops = ASSET_KEYS.map((key) => {
    const start = cursor;
    cursor += total ? (numberValue(amounts[key]) / total) * 100 : 0;
    return `${ASSET_COLORS[key]} ${start}% ${cursor}%`;
  });
  return (
    <div
      className="relative size-48 shrink-0 rounded-full"
      style={{ background: `conic-gradient(${stops.join(", ")})` }}
    >
      <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-panel">
        <span className="label-caps">Book value</span>
        <span className="num mt-1 text-xl font-semibold">{fmtMoneyCompact(total)}</span>
      </div>
    </div>
  );
}

export function TeamDesk({ profile }: { profile: Profile }) {
  useRealtimeGame();
  const state = useGameState();
  const teams = useTeams();
  const allocations = useAllocations();
  const assets = useAssets();
  const moves = usePriceMoves();
  const news = useNews();
  const submissions = useSubmissions();
  const snapshots = useSnapshots();
  const team = teams.data?.find((item) => item.team_number === profile.team_number);
  const live = useMemo(
    () => (team ? (allocations.data?.[team.id] ?? emptyAmounts()) : emptyAmounts()),
    [allocations.data, team],
  );
  const [draft, setDraft] = useState<Amounts>(live);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const { seconds } = useCountdown(state.data?.timer_ends_at);

  useEffect(() => setDraft(live), [live]);
  const currentRound = state.data?.current_round ?? 1;
  const total = ASSET_KEYS.reduce((sum, key) => sum + numberValue(draft[key]), 0);
  const base = snapshots.data?.find(
    (snapshot) => snapshot.team_id === team?.id && snapshot.round === currentRound - 1,
  );
  const submitted = submissions.data?.some(
    (item) => item.team_id === team?.id && item.round === currentRound,
  );
  const currentNews = news.data?.filter((item) => item.round <= currentRound).slice(0, 4) ?? [];
  const priceMoves = moves.data?.[currentRound] ?? {};
  const { data: benchmark } = useBenchmark();
  const benchmarkSnapshot = benchmark?.filter((item) => item.round <= currentRound).at(-1);
  const latestValue =
    numberValue(live[ASSET_KEYS[0]]) +
    ASSET_KEYS.slice(1).reduce((sum, key) => sum + numberValue(live[key]), 0);
  const previousValue = numberValue(base?.total_value ?? START_CAPITAL);
  const portfolioChange = latestValue - previousValue;
  const portfolioReturn = (latestValue - START_CAPITAL) / START_CAPITAL;
  const marketReturn =
    ((benchmarkSnapshot?.total_value ?? START_CAPITAL) - START_CAPITAL) / START_CAPITAL;
  const vsMarket = portfolioReturn - marketReturn;
  const bondsLocked = Boolean(team?.bonds_locked);
  const bondsChanged =
    currentRound > 1 &&
    Math.abs(numberValue(draft.bonds) - numberValue(base?.allocation.bonds)) > 1;
  const capExceeded = ASSET_KEYS.some(
    (key) =>
      Math.abs(numberValue(draft[key]) - numberValue(base?.allocation[key])) >
      MAX_MOVE_PER_ASSET + 1,
  );
  const isSurprise = currentRound >= TOTAL_ROUNDS;
  const timerExpired = seconds !== null && seconds <= 0;
  const isOpen = state.data?.status === "open" && !submitted && !isSurprise && !timerExpired;
  const [confirmBonds, setConfirmBonds] = useState(false);

  async function submit() {
    if (!team) return;
    if (bondsChanged && !bondsLocked && !confirmBonds) {
      setConfirmBonds(true);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await submitAllocation({ data: { amounts: draft } });
      setMessage("Allocation submitted. Your desk is locked for this round.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit allocation");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen">
      <TopBar eyebrow={`Team ${profile.team_number} / Live desk`} title={profile.display_name}>
        <StatusPill status={state.data?.status ?? "setup"} />
        <div className="flex items-center gap-2 border-l border-border pl-4">
          <span className="label-caps">Round {state.data?.current_round ?? "-"}</span>
          <Countdown seconds={seconds} />
        </div>
      </TopBar>
      <Ticker moves={priceMoves} />
      <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-5 sm:px-6">
        <div className="grid gap-5 xl:grid-cols-[1.45fr_0.8fr]">
          <div className="space-y-5">
            {isSurprise ? (
              <Panel className="border-warn/50 bg-warn/5">
                <div className="flex items-center gap-3">
                  <LockKeyhole className="size-5 text-warn" />
                  <div>
                    <p className="label-caps text-warn">Round 4 / Surprise event</p>
                    <h2 className="mt-1 text-xl font-semibold">Positions Frozen</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      No trades are allowed. Watch the host reveal the final price shock.
                    </p>
                  </div>
                </div>
              </Panel>
            ) : (
              <Panel
                title="Allocation desk"
                action={
                  <span className="num text-xs text-muted-foreground">
                    Target {fmtMoney(base?.total_value ?? START_CAPITAL)}
                  </span>
                }
              >
                <div className="flex flex-col items-center gap-7 md:flex-row">
                  <AllocationDonut amounts={draft} total={total} />
                  <div className="grid w-full gap-3 sm:grid-cols-2">
                    {ASSET_KEYS.map((key) => {
                      const lockedBond = key === "bonds" && bondsLocked;
                      return (
                        <label key={key} className="border border-border/70 bg-background/30 p-3">
                          <span className="flex items-center gap-2 text-xs font-medium">
                            <AssetDot assetKey={key} />
                            {ASSET_LABELS[key]}
                            {lockedBond && <span className="ml-auto text-warn">🔒 Locked</span>}
                          </span>
                          <div className="mt-3 flex items-center gap-2">
                            <span className="num text-muted-foreground">$</span>
                            <input
                              disabled={!isOpen || lockedBond}
                              type="number"
                              min="0"
                              step="1000"
                              value={Math.round(numberValue(draft[key]))}
                              onChange={(event) =>
                                setDraft((current) => ({
                                  ...current,
                                  [key]: Number(event.target.value),
                                }))
                              }
                              className="num w-full bg-transparent text-right text-sm outline-none disabled:opacity-50"
                            />
                          </div>
                          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                            <span>{fmtPct(total ? numberValue(draft[key]) / total : 0)}</span>
                            <span
                              className={
                                Math.abs(
                                  numberValue(draft[key]) - numberValue(base?.allocation[key]),
                                ) >
                                MAX_MOVE_PER_ASSET + 1
                                  ? "text-loss"
                                  : ""
                              }
                            >
                              Move{" "}
                              {fmtMoneyCompact(
                                numberValue(draft[key]) - numberValue(base?.allocation[key]),
                              )}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <div>
                    <span className="label-caps">Unallocated / over-allocated</span>
                    <p
                      className={`num mt-1 text-lg ${Math.abs(total - numberValue(base?.total_value ?? START_CAPITAL)) <= 1 ? "text-gain" : "text-loss"}`}
                    >
                      {fmtMoney(numberValue(base?.total_value ?? START_CAPITAL) - total)}
                    </p>
                  </div>
                  <button
                    onClick={submit}
                    disabled={
                      !isOpen ||
                      busy ||
                      capExceeded ||
                      Math.abs(total - numberValue(base?.total_value ?? START_CAPITAL)) > 1
                    }
                    className="rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy ? "Submitting..." : submitted ? "Submitted" : "Submit allocation"}
                  </button>
                </div>
                {(capExceeded || timerExpired) && (
                  <p className="mt-4 border border-loss/40 bg-loss/10 p-3 text-sm text-loss">
                    {timerExpired
                      ? "Time is up. This desk is locked until the host advances the round."
                      : "One or more assets exceeds the $10M movement cap."}
                  </p>
                )}
                {message && (
                  <p className="mt-4 border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
                    {message}
                  </p>
                )}
                {confirmBonds && (
                  <div className="mt-4 border border-warn/50 bg-warn/10 p-4">
                    <p className="text-sm font-semibold text-warn">
                      This is your only Bonds adjustment. Confirm?
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      After submitting, Bonds will be read-only for the rest of the game.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setConfirmBonds(false)}
                        className="rounded-md border border-border px-3 py-2 text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setConfirmBonds(false);
                          void submit();
                        }}
                        className="rounded-md bg-warn px-3 py-2 text-xs font-semibold text-background"
                      >
                        Confirm Bonds lock
                      </button>
                    </div>
                  </div>
                )}
              </Panel>
            )}
            <Panel title="Market intelligence">
              <div className="space-y-3">
                {currentNews.length ? (
                  currentNews.map((item) => (
                    <article
                      key={item.round}
                      className="border-b border-border/60 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-medium">{item.headline}</h3>
                        <span className="label-caps">R{item.round}</span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.body}</p>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No intelligence has been posted for this round.
                  </p>
                )}
              </div>
            </Panel>
          </div>
          <div className="space-y-5">
            <Panel title="Desk summary">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="label-caps">Portfolio</p>
                  <p className="num mt-2 text-2xl font-semibold">{fmtMoneyCompact(latestValue)}</p>
                </div>
                <div>
                  <p className="label-caps">Vs. market</p>
                  <p
                    className={`num mt-2 text-2xl font-semibold ${vsMarket >= 0 ? "text-gain" : "text-loss"}`}
                  >
                    {fmtPct(vsMarket)}
                  </p>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Since last round:{" "}
                <Delta
                  value={portfolioChange}
                  pct={previousValue ? portfolioChange / previousValue : 0}
                  size="sm"
                />
              </div>
              <div className="mt-6 space-y-3">
                {ASSET_KEYS.map((key) => (
                  <div key={key} className="flex items-center gap-3 text-sm">
                    <AssetDot assetKey={key} />
                    <span className="flex-1">{ASSET_LABELS[key]}</span>
                    <span className="num text-muted-foreground">
                      {fmtMoneyCompact(numberValue(draft[key]))}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Portfolio history">
              <TeamPerformanceChart
                snapshots={snapshots.data?.filter((item) => item.team_id === team?.id) ?? []}
                benchmark={benchmark ?? []}
              />
            </Panel>
            <Panel title="Round protocol">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p className="flex gap-2">
                  <ShieldCheck className="size-4 shrink-0 text-primary" />
                  You may move up to $10M in or out of each asset.
                </p>
                <p className="flex gap-2">
                  <LockKeyhole className="size-4 shrink-0 text-warn" />
                  Bonds become locked after changing them after round one.
                </p>
                <p className="flex gap-2">
                  <TrendingUp className="size-4 shrink-0 text-gain" />
                  Your book is revalued when the host settles the round.
                </p>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="label-caps">{label}</p>
      <p className={`num mt-2 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function TeamPerformanceChart({
  snapshots,
  benchmark,
}: {
  snapshots: Array<{ round: number; total_value: number }>;
  benchmark: Array<{ round: number; total_value: number }>;
}) {
  const values = [
    ...snapshots.map((item) => item.total_value),
    ...benchmark.map((item) => item.total_value),
    START_CAPITAL,
  ];
  const min = Math.min(...values) * 0.995;
  const max = Math.max(...values) * 1.005;
  const point = (round: number, value: number) =>
    `${18 + round * 76},${88 - ((value - min) / (max - min || 1)) * 68}`;
  return (
    <div>
      <svg
        viewBox="0 0 330 100"
        className="h-36 w-full"
        preserveAspectRatio="none"
        aria-label="Portfolio history"
      >
        <line x1="18" y1="88" x2="322" y2="88" stroke="var(--border)" />
        <polyline
          points={snapshots.map((item) => point(item.round, item.total_value)).join(" ")}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="3"
        />
        <polyline
          points={benchmark.map((item) => point(item.round, item.total_value)).join(" ")}
          fill="none"
          stroke="var(--muted-foreground)"
          strokeDasharray="5 4"
          strokeWidth="2"
        />
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>R0</span>
        <span>R1</span>
        <span>R2</span>
        <span>R3</span>
        <span>R4</span>
      </div>
    </div>
  );
}

export function HostControlRoom({ profile }: { profile: Profile }) {
  useRealtimeGame();
  const state = useGameState();
  const teams = useTeams();
  const allocations = useAllocations();
  const submissions = useSubmissions();
  const performance = usePerformance();
  const changeLog = useChangeLog();
  const [tab, setTab] = useState<"control" | "market">("control");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [timer, setTimer] = useState(String(state.data?.timer_seconds ?? 300));
  const [shockMoves, setShockMoves] = useState<Record<string, number>>({ crypto: 20 });

  useEffect(() => {
    if (state.data?.timer_seconds) setTimer(String(state.data.timer_seconds));
  }, [state.data?.timer_seconds]);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Command failed");
    } finally {
      setBusy(false);
    }
  }
  const currentRound = state.data?.current_round ?? 1;
  const ranked = (teams.data ?? [])
    .map((team) => ({
      ...team,
      total: performance.byTeam[team.id]?.at(-1)?.value ?? START_CAPITAL,
      series: performance.byTeam[team.id] ?? [],
      submitted: submissions.data?.some(
        (item) => item.team_id === team.id && item.round === currentRound,
      ),
    }))
    .sort((a, b) => b.total - a.total);
  const latestBenchmark = performance.latestBench;

  return (
    <main className="min-h-screen">
      <TopBar eyebrow="Host / Control room" title="Market Operations">
        <StatusPill status={state.data?.status ?? "setup"} />
        <span className="label-caps">
          Round {currentRound} / {TOTAL_ROUNDS}
        </span>
      </TopBar>
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
        <nav className="mb-5 flex gap-2 border-b border-border">
          <button
            onClick={() => setTab("control")}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm ${tab === "control" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >
            <BarChart3 className="size-4" />
            Control room
          </button>
          <button
            onClick={() => setTab("market")}
            className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm ${tab === "market" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >
            <Settings2 className="size-4" />
            Market data editor
          </button>
        </nav>
        {tab === "market" ? (
          <MarketEditor round={currentRound} busy={busy} run={run} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Panel>
                <Metric label="Market line" value={fmtMoneyCompact(latestBenchmark)} />
                <p className="mt-2 text-xs text-muted-foreground">Benchmark latest settled value</p>
              </Panel>
              <Panel>
                <Metric
                  label="Submissions"
                  value={`${ranked.filter((team) => team.submitted).length} / ${ranked.length}`}
                />
                <p className="mt-2 text-xs text-muted-foreground">Round {currentRound} received</p>
              </Panel>
              <Panel>
                <Metric
                  label="Timer"
                  value={state.data?.timer_ends_at ? "Running" : "Standby"}
                  tone={state.data?.timer_ends_at ? "text-gain" : "text-muted-foreground"}
                />
                <p className="mt-2 text-xs text-muted-foreground">Shared with every desk</p>
              </Panel>
            </div>
            <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_1fr]">
              <Panel
                title="Live leaderboard"
                action={<span className="label-caps">Auto-refresh</span>}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="label-caps">
                      <tr>
                        <th className="pb-3">Rank</th>
                        <th className="pb-3">Desk</th>
                        <th className="pb-3">Value</th>
                        <th className="pb-3">vs market</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranked.map((team, index) => (
                        <tr key={team.id} className="border-t border-border/60">
                          <td className="num py-3 text-muted-foreground">0{index + 1}</td>
                          <td className="py-3 font-medium">{team.name}</td>
                          <td className="num py-3">{fmtMoneyCompact(team.total)}</td>
                          <td className="py-3">
                            <Delta value={team.total - latestBenchmark} size="sm" />
                          </td>
                          <td className="py-3">
                            <span className={team.submitted ? "text-gain" : "text-warn"}>
                              {team.submitted ? "Submitted" : "Thinking"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
              <Panel title="Performance comparison">
                <PerformanceChart teams={ranked} benchmark={performance.bench} />
              </Panel>
            </div>
            <div className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
              <Panel title="Round controls">
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(() => hostSetStatus({ data: { status: "open" } }), "Round opened")
                    }
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    Start round
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(() => hostSetStatus({ data: { status: "frozen" } }), "Round frozen")
                    }
                    className="rounded-md border border-warn/50 px-4 py-2 text-sm text-warn"
                  >
                    Freeze early
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => run(() => hostSettleRound({}), "Round settled")}
                    className="rounded-md border border-warn/50 px-4 py-2 text-sm text-warn"
                  >
                    Settle
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => run(() => hostAdvanceRound({}), "Advanced to next round")}
                    className="rounded-md border border-border px-4 py-2 text-sm"
                  >
                    Advance
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => run(() => hostResetGame({}), "Game reset")}
                    className="rounded-md border border-loss/50 px-4 py-2 text-sm text-loss"
                  >
                    Reset
                  </button>
                </div>
                <div className="mt-5 flex gap-2">
                  <input
                    value={timer}
                    onChange={(event) => setTimer(event.target.value)}
                    type="number"
                    min="10"
                    max="3600"
                    className="num w-28 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => hostStartTimer({ data: { seconds: Number(timer) } }),
                        "Timer started",
                      )
                    }
                    className="rounded-md border border-primary/50 px-4 py-2 text-sm text-primary"
                  >
                    Start timer
                  </button>
                </div>
                <div className="mt-5 border-t border-border pt-4">
                  <p className="label-caps">Trigger price shock / Round {currentRound}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {ASSET_KEYS.map((key) => (
                      <label key={key} className="text-xs text-muted-foreground">
                        {ASSET_LABELS[key]}
                        <input
                          type="number"
                          step="0.1"
                          value={shockMoves[key] ?? 0}
                          onChange={(event) =>
                            setShockMoves((current) => ({
                              ...current,
                              [key]: Number(event.target.value),
                            }))
                          }
                          className="num mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-right text-xs"
                        />
                      </label>
                    ))}
                  </div>
                  <button
                    disabled={busy || currentRound !== TOTAL_ROUNDS}
                    onClick={() =>
                      run(
                        () => hostTriggerShock({ data: { moves: shockMoves } }),
                        "Shock applied and round frozen",
                      )
                    }
                    className="mt-3 rounded-md bg-loss px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
                  >
                    Trigger shock & freeze
                  </button>
                </div>
                {message && (
                  <p className="mt-4 border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
                    {message}
                  </p>
                )}
              </Panel>
              <Panel title="Desk drill-down">
                <div className="space-y-3">
                  {ranked.map((team) => (
                    <details key={team.id} className="border border-border/60 p-3">
                      <summary className="cursor-pointer list-none">
                        <div className="flex justify-between text-sm">
                          <span>{team.name}</span>
                          <span className="num">{fmtMoneyCompact(team.total)}</span>
                        </div>
                      </summary>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                        {Object.entries(allocations.data?.[team.id] ?? {}).map(([key, amount]) => (
                          <span key={key}>
                            <span
                              className="mr-1 inline-block size-1.5 rounded-full"
                              style={{ background: ASSET_COLORS[key as keyof typeof ASSET_COLORS] }}
                            />
                            {ASSET_LABELS[key as keyof typeof ASSET_LABELS] ?? key}{" "}
                            {fmtMoneyCompact(numberValue(amount))}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                        <p className="label-caps mb-2">Change log</p>
                        {changeLog.data
                          ?.filter((entry) => entry.team_id === team.id)
                          .slice(0, 8)
                          .map((entry) => (
                            <p key={entry.id} className="flex justify-between py-1">
                              <span>
                                R{entry.round} ·{" "}
                                {ASSET_LABELS[entry.asset_key as keyof typeof ASSET_LABELS] ??
                                  entry.asset_key}
                              </span>
                              <Delta value={entry.delta} size="sm" />
                            </p>
                          ))}
                      </div>
                    </details>
                  ))}
                </div>
              </Panel>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function PerformanceChart({
  teams,
  benchmark,
}: {
  teams: Array<{
    id: string;
    name: string;
    total: number;
    series: Array<{ round: number; value: number }>;
  }>;
  benchmark: Array<{ round: number; value: number }>;
}) {
  const allValues = [
    ...benchmark.map((item) => item.value),
    ...teams.map((team) => team.total),
    START_CAPITAL,
  ];
  const min = Math.min(...allValues) * 0.995;
  const max = Math.max(...allValues) * 1.005;
  const point = (round: number, value: number) =>
    `${20 + round * 75},${92 - ((value - min) / (max - min || 1)) * 76}`;
  return (
    <div>
      <svg
        viewBox="0 0 360 110"
        className="h-56 w-full"
        preserveAspectRatio="none"
        aria-label="Portfolio performance comparison"
      >
        <line x1="20" y1="92" x2="340" y2="92" stroke="var(--border)" />
        <line x1="20" y1="16" x2="20" y2="92" stroke="var(--border)" />
        {benchmark.length > 0 && (
          <polyline
            points={benchmark.map((item) => point(item.round, item.value)).join(" ")}
            fill="none"
            stroke="var(--muted-foreground)"
            strokeDasharray="5 4"
            strokeWidth="2"
          />
        )}
        {teams.map((team, index) => (
          <polyline
            key={team.id}
            points={(team.series.length ? team.series : [{ round: 0, value: START_CAPITAL }])
              .map((item) => point(item.round, item.value))
              .join(" ")}
            fill="none"
            stroke={
              [
                "var(--asset-tech)",
                "var(--asset-gold)",
                "var(--asset-emerging)",
                "var(--asset-crypto)",
              ][index % 4]
            }
            strokeWidth="3"
          />
        ))}
      </svg>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>
          <i className="mr-1 inline-block size-2 rounded-full bg-muted-foreground" />
          Market
        </span>
        {teams.map((team, index) => (
          <span key={team.id}>
            <i
              className="mr-1 inline-block size-2 rounded-full"
              style={{
                background: [
                  "var(--asset-tech)",
                  "var(--asset-gold)",
                  "var(--asset-emerging)",
                  "var(--asset-crypto)",
                ][index % 4],
              }}
            />
            {team.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function MarketEditor({
  round,
  busy,
  run,
}: {
  round: number;
  busy: boolean;
  run: (action: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const assets = useAssets();
  const moves = usePriceMoves();
  const news = useNews();
  const [selectedRound, setSelectedRound] = useState(round);
  const [moveDraft, setMoveDraft] = useState<Record<string, number>>({});
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  useEffect(() => {
    const nextMoves = moves.data?.[selectedRound] ?? {};
    setMoveDraft(nextMoves);
  }, [moves.data, selectedRound]);
  useEffect(() => {
    const nextWeights: Record<string, number> = {};
    const nextPrices: Record<string, number> = {};
    for (const asset of assets.data ?? []) {
      nextWeights[asset.key] = asset.benchmark_weight;
      nextPrices[asset.key] = asset.base_price;
    }
    setWeights(nextWeights);
    setPrices(nextPrices);
  }, [assets.data]);
  const weightTotal = Object.values(weights).reduce((sum, value) => sum + numberValue(value), 0);
  const previewTotal =
    START_CAPITAL *
    ASSET_KEYS.reduce(
      (sum, key) =>
        sum + (numberValue(weights[key]) / 100) * (1 + numberValue(moveDraft[key]) / 100),
      0,
    );
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Panel
        title="Price moves by round"
        action={
          <div className="flex items-center gap-2">
            <select
              value={selectedRound}
              onChange={(event) => setSelectedRound(Number(event.target.value))}
              className="rounded-md border border-input bg-background px-2 py-2 text-xs"
            >
              {Array.from({ length: TOTAL_ROUNDS }, (_, index) => index + 1).map((item) => (
                <option key={item} value={item}>
                  Round {item}
                </option>
              ))}
            </select>
            <button
              disabled={busy}
              onClick={() =>
                run(
                  () => hostSetPriceMoves({ data: { round: selectedRound, moves: moveDraft } }),
                  "Price moves saved",
                )
              }
              className="flex items-center gap-2 rounded-md border border-primary/50 px-3 py-2 text-xs text-primary"
            >
              <Save className="size-3.5" />
              Save moves
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {ASSET_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-3">
              <AssetDot assetKey={key} />
              <span className="flex-1 text-sm">{ASSET_LABELS[key]}</span>
              <input
                type="number"
                step="0.01"
                value={moveDraft[key] ?? 0}
                onChange={(event) =>
                  setMoveDraft((current) => ({ ...current, [key]: Number(event.target.value) }))
                }
                className="num w-28 rounded-md border border-input bg-background px-3 py-2 text-right text-sm"
              />
              <span className="num w-8 text-muted-foreground">%</span>
            </label>
          ))}
        </div>
        <div className="mt-5 border-t border-border pt-4">
          <p className="label-caps">Hypothetical equal/weighted book preview</p>
          <p className="num mt-2 text-2xl font-semibold">{fmtMoney(previewTotal)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Projected value after Round {selectedRound} moves using the current benchmark mix.
          </p>
        </div>
      </Panel>
      <Panel
        title="Benchmark mix"
        action={
          <button
            disabled={busy || Math.abs(weightTotal - 100) > 0.05}
            onClick={() =>
              run(() => hostSetBenchmarkWeights({ data: { weights } }), "Benchmark weights saved")
            }
            className="flex items-center gap-2 rounded-md border border-primary/50 px-3 py-2 text-xs text-primary"
          >
            <Save className="size-3.5" />
            Save mix
          </button>
        }
      >
        <div className="mb-4 flex justify-between text-sm">
          <span className="text-muted-foreground">Total weight</span>
          <span className={`num ${Math.abs(weightTotal - 100) < 0.05 ? "text-gain" : "text-loss"}`}>
            {weightTotal.toFixed(2)}%
          </span>
        </div>
        <div className="space-y-3">
          {ASSET_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-3">
              <AssetDot assetKey={key} />
              <span className="flex-1 text-sm">{ASSET_LABELS[key]}</span>
              <input
                type="number"
                step="0.01"
                value={weights[key] ?? 0}
                onChange={(event) =>
                  setWeights((current) => ({ ...current, [key]: Number(event.target.value) }))
                }
                className="num w-28 rounded-md border border-input bg-background px-3 py-2 text-right text-sm"
              />
              <span className="num w-8 text-muted-foreground">%</span>
            </label>
          ))}
        </div>
      </Panel>
      <Panel title="Base prices">
        <div className="space-y-3">
          {ASSET_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-3">
              <AssetDot assetKey={key} />
              <span className="flex-1 text-sm">{ASSET_LABELS[key]}</span>
              <input
                type="number"
                value={prices[key] ?? 0}
                onChange={(event) =>
                  setPrices((current) => ({ ...current, [key]: Number(event.target.value) }))
                }
                className="num w-32 rounded-md border border-input bg-background px-3 py-2 text-right text-sm"
              />
              <button
                disabled={busy}
                onClick={() =>
                  run(
                    () => hostSetBasePrice({ data: { key, basePrice: prices[key] ?? 0 } }),
                    `${ASSET_LABELS[key]} price saved`,
                  )
                }
                className="rounded-md border border-border p-2 text-muted-foreground hover:text-foreground"
              >
                <Save className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Publish round news">
        <div className="space-y-3">
          <input
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
            placeholder="Headline"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Brief the desks..."
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="Optional image or tweet URL"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            disabled={busy || !headline.trim()}
            onClick={() =>
              run(
                () => hostPostNews({ data: { round, headline, body, imageUrl } }),
                "News published",
              )
            }
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Newspaper className="size-4" />
            Publish news
          </button>
        </div>
        <div className="mt-5 border-t border-border pt-4">
          {news.data?.slice(0, 3).map((item) => (
            <div key={item.round} className="border-b border-border/60 py-2 last:border-0">
              <p className="text-sm">
                R{item.round} · {item.headline}
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
