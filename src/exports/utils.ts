
import { shouldIncludeRun } from "./historyFiltering";
import { HistoryManager } from "../history";
import { isEffectMilestone } from "../milestones";
import type { RunHistory, HistoryEntry } from "../history";
import type { ViewConfig } from "../config";

export function runTime(entry: HistoryEntry) {
    return entry.milestones[entry.milestones.length - 1]?.[1];
}

function findBestRunImpl(history: HistoryManager, view: ViewConfig): HistoryEntry | undefined {
    let best: HistoryEntry | undefined = undefined;

    for (const run of history.runs) {
        if (!shouldIncludeRun(run, view, history)) {
            continue;
        }

        if (best === undefined || runTime(run) < runTime(best)) {
            best = run;
        }
    }

    return best;
}

const bestRunCache: Record<string, HistoryEntry> = {};

export function findBestRun(history: HistoryManager, view: ViewConfig): HistoryEntry | undefined {
    const cacheKey = `${view.resetType}.${view.universe ?? "*"}.${view.starLevel ?? "*"}`;
    const cacheEntry = bestRunCache[cacheKey];
    if (cacheEntry !== undefined) {
        return cacheEntry;
    }

    const best = findBestRunImpl(history, view);
    if (best !== undefined) {
        bestRunCache[cacheKey] = best;
    }

    return best;
}

export function sortMilestones(view: ViewConfig, lastRun: HistoryEntry, history: RunHistory | HistoryManager) {
    const milestones = Object.keys(view.milestones);

    const getMilestoneID = history instanceof HistoryManager ?
        (id: string) => history.getMilestoneID(id) :
        (id: string) => history.milestones[id];

    milestones.sort((l, r) => {
        if (!isEffectMilestone(l) && !isEffectMilestone(r)) {
            const lIdx = lastRun.milestones.findIndex(([id]) => id === getMilestoneID(l));
            const rIdx = lastRun.milestones.findIndex(([id]) => id === getMilestoneID(r));
            return rIdx - lIdx;
        }
        else if (isEffectMilestone(l)) {
            return 1;
        }
        else {
            return -1;
        }
    });

    for (let i = 0; i != milestones.length; ++i) {
        const milestone = milestones[i];
        view.milestones[milestone].index = i;
    }
}
