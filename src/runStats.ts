import { getResetCounts } from "./gameUtils";

export type RunStats = {
    run: number,
    universe: string,
    resets: Record<string, number>,
    totalDays: number,
    milestones: Record<string, number>
}

const lastRunStorageKey = "sneed.analytics.latest";

export function loadLastRun(): RunStats {
    return JSON.parse(localStorage.getItem(lastRunStorageKey));
}

export function saveLastRun(runStats: RunStats) {
    localStorage.setItem(lastRunStorageKey, JSON.stringify(runStats));
}

export function discardLastRun() {
    localStorage.removeItem(lastRunStorageKey);
}

export function inferResetType(runStats: RunStats) {
    const resetCounts = getResetCounts();

    // Find which reset got incremented
    const reset = Object.keys(resetCounts).find(reset => {
        return resetCounts[reset] === (runStats.resets[reset] ?? 0) + 1;
    });

    // The game does not differentiate between Black Hole and Vacuum Collapse resets
    if (reset === "Black Hole" && runStats.universe === "magic") {
        return "Vacuum Collapse";
    }
    else {
        return reset ?? "Unknown";
    }
}
