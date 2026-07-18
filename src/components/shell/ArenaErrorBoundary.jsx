import { Component } from "react";
import { track } from "@/lib/telemetry";

// Scoped to the arena content area only — sidebar, top bar, and network
// banner all live outside this boundary and stay interactive if a route's
// content throws. Reset by remounting with a new `key` (App.jsx keys this
// by `product`, so switching arenas is itself a recovery path).
export class ArenaErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    track("arena_render_error", { message: String(error?.message ?? error) });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-16 text-center">
          <p className="text-base font-medium">This page couldn't load.</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Something went wrong rendering this section. Pick another destination from the sidebar, or try again.
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-1 rounded-lg bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
