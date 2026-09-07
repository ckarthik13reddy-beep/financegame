import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { useProfile, useSession } from "@/hooks/useGame";
import { supabase } from "@/integrations/supabase/client";
import { HostControlRoom, LoginScreen, TeamDesk } from "@/components/game-screens";

// No head() here: the home route inherits title/description/og/twitter from
// __root.tsx, and ships no og:image so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const session = useSession();
  const profile = useProfile(session.userId);

  if (!session.ready || (session.userId && profile.isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="num text-sm text-muted-foreground">Connecting to the floor...</span>
      </div>
    );
  }
  if (!session.userId) return <LoginScreen />;
  if (!profile.data) {
    return <ProfileRecovery error={profile.error} />;
  }
  return profile.data.role === "host" ? (
    <HostControlRoom profile={profile.data} />
  ) : (
    <TeamDesk profile={profile.data} />
  );
}

function ProfileRecovery({ error }: { error: Error | null }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function recover() {
    setBusy(true);
    setMessage("");
    const result = await supabase.rpc("bootstrap_demo_profile");
    if (result.error) {
      setMessage(result.error.message);
    } else {
      window.location.reload();
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="panel w-full max-w-lg p-6">
        <p className="label-caps text-loss">Authenticated, profile missing</p>
        <h1 className="mt-2 text-xl font-semibold">
          Your account is signed in, but not initialized.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Run the profile setup once. If it fails, the exact database error appears below.
        </p>
        {(message || error) && (
          <pre className="mt-4 overflow-auto whitespace-pre-wrap border border-loss/40 bg-loss/10 p-3 text-xs text-loss">
            {message || error?.message}
          </pre>
        )}
        <button
          onClick={recover}
          disabled={busy}
          className="mt-5 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Initializing..." : "Initialize account profile"}
        </button>
        <button
          onClick={() => supabase.auth.signOut()}
          className="ml-3 rounded-md border border-border px-4 py-3 text-sm text-muted-foreground"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
