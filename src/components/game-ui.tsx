import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  ASSET_COLORS,
  ASSET_KEYS,
  ASSET_LABELS,
  ROUND_STATUS_LABEL,
  fmtClock,
  fmtPct,
  type AssetKey,
} from "@/lib/game-constants";

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel p-4 sm:p-5", className)}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="label-caps">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "open"
      ? "text-gain border-gain/40 bg-gain/10"
      : status === "frozen"
        ? "text-warn border-warn/40 bg-warn/10"
        : status === "complete"
          ? "text-primary border-primary/40 bg-primary/10"
          : "text-muted-foreground border-border bg-secondary/60";
  return (
    <span className={cn("num rounded-full border px-3 py-1 text-[11px] tracking-widest uppercase", tone)}>
      {status === "open" && <span className="live-dot mr-2 inline-block size-1.5 rounded-full bg-gain" />}
      {ROUND_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function Countdown({ seconds }: { seconds: number | null }) {
  if (seconds === null) return <span className="num text-muted-foreground">--:--</span>;
  const danger = seconds <= 30;
  return (
    <span
      className={cn(
        "num text-2xl font-semibold tabular-nums transition-colors",
        danger ? "text-loss" : "text-primary",
      )}
    >
      {fmtClock(seconds)}
    </span>
  );
}

export function Delta({
  value,
  pct,
  className,
  size = "md",
}: {
  value?: number | null;
  pct?: number | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const basis = value ?? pct ?? 0;
  const tone = basis > 0.0001 ? "text-gain" : basis < -0.0001 ? "text-loss" : "text-muted-foreground";
  const sizes = { sm: "text-xs", md: "text-sm", lg: "text-xl" }[size];
  return (
    <span className={cn("num font-semibold", tone, sizes, className)}>
      {value !== undefined && value !== null && (
        <>
          {value >= 0 ? "+" : "-"}$
          {Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </>
      )}
      {value !== undefined && value !== null && pct !== undefined && pct !== null && " · "}
      {pct !== undefined && pct !== null && fmtPct(pct)}
    </span>
  );
}

/** Flashes green/red whenever the number moves. */
export function FlashValue({ value, children }: { value: number; children: ReactNode }) {
  const prev = useRef(value);
  const [flash, setFlash] = useState<"" | "flash-gain" | "flash-loss">("");

  useEffect(() => {
    if (Math.abs(value - prev.current) > 0.01) {
      setFlash(value > prev.current ? "flash-gain" : "flash-loss");
      const id = window.setTimeout(() => setFlash(""), 950);
      prev.current = value;
      return () => window.clearTimeout(id);
    }
    prev.current = value;
  }, [value]);

  return <span className={cn("inline-block rounded px-1", flash)}>{children}</span>;
}

export function AssetDot({ assetKey }: { assetKey: AssetKey }) {
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-sm"
      style={{ backgroundColor: ASSET_COLORS[assetKey] }}
    />
  );
}

export function TopBar({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-lg">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <div className="mr-auto">
          <p className="label-caps">{eyebrow}</p>
          <h1 className="text-lg font-semibold sm:text-xl">{title}</h1>
        </div>
        {children}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/" });
          }}
          className="num inline-flex items-center gap-2 rounded-md border border-border bg-secondary/60 px-3 py-2 text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <LogOut className="size-3.5" /> Exit
        </button>
      </div>
    </header>
  );
}

export function Ticker({ moves }: { moves: Record<string, number> }) {
  const items = ASSET_KEYS.map((k) => ({ key: k, label: ASSET_LABELS[k], pct: moves[k] ?? 0 }));
  const row = [...items, ...items];
  return (
    <div className="overflow-hidden border-b border-border/70 bg-panel/70">
      <div className="ticker-track py-2">
        {row.map((item, i) => (
          <span key={`${item.key}-${i}`} className="num mx-6 text-xs tracking-wider uppercase">
            <span className="text-muted-foreground">{item.label}</span>{" "}
            <span
              className={
                item.pct > 0 ? "text-gain" : item.pct < 0 ? "text-loss" : "text-muted-foreground"
              }
            >
              {fmtPct(item.pct)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
