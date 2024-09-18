import type { HistoryManager, HistoryEntry } from "../history";
import type { ViewConfig } from "../config";

function getResetType(entry: HistoryEntry, history: HistoryManager) {
    const [milestoneID] = entry.milestones[entry.milestones.length - 1];
    return history.getMilestone(milestoneID);
}

function shouldIncludeRun(entry: HistoryEntry, view: ViewConfig, history: HistoryManager) {
    if (view.universe !== undefined && entry.universe !== view.universe) {
        return false;
    }

    if (getResetType(entry, history) !== view.resetType) {
        return false;
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
