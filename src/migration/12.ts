import { sortMilestones } from "../exports/utils";
import { rotateMap, transformMap } from "../utils";
import type { additionalInformation, resets, universes, viewModes } from "../enums";
import type { Config, ViewConfig as ViewConfig13 } from "../config";
import type { RunHistory, HistoryEntry } from "../history";

export type ViewConfig12 = {
    resetType: keyof typeof resets,
    starLevel?: number,
    universe?: keyof typeof universes,
    mode: keyof typeof viewModes,
    includeCurrentRun?: boolean,
    smoothness: number,
    showBars: boolean,
    showLines: boolean,
    fillArea: boolean,
    numRuns?: number,
    daysScale?: number,
    milestones: Record<string, boolean>,
    additionalInfo: Array<keyof typeof additionalInformation>
}

export type Config12 = {
    version: number,
    recordRuns: boolean,
    lastOpenViewIndex?: number,
    views: ViewConfig12[]
}

function getResetType(entry: HistoryEntry, milestonesByID: Record<number, string>) {
    const [milestoneID] = entry.milestones[entry.milestones.length - 1];
    const milestone = milestonesByID[milestoneID];

    const prefix = "reset:";
    if (milestone.startsWith(prefix)) {
        return milestone.slice(prefix.length);
    }
}

function shouldIncludeRun(entry: HistoryEntry, view: ViewConfig13, milestonesByID: Record<number, string>) {
    if (view.universe !== undefined && entry.universe !== view.universe) {
        return false;
    }

    if (view.starLevel !== undefined && entry.starLevel !== view.starLevel) {
        return false;
    }

    if (getResetType(entry, milestonesByID) !== view.resetType) {
        return false;
    }

    // Don't show VC runs in generic Black Hole views
    if (view.resetType === "blackhole" && view.universe === undefined) {
        return entry.universe !== "magic";
    }

    return true;
}

function getLastRun(history: RunHistory, view: ViewConfig13): HistoryEntry | undefined {
    const milestonesByID = rotateMap(history.milestones);

    for (let i = history.runs.length - 1; i >= 0; --i) {
        const run = history.runs[i];
        if (shouldIncludeRun(run, view, milestonesByID)) {
            return run;
        }
    }
}

function migrateView(view: ViewConfig12, history: RunHistory): ViewConfig13 {
    const newView = {
        ...view,
        milestones: transformMap(view.milestones, ([milestone, enabled], index) => [milestone, { index, enabled }])
    };

    const lastRun = getLastRun(history, newView);
    if (lastRun !== undefined) {
        sortMilestones(newView, lastRun, history);
    }

    return newView;
}

export function migrate12(config: Config, history: RunHistory) {
    config.views = config.views.map(v => migrateView(v as any, history));

    config.version = 13;
}
