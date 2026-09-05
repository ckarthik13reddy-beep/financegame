export const START_CAPITAL = 100_000_000;
export const MAX_MOVE_PER_ASSET = 10_000_000;
export const TOTAL_ROUNDS = 4;
export const EMAIL_DOMAIN = "tradingfloor.app";

export type AssetKey = "gold" | "bonds" | "energy" | "crypto" | "emerging" | "tech";

export const ASSET_KEYS: AssetKey[] = ["gold", "bonds", "energy", "crypto", "emerging", "tech"];

export const ASSET_LABELS: Record<AssetKey, string> = {
  gold: "Gold",
  bonds: "Bonds",
  energy: "Energy",
  crypto: "Crypto",
  emerging: "Emerging Markets",
  tech: "Tech Stocks",
};

export const ASSET_COLORS: Record<AssetKey, string> = {
  gold: "var(--asset-gold)",
  bonds: "var(--asset-bonds)",
  energy: "var(--asset-energy)",
  crypto: "var(--asset-crypto)",
  emerging: "var(--asset-emerging)",
  tech: "var(--asset-tech)",
};

export const TEAM_COLORS = ["#22d3ee", "#f59e0b", "#a3e635", "#f472b6"];
export const BENCHMARK_COLOR = "#94a3b8";

export const ROUND_STATUS_LABEL: Record<string, string> = {
  setup: "Setup",
  open: "Open for Trading",
  frozen: "Frozen",
  complete: "Complete",
};

export const DEFAULT_CREDENTIALS = [
  { username: "team1", password: "trade2026", label: "Team 1" },
  { username: "team2", password: "trade2026", label: "Team 2" },
  { username: "team3", password: "trade2026", label: "Team 3" },
  { username: "team4", password: "trade2026", label: "Team 4" },
  { username: "host", password: "host2026", label: "Host" },
];

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const moneyCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});

export function fmtMoney(n: number) {
  return money.format(n);
}

export function fmtMoneyCompact(n: number) {
  return moneyCompact.format(n);
}

export function fmtSigned(n: number) {
  return `${n >= 0 ? "+" : "-"}${money.format(Math.abs(n))}`;
}

export function fmtPct(n: number, digits = 2) {
  return `${n >= 0 ? "+" : "-"}${Math.abs(n).toFixed(digits)}%`;
}

export function fmtClock(secs: number) {
  const s = Math.max(0, Math.floor(secs));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
