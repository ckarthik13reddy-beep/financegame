import { createFileRoute } from "@tanstack/react-router";

import { useProfile, useSession } from "@/hooks/useGame";
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
  if (!profile.data)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-loss">Your account profile is unavailable.</span>
      </div>
    );
  return profile.data.role === "host" ? (
    <HostControlRoom profile={profile.data} />
  ) : (
    <TeamDesk profile={profile.data} />
  );
}
