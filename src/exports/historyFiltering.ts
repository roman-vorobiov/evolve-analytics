import type { HistoryManager, HistoryEntry } from "../history";
import type { ViewConfig } from "../config";

function getResetType(entry: HistoryEntry, history: HistoryManager) {
    const [milestoneID] = entry.milestones[entry.milestones.length - 1];
    const milestone = history.getMilestone(milestoneID);

    const prefix = "reset:";
    if (milestone.startsWith(prefix)) {
        return milestone.slice(prefix.length);
    }
}

export function shouldIncludeRun(entry: HistoryEntry, view: ViewConfig, history: HistoryManager) {
    if (view.universe !== undefined && entry.universe !== view.universe) {
        return false;
    }

    if (getResetType(entry, history) !== view.resetType) {
        return false;
    }

    // Don't show VC runs in generic Black Hole views
    if (view.resetType === "blackhole" && view.universe === undefined) {
        return entry.universe !== "magic";
    }

    return true;
}

export function applyFilters(history: HistoryManager, view: ViewConfig): HistoryEntry[] {
    const runs: HistoryEntry[] = [];

    for (let i = history.runs.length - 1; i >= 0; --i) {
        const run = history.runs[i];

        if (shouldIncludeRun(run, view, history)) {
            runs.push(run);
        }

        if (view.numRuns !== undefined && runs.length >= view.numRuns) {
            break;
        }
    }

    return runs.reverse();
}
